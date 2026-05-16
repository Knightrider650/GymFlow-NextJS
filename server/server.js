require('dotenv').config();
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
const { authMiddleware, generateToken, generateRefreshToken, authorizeRoles } = require('./middleware/auth');

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
        user: { id: user.id, email: user.email, name: user.name, role: user.role, gymId: user.gymId }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Authentication failed' });
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
    res.json({ success: true, data: { accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================================
// MEMBERS ROUTES 
// ============================================================================

app.get('/api/members', authMiddleware, async (req, res) => {
  const trainerId = isTrainerRole(req.user.role) ? req.user.id : null;
  let members = await db.getMembers(req.user.id, trainerId);
  members = members.map(m => ({
    ...m,
    membershipType: m.membership_type || m.membershipType,
    joinDate: m.join_date || m.joinDate,
    expiryDate: m.expiry_date || m.expiryDate
  }));
  res.json({ success: true, data: members });
});

app.post('/api/members', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  const member = await db.addMember({ ...req.body, id: uuidv4() }, req.user.id);
  broadcast('members:update', member);
  res.status(201).json({ success: true, data: member });
});

app.post('/api/members/bulk', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  try {
    if (!Array.isArray(req.body.members)) {
      return res.status(400).json({ success: false, error: 'Expected "members" array in payload' });
    }
    
    // Assign UUIDs to each imported member
    const preparedMembers = req.body.members.map(m => ({ ...m, id: uuidv4() }));
    
    const inserted = await db.bulkAddMembers(preparedMembers, req.user.id);
    
    // Broadcast bulk update so all connected clients fetch fresh state
    broadcast('members:update_bulk', { count: inserted.length });
    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    console.error('Bulk Import Error:', err);
    res.status(500).json({ success: false, error: 'Bulk import failed on database level' });
  }
});

app.delete('/api/members/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const success = await db.deleteMember(req.params.id, req.user.id);
  if (success) broadcast('members:delete', { id: req.params.id });
  res.json({ success });
});

app.put('/api/members/:id', authMiddleware, async (req, res) => {
  const member = await db.updateMember(req.params.id, req.body, req.user.id);
  if (member) broadcast('members:update', member);
  res.json({ success: !!member, data: member });
});


// ============================================================================
// ATTENDANCE ROUTES
// ============================================================================

app.get('/api/attendance', authMiddleware, async (req, res) => {
  const trainerId = req.user.role === 'trainer' ? req.user.id : null;
  const data = await db.getAttendance(req.query, req.user.id, trainerId);
  res.json({ success: true, data });
});

app.post('/api/attendance/checkin', authMiddleware, async (req, res) => {
  const record = await db.checkIn(req.body.memberId, req.body.notes, req.user.id);
  broadcast('attendance:update', record);
  res.status(201).json({ success: true, data: record });
});

app.post('/api/attendance/:id/checkout', authMiddleware, async (req, res) => {
  const record = await db.checkOut(req.params.id, req.user.id);
  if (record) broadcast('attendance:update', record);
  res.json({ success: !!record, data: record });
});

// ============================================================================
// STAFF ROUTES
// ============================================================================

app.get('/api/staff', authMiddleware, async (req, res) => {
  let data = await db.getStaff(req.user.id);
  
  // Report requirement: No money/salary visibility for trainers
  if (isTrainerRole(req.user.role)) {
    data = data.map(({ salary, ...rest }) => rest);
  }
  
  res.json({ success: true, data });
});

app.post('/api/staff', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  const member = await db.addStaff({ ...req.body, id: uuidv4() }, req.user.id);
  broadcast('staff:update', member);
  res.status(201).json({ success: true, data: member });
});

app.put('/api/staff/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  const member = await db.updateStaff(req.params.id, req.body, req.user.id);
  if (member) broadcast('staff:update', member);
  res.json({ success: !!member, data: member });
});

app.delete('/api/staff/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const success = await db.deleteStaff(req.params.id, req.user.id);
  if (success) broadcast('staff:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// INVENTORY ROUTES
// ============================================================================

app.get('/api/inventory', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  let data = await db.getInventory(req.user.id);
  data = data.map(i => ({
    ...i,
    minThreshold: i.min_threshold ?? i.minThreshold,
    costPerUnit: i.cost_per_unit ?? i.costPerUnit,
    lastUpdated: i.last_updated ?? i.lastUpdated
  }));
  res.json({ success: true, data });
});

app.post('/api/inventory', authMiddleware, async (req, res) => {
  const item = await db.addInventoryItem({ ...req.body, id: uuidv4() }, req.user.id);
  broadcast('inventory:update', item);
  res.status(201).json({ success: true, data: item });
});

app.put('/api/inventory/:id', authMiddleware, async (req, res) => {
  const item = await db.updateInventoryItem(req.params.id, req.body, req.user.id);
  if (item) broadcast('inventory:update', item);
  res.json({ success: !!item, data: item });
});

app.delete('/api/inventory/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const success = await db.deleteInventoryItem(req.params.id, req.user.id);
  if (success) broadcast('inventory:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// BILLING ROUTES
// ============================================================================

app.get('/api/billing', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  const data = await db.getInvoices(req.user.id);
  res.json({ success: true, data });
});

app.post('/api/billing', authMiddleware, async (req, res) => {
  const invoice = await db.addInvoice({ ...req.body, id: uuidv4(), status: 'pending' }, req.user.id);
  broadcast('billing:update', invoice);
  res.status(201).json({ success: true, data: invoice });
});

app.post('/api/billing/:id/pay', authMiddleware, async (req, res) => {
  const record = await db.payInvoice(req.params.id, req.body, req.user.id);
  if (record) broadcast('billing:update', record);
  res.json({ success: !!record, data: record });
});

app.put('/api/billing/:id', authMiddleware, async (req, res) => {
  const invoice = await db.updateInvoice(req.params.id, req.body, req.user.id);
  if (invoice) broadcast('billing:update', invoice);
  res.json({ success: !!invoice, data: invoice });
});

app.delete('/api/billing/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const success = await db.deleteInvoice(req.params.id, req.user.id);
  if (success) broadcast('billing:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// CLASSES ROUTES
// ============================================================================

app.get('/api/classes', authMiddleware, async (req, res) => {
  const instructorId = isTrainerRole(req.user.role) ? req.user.id : null;
  const data = await db.getClasses(req.user.id, instructorId);
  res.json({ success: true, data });
});

app.post('/api/classes', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager', 'staff']), async (req, res) => {
  const cls = await db.addClass({ ...req.body, id: uuidv4(), currentEnrollment: 0 }, req.user.id);
  broadcast('classes:update', cls);
  res.status(201).json({ success: true, data: cls });
});

app.put('/api/classes/:id', authMiddleware, async (req, res) => {
  const cls = await db.updateClass(req.params.id, req.body, req.user.id);
  if (cls) broadcast('classes:update', cls);
  res.json({ success: !!cls, data: cls });
});

app.delete('/api/classes/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  const success = await db.deleteClass(req.params.id, req.user.id);
  if (success) broadcast('classes:delete', { id: req.params.id });
  res.json({ success });
});

app.get('/api/classes/:id/bookings', authMiddleware, async (req, res) => {
  const data = await db.getClassBookings(req.params.id, req.user.id);
  res.json({ success: true, data });
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const data = await db.bookClass(req.body.memberId, req.body.classId, req.user.id);
    broadcast('bookings:update', data);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
  const success = await db.cancelBooking(req.params.id, req.user.id);
  if (success) broadcast('bookings:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// SETTINGS & STATS
// ============================================================================

app.get('/api/settings', authMiddleware, async (req, res) => {
  const data = await db.getSettings(req.user.id);
  res.json({ success: true, data });
});

app.put('/api/settings', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto', 'manager']), async (req, res) => {
  const data = await db.updateSettings(req.body, req.user.id);
  res.json({ success: true, data });
});

app.get('/api/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    const trainerId = req.user.role === 'trainer' ? req.user.id : null;
    let data = await db.getDashboardStats(req.user.id, trainerId);
    
    // Report requirement: Trainers should not see revenue/money
    if (isTrainerRole(req.user.role)) {
      delete data.todayRevenue;
      delete data.monthlyRevenue;
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
  const data = await db.getNotifications(req.user.id);
  res.json({ success: true, data });
});

app.put('/api/notifications/:id', authMiddleware, async (req, res) => {
  const data = await db.markNotificationRead(req.params.id, req.user.id);
  res.json({ success: !!data, data });
});

// ============================================================================
// LEADS (CRM) ROUTES
// ============================================================================

app.get('/api/leads', authMiddleware, async (req, res) => {
  const data = await db.getLeads(req.user.id);
  res.json({ success: true, data });
});

app.post('/api/leads', authMiddleware, async (req, res) => {
  const lead = await db.addLead({ ...req.body, id: uuidv4() }, req.user.id);
  broadcast('leads:update', lead);
  res.status(201).json({ success: true, data: lead });
});

app.put('/api/leads/:id', authMiddleware, async (req, res) => {
  const lead = await db.updateLead(req.params.id, req.body, req.user.id);
  if (lead) broadcast('leads:update', lead);
  res.json({ success: !!lead, data: lead });
});

app.delete('/api/leads/:id', authMiddleware, async (req, res) => {
  const success = await db.deleteLead(req.params.id, req.user.id);
  if (success) broadcast('leads:delete', { id: req.params.id });
  res.json({ success });
});

app.post('/api/leads/:id/convert', authMiddleware, async (req, res) => {
  const member = await db.convertLead(req.params.id, { ...req.body, id: uuidv4() }, req.user.id);
  if (member) {
    broadcast('leads:delete', { id: req.params.id });
    broadcast('members:update', member);
  }
  res.json({ success: !!member, data: member });
});

// ============================================================================
// MEMBERSHIP PLANS ROUTES
// ============================================================================

app.get('/api/plans', authMiddleware, async (req, res) => {
  const data = await db.getPlans(req.user.id);
  res.json({ success: true, data });
});

app.post('/api/plans', authMiddleware, async (req, res) => {
  const plan = await db.addPlan({ ...req.body, id: uuidv4() }, req.user.id);
  broadcast('plans:update', plan);
  res.status(201).json({ success: true, data: plan });
});

app.put('/api/plans/:id', authMiddleware, async (req, res) => {
  const plan = await db.updatePlan(req.params.id, req.body, req.user.id);
  if (plan) broadcast('plans:update', plan);
  res.json({ success: !!plan, data: plan });
});

app.delete('/api/plans/:id', authMiddleware, async (req, res) => {
  const success = await db.deletePlan(req.params.id, req.user.id);
  if (success) broadcast('plans:delete', { id: req.params.id });
  res.json({ success });
});

// ============================================================================
// SETTINGS API
// ============================================================================

app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const data = await db.getSettings ? await db.getSettings(req.user.id) : { gymName: 'GymFlow' };
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const data = await db.updateSettings ? await db.updateSettings(req.body, req.user.id) : req.body;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.post('/api/settings', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const data = await db.updateSettings ? await db.updateSettings(req.body, req.user.id) : req.body;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================================================
// BRANCHES API
// ============================================================================

app.get('/api/branches', authMiddleware, async (req, res) => {
  try {
    const data = await db.getBranches(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

app.post('/api/branches', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const branch = await db.addBranch(req.body, req.user.id);
    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

app.put('/api/branches/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    const branch = await db.updateBranch(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: branch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

app.delete('/api/branches/:id', authMiddleware, authorizeRoles(['admin', 'ceo', 'cto']), async (req, res) => {
  try {
    await db.deleteBranch(req.params.id, req.user.id);
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
    const trainerId = req.user.role === 'trainer' ? req.user.id : null;
    let data;
    
    switch(type) {
      case 'member-summary':
      case 'expiring-members':
        data = await db.getMembers(req.user.id, trainerId);
        break;
      case 'revenue':
        // Double check permissions for revenue report
        if (req.user.role === 'trainer') return res.status(403).json({ error: 'Access denied' });
        data = await db.getInvoices(req.user.id);
        break;
      case 'attendance':
        data = await db.getAttendance({}, req.user.id, trainerId);
        break;
      case 'class-utilization':
        data = await db.getClasses(req.user.id, trainerId);
        break;
      case 'equipment-status':
        data = await db.getInventory(req.user.id);
        break;
      case 'leads-conversion':
        if (req.user.role === 'trainer') return res.status(403).json({ error: 'Access denied' });
        data = await db.getLeads(req.user.id);
        break;
      case 'staff-performance':
        if (req.user.role === 'trainer') return res.status(403).json({ error: 'Access denied' });
        data = await db.getStaff(req.user.id);
        break;
      default:
        data = await db.getDashboardStats(req.user.id, trainerId);
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

    const feedback = await db.addFeedback({
      id: uuidv4(),
      category,
      title,
      details,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      createdAt: new Date().toISOString(),
      status: 'new'
    }, req.user.id);

    broadcast('feedback:new', feedback);
    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.get('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const data = await db.getFeedback(req.user.id);
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

    const data = await db.getActivityLogs(filters);
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
      gymId: 'gym-001'
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

    const campaign = await db.createCampaign({
      id: uuidv4(),
      userId: req.user.id,
      title,
      description,
      target_audience: targetAudience,
      message,
      status: 'draft',
      scheduled_date: scheduledDate,
      createdAt: new Date().toISOString()
    }, req.user.id);

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
    const campaigns = await db.getCampaigns(req.user.id);
    res.json({ success: true, data: campaigns });
  } catch (err) {
    console.error('Fetch campaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.put('/api/campaigns/:id', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await db.updateCampaign(id, req.body, req.user.id);
    
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
    const deleted = await db.deleteCampaign(id, req.user.id);
    
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
    const reminders = await db.getReminders(req.user.id);
    const stats = await db.getReminderStats(req.user.id);
    res.json({ success: true, data: reminders, stats });
  } catch (err) {
    console.error('Fetch reminders error:', err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

app.post('/api/campaigns/:id/send', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await db.getCampaigns(req.user.id);
    const targetCampaign = campaign.find(c => c.id === id);
    
    if (!targetCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Create reminders for all members
    const members = await db.getMembers();
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
      }, req.user.id);
      reminderCount++;
    }

    // Update campaign status
    await db.updateCampaign(id, { status: 'sent' }, req.user.id);

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

app.get('/api/invites/:token/verify', async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await db.getInviteByToken(token);
    
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found or expired' });
    }

    res.json({ success: true, data: { email: invite.email, invitedBy: invite.inviter_name } });
  } catch (err) {
    console.error('Verify invite error:', err);
    res.status(500).json({ error: 'Failed to verify invite' });
  }
});

app.post('/api/auth/signup-invite', async (req, res) => {
  try {
    const { email, password, name, token } = req.body || {}

    if (!email || !password || !name || !token) {
      return res.status(400).json({ error: 'Email, password, name, and token are required' })
    }

    // Verify invite token
    const invite = await db.getInviteByToken(token)
    if (!invite) return res.status(401).json({ error: 'Invalid or expired invite' })

    if (invite.email !== email) return res.status(401).json({ error: 'Email does not match invite' })

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email)
    if (existingUser) return res.status(409).json({ error: 'User already exists' })

    // Create new user
    const userId = uuidv4()
    const newUser = await db.createUser({
      id: userId,
      email,
      password,
      name,
      role: 'staff',
      gymId: invite.gym_id || invite.gymId || 'gym-001',
    })

    // Accept the invite and log activity
    await db.acceptInvite(token, userId)
    await db.logActivity(
      userId,
      name,
      'create',
      'user',
      userId,
      email,
      'Registered via invite'
    )

    // Generate tokens
    const accessToken = generateToken(newUser)
    const refreshToken = generateRefreshToken(newUser)

    broadcast('user:registered', { email, name })

    return res.json({
      success: true,
      data: {
        user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
        accessToken,
        refreshToken,
      },
    })
  } catch (err) {
    console.error('Signup via invite error:', err)
    return res.status(500).json({ error: 'Failed to complete signup' })
  }
})

app.delete('/api/invites/:id', authMiddleware, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteInvite(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Invite not found' });
    }
  // ============================================================================
    await db.logActivity(
      req.user.id,
      req.user.name || req.user.email,
      'delete',
      'invite',
      id,
      '',
      'Deleted invite'
    );
  // AUTO-EXPIRY JOB
    broadcast('invite:deleted', { inviteId: id });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete invite error:', err);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});
  // ============================================================================
async function startServer() {
  if (db.init) await db.init();
  const AUTO_EXPIRY_INTERVAL = 60 * 60 * 1000; // 1 hour

  const runAutoExpiryJob = async () => {
    try {
      console.log('🔄 Running auto-expiry job...');
      const today = new Date().toISOString().split('T')[0];

      // Get all members
      const allMembers = await db.getMembers();

      if (!allMembers || allMembers.length === 0) {
        console.log('✓ No members to check');
        return;
      }

      // Find expired members
      let expiredCount = 0;
      for (const member of allMembers) {
        if (member.status === 'active' && member.expiry_date && member.expiry_date < today) {
          // Mark as expired
          await db.updateMember(member.id, { status: 'expired' });
          expiredCount++;

          // Log the expiry activity
          await db.logActivity(
            'system',
            'System',
            'update',
            'member',
            member.id,
            member.name,
            `Membership expired on ${member.expiry_date}`
          );

          // Broadcast expiry event for real-time UI update
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

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => console.error('Startup error:', err));
