# 🚀 GymFlow Quick Start Guide

Get GymFlow running in 5 minutes!

## 📋 Prerequisites

- Node.js v18+
- npm or yarn
- A terminal/command line

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies (1 min)
```bash
npm install
```

### Step 2: Configure API (30 sec)
Create `.env.local` (or copy `.env.example`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

### Step 3: Start Development Server (30 sec)
```bash
npm run dev
```

### Step 4: Open in Browser (30 sec)
Navigate to http://localhost:3000

### Step 5: Login (1 min)
```
Email: admin@gym.com
Password: password123
```

**You're in! 🎉**

---

## 🎯 First Actions

### 1. View Dashboard
Click on "Dashboard" in the sidebar to see:
- Active members count
- Today's revenue
- Daily visits
- Pending payments

### 2. Add a Member
1. Go to **Members**
2. Click **"Add Member"**
3. Fill in required fields
4. Click **"Add Member"**

### 3. Check In a Member
1. Go to **Attendance**
2. Click **"Check-in Member"**
3. Select member from dropdown
4. Click **"Check-in"**

### 4. Create an Invoice
1. Go to **Billing**
2. Click **"Create Invoice"**
3. Fill in member, amount, due date
4. Click **"Create Invoice"**

### 5. View Analytics
1. Go to **Dashboard**
2. Scroll down to see:
   - Revenue trend chart
   - Attendance trend chart
   - Recent invoices
   - Recent check-ins

---

## 🛠️ Available Commands

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## 📁 Project Structure

```
app/               - Page routes
├── dashboard/     - Main dashboard
├── members/       - Member management
├── attendance/    - Check-in/out
├── billing/       - Invoices & payments
├── classes/       - Class scheduling
├── inventory/     - Stock management
├── staff/         - Staff management
└── settings/      - Configuration

components/       - React components
├── ui/           - shadcn/ui components
└── layout/       - Layout components

lib/              - Core libraries
├── api-client.ts  - Axios HTTP client
└── store.ts       - Zustand state

hooks/            - Custom React hooks
utils/            - Utility functions
types/            - TypeScript types
```

---

## 🔧 Customize

### Change API URL
Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-api.com
```

### Modify Theme Colors
Edit `app/globals.css`:
```css
:root {
  --primary: 0 0% 9.0%;  /* Change to your color */
}
```

### Add New Page
1. Create folder: `app/mypage/`
2. Create file: `app/mypage/page.tsx`
3. Add sidebar link in `components/layout/sidebar.tsx`

---

## 🔑 Default Login Credentials

```
Email: admin@gym.com
Password: password123
```

(Change these in production!)

---

## 📚 Next Steps

1. **Connect Backend**: Ensure backend is running on `http://localhost:5000`
2. **Explore Pages**: Visit each page to understand features
3. **Add Test Data**: Add members, create invoices
4. **Review Code**: Check `lib/store.ts` for state management
5. **Customize**: Modify colors, add branding

---

## 🆘 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Dependencies not installing
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Connection Failed
- Check if backend is running on port 5000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for errors

---

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://zustand-demo.vercel.app)

---

## 💡 Tips

- **Dark Mode**: Built with Tailwind dark mode support
- **Mobile Friendly**: Responsive design with Tailwind
- **Type Safe**: Full TypeScript support
- **Modern Stack**: Latest Next.js 14 with App Router
- **Hot Reload**: Fast refresh with dev server

---

## 🎓 Common Tasks

### Add a New Hook
Create in `hooks/index.ts`:
```tsx
export const useMyFeature = () => {
  // Your hook code
}
```

### Add API Call
Use in components:
```tsx
const { data, error } = await apiClient.get('/api/endpoint')
```

### Display Data in Table
Use `Table` component:
```tsx
<Table>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## ⭐ Features You'll See

✅ Beautiful modern UI with dark mode support  
✅ Real-time data updates  
✅ Advanced filtering & search  
✅ Responsive design (mobile, tablet, desktop)  
✅ Charts & analytics  
✅ Form validation  
✅ Toast notifications  
✅ Keyboard shortcuts  

---

## 📞 Need Help?

- Check `.github/README.md` for detailed docs
- Review `DEPLOYMENT.md` for deployment help
- Check individual page comments in code
- Open a GitHub issue

---

**Ready to manage your gym? Let's go! 💪**

Happy coding! 🚀
