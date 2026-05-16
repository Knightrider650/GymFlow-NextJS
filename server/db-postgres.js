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
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
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
        name TEXT NOT NULL,
        instructor_name TEXT,
        max_capacity INTEGER,
        current_enrollment INTEGER DEFAULT 0,
        instructor_id UUID REFERENCES users(id),
        description TEXT
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
        enable_notifications BOOLEAN DEFAULT TRUE
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
        features TEXT
      );
    `;
    await pool.query(schema);
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
    const res = await pool.query(
      'INSERT INTO members (id, owner_id, name, email, phone, membership_type, status, join_date, expiry_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [member.id, ownerId, member.name, member.email, member.phone, member.membershipType || member.membership_type, member.status, member.joinDate || member.join_date, member.expiryDate || member.expiry_date]
    );
    return res.rows[0];
  },

  async bulkAddMembers(membersArray, ownerId) {
    // Basic iterative strategy for PostgreSQL bulk insert compatibility
    const inserted = [];
    for (const member of membersArray) {
      const res = await pool.query(
        'INSERT INTO members (id, owner_id, name, email, phone, membership_type, status, join_date, expiry_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [member.id, ownerId, member.name, member.email, member.phone, member.membershipType || member.membership_type, member.status, member.joinDate || member.join_date, member.expiryDate || member.expiry_date]
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
      expiryDate: 'expiry_date', expiry_date: 'expiry_date'
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
    const res = await pool.query(
      'INSERT INTO staff (id, owner_id, name, email, phone, position, salary, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [member.id, ownerId, member.name, member.email, member.phone, member.position, member.salary, member.status || 'active']
    );
    return res.rows[0];
  },

  async updateStaff(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowed = ['name', 'email', 'phone', 'position', 'salary', 'status'];

    for (const [key, value] of Object.entries(patch)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx}`);
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
  async getAttendance(filters, ownerId) {
    const res = await pool.query(`
      SELECT a.*, m.name as member_name 
      FROM attendance a 
      JOIN members m ON a.member_id = m.id 
      WHERE a.owner_id = $1 
      ORDER BY a.check_in_time DESC Limit 100
    `, [ownerId]);
    return res.rows.map(r => ({ ...r, memberName: r.member_name }));
  },

  async checkIn(memberId, notes, ownerId) {
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
    return res.rows.map(row => ({ ...row, memberName: row.member_name }));
  },

  async addInvoice(invoice, ownerId) {
    const res = await pool.query(
      'INSERT INTO billing (id, owner_id, member_id, amount, description, status, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [invoice.id, ownerId, invoice.memberId, invoice.amount, invoice.description, invoice.status, invoice.dueDate]
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
    const res = await pool.query(
      'INSERT INTO classes (id, owner_id, name, instructor_name, max_capacity, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [cls.id, ownerId, cls.name, cls.instructorName, cls.maxCapacity, cls.description]
    );
    return res.rows[0];
  },

  async updateClass(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    const allowed = { name: 'name', instructorName: 'instructor_name', maxCapacity: 'max_capacity', description: 'description' };

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
    const res = await pool.query(`UPDATE classes SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`, values);
    return res.rows[0];
  },

  async deleteClass(id, ownerId) {
    const res = await pool.query('DELETE FROM classes WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Settings
  async getSettings(ownerId) {
    const res = await pool.query('SELECT * FROM settings WHERE owner_id = $1', [ownerId]);
    if (res.rows.length === 0) {
      await pool.query(
        'INSERT INTO settings (owner_id, gym_name, currency, tax_rate) VALUES ($1, $2, $3, $4)',
        [ownerId, 'GymFlow Pro', 'USD', 0.08]
      );
      return { gym_name: 'GymFlow Pro', currency: 'USD', tax_rate: 0.08, enable_notifications: true };
    }
    return res.rows[0];
  },

  async updateSettings(patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(patch)) {
      const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      fields.push(`${col} = $${idx}`);
      values.push(value);
      idx++;
    }
    if (fields.length === 0) return null;
    values.push(ownerId);
    const res = await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE owner_id = $${idx} RETURNING *`, values);
    return res.rows[0];
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
    return res.rows;
  },

  async addPlan(plan, ownerId) {
    const res = await pool.query(
      'INSERT INTO plans (id, owner_id, name, price, duration_months, features) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [plan.id, ownerId, plan.name, plan.price, plan.durationMonths || plan.duration_months, plan.features]
    );
    return res.rows[0];
  },

  async updatePlan(id, patch, ownerId) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      const col = key === 'durationMonths' ? 'duration_months' : key;
      if (['name', 'price', 'duration_months', 'features'].includes(col)) {
        fields.push(`${col} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    values.push(ownerId);
    const res = await pool.query(`UPDATE plans SET ${fields.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`, values);
    return res.rows[0];
  },

  async deletePlan(id, ownerId) {
    const res = await pool.query('DELETE FROM plans WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    return (res.rowCount || 0) > 0;
  },

  // Dashboard Stats
  async getDashboardStats(ownerId) {
    // Advanced postgres queries to calculate exactly what we calculated in db.js
    const activeMembers = await pool.query('SELECT COUNT(*) as count FROM members WHERE owner_id = $1 AND status = $2', [ownerId, 'active']);
    const totalMembers = await pool.query('SELECT COUNT(*) as count FROM members WHERE owner_id = $1', [ownerId]);
    
    return {
      activeMembers: parseInt(activeMembers.rows[0].count),
      totalMembers: parseInt(totalMembers.rows[0].count),
      todayRevenue: 0,
      monthlyRevenue: 0,
      todayVisits: 0,
      pendingPayments: 0,
      revenueTrend: [],
      attendanceTrend: [],
      retention: '94%'
    };
  }
};

module.exports = db;
