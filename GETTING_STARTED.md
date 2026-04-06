# Getting Started with GymFlow

Welcome to GymFlow v2.0! This guide will help you get up and running quickly.

## ✅ Pre-Installation Checklist

Before you start, make sure you have:

- [ ] Node.js v18 or higher installed (`node --version`)
- [ ] npm or yarn package manager
- [ ] Git installed
- [ ] A code editor (VS Code recommended)
- [ ] Terminal/Command line access
- [ ] Backend running on port 5000 (or accessible via network)

## 🚀 Installation Steps

### 1️⃣ Install Dependencies

```bash
npm install
```

This installs all required packages. Takes 2-3 minutes.

### 2️⃣ Configure Environment

The `.env.local` file is already created with default values. If you need to change the API URL:

```bash
# Edit .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

### 3️⃣ Start Development Server

```bash
npm run dev
```

You'll see:
```
> Ready in 2.1s
> Local: http://localhost:3000
```

### 4️⃣ Open in Browser

Navigate to:
```
http://localhost:3000
```

### 5️⃣ Login

Use demo credentials:
```
Email: admin@gym.com
Password: password123
```

**✨ You're in! Everything is working.**

---

## 📚 What See First

### Dashboard (http://localhost:3000/dashboard)
- View key metrics
- See charts and trends
- Quick access to all features

### Members (http://localhost:3000/members)
- Add new members
- Edit/delete existing members
- Search and filter
- View membership details

### Attendance (http://localhost:3000/attendance)
- Check in members
- Check out members
- View attendance history

### Billing (http://localhost:3000/billing)
- Create invoices
- Record payments
- View revenue reports

---

## 🛠️ Project Structure

```
GymFlow-NextJS/
│
├── app/                 # Next.js pages & routes
│   ├── dashboard/
│   ├── members/
│   ├── attendance/
│   ├── billing/
│   ├── classes/
│   ├── inventory/
│   ├── staff/
│   ├── notifications/
│   └── settings/
│
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── layout/         # Layout components
│
├── lib/                # Core logic
│   ├── api-client.ts   # API calls
│   ├── store.ts        # State management
│   └── utils.ts        # Utilities
│
├── hooks/              # Custom hooks
├── utils/              # Formatting utilities
├── types/              # TypeScript definitions
│
└── Configuration files
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    └── .env.local
```

---

## 🎯 Common Tasks

### Add a Member
1. Go to Members page
2. Click "Add Member" button
3. Fill in:
   - Full Name
   - Email
   - Phone
   - Membership Type (Basic/Premium/Elite)
   - Join Date
   - Expiry Date
4. Click "Add Member"

### Check in a Member
1. Go to Attendance page
2. Click "Check-in Member"
3. Select member from dropdown
4. Click "Check-in"

### Create an Invoice
1. Go to Billing page
2. Click "Create Invoice"
3. Fill in:
   - Member name
   - Amount
   - Description
   - Due date
4. Click "Create Invoice"

### Record a Payment
1. Go to Billing page
2. Find invoice in list
3. Click "Mark Paid"
4. Enter amount and method
5. Click "Record Payment"

### View Dashboard
1. Click "Dashboard" in sidebar
2. See key metrics:
   - Active members count
   - Today's revenue
   - Daily gym visits
   - Pending payments

---

## 🔧 Customization

### Change Brand Colors

Edit `app/globals.css`:
```css
:root {
  --primary: 0 0% 9.0%;          /* Main brand color */
  --secondary: 0 0% 96.1%;       /* Secondary color */
  /* ... other colors ... */
}
```

### Modify Sidebar

Edit `components/layout/sidebar.tsx`:
```tsx
// Change navigation items
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  // ... add more items ...
]
```

### Add New Page

1. Create folder: `app/mypage/`
2. Create file: `app/mypage/page.tsx`
3. Use template:

```tsx
'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function MyPage() {
  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>My Page</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your content here */}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
```

4. Add sidebar link in `components/layout/sidebar.tsx`

---

## 📊 Database Integration

The app is ready to connect to your backend. It expects:

### API Base URL
```
http://localhost:5000
```

### Key Endpoints
- `GET /api/members` - Get members list
- `POST /api/members` - Create member
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/checkin` - Check in
- `GET /api/billing` - Get invoices
- `POST /api/billing` - Create invoice
- And more...

### Current Setup
- Backend: Running on port 5000
- Frontend: Running on port 3000
- Direct API calls via Axios
- JWT authentication ready

---

## 🆘 Troubleshooting

### Port 3000 Already in Use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Dependencies Won't Install
```bash
# Clear npm cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Connection Issues
- Verify backend is running on port 5000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Open browser DevTools -> Network tab to see API calls
- Look for error messages in console

### Lost Login Session
- Tokens stored in localStorage
- Clear browser storage if issues
- Re-login to refresh tokens

---

## 📖 Learn More

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
- **Zustand**: https://zustand-demo.vercel.app

---

## 📈 Performance Tips

1. **Use Lazy Loading**
   - Pages load on demand
   - Built into Next.js

2. **Cache API Responses**
   - 5-second cache window
   - Reduce API calls

3. **Optimize Images**
   - Use next/image
   - Automatic optimization

4. **Monitor Bundle Size**
   ```bash
   npm run build
   # Check .next/static sizes
   ```

---

## 🔐 Security Reminders

- [ ] Change demo credentials in production
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS on production
- [ ] Never commit `.env.local` with real secrets
- [ ] Keep dependencies updated
  ```bash
  npm outdated        # Check for updates
  npm update          # Update packages
  ```

---

## 🚀 Deployment

When ready to deploy:

1. Read `DEPLOYMENT.md`
2. Choose hosting platform:
   - **Vercel** (recommended for Next.js)
   - **Railway** (for full stack)
   - **Heroku** (traditional option)
   - **AWS** (enterprise)
   - **VPS** (manual control)

3. Set production environment variables
4. Run build test locally:
   ```bash
   npm run build
   npm start
   ```
5. Deploy using platform instructions

---

## 👥 User Roles

### Admin
- Full access to all features
- Create/edit/delete members
- Manage billing and staff
- Access settings

### Staff
- View members
- Check in/out members
- Create invoices
- View reports

### Trainer
- View assigned classes
- Check member attendance
- Limited access to member info

---

## 📱 Mobile Support

The app is fully responsive:
- **Mobile**: Full functionality on phones
- **Tablet**: Optimized for tablets
- **Desktop**: Full-featured desktop experience

---

## 🎯 Next Steps

1. **Explore the Code**
   - Review `lib/store.ts` for state management
   - Check `hooks/index.ts` for custom hooks
   - Look at page components for examples

2. **Modify for Your Gym**
   - Update gym details in Settings
   - Change colors and branding
   - Add your logo

3. **Connect Your Data**
   - Ensure backend is running
   - Add real members
   - Create test invoices

4. **Deploy to Production**
   - Follow DEPLOYMENT.md
   - Set up domain
   - Configure SSL/HTTPS

---

## 🎓 Code Examples

### Make an API Call
```tsx
const { apiClient } = require('@/lib/api-client')

const response = await apiClient.get('/api/members')
if (response.success) {
  console.log(response.data)
}
```

### Use a Hook
```tsx
import { useMembers } from '@/hooks'

export function MyComponent() {
  const { members, fetchMembers } = useMembers()
  
  useEffect(() => {
    fetchMembers()
  }, [])
  
  return <div>{members.length} members</div>
}
```

### Format Data
```tsx
import { formatCurrency, formatDate } from '@/utils/format'

const amount = formatCurrency(1000)      // "$1,000.00"
const date = formatDate('2024-04-03')    // "Apr 03, 2024"
```

---

## 📞 Getting Help

- Check documentation in `/docs`
- Review code comments in source files
- Search existing GitHub issues
- Open new issue with error details
- Check browser console for errors

---

## ✨ You're All Set!

Everything is configured and ready to use.

**Quick reminders:**
- API should be running on port 5000
- Frontend is on port 3000
- Demo username: admin@gym.com
- Demo password: password123
- Read documentation in README.md and DEPLOYMENT.md

---

**Enjoy using GymFlow! 💪**

Built with ❤️ using Next.js, React, and Tailwind CSS
