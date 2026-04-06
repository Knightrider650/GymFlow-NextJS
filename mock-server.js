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

      if (path === '/api/auth/login' && method === 'POST') {
        statusCode = 200;
        response = { success: true, data: { user: { id: 'admin-1', email: 'admin@gym.com', fullname: 'Admin User', role: 'admin', gymId: 'gym-1' }, tokens: { accessToken: 'mock-access-token' } } };
      }
      else if (path === '/api/auth/me' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: { id: 'admin-1', email: 'admin@gym.com', fullname: 'Admin User', role: 'admin', gymId: 'gym-1' } };
      }
      else if (path === '/api/members' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: members };
      }
      else if (path === '/api/members' && method === 'POST') {
        statusCode = 201;
        const newMember = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
        members.push(newMember);
        response = { success: true, data: newMember };
      }
      else if (path.startsWith('/api/members/') && (method === 'PUT' || method === 'PATCH')) {
        const id = path.split('/').pop();
        const index = members.findIndex(m => String(m.id) === String(id));
        if (index !== -1) {
          members[index] = { ...members[index], ...data, updatedAt: new Date().toISOString() };
          statusCode = 200;
          response = { success: true, data: members[index] };
        }
      }
      else if (path.startsWith('/api/members/') && method === 'DELETE') {
        const id = path.split('/').pop();
        members = members.filter(m => String(m.id) !== String(id));
        statusCode = 200;
        response = { success: true };
      }
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
        response = { success: true, data: newRecord };
      }
      else if (path.includes('/checkout') && method === 'POST') {
        const id = path.split('/')[3];
        const record = attendance.find(a => String(a.id) === String(id));
        if (record) {
          record.status = 'checked-out';
          record.checkOutTime = new Date().toISOString();
          statusCode = 200;
          response = { success: true, data: record };
        }
      }
      else if (path === '/api/billing' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: invoices };
      }
      else if (path === '/api/billing' && method === 'POST') {
        statusCode = 201;
        const newInv = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
        invoices.push(newInv);
        response = { success: true, data: newInv };
      }
      else if (path === '/api/payments' && method === 'POST') {
        statusCode = 201;
        const { invoiceId } = data;
        const inv = invoices.find(i => String(i.id) === String(invoiceId));
        if (inv) {
          inv.status = 'paid';
          inv.updatedAt = new Date().toISOString();
        }
        response = { success: true, data: { ...data, id: Date.now().toString() } };
      }
      else if (path === '/api/dashboard-stats' && method === 'GET') {
        statusCode = 200;
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        const revenue = invoices.filter(i => i.status === 'paid' && i.updatedAt?.startsWith(today)).reduce((s, i) => s + Number(i.amount), 0);
        response = {
          success: true,
          data: {
            totalMembers: members.length,
            activeMembers: members.filter(m => m.status === 'active').length,
            pendingPayments: invoices.filter(i => i.status === 'pending').length,
            todayVisits: attendance.filter(a => a.recordedDate === today).length,
            todayRevenue: revenue,
            monthlyRevenue: invoices.filter(i => i.status === 'paid' && i.updatedAt?.startsWith(month)).reduce((s, i) => s + Number(i.amount), 0),
            revenueTrend: [{ name: 'Mon', revenue: 100 }, { name: 'Tue', revenue: 200 }, { name: 'Sun', revenue: revenue || 150 }],
            attendanceTrend: [{ name: 'Mon', visits: 10 }, { name: 'Sun', visits: attendance.filter(a => a.recordedDate === today).length || 5 }]
          }
        };
      }
      else if (path === '/api/inventory' && method === 'GET') {
        statusCode = 200;
        response = { success: true, data: inventory };
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
  log(`Mock Server listening on port ${PORT}`);
});
