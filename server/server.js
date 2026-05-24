require('dotenv').config();
console.log('✓ Dotenv loaded');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Use PostgreSQL if DATABASE_URL is provided, else fallback to JSON file
const db = process.env.DATABASE_URL ? require('./db-postgres') : require('./db');
console.log('✓ Database module loaded');
const { authMiddleware, generateToken, generateRefreshToken, authorizeRoles, authorizePlatform } = require('./middleware/auth');

// Local role helper for this server process
function isTrainerRole(role) {
  return role === 'trainer'
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Standard Middlewares
console.log('✓ Setting up middlewares...');
const rateLimit = require('express-rate-limit');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"],
    },
  },
}));
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// Main App Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Socket.io Setup
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected'));
});

const sseClients = new Set();
const broadcast = (event, data) => {
  io.emit(event, data);
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
};

const createAndBroadcastNotification = async (title, message, type, tenantId) => {
  try {
    const notification = await db.addNotification({
      title,
      message,
      type
    }, tenantId);
    broadcast('notifications:new', notification);
  } catch (err) {
    console.error('Failed to create/broadcast notification:', err);
  }
};

function getTenantContextId(req) {
  if (!req) return null;

  // Support passing user object directly just in case
  const user = req.user || req;

  if (req.headers) {
    const headerGymId = req.headers['x-gym-id'] || req.headers['x-tenant-id'];
    if (headerGymId && headerGymId !== 'all') return headerGymId;

    const queryGymId = req.query && (req.query.gymId || req.query.tenantId);
    if (queryGymId && queryGymId !== 'all') return queryGymId;

    const bodyGymId = req.body && (req.body.gymId || req.body.tenantId);
    if (bodyGymId && bodyGymId !== 'all') return bodyGymId;
  }

  if (user && user.scope === 'platform') {
    return null;
  }

  return user ? (user.tenantId || user.tenant_id || user.gymId || user.gym_id || null) : null;
}

function withTenantPayload(payload, tenantId) {
  return {
    ...payload,
    tenant_id: tenantId,
    tenantId,
  };
}

function mapAttendanceRecord(r) {
  if (!r) return null;
  return {
    ...r,
    memberId: r.member_id || r.memberId,
    checkInTime: r.check_in_time || r.checkInTime,
    checkOutTime: r.check_out_time || r.checkOutTime,
    recordedDate: r.recorded_date || r.recordedDate,
  };
}

function mapInvoice(i) {
  if (!i) return null;
  return {
    ...i,
    invoiceNumber: i.invoice_number || i.invoiceNumber,
    memberId: i.member_id || i.memberId,
    taxAmount: i.tax_amount || i.taxAmount,
    invoiceDate: i.invoice_date || i.invoiceDate,
    dueDate: i.due_date || i.dueDate,
    paymentDate: i.payment_date || i.paymentDate,
  };
}

function mapClass(c) {
  if (!c) return null;
  return {
    ...c,
    maxCapacity: c.max_capacity ?? c.maxCapacity,
    currentEnrollment: c.current_enrollment ?? c.currentEnrollment ?? 0,
    instructorName: c.instructor_name ?? c.instructorName,
    branchId: c.branch_id ?? c.branchId,
  };
}

function mapStaff(s) {
  if (!s) return null;
  return {
    ...s,
    branchId: s.branch_id || s.branchId,
    emergencyContact: s.emergency_contact || s.emergencyContact,
  };
}

function mapInventoryItem(i) {
  if (!i) return null;
  return {
    ...i,
    minThreshold: i.min_threshold ?? i.minThreshold,
    costPerUnit: i.cost_per_unit ?? i.costPerUnit,
    lastUpdated: i.last_updated ?? i.lastUpdated,
  };
}

function mapPlan(p) {
  if (!p) return null;
  return {
    ...p,
    durationMonths: p.durationMonths ?? p.duration_months,
    durationDays: p.durationDays ?? p.duration_days,
  };
}

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

const loginAttempts = {};

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Account temporarily locked after 5 failed attempts. Please try again in 30 minutes.' }
});

app.post('/api/auth/register', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing required fields' });
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const user = await db.createUser({ id: uuidv4(), email, password, name, role: role || 'staff', gymId: 'gym-001' });
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({ success: true, data: { accessToken: token, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  } catch(err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const attempt = loginAttempts[email];
    
    if (attempt && attempt.count >= 5 && Date.now() < attempt.lockUntil) {
      return res.status(429).json({ error: 'Account temporarily locked. Please try again later.' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      if (!loginAttempts[email]) loginAttempts[email] = { count: 0, lockUntil: 0 };
      loginAttempts[email].count += 1;
      if (loginAttempts[email].count >= 5) {
        loginAttempts[email].lockUntil = Date.now() + 30 * 60 * 1000;
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete loginAttempts[email];

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        accessToken: token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          scope: user.scope || (['cto', 'ceo', 'admin'].includes(user.role) ? 'platform' : 'tenant'),
          gymId: user.gymId,
          tenantId: user.tenantId || user.tenant_id || user.gymId || null,
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/switch-gym', authMiddleware, authorizePlatform, async (req, res) => {
  try {
    const { gymId } = req.body;
    if (!gymId) {
      return res.status(400).json({ error: 'gymId is required' });
    }

    const tenant = await db.getTenantById(gymId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const supportUser = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      scope: 'tenant',
      tenantId: tenant.id,
      gymId: tenant.id,
    };

    const accessToken = generateToken(supportUser);
    const refreshToken = generateRefreshToken(supportUser);

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'create',
      'support-session',
      tenant.id,
      tenant.name,
      `Opened support session for ${tenant.name}`
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        tenant,
      },
    });
  } catch (err) {
    console.error('Switch gym error:', err);
    res.status(500).json({ error: 'Failed to switch gym' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({ success: true, data: req.user });
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const { verifyRefreshToken, generateToken } = require('./middleware/auth');
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const user = await db.getUserById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = generateToken(user);
    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          scope: user.scope || (['cto', 'ceo', 'admin'].includes(user.role) ? 'platform' : 'tenant'),
          gymId: user.gymId,
          tenantId: user.tenantId || user.tenant_id || user.gymId || null,
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/super-admin/overview', authMiddleware, authorizePlatform, async (req, res) => {
  try {
    const overview = await db.getPlatformOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    console.error('Platform overview error:', err);
    res.status(500).json({ error: 'Failed to fetch platform overview' });
  }
});

app.get('/api/super-admin/gyms', authMiddleware, authorizePlatform, async (req, res) => {
  try {
    const gyms = await db.getTenants();
    res.json({ success: true, data: gyms });
  } catch (err) {
    console.error('Platform gyms error:', err);
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

app.get('/api/platform/tenants', authMiddleware, authorizePlatform, async (req, res) => {
  try {
    const gyms = await db.getTenants();
    res.json({ success: true, data: gyms });
  } catch (err) {
    console.error('Platform tenants error:', err);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

app.post('/api/platform/tenants', authMiddleware, authorizePlatform, async (req, res) => {
  try {
    const tenant = await db.createTenant(req.body);
    res.status(201).json({ success: true, data: tenant });
  } catch (err) {
    console.error('Create tenant error:', err);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

app.put('/api/platform/tenants/:id', authMiddleware, authorizePlatform, async (req, res) => {
  try {
    const tenant = await db.updateTenant(req.params.id, req.body);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json({ success: true, data: tenant });
  } catch (err) {
    console.error('Update tenant error:', err);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// ============================================================================
// MEMBERS ROUTES 
// ============================================================================

app.get('/api/members', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const trainerId = isTrainerRole(req.user.role) ? req.user.id : null;
  let members = await db.getMembers(tenantId, trainerId);
  members = members.map(m => ({
    ...m,
    membershipType: m.membership_type || m.membershipType,
    joinDate: m.join_date || m.joinDate,
    expiryDate: m.expiry_date || m.expiryDate,
    dob: m.dob
  }));
  res.json({ success: true, data: members });
});

app.post('/api/members', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const member = await db.addMember(withTenantPayload({ ...req.body, id: uuidv4() }, tenantId), tenantId);
  broadcast('members:update', member);
  if (member) {
    createAndBroadcastNotification(
      'New Member Registered',
      `${member.name} has joined the gym.`,
      'members',
      tenantId
    );
  }
  res.status(201).json({ success: true, data: member });
});

app.post('/api/members/bulk', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  try {
    if (!Array.isArray(req.body.members)) {
      return res.status(400).json({ success: false, error: 'Expected "members" array in payload' });
    }
    
    // Assign UUIDs to each imported member
    const tenantId = getTenantContextId(req);
    const preparedMembers = req.body.members.map(m => withTenantPayload({ ...m, id: uuidv4() }, tenantId));
    
    const inserted = await db.bulkAddMembers(preparedMembers, tenantId);
    
    // Broadcast bulk update so all connected clients fetch fresh state
    broadcast('members:update_bulk', { count: inserted.length });
    if (inserted && inserted.length > 0) {
      createAndBroadcastNotification(
        'Bulk Import Completed',
        `Successfully imported ${inserted.length} members.`,
        'members',
        tenantId
      );
    }
    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    console.error('Bulk Import Error:', err);
    res.status(500).json({ success: false, error: 'Bulk import failed on database level' });
  }
});

app.delete('/api/members/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.deleteMember(req.params.id, tenantId);
  if (success) broadcast('members:delete', { id: req.params.id });
  res.json({ success });
});

app.put('/api/members/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const member = await db.updateMember(req.params.id, req.body, tenantId);
  if (member) broadcast('members:update', member);
  res.json({ success: !!member, data: member });
});

app.post('/api/members/message', authMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const { memberIds, channel, subject, message } = req.body;
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Recipient member IDs are required' });
    }
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }
    
    const count = memberIds.length;
    
    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'send_message',
      'Member',
      memberIds[0],
      'Multiple Members',
      `Sent ${channel.toUpperCase()} message to ${count} members: "${message.substring(0, 50)}..."`
    );
    
    if (db.createReminder) {
      for (const memberId of memberIds) {
        try {
          await db.createReminder({
            id: uuidv4(),
            user_id: req.user.id,
            recipient_id: memberId,
            message: `${subject ? `[${subject}] ` : ''}${message}`,
            status: 'sent',
            sent_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }, tenantId);
        } catch (e) {
          console.error('Failed to save reminder log:', e);
        }
      }
    }
    
    res.json({ success: true, message: `Message successfully dispatched to ${count} members via ${channel.toUpperCase()}` });
  } catch (err) {
    console.error('Send member message error:', err);
    res.status(500).json({ success: false, error: 'Failed to dispatch messages' });
  }
});


// ============================================================================
// ATTENDANCE ROUTES
// ============================================================================

app.get('/api/attendance', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const trainerId = req.user.role === 'trainer' ? req.user.id : null;
  const data = await db.getAttendance(req.query, tenantId, trainerId);
  res.json({ success: true, data: data.map(mapAttendanceRecord) });
});

app.post('/api/attendance/checkin', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const record = await db.checkIn(req.body.memberId, req.body.notes, tenantId);
  const mapped = mapAttendanceRecord(record);
  broadcast('attendance:update', mapped);
  if (mapped) {
    createAndBroadcastNotification(
      'Member Check-in',
      `${mapped.memberName || 'A member'} has checked in.`,
      'attendance',
      tenantId
    );
  }
  res.status(201).json({ success: true, data: mapped });
});

app.post('/api/attendance/:id/checkout', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const record = await db.checkOut(req.params.id, tenantId);
  const mapped = mapAttendanceRecord(record);
  if (mapped) {
    broadcast('attendance:update', mapped);
    createAndBroadcastNotification(
      'Member Check-out',
      `${mapped.memberName || 'A member'} has checked out.`,
      'attendance',
      tenantId
    );
  }
  res.json({ success: !!mapped, data: mapped });
});

app.post('/api/attendance/scan', authMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, error: 'Member ID is required' });
    }

    // 1. Fetch member details
    const members = await db.getMembers(tenantId);
    const member = members.find(m => m.id === memberId);
    if (!member) {
      broadcast('attendance:error', { memberId, error: 'Member not found' });
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    // 2. Check if already checked in today without checking out
    const attendanceRecords = await db.getAttendance({ memberId }, tenantId);
    
    // Find active check-in with robust compatibility for both JSON and Postgres DB schemas
    const activeCheckin = attendanceRecords.find(r => {
      const rMemberId = r.memberId || r.member_id;
      let rDate = r.recordedDate || r.recorded_date;
      if (rDate instanceof Date) {
        rDate = rDate.toISOString().split('T')[0];
      } else if (typeof rDate === 'string' && rDate.includes('T')) {
        rDate = rDate.split('T')[0];
      }
      const isToday = rDate === today;
      const isCheckedIn = !r.checkOutTime && !r.check_out_time;
      return rMemberId === memberId && isToday && isCheckedIn;
    });

    if (activeCheckin) {
      // Perform Check-Out
      const record = await db.checkOut(activeCheckin.id, tenantId);
      
      createAndBroadcastNotification(
        'Member Check-out',
        `${member.name} has checked out (QR Scan).`,
        'attendance',
        tenantId
      );
      
      await db.logActivity(
        req.user.id,
        req.user.name || req.user.email,
        'Check Out',
        'Attendance',
        record.id,
        member.name,
        `${member.name} checked out via QR scan`
      );

      const formattedData = {
        ...mapAttendanceRecord(record),
        memberName: member.name,
        membershipType: member.membership_type || member.membershipType || 'Basic',
        memberStatus: member.status
      };

      broadcast('attendance:update', formattedData);
      return res.json({
        success: true,
        action: 'checkout',
        message: `${member.name} checked out successfully`,
        data: formattedData
      });
    } else {
      // Perform Check-In
      const isExpired = member.status === 'expired' || new Date(member.expiry_date || member.expiryDate) < new Date();

      try {
        const record = await db.checkIn(memberId, 'Checked in via QR scan', tenantId);
        
        createAndBroadcastNotification(
          isExpired ? 'Member Check-in Warning' : 'Member Check-in',
          `${member.name} has checked in (QR Scan).${isExpired ? ' WARNING: Membership Expired.' : ''}`,
          'attendance',
          tenantId
        );

        await db.logActivity(
          req.user.id,
          req.user.name || req.user.email,
          'Check In',
          'Attendance',
          record.id,
          member.name,
          `${member.name} checked in via QR scan${isExpired ? ' (Membership Expired/Warning)' : ''}`
        );

        const formattedData = {
          ...mapAttendanceRecord(record),
          memberName: member.name,
          membershipType: member.membership_type || member.membershipType || 'Basic',
          memberStatus: member.status
        };

        broadcast('attendance:update', formattedData);
        return res.json({
          success: true,
          action: 'checkin',
          warning: isExpired ? 'Membership is expired or inactive' : null,
          message: `${member.name} checked in successfully`,
          data: formattedData
        });
      } catch (err) {
        broadcast('attendance:error', { memberId, memberName: member.name, error: err.message });
        return res.status(400).json({ success: false, error: err.message });
      }
    }
  } catch (error) {
    console.error('Scan attendance error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process QR code scan' });
  }
});

// ============================================================================
// STAFF ROUTES
// ============================================================================

app.get('/api/staff', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  let data = await db.getStaff(tenantId);
  data = data.map(mapStaff);
  
  // Report requirement: No money/salary visibility for trainers
  if (isTrainerRole(req.user.role)) {
    data = data.map(({ salary, ...rest }) => rest);
  }
  
  res.json({ success: true, data });
});

app.post('/api/staff', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const member = await db.addStaff(withTenantPayload({ ...req.body, id: uuidv4() }, tenantId), tenantId);
  const mapped = mapStaff(member);
  broadcast('staff:update', mapped);
  res.status(201).json({ success: true, data: mapped });
});

app.put('/api/staff/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const member = await db.updateStaff(req.params.id, req.body, tenantId);
  const mapped = mapStaff(member);
  if (mapped) broadcast('staff:update', mapped);
  res.json({ success: !!mapped, data: mapped });
});

app.delete('/api/staff/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.deleteStaff(req.params.id, tenantId);
  if (success) broadcast('staff:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// INVENTORY ROUTES
// ============================================================================

app.get('/api/inventory', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  let data = await db.getInventory(tenantId);
  res.json({ success: true, data: data.map(mapInventoryItem) });
});

app.post('/api/inventory', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const item = await db.addInventoryItem(withTenantPayload({ ...req.body, id: uuidv4() }, tenantId), tenantId);
  const mapped = mapInventoryItem(item);
  broadcast('inventory:update', mapped);
  res.status(201).json({ success: true, data: mapped });
});

app.put('/api/inventory/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const item = await db.updateInventoryItem(req.params.id, req.body, tenantId);
  const mapped = mapInventoryItem(item);
  if (mapped) broadcast('inventory:update', mapped);
  res.json({ success: !!mapped, data: mapped });
});

app.delete('/api/inventory/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.deleteInventoryItem(req.params.id, tenantId);
  if (success) broadcast('inventory:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// BILLING ROUTES
// ============================================================================

app.get('/api/billing', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const data = await db.getInvoices(tenantId);
  res.json({ success: true, data: data.map(mapInvoice) });
});

app.post('/api/billing', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const invoice = await db.addInvoice(withTenantPayload({ ...req.body, id: uuidv4(), status: 'pending' }, tenantId), tenantId);
  const mapped = mapInvoice(invoice);
  broadcast('billing:update', mapped);
  if (mapped) {
    createAndBroadcastNotification(
      'New Invoice Created',
      `Invoice ${mapped.invoiceNumber || mapped.id} created for ${mapped.memberName || 'a member'}: $${mapped.amount}`,
      'billing',
      tenantId
    );
  }
  res.status(201).json({ success: true, data: mapped });
});

app.post('/api/billing/:id/pay', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const record = await db.payInvoice(req.params.id, req.body, tenantId);
  const mapped = mapInvoice(record);
  if (mapped) {
    broadcast('billing:update', mapped);
    createAndBroadcastNotification(
      'Invoice Paid',
      `Invoice ${mapped.invoiceNumber || mapped.id} for ${mapped.memberName || 'a member'} has been marked as paid: $${mapped.amount}`,
      'billing',
      tenantId
    );
  }
  res.json({ success: !!mapped, data: mapped });
});

app.put('/api/billing/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const invoice = await db.updateInvoice(req.params.id, req.body, tenantId);
  const mapped = mapInvoice(invoice);
  if (mapped) broadcast('billing:update', mapped);
  res.json({ success: !!mapped, data: mapped });
});

app.delete('/api/billing/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.deleteInvoice(req.params.id, tenantId);
  if (success) broadcast('billing:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// CLASSES ROUTES
// ============================================================================

app.get('/api/classes', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const instructorId = isTrainerRole(req.user.role) ? req.user.id : null;
  const data = await db.getClasses(tenantId, instructorId);
  res.json({ success: true, data: data.map(mapClass) });
});

app.post('/api/classes', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const cls = await db.addClass(withTenantPayload({ ...req.body, id: uuidv4(), currentEnrollment: 0 }, tenantId), tenantId);
  const mapped = mapClass(cls);
  broadcast('classes:update', mapped);
  res.status(201).json({ success: true, data: mapped });
});

app.put('/api/classes/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const cls = await db.updateClass(req.params.id, req.body, tenantId);
  const mapped = mapClass(cls);
  if (mapped) broadcast('classes:update', mapped);
  res.json({ success: !!mapped, data: mapped });
});

app.delete('/api/classes/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.deleteClass(req.params.id, tenantId);
  if (success) broadcast('classes:delete', { id: req.params.id });
  res.json({ success });
});

app.get('/api/classes/:id/bookings', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const data = await db.getClassBookings(req.params.id, tenantId);
  res.json({ success: true, data });
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const data = await db.bookClass(req.body.memberId, req.body.classId, tenantId);
    broadcast('bookings:update', data);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.cancelBooking(req.params.id, tenantId);
  if (success) broadcast('bookings:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// SETTINGS & STATS
// ============================================================================

app.get('/api/settings', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const settings = await db.getSettings(tenantId);
  res.json({ success: true, data: settings });
});

app.put('/api/settings', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  const tenantId = getTenantContextId(req);
  const settings = await db.updateSettings(req.body, tenantId);
  res.json({ success: true, data: settings });
});

app.get('/api/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const trainerId = req.user.role === 'trainer' ? req.user.id : null;
    let data = await db.getDashboardStats(tenantId, trainerId);
    
    // Report requirement: Trainers should not see revenue/money
    if (isTrainerRole(req.user.role)) {
      delete data.todayRevenue;
      delete data.revenueTrend;
      delete data.pendingPayments;
    }
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ============================================================================
// NOTIFICATIONS ROUTES
// ============================================================================

app.get('/api/notifications', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const data = await db.getNotifications(tenantId);
  res.json({ success: true, data });
});

app.put('/api/notifications/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const data = await db.markNotificationRead(req.params.id, tenantId);
  res.json({ success: !!data, data });
});

// ============================================================================
// LEADS (CRM) ROUTES
// ============================================================================

app.get('/api/leads', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const data = await db.getLeads(tenantId);
  res.json({ success: true, data });
});

app.post('/api/leads', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const lead = await db.addLead(withTenantPayload({ ...req.body, id: uuidv4() }, tenantId), tenantId);
  broadcast('leads:update', lead);
  res.status(201).json({ success: true, data: lead });
});

app.put('/api/leads/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const lead = await db.updateLead(req.params.id, req.body, tenantId);
  if (lead) broadcast('leads:update', lead);
  res.json({ success: !!lead, data: lead });
});

app.delete('/api/leads/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.deleteLead(req.params.id, tenantId);
  if (success) broadcast('leads:delete', { id: req.params.id });
  res.json({ success });
});

app.post('/api/leads/:id/convert', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const member = await db.convertLead(req.params.id, withTenantPayload({ ...req.body, id: uuidv4() }, tenantId), tenantId);
  if (member) {
    broadcast('leads:delete', { id: req.params.id });
    broadcast('members:update', member);
    createAndBroadcastNotification(
      'Lead Converted',
      `Lead ${member.name} converted to member successfully under plan ${member.membershipType || 'Basic'}.`,
      'leads',
      tenantId
    );
  }
  res.json({ success: !!member, data: member });
});

// ============================================================================
// MEMBERSHIP PLANS ROUTES
// ============================================================================

app.get('/api/plans', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const data = await db.getPlans(tenantId);
  res.json({ success: true, data: data.map(mapPlan) });
});

app.post('/api/plans', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const plan = await db.addPlan(withTenantPayload({ ...req.body, id: uuidv4() }, tenantId), tenantId);
  const mapped = mapPlan(plan);
  broadcast('plans:update', mapped);
  res.status(201).json({ success: true, data: mapped });
});

app.put('/api/plans/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const plan = await db.updatePlan(req.params.id, req.body, tenantId);
  const mapped = mapPlan(plan);
  if (mapped) broadcast('plans:update', mapped);
  res.json({ success: !!mapped, data: mapped });
});

app.delete('/api/plans/:id', authMiddleware, async (req, res) => {
  const tenantId = getTenantContextId(req);
  const success = await db.deletePlan(req.params.id, tenantId);
  if (success) broadcast('plans:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// SETTINGS API
// ============================================================================

app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const settings = await db.getSettings ? await db.getSettings(tenantId) : { gymName: 'GymFlow' };
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const settings = await db.updateSettings ? await db.updateSettings(req.body, tenantId) : req.body;
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.post('/api/settings', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const settings = await db.updateSettings ? await db.updateSettings(req.body, tenantId) : req.body;
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================================================
// BRANCHES API
// ============================================================================

app.get('/api/branches', authMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const data = await db.getBranches(req.user.id, tenantId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

app.post('/api/branches', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const branch = await db.addBranch(withTenantPayload(req.body, tenantId), tenantId);
    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

app.put('/api/branches/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const branch = await db.updateBranch(req.params.id, req.body, tenantId);
    res.json({ success: true, data: branch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

app.delete('/api/branches/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    await db.deleteBranch(req.params.id, tenantId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

// ============================================================================
// REPORTS API
// ============================================================================



app.get('/api/reports/:type', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff', 'trainer']), async (req, res) => {
  try {
    const { type } = req.params;
    const tenantId = getTenantContextId(req);
    const trainerId = req.user.role === 'trainer' ? req.user.id : null;
    let data;
    
    switch(type) {
      case 'member-summary':
      case 'expiring-members':
        data = await db.getMembers(tenantId, trainerId);
        break;
      case 'revenue':
        // Double check permissions for revenue report
        if (req.user.role === 'trainer') return res.status(403).json({ error: 'Access denied' });
        data = await db.getInvoices(tenantId);
        break;
      case 'attendance':
        data = await db.getAttendance({}, tenantId, trainerId);
        break;
      case 'class-utilization':
        data = await db.getClasses(tenantId, trainerId);
        break;
      case 'equipment-status':
        data = await db.getInventory(tenantId);
        break;
      case 'leads-conversion':
        if (req.user.role === 'trainer') return res.status(403).json({ error: 'Access denied' });
        data = await db.getLeads(tenantId);
        break;
      case 'staff-performance':
        if (req.user.role === 'trainer') return res.status(403).json({ error: 'Access denied' });
        data = await db.getStaff(tenantId);
        break;
      default:
        data = await db.getDashboardStats(tenantId, trainerId);
    }
    
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Report generation failed' });
  }
});

// ============================================================================
// HEALTH & SYNC ROUTES
// ============================================================================

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date() }));

app.get('/api/health/detailed', async (req, res) => {
  const start = Date.now();
  const dbReady = await db.isReady();
  const latency = Date.now() - start;
  res.json({
    status: dbReady ? 'healthy' : 'degraded',
    database: { connected: dbReady, latencyMs: latency },
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  });
});

app.get('/api/sync/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ============================================================================
// FEEDBACK API
// ============================================================================

app.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { category, title, details } = req.body;
    
    if (!category || !title || !details) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const tenantId = getTenantContextId(req);
    const feedback = await db.addFeedback({
      id: uuidv4(),
      category,
      title,
      details,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      createdAt: new Date().toISOString(),
      status: 'new',
      tenant_id: tenantId,
    }, tenantId);

    broadcast('feedback:new', feedback);
    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.get('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const data = await db.getFeedback(tenantId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Fetch feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ============================================================================
// ACTIVITY LOG API
// ============================================================================

app.post('/api/activity-logs', authMiddleware, async (req, res) => {
  try {
    const { action, entityType, entityId, entityName, details } = req.body;
    
    if (!action || !entityType) {
      return res.status(400).json({ error: 'Action and entityType are required' });
    }

    const activity = await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      action,
      entityType,
      entityId || '',
      entityName || '',
      details || ''
    );

    broadcast('activity:new', activity);
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    console.error('Activity logging error:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

app.get('/api/activity-logs', authMiddleware, async (req, res) => {
  try {
    const filters = {
      action: req.query.action,
      entityType: req.query.entityType,
      userId: req.query.userId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: req.query.limit ? parseInt(req.query.limit) : 500
    };

    const tenantId = getTenantContextId(req);
    const data = await db.getActivityLogs({ ...filters, tenantId });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Fetch activity logs error:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Start Server
// ============================================================================
// TEAM MANAGEMENT API
// ============================================================================

app.get('/api/team/members', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const response = await db.getUsers();
    res.json({ success: true, data: response || [] });
  } catch (err) {
    console.error('Fetch team members error:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

app.post('/api/team/members', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await db.createUser({
      id: uuidv4(),
      email,
      password,
      name,
      role: role || 'staff',
      gymId: getTenantContextId(req) || 'gym-001'
    });

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'create',
      'team-member',
      user.id,
      name,
      `Created new team member with role: ${role || 'staff'}`
    );

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Create team member error:', err);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

app.put('/api/team/members/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'staff', 'trainer'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const updatedUser = await db.updateUser(id, { role });
    
    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'update',
      'team-member',
      id,
      updatedUser.name,
      `Updated role to: ${role}`
    );

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        created_at: updatedUser.created_at
      }
    });
  } catch (err) {
    console.error('Update team member error:', err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

app.delete('/api/team/members/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deleted = await db.deleteUser(id);
    
    if (deleted) {
      await db.logActivity(
        req.user.id,
        req.user.name || req.user.email,
        'delete',
        'team-member',
        id,
        user.name,
        'Deleted team member'
      );
      res.json({ success: true, message: 'Team member deleted' });
    } else {
      res.status(400).json({ error: 'Failed to delete team member' });
    }
  } catch (err) {
    console.error('Delete team member error:', err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

// ============================================================================
// CAMPAIGNS & REMINDERS API
// ============================================================================

app.post('/api/campaigns', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { title, description, targetAudience, message, scheduledDate } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const tenantId = getTenantContextId(req);
    const campaign = await db.createCampaign({
      id: uuidv4(),
      userId: req.user.id,
      title,
      description,
      target_audience: targetAudience,
      message,
      status: 'draft',
      scheduled_date: scheduledDate,
      tenant_id: tenantId,
      createdAt: new Date().toISOString()
    }, tenantId);

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'create',
      'campaign',
      campaign.id,
      title,
      `Created campaign targeting: ${targetAudience}`
    );

    broadcast('campaign:created', campaign);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    console.error('Campaign creation error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.get('/api/campaigns', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const campaigns = await db.getCampaigns(tenantId);
    res.json({ success: true, data: campaigns });
  } catch (err) {
    console.error('Fetch campaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.put('/api/campaigns/:id', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantContextId(req);
    const campaign = await db.updateCampaign(id, req.body, tenantId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'update',
      'campaign',
      id,
      campaign.title,
      `Updated campaign status to: ${req.body.status}`
    );

    res.json({ success: true, data: campaign });
  } catch (err) {
    console.error('Campaign update error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

app.delete('/api/campaigns/:id', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantContextId(req);
    const deleted = await db.deleteCampaign(id, tenantId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'delete',
      'campaign',
      id,
      'Unknown',
      'Deleted campaign'
    );

    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    console.error('Campaign deletion error:', err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

app.get('/api/reminders', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const tenantId = getTenantContextId(req);
    const reminders = await db.getReminders(tenantId);
    const stats = await db.getReminderStats(tenantId);
    res.json({ success: true, data: reminders, stats });
  } catch (err) {
    console.error('Fetch reminders error:', err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

app.post('/api/campaigns/:id/send', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantContextId(req);
    const campaign = await db.getCampaigns(tenantId);
    const targetCampaign = campaign.find(c => c.id === id);
    
    if (!targetCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Create reminders for all members
    const members = await db.getMembers(tenantId);
    let reminderCount = 0;
    
    for (const member of members) {
      await db.createReminder({
        id: uuidv4(),
        campaign_id: id,
        user_id: req.user.id,
        recipient_id: member.id,
        message: targetCampaign.message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }, tenantId);
      reminderCount++;
    }

    // Update campaign status
    await db.updateCampaign(id, { status: 'sent' }, tenantId);

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'update',
      'campaign',
      id,
      targetCampaign.title,
      `Sent campaign to ${reminderCount} members`
    );

    broadcast('campaign:sent', { campaignId: id, reminderCount });
    res.json({ success: true, message: `Campaign sent to ${reminderCount} members`, data: { reminderCount } });
  } catch (err) {
    console.error('Campaign send error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Invites & Signup
app.post('/api/invites', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate unique token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await db.createInvite({
      id: uuidv4(),
      email,
      token,
      inviter_id: req.user.id,
      inviter_name: req.user.name || req.user.email,
      expires_at: expiresAt.toISOString()
    });

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'create',
      'invite',
      invite.id,
      email,
      'Sent signup invite'
    );

    broadcast('invite:created', { email, token });
    res.json({ success: true, data: invite });
  } catch (err) {
    console.error('Invite creation error:', err);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

app.get('/api/invites', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { email, status } = req.query;
    const invites = await db.getInvites({ email, status });
    res.json({ success: true, data: invites });
  } catch (err) {
    console.error('Fetch invites error:', err);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

app.post('/api/auth/signup-invite', async (req, res) => {
  try {
    const { token, email, password, name } = req.body;

    if (!token || !email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify invite
    const invite = await db.verifyInvite(token);
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    // Create user
    const user = await db.createUser({
      id: uuidv4(),
      email,
      password,
      name,
      role: 'member',
      gym_id: process.env.DEFAULT_GYM_ID || 'default',
    });

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await db.logActivity(
      user.id,
      user.name,
      'create',
      'user',
      user.id,
      user.email,
      'Signed up via invite'
    );

    // Mark invite as used
    await db.updateInvite(invite.id, { status: 'completed' });

    res.json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('Signup via invite error:', err);
    res.status(500).json({ error: 'Failed to complete signup' });
  }
});

app.delete('/api/invites/:id', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteInvite(id);

    if (!success) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'delete',
      'invite',
      id,
      '',
      'Deleted invite'
    );

    broadcast('invite:deleted', { inviteId: id });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete invite error:', err);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});

// Start server
async function startServer() {
  console.log('🚀 Starting server...');
  if (db.init) await db.init();
  console.log('✓ Database initialized');

  const AUTO_EXPIRY_INTERVAL = 60 * 60 * 1000; // 1 hour
  const runAutoExpiryJob = async () => {
    try {
      console.log('🔄 Running auto-expiry job...');
      const today = new Date().toISOString().split('T')[0];
      const allMembers = await db.getMembers();

      if (!allMembers || allMembers.length === 0) {
        console.log('✓ No members to check');
        return;
      }

      let expiredCount = 0;
      for (const member of allMembers) {
        if (member.status === 'active' && member.expiry_date && member.expiry_date < today) {
          await db.updateMember(member.id, { status: 'expired' });
          expiredCount++;

          await db.logActivity(
            'system',
            'System',
            'update',
            'member',
            member.id,
            member.name,
            `Membership expired on ${member.expiry_date}`
          );

          broadcast('member:expired', {
            memberId: member.id,
            memberName: member.name,
            expiryDate: member.expiry_date,
          });
        }
      }

      if (expiredCount > 0) {
        console.log(`✓ Auto-expiry job: ${expiredCount} member(s) marked as expired`);
      }
    } catch (error) {
      console.error('Auto-expiry job error:', error);
    }
  };

  // Run immediately on startup, then every hour
  await runAutoExpiryJob();
  setInterval(runAutoExpiryJob, AUTO_EXPIRY_INTERVAL);

  httpServer.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => console.error('Startup error:', err));

