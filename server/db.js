const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const DATA_FILE = path.join(__dirname, 'data.json');

/**
 * Initial Seed Data
 */
const INITIAL_DATA = {
  users: [
    {
      id: 'admin-001',
      email: 'admin@gym.com',
      password_hash: '', // Will be hashed on init
      name: 'Gym Administrator',
      role: 'admin',
      gymId: 'gym-001',
      created_at: new Date().toISOString()
    }
  ],
  members: [
    { id: 'm-1', name: 'John Doe', email: 'john@example.com', phone: '555-0101', membership_type: 'Premium', status: 'active', join_date: '2023-11-01', expiry_date: '2024-11-01' },
    { id: 'm-2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', membership_type: 'Basic', status: 'active', join_date: '2023-12-15', expiry_date: '2024-06-15' }
  ],
  staff: [
    { id: 's-1', name: 'Mike Tyson', position: 'Head Trainer', salary: 5000, email: 'mike@gym.com', phone: '555-0201' },
    { id: 's-2', name: 'Sylvester Stallone', position: 'Floor Staff', salary: 3000, email: 'sly@gym.com', phone: '555-0202' }
  ],
  inventory: [
    { id: 'i-1', name: 'Dumbbell Set', category: 'Equipment', quantity: 15, min_threshold: 5, cost_per_unit: 120, last_updated: new Date().toISOString() },
    { id: 'i-2', name: 'Yoga Mats', category: 'Fitness Pros', quantity: 4, min_threshold: 10, cost_per_unit: 25, last_updated: new Date().toISOString() }
  ],
  attendance: [],
  billing: [],
  classes: [
    { id: 'c-1', name: 'Morning Yoga', instructorName: 'Mike Tyson', maxCapacity: 20, currentEnrollment: 12, description: 'Relaxing yoga session' },
    { id: 'c-2', name: 'Heavy HIIT', instructorName: 'Sylvester Stallone', maxCapacity: 15, currentEnrollment: 8, description: 'Intense interval training' }
  ],
  notifications: [
    { id: 'n-1', title: 'System Configured', message: 'Welcome to GymFlow Pro Edition.', read: false, createdAt: new Date().toISOString() }
  ],
  leads: [
    { id: 'l-1', name: 'John Doe Partner', email: 'johndoe+lead@example.com', phone: '123-456-7890', status: 'New', notes: 'Interested in Premium Trial', created_at: new Date().toISOString() }
  ],
  plans: [
    { id: 'p-1', name: 'Premium Plan', price: 99.99, durationMonths: 12, features: 'Full Access, Classes, Gym' },
    { id: 'p-2', name: 'Basic Plan', price: 49.99, durationMonths: 1, features: 'Gym Only' }
  ],
  feedback: [],
  activity_logs: [],
  campaigns: [],
  reminders: [],
  invites: [],
    gymName: 'GymFlow Pro',
    gymLogo: '',
    gymEmail: 'admin@gymflow.com',
    currency: 'USD',
    taxRate: 0.08,
    enableNotifications: true
  }
};

let data = { ...INITIAL_DATA };

/**
 * Database Engine - JSON Implementation
 */
const db = {
  isReady: () => true,

  async init() {
    try {
      const fileData = await fs.readFile(DATA_FILE, 'utf8');
      data = JSON.parse(fileData);
      console.log('✓ Local JSON database loaded');
    } catch (err) {
      console.log('ℹ Initializing new JSON database...');
      // Hash default admin password
      const salt = await bcrypt.genSalt(10);
      INITIAL_DATA.users[0].password_hash = await bcrypt.hash('password', salt);
      data = { ...INITIAL_DATA };
      await this.save();
    }
  },

  async save() {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  },

  // Auth Methods
  async getUserByEmail(email) {
    return data.users.find(u => u.email === email);
  },

  async getUserById(id) {
    return data.users.find(u => u.id === id);
  },

  async createUser(user) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(user.password, salt);
    delete user.password;
    data.users.push(user);
    await this.save();
    return user;
  },

  async getUsers() {
    // Return users without password hashes
    return data.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.created_at
    }));
  },

  async updateUser(id, updates) {
    const user = data.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    await this.save();
    return user;
  },

  async deleteUser(id) {
    const originalLength = data.users.length;
    data.users = data.users.filter(u => u.id !== id);
    if (data.users.length < originalLength) {
      await this.save();
      return true;
    }
    return false;
  },

  // Member Methods
  async getMembers(ownerId) {
    return data.members;
  },

  async addMember(member, ownerId) {
    data.members.push(member);
    await this.save();
    return member;
  },

  async updateMember(id, patch, ownerId) {
    const index = data.members.findIndex(m => m.id === id);
    if (index === -1) return null;
    data.members[index] = { ...data.members[index], ...patch };
    await this.save();
    return data.members[index];
  },

  async bulkAddMembers(membersArray, ownerId) {
    const newMembers = membersArray.map(m => ({ ...m, owner_id: ownerId }));
    data.members = [...data.members, ...newMembers];
    await this.save();
    return newMembers;
  },

  async deleteMember(id, ownerId) {
    const originalLength = data.members.length;
    data.members = data.members.filter(m => m.id !== id);
    await this.save();
    return data.members.length < originalLength;
  },

  // Staff Methods
  async getStaff(ownerId) {
    return data.staff;
  },

  async addStaff(member, ownerId) {
    data.staff.push(member);
    await this.save();
    return member;
  },

  async updateStaff(id, patch, ownerId) {
    const index = data.staff.findIndex(s => s.id === id);
    if (index === -1) return null;
    data.staff[index] = { ...data.staff[index], ...patch, last_updated: new Date().toISOString() };
    await this.save();
    return data.staff[index];
  },

  async deleteStaff(id, ownerId) {
    const originalLength = data.staff.length;
    data.staff = data.staff.filter(s => s.id !== id);
    await this.save();
    return data.staff.length < originalLength;
  },

  // Inventory Methods
  async getInventory(ownerId) {
    return data.inventory;
  },

  async addInventoryItem(item, ownerId) {
    data.inventory.push(item);
    await this.save();
    return item;
  },

  async updateInventoryItem(id, patch, ownerId) {
    const index = data.inventory.findIndex(i => i.id === id);
    if (index === -1) return null;
    data.inventory[index] = { ...data.inventory[index], ...patch };
    await this.save();
    return data.inventory[index];
  },

  async deleteInventoryItem(id, ownerId) {
    const originalLength = data.inventory.length;
    data.inventory = data.inventory.filter(i => i.id !== id);
    await this.save();
    return data.inventory.length < originalLength;
  },

  // Attendance Methods
  async getAttendance(filters, ownerId) {
    return data.attendance;
  },

  async checkIn(memberId, notes, ownerId) {
    const member = data.members.find(m => m.id === memberId);
    const record = {
      id: uuidv4(),
      memberId,
      memberName: member ? member.name : 'Unknown',
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      notes,
      recordedDate: new Date().toISOString().split('T')[0]
    };
    data.attendance.unshift(record);
    await this.save();
    return record;
  },

  async checkOut(id, ownerId) {
    const index = data.attendance.findIndex(a => a.id === id);
    if (index === -1) return null;
    data.attendance[index].checkOutTime = new Date().toISOString();
    await this.save();
    return data.attendance[index];
  },

  // Invoices & Billing
  async getInvoices(ownerId) {
    return data.billing;
  },

  async addInvoice(invoice, ownerId) {
    data.billing.push(invoice);
    await this.save();
    return invoice;
  },

  async payInvoice(id, paymentData, ownerId) {
    const index = data.billing.findIndex(i => i.id === id);
    if (index === -1) return null;
    data.billing[index].status = 'paid';
    data.billing[index].paymentMethod = paymentData.method;
    data.billing[index].paymentDate = new Date().toISOString();
    await this.save();
    return data.billing[index];
  },

  async updateInvoice(id, patch, ownerId) {
    const index = data.billing.findIndex(i => i.id === id);
    if (index === -1) return null;
    data.billing[index] = { ...data.billing[index], ...patch };
    await this.save();
    return data.billing[index];
  },

  async deleteInvoice(id, ownerId) {
    const originalLength = data.billing.length;
    data.billing = data.billing.filter(i => i.id !== id);
    await this.save();
    return data.billing.length < originalLength;
  },

  // Classes Methods
  async getClasses(ownerId) {
    return data.classes;
  },

  async addClass(cls, ownerId) {
    data.classes.push(cls);
    await this.save();
    return cls;
  },

  async updateClass(id, patch, ownerId) {
    const index = data.classes.findIndex(c => c.id === id);
    if (index === -1) return null;
    data.classes[index] = { ...data.classes[index], ...patch };
    await this.save();
    return data.classes[index];
  },

  async deleteClass(id, ownerId) {
    const originalLength = data.classes.length;
    data.classes = data.classes.filter(c => c.id !== id);
    await this.save();
    return data.classes.length < originalLength;
  },

  // Settings
  async getSettings(ownerId) {
    return data.settings;
  },

  async updateSettings(patch, ownerId) {
    data.settings = { ...data.settings, ...patch };
    await this.save();
    return data.settings;
  },

  // Notifications
  async getNotifications(ownerId) {
    return data.notifications;
  },

  async markNotificationRead(id, ownerId) {
    const index = data.notifications.findIndex(n => n.id === id);
    if (index === -1) return null;
    data.notifications[index].read = true;
    await this.save();
    return data.notifications[index];
  },

  // Leads (CRM)
  async getLeads(ownerId) {
    return data.leads || [];
  },

  async addLead(lead, ownerId) {
    if (!data.leads) data.leads = [];
    data.leads.push(lead);
    await this.save();
    return lead;
  },

  async updateLead(id, patch, ownerId) {
    if (!data.leads) data.leads = [];
    const index = data.leads.findIndex(l => l.id === id);
    if (index === -1) return null;
    data.leads[index] = { ...data.leads[index], ...patch, last_updated: new Date().toISOString() };
    await this.save();
    return data.leads[index];
  },

  async deleteLead(id, ownerId) {
    if (!data.leads) data.leads = [];
    const originalLength = data.leads.length;
    data.leads = data.leads.filter(l => l.id !== id);
    await this.save();
    return data.leads.length < originalLength;
  },

  async convertLead(id, newMemberData, ownerId) {
    // Moves lead from leads array to members array
    const lead = await this.updateLead(id, { status: 'Converted' }, ownerId);
    if (!lead) return null;
    const member = await this.addMember(newMemberData, ownerId);
    return member;
  },

  // Membership Plans
  async getPlans(ownerId) {
    return data.plans || [];
  },

  async addPlan(plan, ownerId) {
    if (!data.plans) data.plans = [];
    data.plans.push(plan);
    await this.save();
    return plan;
  },

  async updatePlan(id, patch, ownerId) {
    if (!data.plans) data.plans = [];
    const index = data.plans.findIndex(p => p.id === id);
    if (index === -1) return null;
    data.plans[index] = { ...data.plans[index], ...patch };
    await this.save();
    return data.plans[index];
  },

  async deletePlan(id, ownerId) {
    if (!data.plans) data.plans = [];
    const originalLength = data.plans.length;
    data.plans = data.plans.filter(p => p.id !== id);
    await this.save();
    return data.plans.length < originalLength;
  },

  // Dashboard Stats
  async getDashboardStats(ownerId) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const activeMembers = data.members.filter(m => m.status === 'active').length;
    const todayRevenue = data.billing
      .filter(i => i.status === 'paid' && i.paymentDate && i.paymentDate.startsWith(today))
      .reduce((sum, i) => sum + i.amount, 0);
      
    const monthlyRevenue = data.billing
      .filter(i => i.status === 'paid' && i.paymentDate && i.paymentDate >= monthStart)
      .reduce((sum, i) => sum + i.amount, 0);
      
    const todayVisits = data.attendance
      .filter(a => a.recordedDate === today)
      .length;
      
    const pendingPayments = data.billing
      .filter(i => i.status === 'pending' || i.status === 'overdue')
      .length;

    // Last 7 days Trends
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const revenueTrend = last7Days.map(dateStr => {
      const d = new Date(dateStr);
      return {
        name: days[d.getDay()],
        revenue: data.billing
          .filter(i => i.status === 'paid' && i.paymentDate && i.paymentDate.startsWith(dateStr))
          .reduce((sum, i) => sum + i.amount, 0)
      };
    });

    const attendanceTrend = last7Days.map(dateStr => {
      const d = new Date(dateStr);
      return {
        name: days[d.getDay()],
        visits: data.attendance.filter(a => a.recordedDate === dateStr).length
      };
    });
    
    return {
      activeMembers,
      totalMembers: data.members.length,
      todayRevenue,
      monthlyRevenue,
      todayVisits,
      pendingPayments,
      revenueTrend,
      attendanceTrend,
      retention: '94%' // Simulated for now
    };
  },

  getSettings: async (gymId) => {
    return data.settings || { gymName: 'GymFlow' };
  },

  updateSettings: async (settings, gymId) => {
    data.settings = { ...(data.settings || {}), ...settings };
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return data.settings;
  },

  // Feedback
  async addFeedback(feedback, ownerId) {
    data.feedback = data.feedback || [];
    data.feedback.push(feedback);
    await this.save();
    return feedback;
  },

  async getFeedback(ownerId) {
    return (data.feedback || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async updateFeedback(id, updates, ownerId) {
    const feedback = (data.feedback || []).find(f => f.id === id);
    if (feedback) {
      Object.assign(feedback, updates);
      await this.save();
      return feedback;
    }
    return null;
  },

  async deleteFeedback(id, ownerId) {
    const originalLength = (data.feedback || []).length;
    data.feedback = (data.feedback || []).filter(f => f.id !== id);
    if (data.feedback.length < originalLength) {
      await this.save();
      return true;
    }
    return false;
  },

  // Activity Logs
  async logActivity(userId, userName, action, entityType, entityId, entityName, details) {
    data.activity_logs = data.activity_logs || [];
    const activity = {
      id: uuidv4(),
      userId,
      userName,
      action,
      entityType,
      entityId,
      entityName,
      details,
      createdAt: new Date().toISOString()
    };
    data.activity_logs.push(activity);
    await this.save();
    return activity;
  },

  async getActivityLogs(filters = {}) {
    const logs = (data.activity_logs || []).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Apply filters if needed
    let filtered = logs;
    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }
    if (filters.entityType) {
      filtered = filtered.filter(log => log.entityType === filters.entityType);
    }
    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(log => log.createdAt >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(log => log.createdAt <= filters.dateTo);
    }
    
    return filtered.slice(0, filters.limit || 500);
  },

  async clearActivityLogs() {
    data.activity_logs = [];
    await this.save();
    return true;
  },

  // Campaigns & Reminders
  async createCampaign(campaign, ownerId) {
    data.campaigns = data.campaigns || [];
    data.campaigns.push(campaign);
    await this.save();
    return campaign;
  },

  async getCampaigns(ownerId) {
    return (data.campaigns || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async updateCampaign(id, updates, ownerId) {
    const campaign = (data.campaigns || []).find(c => c.id === id);
    if (campaign) {
      Object.assign(campaign, updates);
      await this.save();
      return campaign;
    }
    return null;
  },

  async deleteCampaign(id, ownerId) {
    const originalLength = (data.campaigns || []).length;
    data.campaigns = (data.campaigns || []).filter(c => c.id !== id);
    if (data.campaigns.length < originalLength) {
      await this.save();
      return true;
    }
    return false;
  },

  async createReminder(reminder, ownerId) {
    data.reminders = data.reminders || [];
    data.reminders.push(reminder);
    await this.save();
    return reminder;
  },

  async getReminders(ownerId) {
    return (data.reminders || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getReminderStats(ownerId) {
    const reminders = data.reminders || [];
    return {
      total: reminders.length,
      sent: reminders.filter(r => r.status === 'sent').length,
      pending: reminders.filter(r => r.status === 'pending').length,
      failed: reminders.filter(r => r.status === 'failed').length
    };
  }

  // Invites & Signup
  async createInvite(invite) {
    const newInvite = {
      id: invite.id || uuidv4(),
      email: invite.email,
      token: invite.token,
      inviter_id: invite.inviter_id,
      inviter_name: invite.inviter_name,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: invite.expires_at,
      accepted_at: null
    };
    data.invites.push(newInvite);
    await this.save();
    return newInvite;
  },

  async getInvites(filters = {}) {
    let invites = data.invites || [];
    
    if (filters.email) {
      invites = invites.filter(i => i.email === filters.email);
    }
    if (filters.status) {
      invites = invites.filter(i => i.status === filters.status);
    }
    if (filters.token) {
      invites = invites.filter(i => i.token === filters.token);
    }
    
    return invites.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getInviteByToken(token) {
    return (data.invites || []).find(i => i.token === token && i.status === 'pending');
  },

  async acceptInvite(token, userId) {
    const invite = (data.invites || []).find(i => i.token === token);
    if (!invite) return null;
    
    invite.status = 'accepted';
    invite.accepted_at = new Date().toISOString();
    await this.save();
    return invite;
  },

  async deleteInvite(id) {
    const idx = (data.invites || []).findIndex(i => i.id === id);
    if (idx === -1) return false;
    data.invites.splice(idx, 1);
    await this.save();
    return true;
  }
};

module.exports = db;
