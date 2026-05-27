const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const DATA_FILE = path.join(__dirname, 'data.json');
const DEFAULT_TENANT_ID = 'gym-001';
const PLATFORM_ROLES = new Set(['cto', 'ceo', 'admin']);

const TENANT_COLLECTIONS = [
  'members',
  'staff',
  'inventory',
  'attendance',
  'billing',
  'classes',
  'notifications',
  'leads',
  'plans',
  'feedback',
  'activity_logs',
  'campaigns',
  'reminders',
  'invites',
  'branches',
];

function getRecordTenantId(record) {
  return record?.tenant_id || record?.tenantId || record?.owner_id || record?.ownerId || record?.gymId || null;
}

function normalizeRecordTenant(record, tenantId = DEFAULT_TENANT_ID) {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const resolvedTenantId = getRecordTenantId(record) || tenantId;
  return {
    ...record,
    tenant_id: resolvedTenantId,
    tenantId: record.tenantId || resolvedTenantId,
  };
}

function normalizeDataModel() {
  if (!Array.isArray(data.tenants)) {
    data.tenants = [
      {
        id: DEFAULT_TENANT_ID,
        name: 'GymFlow Pro',
        slug: 'gymflow-pro',
        status: 'active',
        plan: 'Pro',
        membersLimit: 500,
        branchesLimit: 5,
        contactEmail: 'admin@gymflow.com',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
    ];
  }

  data.users = (data.users || []).map((user) => ({
    ...user,
    scope: user.scope || (PLATFORM_ROLES.has(user.role) ? 'platform' : 'tenant'),
    tenantId: user.tenantId || user.tenant_id || user.gymId || DEFAULT_TENANT_ID,
    tenant_id: user.tenant_id || user.tenantId || user.gymId || DEFAULT_TENANT_ID,
  }));

  for (const collectionName of TENANT_COLLECTIONS) {
    if (Array.isArray(data[collectionName])) {
      data[collectionName] = data[collectionName].map((record) =>
        normalizeRecordTenant(record, DEFAULT_TENANT_ID)
      );
    }
  }
}

function filterByTenant(records = [], tenantId = null) {
  if (!tenantId) {
    return records;
  }

  return records.filter((record) => getRecordTenantId(record) === tenantId);
}

function attachTenant(record, tenantId) {
  if (!record) return record;
  return normalizeRecordTenant(record, tenantId || DEFAULT_TENANT_ID);
}

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
    { id: 'm-1', name: 'John Doe', email: 'john@example.com', phone: '555-0101', dob: '1995-10-15', membership_type: 'Premium', status: 'active', join_date: '2023-11-01', expiry_date: '2024-11-01', tenant_id: DEFAULT_TENANT_ID },
    { id: 'm-2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', dob: '1990-04-20', membership_type: 'Basic', status: 'active', join_date: '2023-12-15', expiry_date: '2024-06-15', tenant_id: DEFAULT_TENANT_ID }
  ],
  staff: [
    { id: 's-1', name: 'Mike Tyson', position: 'Head Trainer', salary: 5000, email: 'mike@gym.com', phone: '555-0201', tenant_id: DEFAULT_TENANT_ID },
    { id: 's-2', name: 'Sylvester Stallone', position: 'Floor Staff', salary: 3000, email: 'sly@gym.com', phone: '555-0202', tenant_id: DEFAULT_TENANT_ID }
  ],
  inventory: [
    { id: 'i-1', name: 'Dumbbell Set', category: 'Equipment', quantity: 15, min_threshold: 5, cost_per_unit: 120, last_updated: new Date().toISOString(), tenant_id: DEFAULT_TENANT_ID },
    { id: 'i-2', name: 'Yoga Mats', category: 'Fitness Pros', quantity: 4, min_threshold: 10, cost_per_unit: 25, last_updated: new Date().toISOString(), tenant_id: DEFAULT_TENANT_ID }
  ],
  attendance: [],
  billing: [],
  classes: [
    { id: 'c-1', name: 'Morning Yoga', instructorName: 'Mike Tyson', maxCapacity: 20, currentEnrollment: 12, description: 'Relaxing yoga session', tenant_id: DEFAULT_TENANT_ID },
    { id: 'c-2', name: 'Heavy HIIT', instructorName: 'Sylvester Stallone', maxCapacity: 15, currentEnrollment: 8, description: 'Intense interval training', tenant_id: DEFAULT_TENANT_ID }
  ],
  branches: [
    {
      id: 'b-1',
      name: 'Main Branch',
      address: '123 Fitness Avenue',
      phone: '555-0301',
      email: 'main@gymflow.com',
      openingTime: '06:00',
      closingTime: '22:00',
      capacity: 200,
      isDefault: true,
      tenant_id: DEFAULT_TENANT_ID,
    },
  ],
  notifications: [
    { id: 'n-1', title: 'System Configured', message: 'Welcome to GymFlow Pro Edition.', read: false, createdAt: new Date().toISOString(), tenant_id: DEFAULT_TENANT_ID }
  ],
  leads: [
    { id: 'l-1', name: 'John Doe Partner', email: 'johndoe+lead@example.com', phone: '123-456-7890', status: 'New', notes: 'Interested in Premium Trial', created_at: new Date().toISOString(), tenant_id: DEFAULT_TENANT_ID }
  ],
  plans: [
    { id: 'p-1', name: 'Premium Plan', price: 99.99, durationMonths: 12, features: 'Full Access, Classes, Gym', tenant_id: DEFAULT_TENANT_ID },
    { id: 'p-2', name: 'Basic Plan', price: 49.99, durationMonths: 1, features: 'Gym Only', tenant_id: DEFAULT_TENANT_ID }
  ],
  feedback: [],
  activity_logs: [],
  campaigns: [],
  reminders: [],
  invites: [],
  tenants: [
    {
      id: DEFAULT_TENANT_ID,
      name: 'GymFlow Pro',
      slug: 'gymflow-pro',
      status: 'active',
      plan: 'Pro',
      membersLimit: 500,
      branchesLimit: 5,
      contactEmail: 'admin@gymflow.com',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    },
  ],
  settings: {
    gymName: 'GymFlow Pro',
    gymLogo: '',
    gymEmail: 'admin@gymflow.com',
    currency: 'INR',
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
      normalizeDataModel();
      console.log('✓ Local JSON database loaded');
    } catch (err) {
      console.log('ℹ Initializing new JSON database...');
      // Hash default admin password
      const salt = await bcrypt.genSalt(10);
      INITIAL_DATA.users[0].password_hash = await bcrypt.hash('password', salt);
      data = { ...INITIAL_DATA };
      normalizeDataModel();
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
  async getMembers(ownerId, trainerId = null) {
    let members = filterByTenant(data.members, ownerId);
    if (trainerId) {
      members = members.filter(m => m.assigned_trainer_id === trainerId);
    }
    return members;
  },

  async addMember(member, ownerId) {
    data.members.push(attachTenant({ ...member, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(member, ownerId);
  },

  async updateMember(id, patch, ownerId) {
    const index = data.members.findIndex(m => m.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.members[index]) !== ownerId) return null;
    data.members[index] = { ...data.members[index], ...patch };
    await this.save();
    return data.members[index];
  },

  async bulkAddMembers(membersArray, ownerId) {
    const newMembers = membersArray.map(m => attachTenant({ ...m, owner_id: ownerId }, ownerId));
    data.members = [...data.members, ...newMembers];
    await this.save();
    return newMembers;
  },

  async deleteMember(id, ownerId) {
    const originalLength = data.members.length;
    data.members = data.members.filter(m => m.id !== id || (ownerId && getRecordTenantId(m) !== ownerId));
    await this.save();
    return data.members.length < originalLength;
  },

  // Staff Methods
  async getStaff(ownerId) {
    return filterByTenant(data.staff, ownerId);
  },

  async addStaff(member, ownerId) {
    data.staff.push(attachTenant({ ...member, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(member, ownerId);
  },

  async updateStaff(id, patch, ownerId) {
    const index = data.staff.findIndex(s => s.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.staff[index]) !== ownerId) return null;
    data.staff[index] = { ...data.staff[index], ...patch, last_updated: new Date().toISOString() };
    await this.save();
    return data.staff[index];
  },

  async deleteStaff(id, ownerId) {
    const originalLength = data.staff.length;
    data.staff = data.staff.filter(s => s.id !== id || (ownerId && getRecordTenantId(s) !== ownerId));
    await this.save();
    return data.staff.length < originalLength;
  },

  // Inventory Methods
  async getInventory(ownerId) {
    return filterByTenant(data.inventory, ownerId);
  },

  async addInventoryItem(item, ownerId) {
    data.inventory.push(attachTenant({ ...item, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(item, ownerId);
  },

  async updateInventoryItem(id, patch, ownerId) {
    const index = data.inventory.findIndex(i => i.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.inventory[index]) !== ownerId) return null;
    data.inventory[index] = { ...data.inventory[index], ...patch };
    await this.save();
    return data.inventory[index];
  },

  async deleteInventoryItem(id, ownerId) {
    const originalLength = data.inventory.length;
    data.inventory = data.inventory.filter(i => i.id !== id || (ownerId && getRecordTenantId(i) !== ownerId));
    await this.save();
    return data.inventory.length < originalLength;
  },

  // Attendance Methods
  async getAttendance(filters, ownerId) {
    const attendance = filterByTenant(data.attendance, ownerId);
    return attendance.map(a => {
      const memberId = a.memberId || a.member_id;
      const member = data.members.find(m => m.id === memberId);
      return {
        ...a,
        memberName: member ? member.name : (a.memberName || 'Unknown')
      };
    });
  },

  async checkIn(memberId, notes, ownerId) {
    const member = data.members.find(m => m.id === memberId);
    if (ownerId && member && getRecordTenantId(member) !== ownerId) return null;
    const record = {
      id: uuidv4(),
      memberId,
      memberName: member ? member.name : 'Unknown',
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      notes,
      recordedDate: new Date().toISOString().split('T')[0],
      tenant_id: ownerId || getRecordTenantId(member),
    };
    data.attendance.unshift(record);
    await this.save();
    return record;
  },

  async checkOut(id, ownerId) {
    const index = data.attendance.findIndex(a => a.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.attendance[index]) !== ownerId) return null;
    data.attendance[index].checkOutTime = new Date().toISOString();
    await this.save();
    
    const record = data.attendance[index];
    const memberId = record.memberId || record.member_id;
    const member = data.members.find(m => m.id === memberId);
    return {
      ...record,
      memberName: member ? member.name : (record.memberName || 'Unknown')
    };
  },

  // Invoices & Billing
  async getInvoices(ownerId) {
    const billing = filterByTenant(data.billing, ownerId);
    return billing.map(b => {
      const memberId = b.memberId || b.member_id;
      const member = data.members.find(m => m.id === memberId);
      return {
        ...b,
        memberName: member ? member.name : (b.memberName || 'Unknown')
      };
    });
  },

  async addInvoice(invoice, ownerId) {
    const record = attachTenant({ ...invoice, owner_id: ownerId }, ownerId);
    data.billing.push(record);
    await this.save();
    
    const memberId = record.memberId || record.member_id;
    const member = data.members.find(m => m.id === memberId);
    return {
      ...record,
      memberName: member ? member.name : (record.memberName || 'Unknown')
    };
  },

  async payInvoice(id, paymentData, ownerId) {
    const index = data.billing.findIndex(i => i.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.billing[index]) !== ownerId) return null;
    data.billing[index].status = 'paid';
    data.billing[index].paymentMethod = paymentData.method;
    data.billing[index].paymentDate = new Date().toISOString();
    await this.save();
    
    const record = data.billing[index];
    const memberId = record.memberId || record.member_id;
    const member = data.members.find(m => m.id === memberId);
    return {
      ...record,
      memberName: member ? member.name : (record.memberName || 'Unknown')
    };
  },

  async updateInvoice(id, patch, ownerId) {
    const index = data.billing.findIndex(i => i.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.billing[index]) !== ownerId) return null;
    data.billing[index] = { ...data.billing[index], ...patch };
    await this.save();
    
    const record = data.billing[index];
    const memberId = record.memberId || record.member_id;
    const member = data.members.find(m => m.id === memberId);
    return {
      ...record,
      memberName: member ? member.name : (record.memberName || 'Unknown')
    };
  },

  async deleteInvoice(id, ownerId) {
    const originalLength = data.billing.length;
    data.billing = data.billing.filter(i => i.id !== id || (ownerId && getRecordTenantId(i) !== ownerId));
    await this.save();
    return data.billing.length < originalLength;
  },

  // Classes Methods
  async getClasses(ownerId, instructorId = null) {
    let classes = filterByTenant(data.classes, ownerId);
    if (instructorId) {
      classes = classes.filter(c => c.instructor_id === instructorId);
    }
    return classes;
  },

  async addClass(cls, ownerId) {
    data.classes.push(attachTenant({ ...cls, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(cls, ownerId);
  },

  async updateClass(id, patch, ownerId) {
    const index = data.classes.findIndex(c => c.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.classes[index]) !== ownerId) return null;
    data.classes[index] = { ...data.classes[index], ...patch };
    await this.save();
    return data.classes[index];
  },

  async deleteClass(id, ownerId) {
    const originalLength = data.classes.length;
    data.classes = data.classes.filter(c => c.id !== id || (ownerId && getRecordTenantId(c) !== ownerId));
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
    return filterByTenant(data.notifications || [], ownerId);
  },

  async markNotificationRead(id, ownerId) {
    const index = data.notifications.findIndex(n => n.id === id);
    if (index === -1) return null;
    data.notifications[index].read = true;
    await this.save();
    return data.notifications[index];
  },

  async addNotification(notification, ownerId) {
    if (!data.notifications) data.notifications = [];
    const newNotification = attachTenant({
      id: notification.id || uuidv4(),
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      read: false,
      createdAt: new Date().toISOString(),
      owner_id: ownerId
    }, ownerId);
    data.notifications.push(newNotification);
    await this.save();
    return newNotification;
  },

  // Leads (CRM)
  async getLeads(ownerId) {
    return filterByTenant(data.leads || [], ownerId);
  },

  async addLead(lead, ownerId) {
    if (!data.leads) data.leads = [];
    data.leads.push(attachTenant({ ...lead, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(lead, ownerId);
  },

  async updateLead(id, patch, ownerId) {
    if (!data.leads) data.leads = [];
    const index = data.leads.findIndex(l => l.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.leads[index]) !== ownerId) return null;
    data.leads[index] = { ...data.leads[index], ...patch, last_updated: new Date().toISOString() };
    await this.save();
    return data.leads[index];
  },

  async deleteLead(id, ownerId) {
    if (!data.leads) data.leads = [];
    const originalLength = data.leads.length;
    data.leads = data.leads.filter(l => l.id !== id || (ownerId && getRecordTenantId(l) !== ownerId));
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
    const plans = filterByTenant(data.plans || [], ownerId);
    return plans.map(p => ({
      ...p,
      durationMonths: p.durationMonths ?? p.duration_months,
      durationDays: p.durationDays ?? p.duration_days,
      features: Array.isArray(p.features) ? p.features.join(', ') : (p.features || '')
    }));
  },

  async addPlan(plan, ownerId) {
    if (!data.plans) data.plans = [];
    const newPlan = attachTenant({
      ...plan,
      durationMonths: plan.durationMonths ?? plan.duration_months,
      durationDays: plan.durationDays ?? plan.duration_days,
      owner_id: ownerId
    }, ownerId);
    data.plans.push(newPlan);
    await this.save();
    return {
      ...newPlan,
      features: Array.isArray(newPlan.features) ? newPlan.features.join(', ') : (newPlan.features || '')
    };
  },

  async updatePlan(id, patch, ownerId) {
    if (!data.plans) data.plans = [];
    const index = data.plans.findIndex(p => p.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.plans[index]) !== ownerId) return null;
    
    const updatedPlan = {
      ...data.plans[index],
      ...patch,
      durationMonths: patch.durationMonths !== undefined ? patch.durationMonths : (patch.duration_months !== undefined ? patch.duration_months : data.plans[index].durationMonths),
      durationDays: patch.durationDays !== undefined ? patch.durationDays : (patch.duration_days !== undefined ? patch.duration_days : data.plans[index].durationDays)
    };
    data.plans[index] = updatedPlan;
    await this.save();
    return {
      ...updatedPlan,
      features: Array.isArray(updatedPlan.features) ? updatedPlan.features.join(', ') : (updatedPlan.features || '')
    };
  },

  async deletePlan(id, ownerId) {
    if (!data.plans) data.plans = [];
    const originalLength = data.plans.length;
    data.plans = data.plans.filter(p => p.id !== id || (ownerId && getRecordTenantId(p) !== ownerId));
    await this.save();
    return data.plans.length < originalLength;
  },

  // Dashboard Stats
  async getDashboardStats(ownerId) {
    const members = filterByTenant(data.members, ownerId);
    const billing = filterByTenant(data.billing, ownerId);
    const attendance = filterByTenant(data.attendance, ownerId);
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const activeMembers = members.filter(m => m.status === 'active').length;
    const todayRevenue = billing
      .filter(i => i.status === 'paid' && i.paymentDate && i.paymentDate.startsWith(today))
      .reduce((sum, i) => sum + i.amount, 0);
      
    const monthlyRevenue = billing
      .filter(i => i.status === 'paid' && i.paymentDate && i.paymentDate >= monthStart)
      .reduce((sum, i) => sum + i.amount, 0);
      
    const todayVisits = attendance
      .filter(a => a.recordedDate === today)
      .length;
      
    const pendingPayments = billing
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
        revenue: billing
          .filter(i => i.status === 'paid' && i.paymentDate && i.paymentDate.startsWith(dateStr))
          .reduce((sum, i) => sum + i.amount, 0)
      };
    });

    const attendanceTrend = last7Days.map(dateStr => {
      const d = new Date(dateStr);
      return {
        name: days[d.getDay()],
        visits: attendance.filter(a => a.recordedDate === dateStr).length
      };
    });
    
    return {
      activeMembers,
      totalMembers: members.length,
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

  async getBranches(ownerId) {
    return filterByTenant(data.branches || [], ownerId);
  },

  async addBranch(branch, ownerId) {
    if (!data.branches) data.branches = [];
    data.branches.push(attachTenant({ ...branch, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(branch, ownerId);
  },

  async updateBranch(id, patch, ownerId) {
    if (!data.branches) data.branches = [];
    const index = data.branches.findIndex((branch) => branch.id === id);
    if (index === -1) return null;
    if (ownerId && getRecordTenantId(data.branches[index]) !== ownerId) return null;
    data.branches[index] = { ...data.branches[index], ...patch };
    await this.save();
    return data.branches[index];
  },

  async deleteBranch(id, ownerId) {
    if (!data.branches) data.branches = [];
    const originalLength = data.branches.length;
    data.branches = data.branches.filter((branch) => branch.id !== id || (ownerId && getRecordTenantId(branch) !== ownerId));
    if (data.branches.length < originalLength) {
      await this.save();
      return true;
    }
    return false;
  },

  async getTenants() {
    return (data.tenants || []).map((tenant) => {
      const tenantMembers = filterByTenant(data.members, tenant.id);
      const activeMembers = tenantMembers.filter(m => m.status === 'active').length;
      const tenantBilling = filterByTenant(data.billing, tenant.id);
      const totalRevenue = tenantBilling
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + Number(i.amount || 0), 0);

      return {
        ...tenant,
        activeMembers,
        totalMembers: tenantMembers.length,
        membersCount: tenantMembers.length,
        totalRevenue,
        branchesCount: filterByTenant(data.branches || [], tenant.id).length,
        lastActiveAt: tenant.lastActiveAt || tenant.updatedAt || tenant.createdAt,
      };
    });
  },

  async getTenantById(id) {
    return (data.tenants || []).find((tenant) => tenant.id === id) || null;
  },

  async createTenant(tenant) {
    if (!data.tenants) data.tenants = [];
    const newTenant = {
      id: tenant.id || uuidv4(),
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status || 'active',
      plan: tenant.plan || 'Basic',
      contactEmail: tenant.contactEmail || tenant.email || '',
      membersLimit: tenant.membersLimit || 100,
      branchesLimit: tenant.branchesLimit || 1,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      ...tenant,
    };
    data.tenants.push(newTenant);
    await this.save();
    return newTenant;
  },

  async updateTenant(id, patch) {
    const index = (data.tenants || []).findIndex((tenant) => tenant.id === id);
    if (index === -1) return null;
    data.tenants[index] = { ...data.tenants[index], ...patch, lastActiveAt: new Date().toISOString() };
    await this.save();
    return data.tenants[index];
  },

  async getPlatformOverview() {
    const tenants = data.tenants || [];
    const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;
    const suspendedTenants = tenants.filter((tenant) => tenant.status === 'suspended').length;
    const mrr = tenants.reduce((sum, tenant) => {
      const planPrice = tenant.planPrice || (tenant.plan === 'Enterprise' ? 299 : tenant.plan === 'Pro' ? 149 : 49);
      return sum + planPrice;
    }, 0);

    return {
      totalGyms: tenants.length,
      activeGyms: activeTenants,
      suspendedGyms: suspendedTenants,
      totalMembers: data.members.length,
      mrr,
      churnRate: tenants.length ? Math.max(0, Math.round((suspendedTenants / tenants.length) * 100)) : 0,
      todaySignUps: data.members.filter((member) => member.createdAt && member.createdAt.startsWith(new Date().toISOString().split('T')[0])).length,
    };
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
    return filterByTenant(data.feedback || [], ownerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    data.feedback = (data.feedback || []).filter(f => f.id !== id || (ownerId && getRecordTenantId(f) !== ownerId));
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
    const logs = filterByTenant(data.activity_logs || [], filters.tenantId).sort((a, b) => 
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
    data.campaigns.push(attachTenant({ ...campaign, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(campaign, ownerId);
  },

  async getCampaigns(ownerId) {
    return filterByTenant(data.campaigns || [], ownerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async updateCampaign(id, updates, ownerId) {
    const campaign = (data.campaigns || []).find(c => c.id === id);
    if (campaign) {
      if (ownerId && getRecordTenantId(campaign) !== ownerId) return null;
      Object.assign(campaign, updates);
      await this.save();
      return campaign;
    }
    return null;
  },

  async deleteCampaign(id, ownerId) {
    const originalLength = (data.campaigns || []).length;
    data.campaigns = (data.campaigns || []).filter(c => c.id !== id || (ownerId && getRecordTenantId(c) !== ownerId));
    if (data.campaigns.length < originalLength) {
      await this.save();
      return true;
    }
    return false;
  },

  async createReminder(reminder, ownerId) {
    data.reminders = data.reminders || [];
    data.reminders.push(attachTenant({ ...reminder, owner_id: ownerId }, ownerId));
    await this.save();
    return attachTenant(reminder, ownerId);
  },

  async getReminders(ownerId) {
    return filterByTenant(data.reminders || [], ownerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getReminderStats(ownerId) {
    const reminders = filterByTenant(data.reminders || [], ownerId);
    return {
      total: reminders.length,
      sent: reminders.filter(r => r.status === 'sent').length,
      pending: reminders.filter(r => r.status === 'pending').length,
      failed: reminders.filter(r => r.status === 'failed').length
    };
  },

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
      tenant_id: invite.tenant_id || invite.tenantId || invite.gymId || DEFAULT_TENANT_ID,
      accepted_at: null
    };
    data.invites.push(newInvite);
    await this.save();
    return newInvite;
  },

  async getInvites(filters = {}) {
    let invites = data.invites || [];
    if (filters.tenantId) {
      invites = invites.filter((invite) => getRecordTenantId(invite) === filters.tenantId);
    }
    
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

  async verifyInvite(token) {
    return this.getInviteByToken(token);
  },

  async updateInvite(id, updates) {
    const invite = (data.invites || []).find(i => i.id === id);
    if (invite) {
      Object.assign(invite, updates);
      await this.save();
      return invite;
    }
    return null;
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
