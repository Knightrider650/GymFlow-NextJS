const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Database Engine - PostgreSQL Implementation
 */
const db = {
  isReady: () => pool.connect().then(() => true).catch(() => false),

  async init() {
    console.log('✓ Initializing PostgreSQL database...');
    // Create tables if they don't exist
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS members (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        branch_id UUID,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        dob DATE,
        address TEXT,
        membership_type TEXT,
        status TEXT DEFAULT 'active',
        join_date DATE DEFAULT CURRENT_DATE,
        expiry_date DATE,
        emergency_contact JSONB,
        assigned_trainer_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        name TEXT NOT NULL,
        category TEXT,
        quantity INTEGER DEFAULT 0,
        min_threshold INTEGER DEFAULT 5,
        cost_per_unit NUMERIC(10, 2),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        member_id UUID REFERENCES members(id) ON DELETE CASCADE,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        check_out_time TIMESTAMP,
        notes TEXT,
        recorded_date DATE DEFAULT CURRENT_DATE
      );

      CREATE TABLE IF NOT EXISTS billing (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        member_id UUID REFERENCES members(id) ON DELETE CASCADE,
        invoice_number TEXT,
        subtotal NUMERIC(10, 2) DEFAULT 0,
        tax_amount NUMERIC(10, 2) DEFAULT 0,
        amount NUMERIC(10, 2) NOT NULL,
        status TEXT DEFAULT 'pending',
        description TEXT,
        invoice_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        payment_method TEXT,
        payment_date TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        branch_id UUID,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        position TEXT,
        salary NUMERIC(10, 2),
        status TEXT DEFAULT 'active',
        join_date DATE DEFAULT CURRENT_DATE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        branch_id UUID REFERENCES branches(id),
        name TEXT NOT NULL,
        instructor_name TEXT,
        max_capacity INTEGER,
        current_enrollment INTEGER DEFAULT 0,
        instructor_id UUID REFERENCES users(id),
        time TEXT,
        days TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        owner_id UUID PRIMARY KEY REFERENCES users(id),
        gym_name TEXT,
        currency TEXT,
        tax_rate NUMERIC(4, 2),
        enable_notifications BOOLEAN DEFAULT TRUE,
        config JSONB DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS branches (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        opening_time TEXT,
        closing_time TEXT,
        capacity INTEGER,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'New',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        name TEXT NOT NULL,
        price NUMERIC(10, 2),
        duration_months INTEGER DEFAULT 1,
        duration_days INTEGER,
        features TEXT[]
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        member_id UUID REFERENCES members(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, attended, no-show
        booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY,
        owner_id UUID,
        user_id UUID,
        title TEXT NOT NULL,
        description TEXT,
        target_audience TEXT DEFAULT 'All Members',
        message TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        scheduled_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id UUID PRIMARY KEY,
        owner_id UUID,
        user_id UUID,
        campaign_id UUID,
        recipient_id UUID,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invites (
        id UUID PRIMARY KEY,
        tenant_id UUID,
        email TEXT NOT NULL,
        token TEXT NOT NULL,
        inviter_id UUID,
        inviter_name TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        accepted_at TIMESTAMP
      );
    `;

    try {
      await pool.query(schema);

      // Schema Migrations - Ensure new columns exist in existing tables
      const migrations = [
        // Members table
        "ALTER TABLE members ADD COLUMN IF NOT EXISTS branch_id UUID;",
        "ALTER TABLE members ADD COLUMN IF NOT EXISTS dob DATE;",
        // Staff table
        "ALTER TABLE staff ADD COLUMN IF NOT EXISTS branch_id UUID;",
        // Billing table
        "ALTER TABLE billing ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) DEFAULT 0;",
        "ALTER TABLE billing ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0;",
        // Classes table
        "ALTER TABLE classes ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);",
        "ALTER TABLE classes ADD COLUMN IF NOT EXISTS time TEXT;",
        "ALTER TABLE classes ADD COLUMN IF NOT EXISTS days TEXT;",
        // Settings table
        "ALTER TABLE settings ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';",
        // Plans table
        "ALTER TABLE plans ADD COLUMN IF NOT EXISTS duration_days INTEGER;",
        "ALTER TABLE plans ADD COLUMN IF NOT EXISTS features TEXT[];"
      ];

      for (const migration of migrations) {
        try {
          await pool.query(migration);
        } catch (e) {
          console.warn(`Migration skipped or failed: ${migration}`, e.message);
        }
      }

      console.log('✓ PostgreSQL schema synchronized.');
    } catch (err) {
      console.error('✗ Database initialization failed:', err);
      throw err;
    }
  },

  // Auth Methods
  async getUserByEmail(email) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
  },

  async getUserById(id) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  },

  async createUser(user) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    const res = await pool.query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.id, user.email, hash, user.name, user.role]
    );
    return res.rows[0];
  },

  // Member Methods
  async getMembers(ownerId, trainerId = null) {
    let query = 'SELECT * FROM members WHERE owner_id = $1';
    const params = [ownerId];
    
    if (trainerId) {
      query += ' AND assigned_trainer_id = $2';
      params.push(trainerId);
    }
    
    query += ' ORDER BY name';
    const res = await pool.query(query, params);
    return res.rows;
  },

  async addMember(member, ownerId) {
    const branchId = member.branchId || member.branch_id || null;
    const res = await pool.query(
      'INSERT INTO members (id, owner_id, name, email, phone, membership_type, status, join_date, expiry_date, branch_id, dob) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [member.id, ownerId, member.name, member.email, member.phone, member.membershipType || member.membership_type, member.status, member.joinDate || member.join_date, member.expiryDate || member.expiry_date, branchId, member.dob || null]
    );
    return res.rows[0];
  },
  
  async bulkAddMembers(membersArray, ownerId) {
    // Basic iterative strategy for PostgreSQL bulk insert compatibility
    const inserted = [];
    for (const member of membersArray) {
      const branchId = member.branchId || member.branch_id || null;
      const res = await pool.query(
        'INSERT INTO members (id, owner_id, name, email, phone, membership_type, status, join_date, expiry_date, branch_id, dob) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [member.id, ownerId, member.name, member.email, member.phone, member.membershipType || member.membership_type, member.status, member.joinDate || member.join_date, member.expiryDate || member.expiry_date, branchId, member.dob || null]
      );
      inserted.push(res.rows[0]);
    }
    return inserted;
  },
 
  async updateMember(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
 
    const propMap = {
      name: 'name', email: 'email', phone: 'phone', address: 'address',
      membershipType: 'membership_type', membership_type: 'membership_type',
      status: 'status', joinDate: 'join_date', join_date: 'join_date',
      expiryDate: 'expiry_date', expiry_date: 'expiry_date',
      branchId: 'branch_id', branch_id: 'branch_id', dob: 'dob'
    };
 
    for (const [key, value] of Object.entries(patch)) {
      if (propMap[key] !== undefined) {
        fields.push(`${propMap[key]} = $${idx}`);
        values.push(value);
        idx++;
      } else if (key === 'emergencyContact') {
        fields.push(`emergency_contact = $${idx}`);
        values.push(JSON.stringify({ name: patch.emergencyContact, phone: patch.emergencyPhone }));
        idx++;
      }
    }
 
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    const query = `UPDATE members SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`;
    const res = await pool.query(query, values);
    return res.rows[0];
  },

  async deleteMember(id, ownerId) {
    const res = await pool.query('DELETE FROM members WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Staff Methods
  async getStaff(ownerId) {
    const res = await pool.query('SELECT * FROM staff WHERE owner_id = $1', [ownerId]);
    return res.rows;
  },
  
  async addStaff(member, ownerId) {
    const branchId = member.branchId || member.branch_id || null;
    const res = await pool.query(
      'INSERT INTO staff (id, owner_id, name, email, phone, position, salary, status, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [member.id, ownerId, member.name, member.email, member.phone, member.position, member.salary, member.status || 'active', branchId]
    );
    return res.rows[0];
  },

  async updateStaff(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    const propMap = {
      name: 'name', email: 'email', phone: 'phone', position: 'position',
      salary: 'salary', status: 'status', branchId: 'branch_id', branch_id: 'branch_id'
    };

    for (const [key, value] of Object.entries(patch)) {
      if (propMap[key] !== undefined) {
        fields.push(`${propMap[key]} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    const res = await pool.query(`UPDATE staff SET ${fields.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`, values);
    return res.rows[0];
  },

  async deleteStaff(id, ownerId) {
    const res = await pool.query('DELETE FROM staff WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Inventory Methods
  async getInventory(ownerId) {
    const res = await pool.query('SELECT * FROM inventory WHERE owner_id = $1', [ownerId]);
    return res.rows;
  },

  async addInventoryItem(item, ownerId) {
    const res = await pool.query(
      'INSERT INTO inventory (id, owner_id, name, category, quantity, min_threshold, cost_per_unit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [item.id, ownerId, item.name, item.category, item.quantity, item.minThreshold || item.min_threshold, item.costPerUnit || item.cost_per_unit]
    );
    return res.rows[0];
  },

  async updateInventoryItem(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowed = { name: 'name', category: 'category', quantity: 'quantity', minThreshold: 'min_threshold', costPerUnit: 'cost_per_unit' };

    for (const [key, value] of Object.entries(patch)) {
      if (allowed[key]) {
        fields.push(`${allowed[key]} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    const res = await pool.query(`UPDATE inventory SET ${fields.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`, values);
    return res.rows[0];
  },

  async deleteInventoryItem(id, ownerId) {
    const res = await pool.query('DELETE FROM inventory WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Attendance Methods
  async getAttendance(filters, ownerId, trainerId = null) {
    let query = `
      SELECT a.*, m.name as member_name 
      FROM attendance a 
      JOIN members m ON a.member_id = m.id 
      WHERE a.owner_id = $1
    `;
    const params = [ownerId];
    
    if (trainerId) {
      query += ' AND m.assigned_trainer_id = $2';
      params.push(trainerId);
    }
    
    query += ' ORDER BY a.check_in_time DESC Limit 100';
    
    const res = await pool.query(query, params);
    return res.rows.map(r => ({ ...r, memberName: r.member_name }));
  },

  async checkIn(memberId, notes, ownerId) {
    // 1. Fetch settings to see enforcement rules
    const settings = await this.getSettings(ownerId);
    const rules = settings.config?.membershipRules || {};
    const attendanceRules = settings.config?.attendanceRules || {};

    // 2. Fetch member details
    const memberRes = await pool.query('SELECT * FROM members WHERE id = $1 AND owner_id = $2', [memberId, ownerId]);
    if (memberRes.rows.length === 0) throw new Error('Member not found');
    const member = memberRes.rows[0];

    // 3. Enforce Expiry Rule
    if (rules.blockExpiredCheckIn) {
      const today = new Date().toISOString().split('T')[0];
      const expiryDate = member.expiry_date ? new Date(member.expiry_date).toISOString().split('T')[0] : null;
      
      if (!expiryDate || expiryDate < today) {
        // Check grace period if applicable
        const graceDays = rules.renewalGracePeriod || 0;
        const graceExpiry = new Date(member.expiry_date || 0);
        graceExpiry.setDate(graceExpiry.getDate() + graceDays);
        
        if (graceExpiry < new Date()) {
          throw new Error('Check-in blocked: Membership expired');
        }
      }
    }

    // 4. Enforce Daily Limit Rule
    if (attendanceRules.maxCheckInsPerDay) {
      const today = new Date().toISOString().split('T')[0];
      const countRes = await pool.query(
        'SELECT COUNT(*) FROM attendance WHERE member_id = $1 AND recorded_date = $2',
        [memberId, today]
      );
      const count = parseInt(countRes.rows[0].count);
      if (count >= attendanceRules.maxCheckInsPerDay) {
        throw new Error(`Check-in blocked: Daily limit of ${attendanceRules.maxCheckInsPerDay} reached`);
      }
    }

    // 5. Perform Check-in
    const res = await pool.query(
      'INSERT INTO attendance (id, owner_id, member_id, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [uuidv4(), ownerId, memberId, notes]
    );
    return res.rows[0];
  },

  async checkOut(id, ownerId) {
    const res = await pool.query(
      'UPDATE attendance SET check_out_time = CURRENT_TIMESTAMP WHERE id = $1 AND owner_id = $2 RETURNING *',
      [id, ownerId]
    );
    return res.rows[0];
  },

  // Invoices & Billing
  async getInvoices(ownerId) {
    const res = await pool.query(`
      SELECT b.*, m.name as member_name 
      FROM billing b 
      JOIN members m ON b.member_id = m.id 
      WHERE b.owner_id = $1
      ORDER BY b.invoice_date DESC
    `, [ownerId]);
    return res.rows.map(row => ({ 
    ...row, 
    memberName: row.member_name,
    paymentDate: row.payment_date 
  }));
  },

  async addInvoice(invoice, ownerId) {
    // 1. Fetch billing settings
    const settings = await this.getSettings(ownerId);
    const billingRules = settings.config?.billing || {};
    
    // 2. Auto-calculate Tax
    let subtotal = parseFloat(invoice.amount);
    let taxRate = billingRules.defaultTaxRate || 0;
    let taxAmount = subtotal * (taxRate / 100);
    let totalAmount = subtotal + taxAmount;

    // 3. Auto-generate Invoice Number
    let invoiceNumber = invoice.invoiceNumber || invoice.invoice_number;
    if (!invoiceNumber) {
      const prefix = billingRules.invoicePrefix || 'GF';
      const countRes = await pool.query('SELECT COUNT(*) FROM billing WHERE owner_id = $1', [ownerId]);
      const nextNum = parseInt(countRes.rows[0].count) + 1;
      invoiceNumber = `${prefix}-${nextNum.toString().padStart(5, '0')}`;
    }

    // 4. Auto-calculate Due Date
    let dueDate = invoice.dueDate || invoice.due_date;
    if (!dueDate) {
      const days = billingRules.defaultPaymentDueDays || 7;
      const date = new Date();
      date.setDate(date.getDate() + days);
      dueDate = date.toISOString().split('T')[0];
    }

    const res = await pool.query(
      'INSERT INTO billing (id, owner_id, member_id, invoice_number, subtotal, tax_amount, amount, description, status, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [invoice.id || uuidv4(), ownerId, invoice.memberId, invoiceNumber, subtotal, taxAmount, totalAmount, invoice.description, invoice.status || 'pending', dueDate]
    );
    return res.rows[0];
  },

  async payInvoice(id, paymentData, ownerId) {
    const res = await pool.query(
      'UPDATE billing SET status = $1, payment_method = $2, payment_date = CURRENT_TIMESTAMP WHERE id = $3 AND owner_id = $4 RETURNING *',
      ['paid', paymentData.method, id, ownerId]
    );
    return res.rows[0];
  },

  async updateInvoice(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowed = ['amount', 'description', 'status', 'due_date'];

    for (const [key, value] of Object.entries(patch)) {
      if (allowed.includes(key) || key === 'dueDate') {
        const col = key === 'dueDate' ? 'due_date' : key;
        fields.push(`${col} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    const res = await pool.query(`UPDATE billing SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`, values);
    return res.rows[0];
  },

  async deleteInvoice(id, ownerId) {
    const res = await pool.query('DELETE FROM billing WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Classes Methods
  async getClasses(ownerId, instructorId = null) {
    let query = 'SELECT * FROM classes WHERE owner_id = $1';
    const params = [ownerId];
    
    if (instructorId) {
      query += ' AND instructor_id = $2';
      params.push(instructorId);
    }
    
    const res = await pool.query(query, params);
    return res.rows;
  },

  async addClass(cls, ownerId) {
    const branchId = cls.branchId || cls.branch_id || null;
    const res = await pool.query(
      'INSERT INTO classes (id, owner_id, name, instructor_name, max_capacity, description, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [cls.id, ownerId, cls.name, cls.instructorName, cls.maxCapacity, cls.description, branchId]
    );
    return res.rows[0];
  },

  async updateClass(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowed = { 
      name: 'name', 
      instructorName: 'instructor_name', 
      maxCapacity: 'max_capacity', 
      description: 'description',
      branchId: 'branch_id',
      branch_id: 'branch_id'
    };

    for (const [key, value] of Object.entries(patch)) {
      if (allowed[key]) {
        fields.push(`${allowed[key]} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    const query = `UPDATE classes SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`;
    const res = await pool.query(query, values);
    return res.rows[0];
  },

  async deleteClass(id, ownerId) {
    const res = await pool.query('DELETE FROM classes WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Booking Methods
  async getClassBookings(classId, ownerId) {
    const res = await pool.query(`
      SELECT b.*, m.name as member_name 
      FROM bookings b 
      JOIN members m ON b.member_id = m.id 
      WHERE b.class_id = $1 AND b.owner_id = $2
      ORDER BY b.booked_at ASC
    `, [classId, ownerId]);
    return res.rows;
  },

  async bookClass(memberId, classId, ownerId) {
    // 1. Fetch settings and class details
    const settings = await this.getSettings(ownerId);
    const rules = settings.config?.classRules || {};
    
    const classRes = await pool.query('SELECT * FROM classes WHERE id = $1 AND owner_id = $2', [classId, ownerId]);
    if (classRes.rows.length === 0) throw new Error('Class not found');
    const cls = classRes.rows[0];

    // 2. Enforce Capacity
    if (cls.current_enrollment >= cls.max_capacity) {
      if (!rules.enableWaitlist) {
        throw new Error('Class is full');
      }
      // Waitlist logic would go here
    }

    // 3. Enforce Timing Rules (Lead time and Cutoff)
    // (Logic simplified for this implementation)
    
    // 4. Record Booking
    const bookingId = uuidv4();
    await pool.query(
      'INSERT INTO bookings (id, owner_id, class_id, member_id) VALUES ($1, $2, $3, $4)',
      [bookingId, ownerId, classId, memberId]
    );

    // 5. Update Enrollment
    await pool.query('UPDATE classes SET current_enrollment = current_enrollment + 1 WHERE id = $1', [classId]);
    
    return { id: bookingId, memberId, classId, status: 'confirmed' };
  },

  async cancelBooking(bookingId, ownerId) {
    // 1. Fetch booking to get classId
    const bookRes = await pool.query('SELECT * FROM bookings WHERE id = $1 AND owner_id = $2', [bookingId, ownerId]);
    if (bookRes.rows.length === 0) return false;
    const booking = bookRes.rows[0];

    // 2. Delete booking
    await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);

    // 3. Update Enrollment
    await pool.query('UPDATE classes SET current_enrollment = current_enrollment - 1 WHERE id = $1', [booking.class_id]);
    
    return true;
  },

  // Settings
  async getSettings(ownerId) {
    const res = await pool.query('SELECT * FROM settings WHERE owner_id = $1', [ownerId]);
    if (res.rows.length === 0) {
      const defaultSettings = { 
        gym_name: 'GymFlow Pro', 
        currency: 'INR', 
        tax_rate: 0.08, 
        enable_notifications: true,
        config: JSON.stringify({
          membershipRules: { defaultDuration: 30, renewalGracePeriod: 7, allowBackDatedRenewals: false, blockExpiredCheckIn: true },
          billing: { defaultTaxRate: 8, invoicePrefix: 'GF', autoGenerateInvoice: true },
          system: { timeZone: 'UTC', weekStartDay: 'Monday', itemsPerPage: 25 }
        })
      };
      await pool.query(
        'INSERT INTO settings (owner_id, gym_name, currency, tax_rate, config) VALUES ($1, $2, $3, $4, $5)',
        [ownerId, defaultSettings.gym_name, defaultSettings.currency, defaultSettings.tax_rate, defaultSettings.config]
      );
      return { ...defaultSettings, config: JSON.parse(defaultSettings.config) };
    }
    const row = res.rows[0];
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {})
    };
  },

  async updateSettings(patch, ownerId) {
    // Top-level columns in the settings table
    const columns = ['gym_name', 'currency', 'tax_rate', 'enable_notifications', 'config'];
    
    // Get current settings to handle config merging
    const currentRes = await pool.query('SELECT * FROM settings WHERE owner_id = $1', [ownerId]);
    if (currentRes.rows.length === 0) return null;
    const currentRow = currentRes.rows[0];
    let currentConfig = typeof currentRow.config === 'string' ? JSON.parse(currentRow.config) : (currentRow.config || {});

    const fields = [];
    const values = [];
    let idx = 1;
    let configChanged = false;

    for (const [key, value] of Object.entries(patch)) {
      const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      
      if (columns.includes(col) && col !== 'config') {
        fields.push(`${col} = $${idx}`);
        values.push(value);
        idx++;
      } else if (key === 'config') {
        // Direct config update
        const newConfig = typeof value === 'string' ? JSON.parse(value) : value;
        currentConfig = { ...currentConfig, ...newConfig };
        configChanged = true;
      } else {
        // Sub-settings like membershipRules, billing, etc.
        currentConfig[key] = value;
        configChanged = true;
      }
    }

    if (configChanged) {
      fields.push(`config = $${idx}`);
      values.push(JSON.stringify(currentConfig));
      idx++;
    }

    if (fields.length === 0) return this.getSettings(ownerId);
    
    values.push(ownerId);
    const res = await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE owner_id = $${idx} RETURNING *`, values);
    const row = res.rows[0];
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {})
    };
  },

  // Branches
  async getBranches(ownerId) {
    const res = await pool.query('SELECT * FROM branches WHERE owner_id = $1 ORDER BY created_at ASC', [ownerId]);
    return res.rows;
  },

  async addBranch(branch, ownerId) {
    const id = uuidv4();
    const { name, address, phone, email, openingTime, closingTime, capacity, isDefault } = branch;
    await pool.query(
      'INSERT INTO branches (id, owner_id, name, address, phone, email, opening_time, closing_time, capacity, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [id, ownerId, name, address, phone, email, openingTime, closingTime, capacity, isDefault]
    );
    return { id, ...branch };
  },

  async updateBranch(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      fields.push(`${col} = $${idx}`);
      values.push(value);
      idx++;
    }
    values.push(id, ownerId);
    const res = await pool.query(`UPDATE branches SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx+1} RETURNING *`, values);
    return res.rows[0];
  },

  async deleteBranch(id, ownerId) {
    await pool.query('DELETE FROM branches WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return true;
  },

  // Notifications
  async getNotifications(ownerId) {
    const res = await pool.query('SELECT * FROM notifications WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
    return res.rows;
  },

  async markNotificationRead(id, ownerId) {
    const res = await pool.query('UPDATE notifications SET read = TRUE WHERE id = $1 AND owner_id = $2 RETURNING *', [id, ownerId]);
    return res.rows[0];
  },

  async addNotification(notification, ownerId) {
    const res = await pool.query(
      'INSERT INTO notifications (id, owner_id, title, message, type, read) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [uuidv4(), ownerId, notification.title, notification.message, notification.type || 'info', false]
    );
    return res.rows[0];
  },

  // Leads (CRM)
  async getLeads(ownerId) {
    const res = await pool.query('SELECT * FROM leads WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
    return res.rows;
  },

  async addLead(lead, ownerId) {
    const res = await pool.query(
      'INSERT INTO leads (id, owner_id, name, email, phone, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [lead.id, ownerId, lead.name, lead.email, lead.phone, lead.status || 'New', lead.notes]
    );
    return res.rows[0];
  },

  async updateLead(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      if (['name', 'email', 'phone', 'status', 'notes'].includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    const res = await pool.query(`UPDATE leads SET ${fields.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`, values);
    return res.rows[0];
  },

  async deleteLead(id, ownerId) {
    const res = await pool.query('DELETE FROM leads WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  async convertLead(id, newMemberData, ownerId) {
    const lead = await this.updateLead(id, { status: 'Converted' }, ownerId);
    if (!lead) return null;
    return await this.addMember(newMemberData, ownerId);
  },

  // Membership Plans
  async getPlans(ownerId) {
    const res = await pool.query('SELECT * FROM plans WHERE owner_id = $1 ORDER BY price ASC', [ownerId]);
    return res.rows.map(row => {
      let mappedFeatures = '';
      if (Array.isArray(row.features)) {
        mappedFeatures = row.features.join(', ');
      } else if (typeof row.features === 'string') {
        mappedFeatures = row.features;
      }
      return {
        ...row,
        durationMonths: row.duration_months,
        durationDays: row.duration_days,
        features: mappedFeatures
      };
    });
  },

  async addPlan(plan, ownerId) {
    let featuresArray = [];
    if (typeof plan.features === 'string') {
      featuresArray = plan.features.split(',').map(f => f.trim()).filter(Boolean);
    } else if (Array.isArray(plan.features)) {
      featuresArray = plan.features;
    }

    const res = await pool.query(
      'INSERT INTO plans (id, owner_id, name, price, duration_months, duration_days, features) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        plan.id,
        ownerId,
        plan.name,
        plan.price,
        plan.durationMonths !== undefined ? plan.durationMonths : plan.duration_months,
        plan.durationDays !== undefined ? plan.durationDays : plan.duration_days,
        featuresArray
      ]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      durationMonths: row.duration_months,
      durationDays: row.duration_days,
      features: Array.isArray(row.features) ? row.features.join(', ') : (row.features || '')
    };
  },

  async updatePlan(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    
    const allowed = {
      name: 'name',
      price: 'price',
      durationMonths: 'duration_months',
      duration_months: 'duration_months',
      durationDays: 'duration_days',
      duration_days: 'duration_days',
      features: 'features'
    };

    for (const [key, value] of Object.entries(patch)) {
      const col = allowed[key];
      if (col) {
        fields.push(`${col} = $${idx}`);
        if (col === 'features') {
          let featuresArray = [];
          if (typeof value === 'string') {
            featuresArray = value.split(',').map(f => f.trim()).filter(Boolean);
          } else if (Array.isArray(value)) {
            featuresArray = value;
          }
          values.push(featuresArray);
        } else {
          values.push(value);
        }
        idx++;
      }
    }
    
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    
    const res = await pool.query(
      `UPDATE plans SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`,
      values
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      durationMonths: row.duration_months,
      durationDays: row.duration_days,
      features: Array.isArray(row.features) ? row.features.join(', ') : (row.features || '')
    };
  },

  async deletePlan(id, ownerId) {
    const res = await pool.query('DELETE FROM plans WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Campaigns & Reminders
  async getCampaigns(ownerId) {
    let query = 'SELECT * FROM campaigns';
    const params = [];
    if (ownerId) {
      query += ' WHERE owner_id = $1';
      params.push(ownerId);
    }
    query += ' ORDER BY created_at DESC';
    const res = await pool.query(query, params);
    return res.rows.map(row => ({
      ...row,
      createdAt: row.created_at,
      targetAudience: row.target_audience,
      scheduledDate: row.scheduled_date
    }));
  },

  async createCampaign(campaign, ownerId) {
    const res = await pool.query(
      'INSERT INTO campaigns (id, owner_id, user_id, title, description, target_audience, message, status, scheduled_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        campaign.id,
        ownerId,
        campaign.userId || campaign.user_id,
        campaign.title,
        campaign.description,
        campaign.target_audience || campaign.targetAudience,
        campaign.message,
        campaign.status || 'draft',
        campaign.scheduled_date || campaign.scheduledDate,
        campaign.createdAt || new Date()
      ]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      createdAt: row.created_at,
      targetAudience: row.target_audience,
      scheduledDate: row.scheduled_date
    };
  },

  async updateCampaign(id, updates, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = {
      title: 'title',
      description: 'description',
      target_audience: 'target_audience',
      targetAudience: 'target_audience',
      message: 'message',
      status: 'status',
      scheduled_date: 'scheduled_date',
      scheduledDate: 'scheduled_date'
    };

    for (const [key, value] of Object.entries(updates)) {
      const col = allowed[key];
      if (col) {
        fields.push(`${col} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);

    const res = await pool.query(
      `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`,
      values
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      createdAt: row.created_at,
      targetAudience: row.target_audience,
      scheduledDate: row.scheduled_date
    };
  },

  async deleteCampaign(id, ownerId) {
    const res = await pool.query('DELETE FROM campaigns WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  async createReminder(reminder, ownerId) {
    const res = await pool.query(
      'INSERT INTO reminders (id, owner_id, user_id, recipient_id, message, status, sent_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        reminder.id,
        ownerId,
        reminder.user_id || reminder.userId,
        reminder.recipient_id || reminder.recipientId,
        reminder.message,
        reminder.status || 'pending',
        reminder.sent_at || reminder.sentAt || new Date(),
        reminder.createdAt || new Date()
      ]
    );
    return res.rows[0];
  },

  async getReminders(ownerId) {
    const res = await pool.query('SELECT * FROM reminders WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
    return res.rows.map(row => ({
      ...row,
      createdAt: row.created_at,
      sentAt: row.sent_at
    }));
  },

  async getReminderStats(ownerId) {
    const totalRes = await pool.query('SELECT COUNT(*) FROM reminders WHERE owner_id = $1', [ownerId]);
    const sentRes = await pool.query("SELECT COUNT(*) FROM reminders WHERE owner_id = $1 AND status = 'sent'", [ownerId]);
    const pendingRes = await pool.query("SELECT COUNT(*) FROM reminders WHERE owner_id = $1 AND status = 'pending'", [ownerId]);
    const failedRes = await pool.query("SELECT COUNT(*) FROM reminders WHERE owner_id = $1 AND status = 'failed'", [ownerId]);

    return {
      total: parseInt(totalRes.rows[0].count || 0),
      sent: parseInt(sentRes.rows[0].count || 0),
      pending: parseInt(pendingRes.rows[0].count || 0),
      failed: parseInt(failedRes.rows[0].count || 0)
    };
  },

  // Invites
  async createInvite(invite) {
    const tenantId = invite.tenant_id || invite.tenantId || invite.gymId;
    const res = await pool.query(
      'INSERT INTO invites (id, tenant_id, email, token, inviter_id, inviter_name, status, created_at, expires_at, accepted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        invite.id || uuidv4(),
        tenantId,
        invite.email,
        invite.token,
        invite.inviter_id || invite.inviterId,
        invite.inviter_name || invite.inviterName,
        'pending',
        new Date(),
        invite.expires_at || invite.expiresAt,
        null
      ]
    );
    return res.rows[0];
  },

  async getInvites(filters = {}) {
    let query = 'SELECT * FROM invites WHERE 1=1';
    const params = [];
    let idx = 1;

    if (filters.tenantId) {
      query += ` AND tenant_id = $${idx}`;
      params.push(filters.tenantId);
      idx++;
    }
    if (filters.email) {
      query += ` AND email = $${idx}`;
      params.push(filters.email);
      idx++;
    }
    if (filters.status) {
      query += ` AND status = $${idx}`;
      params.push(filters.status);
      idx++;
    }
    if (filters.token) {
      query += ` AND token = $${idx}`;
      params.push(filters.token);
      idx++;
    }

    query += ' ORDER BY created_at DESC';
    const res = await pool.query(query, params);
    return res.rows;
  },

  async getInviteByToken(token) {
    const res = await pool.query("SELECT * FROM invites WHERE token = $1 AND status = 'pending'", [token]);
    return res.rows[0] || null;
  },

  async verifyInvite(token) {
    return this.getInviteByToken(token);
  },

  async updateInvite(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['email', 'token', 'status', 'expires_at', 'accepted_at'].includes(key) || key === 'expiresAt' || key === 'acceptedAt') {
        const col = key === 'expiresAt' ? 'expires_at' : (key === 'acceptedAt' ? 'accepted_at' : key);
        fields.push(`${col} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return null;
    values.push(id);

    const res = await pool.query(
      `UPDATE invites SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return res.rows[0] || null;
  },

  async acceptInvite(token, userId) {
    const res = await pool.query(
      "UPDATE invites SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE token = $1 RETURNING *",
      [token]
    );
    return res.rows[0] || null;
  },

  async deleteInvite(id) {
    const res = await pool.query('DELETE FROM invites WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  },

  // Dashboard Stats
  async getDashboardStats(ownerId, trainerId = null) {
    const memberWhere = trainerId ? 'AND assigned_trainer_id = $3' : '';
    const params = [ownerId, 'active'];
    if (trainerId) params.push(trainerId);

    const activeMembersRes = await pool.query(`SELECT COUNT(*) as count FROM members WHERE owner_id = $1 AND status = $2 ${memberWhere}`, params);
    const totalMembersRes = await pool.query(`SELECT COUNT(*) as count FROM members WHERE owner_id = $1 ${trainerId ? 'AND assigned_trainer_id = $2' : ''}`, trainerId ? [ownerId, trainerId] : [ownerId]);
    
    const today = new Date().toISOString().split('T')[0];
    const attendanceWhere = trainerId ? 'AND m.assigned_trainer_id = $3' : '';
    const attendanceParams = [ownerId, today];
    if (trainerId) attendanceParams.push(trainerId);

    const todayVisitsRes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM attendance a
      JOIN members m ON a.member_id = m.id
      WHERE a.owner_id = $1 AND a.recorded_date = $2 ${attendanceWhere}
    `, attendanceParams);

    const pendingPaymentsRes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM billing b
      JOIN members m ON b.member_id = m.id
      WHERE b.owner_id = $1 AND b.status = 'pending' ${trainerId ? 'AND m.assigned_trainer_id = $2' : ''}
    `, trainerId ? [ownerId, trainerId] : [ownerId]);

    // Revenue calculations (only for non-trainers)
    let todayRevenue = 0;
    let monthlyRevenue = 0;
    
    if (!trainerId) {
      const todayRevenueRes = await pool.query(`
        SELECT SUM(amount) as sum FROM billing 
        WHERE owner_id = $1 AND status = 'paid' AND payment_date >= CURRENT_DATE
      `, [ownerId]);
      
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthlyRevenueRes = await pool.query(`
        SELECT SUM(amount) as sum FROM billing 
        WHERE owner_id = $1 AND status = 'paid' AND payment_date >= $2
      `, [ownerId, monthStart.toISOString().split('T')[0]]);
      
      todayRevenue = parseFloat(todayRevenueRes.rows[0].sum || 0);
      monthlyRevenue = parseFloat(monthlyRevenueRes.rows[0].sum || 0);
    }

    return {
      activeMembers: parseInt(activeMembersRes.rows[0].count),
      totalMembers: parseInt(totalMembersRes.rows[0].count),
      todayRevenue,
      monthlyRevenue,
      todayVisits: parseInt(todayVisitsRes.rows[0].count),
      pendingPayments: parseInt(pendingPaymentsRes.rows[0].count),
      revenueTrend: [], // Trend logic could be added here
      attendanceTrend: [],
      retention: '94%'
    };
  }
};

module.exports = db;
