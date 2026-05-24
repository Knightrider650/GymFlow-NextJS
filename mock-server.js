const http = require('http');
const fs = require('fs');
const path_mod = require('path');

const PORT = 5000;
const LOG_FILE = path_mod.join(__dirname, 'mock-server.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, line);
}

// Mock Database
let members = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '5550101010', address: '123 Main St', membershipType: 'Premium', status: 'active', joinDate: '2024-01-01', expiryDate: '2024-12-31', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '5550102020', address: '456 Oak Ave', membershipType: 'Basic', status: 'active', joinDate: '2023-01-01', expiryDate: '2023-12-31', createdAt: '2023-01-01T00:00:00Z' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', phone: '5551234567', address: '789 Pine Rd', membershipType: 'Elite', status: 'active', joinDate: '2023-03-10', expiryDate: '2024-03-10', createdAt: '2023-03-10T00:00:00Z' }
];

let attendance = [
  { id: '1', memberId: '1', memberName: 'John Doe', checkInTime: new Date(Date.now() - 3600000).toISOString(), status: 'checked-in', recordedDate: new Date().toISOString().split('T')[0] }
];

let inventory = [
  { id: '1', name: 'Dumbbell Set (5-50lbs)', category: 'Equipment', quantity: 5, minThreshold: 2, costPerUnit: 1200 },
  { id: '2', name: 'Yoga Mats', category: 'Accessories', quantity: 2, minThreshold: 10, costPerUnit: 25 },
  { id: '3', name: 'Whey Protein (2kg)', category: 'Supplements', quantity: 45, minThreshold: 15, costPerUnit: 60 }
];

let invoices = [
  { id: '1', memberId: '1', memberName: 'John Doe', amount: 50, status: 'paid', invoiceNumber: 'INV-1001', invoiceDate: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() },
  { id: '2', memberId: '2', memberName: 'Jane Smith', amount: 30, status: 'pending', invoiceNumber: 'INV-1002', invoiceDate: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0] }
];

let staff = [
  { id: '1', name: 'Robert Smith', email: 'robert@gym.com', phone: '555-0123', position: 'Manager', salary: 5000, status: 'active', joinDate: '2023-01-15' },
  { id: '2', name: 'Sarah Wilson', email: 'sarah@gym.com', phone: '555-0456', position: 'Trainer', salary: 3500, status: 'active', joinDate: '2023-06-20' }
];

let leads = [
  { id: '1', name: 'Alice Cooper', email: 'alice@example.com', phone: '555-9999', status: 'New', notes: 'Interested in yoga classes', createdAt: new Date().toISOString() },
  { id: '2', name: 'Bob Marley', email: 'bob@example.com', phone: '555-8888', status: 'Contacted', notes: 'Prefers evening slots', createdAt: new Date().toISOString() }
];

let plans = [
  { id: '1', name: 'Basic Monthly', price: 30, durationMonths: 1, features: 'Gym Access, Locker Room' },
  { id: '2', name: 'Annual Premium', price: 300, durationMonths: 12, features: 'Gym Access, Pool, Personal Trainer' }
];

let classes = [
  { id: '1', name: 'Morning Yoga', instructorName: 'Sarah Wilson', time: '08:00 AM', days: 'Mon, Wed, Fri', maxCapacity: 20, currentEnrollment: 12, description: 'Start your day with mindful stretching and balance exercises' },
  { id: '2', name: 'Zumba Dance', instructorName: 'Mike Johnson', time: '06:30 PM', days: 'Tue, Thu', maxCapacity: 25, currentEnrollment: 18, description: 'High-energy dance workout for all fitness levels' }
];

let notifications = [
  { id: '1', type: 'system', title: 'Maintenance Alert', message: 'The showers will be closed for 2 hours today.', read: false, createdAt: new Date().toISOString() },
  { id: '2', type: 'payment_reminder', title: 'Invoice Due', message: 'Jane Smith\'s invoice is due today.', read: false, createdAt: new Date().toISOString() },
  { id: '3', type: 'membership_expiry', title: 'Expiring Membership', message: 'John Doe\'s membership expires in 7 days.', read: false, createdAt: new Date().toISOString() }
];

let settings = {
  gymName: 'GymFlow HQ',
  gymLogo: '',
  gymEmail: 'contact@gymflow.com',
  gymPhone: '+1 (555) 999-8888',
  gymAddress: '123 Fitness Ave, Wellness City',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  invoicePrefix: 'GF-'
};

let activityLogs = [
  { id: '1', action: 'Member Login', details: 'John Doe logged in', timestamp: new Date().toISOString(), userName: 'John Doe', userId: '1' },
  { id: '2', action: 'Update Inventory', details: 'Stock updated for Yoga Mats', timestamp: new Date().toISOString(), userName: 'Admin User', userId: 'admin-1' }
];

let messageLogs = [
  { id: '1', memberId: '1', memberName: 'John Doe', type: 'Reminder', channel: 'Email', status: 'Sent', sentAt: new Date().toISOString(), content: 'Your membership expires in 7 days.' }
];

let campaigns = [
  { id: '1', title: 'Summer Special', subject: 'Get 20% off Annual Plans!', content: 'Limited time offer...', targetSegment: 'All Members', status: 'Sent', sentAt: new Date().toISOString(), createdBy: 'Admin' }
];

let feedback = [
  { id: '1', category: 'feature', title: 'Mobile App', details: 'Would love to see a mobile app for member check-ins.', createdAt: new Date().toISOString() }
];

let invites = [
  { id: '1', email: 'partner@fitness.com', role: 'Trainer', status: 'pending', sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString() }
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gym-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => (body += chunk.toString()));
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : null;
      const url = req.url;
      const method = req.method;
      const path = url.split('?')[0];

      log(`${method} ${url} -> Path: ${path}`);

      let response = { success: false, error: 'Endpoint not found' };
      let statusCode = 404;

      const addLog = (action, details) => {
        activityLogs.unshift({
          id: Date.now().toString(),
          action,
          details,
          timestamp: new Date().toISOString(),
          userName: 'Admin User',
          userId: 'admin-1'
        });
      };

      // GENERIC CRUD HANDLER HELPER
      const handleCRUD = (collection, collectionName, singularName) => {
        if (path === `/api/${collectionName}` && method === 'GET') {
          statusCode = 200;
          response = { success: true, data: collection };
          return true;
        }
        if (path === `/api/${collectionName}` && method === 'POST') {
          statusCode = 201;
          const newItem = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
          collection.push(newItem);
          addLog(`Add ${singularName}`, `Added new ${singularName.toLowerCase()}: ${newItem.name || newItem.id}`);
          response = { success: true, data: newItem };
          return true;
        }
        if (path.startsWith(`/api/${collectionName}/`) && (method === 'PUT' || method === 'PATCH')) {
          const id = path.split('/').pop();
          const index = collection.findIndex(item => String(item.id) === String(id));
          if (index !== -1) {
            collection[index] = { ...collection[index], ...data, updatedAt: new Date().toISOString() };
            addLog(`Update ${singularName}`, `Updated ${singularName.toLowerCase()}: ${collection[index].name || id}`);
            statusCode = 200;
            response = { success: true, data: collection[index] };
          } else {
            statusCode = 404;
            response = { success: false, error: 'Item not found' };
          }
          return true;
        }
        if (path.startsWith(`/api/${collectionName}/`) && method === 'DELETE') {
          const id = path.split('/').pop();
          const index = collection.findIndex(item => String(item.id) === String(id));
          if (index !== -1) {
            const deleted = collection.splice(index, 1)[0];
            addLog(`Delete ${singularName}`, `Deleted ${singularName.toLowerCase()}: ${deleted.name || id}`);
            statusCode = 200;
            response = { success: true };
          } else {
            statusCode = 404;
            response = { success: false, error: 'Item not found' };
          }
          return true;
        }
        return false;
      };

      // AUTH
      if (path === '/api/auth/login' && method === 'POST') {
        statusCode = 200;
        response = { success: true, data: { user: { id: 'admin-1', email: 'admin@gym.com', fullname: 'Admin User', role: 'admin', gymId: 'gym-1' }, tokens: { accessToken: 'mock-access-token' } } };
      }
      else if (path === '/api/auth/me' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: { id: 'admin-1', email: 'admin@gym.com', fullname: 'Admin User', role: 'admin', gymId: 'gym-1' } };
      }
      
      // ENTITIES
      else if (handleCRUD(members, 'members', 'Member')) {}
      else if (handleCRUD(staff, 'staff', 'Staff')) {}
      else if (handleCRUD(leads, 'leads', 'Lead')) {}
      else if (handleCRUD(plans, 'plans', 'Plan')) {}
      else if (handleCRUD(classes, 'classes', 'Class')) {}
      else if (handleCRUD(inventory, 'inventory', 'Inventory Item')) {}
      else if (handleCRUD(invoices, 'billing', 'Invoice')) {}
      else if (handleCRUD(notifications, 'notifications', 'Notification')) {}
      else if (handleCRUD(invites, 'invites', 'Invitation')) {}
      else if (handleCRUD(feedback, 'feedback', 'Feedback')) {}

      // SPECIAL ENDPOINTS
      
      // SYNC STREAM
      else if (path === '/api/sync/stream' && method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        res.write('data: {"status": "connected"}\n\n');
        return;
      }
      
      // ATTENDANCE
      else if (path === '/api/attendance' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: attendance };
      }
      else if (path === '/api/attendance/checkin' && method === 'POST') {
        statusCode = 201;
        const { memberId, notes } = data;
        const member = members.find(m => String(m.id) === String(memberId));
        const newRecord = {
          id: Date.now().toString(),
          memberId,
          memberName: member ? member.name : 'Unknown',
          checkInTime: new Date().toISOString(),
          status: 'checked-in',
          recordedDate: new Date().toISOString().split('T')[0],
          notes
        };
        attendance.push(newRecord);
        addLog('Member Check-in', `Member ${newRecord.memberName} checked in`);
        response = { success: true, data: newRecord };
      }
      else if (path.includes('/checkout') && method === 'POST') {
        const id = path.split('/')[3];
        const record = attendance.find(a => String(a.id) === String(id));
        if (record) {
          record.status = 'checked-out';
          record.checkOutTime = new Date().toISOString();
          addLog('Member Check-out', `Member ${record.memberName} checked out`);
          statusCode = 200;
          response = { success: true, data: record };
        }
      }

      // PAYMENTS
      else if ((path === '/api/payments' || path.includes('/pay')) && method === 'POST') {
        statusCode = 201;
        const invoiceId = data.invoiceId || path.split('/')[3];
        const inv = invoices.find(i => String(i.id) === String(invoiceId));
        if (inv) {
          inv.status = 'paid';
          inv.updatedAt = new Date().toISOString();
          addLog('Payment Processed', `Payment recorded for Invoice ${inv.invoiceNumber}`);
        }
        response = { success: true, data: { ...data, id: Date.now().toString() } };
      }

      // DASHBOARD
      else if (path === '/api/dashboard-stats' && method === 'GET') {
        statusCode = 200;
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        const revenue = invoices.filter(i => i.status === 'paid' && (i.updatedAt?.startsWith(today) || i.invoiceDate?.startsWith(today))).reduce((s, i) => s + Number(i.amount), 0);
        
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
            revenue: invoices
              .filter(i => i.status === 'paid' && (i.updatedAt?.startsWith(dateStr) || i.invoiceDate?.startsWith(dateStr)))
              .reduce((sum, i) => sum + Number(i.amount), 0)
          };
        });

        const attendanceTrend = last7Days.map(dateStr => {
          const d = new Date(dateStr);
          return {
            name: days[d.getDay()],
            visits: attendance.filter(a => a.recordedDate === dateStr).length
          };
        });

        response = {
          success: true,
          data: {
            totalMembers: members.length,
            activeMembers: members.filter(m => m.status === 'active').length,
            pendingPayments: invoices.filter(i => i.status === 'pending').length,
            todayVisits: attendance.filter(a => a.recordedDate === today).length,
            todayRevenue: revenue,
            monthlyRevenue: invoices.filter(i => i.status === 'paid' && (i.updatedAt?.startsWith(month) || i.invoiceDate?.startsWith(month))).reduce((s, i) => s + Number(i.amount), 0),
            revenueTrend,
            attendanceTrend
          }
        };
      }

      // CONVERT LEAD
      else if (path.includes('/convert') && method === 'POST') {
        const id = path.split('/')[3];
        const lead = leads.find(l => String(l.id) === String(id));
        if (lead) {
          lead.status = 'Converted';
          const newMember = {
            id: Date.now().toString(),
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            membershipType: data.membershipType || 'Basic',
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
          };
          members.push(newMember);
          addLog('Lead Converted', `Lead ${lead.name} converted to member`);
          statusCode = 200;
          response = { success: true, data: newMember };
        }
      }

      // SETTINGS
      else if (path === '/api/settings' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: settings };
      }
      else if (path === '/api/settings' && method === 'PUT') {
        settings = { ...settings, ...data };
        addLog('Update Settings', 'System settings updated');
        statusCode = 200;
        response = { success: true, data: settings };
      }

      // ACTIVITY LOG
      else if ((path === '/api/activity-log' || path === '/api/activity-logs') && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: activityLogs };
      }

      // COMMUNICATIONS
      else if (path === '/api/communications/logs' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: messageLogs };
      }
      else if (path === '/api/campaigns' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: campaigns };
      }
      else if (path === '/api/campaigns' && method === 'POST') {
        statusCode = 201;
        const newCampaign = { ...data, id: Date.now().toString(), status: 'Sent', sentAt: new Date().toISOString(), createdBy: 'Admin' };
        campaigns.push(newCampaign);
        addLog('New Campaign', `Launched campaign: ${newCampaign.title}`);
        response = { success: true, data: newCampaign };
      }

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (e) {
      log(`ERROR: ${e.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
    }
  });
});

server.listen(PORT, () => {
  log(`Mock Server integrated and listening on port ${PORT}`);
});
