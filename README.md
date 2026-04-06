# 💪 GymFlow - Professional Gym Management System v2.0

> A modern, feature-rich gym management system built with Next.js, React, and Tailwind CSS

## 📋 Overview

GymFlow is a complete, production-ready gym management system designed to streamline all operations for gym businesses. It provides a sleek, modern interface built with Next.js and shadcn/ui components, offering comprehensive functionality for managing members, tracking attendance, processing payments, scheduling classes, and generating detailed analytics.

**Status:** ✅ **Production Ready**  
**Version:** 2.0.0  
**Last Updated:** April 2026

---

## 🎯 Key Features

### 👥 Member Management
- **Comprehensive Profiles**: Store personal details, contact info, emergency contacts
- **Membership Types**: Basic, Premium, Elite, Trial
- **Status Tracking**: Active, Expired, Pending, Cancelled
- **Search & Filter**: Quick member lookup by name, email, phone
- **Bulk Operations**: Edit or delete multiple members at once
- **Import/Export**: CSV support for data migration

### 📅 Attendance Tracking
- **Real-time Check-in/Check-out**: Log member visits with timestamps
- **Attendance History**: View detailed records with notes
- **Daily Reports**: Track gym traffic patterns
- **Duration Calculation**: Automatic workout duration tracking
- **Batch Check-in**: Check in multiple members quickly

### 💰 Billing & Payment Processing
- **Automated Invoicing**: Create invoices for memberships, services, products
- **Multiple Payment Methods**: Cash, Card, Bank Transfer, Cheque
- **Payment Status Tracking**: Paid, Pending, Overdue, Partial
- **Revenue Reports**: Monthly and custom period reports
- **Payment Reminders**: Automatic notifications for pending payments
- **Invoice Management**: Create, edit, track, and archive invoices

### 🏋️ Class Scheduling
- **Class Management**: Create and manage fitness classes
- **Instructor Assignment**: Assign trainers to classes
- **Capacity Control**: Prevent overbooking with limits
- **Member Enrollment**: Track class attendance
- **Schedule Management**: Recurring and custom schedules
- **Notification System**: Alert members of class updates

### 📦 Inventory Management
- **Stock Tracking**: Monitor equipment, supplements, merchandise
- **Low Stock Alerts**: Automatic notifications when items need reordering
- **Categorization**: Equipment, Consumables, Services, Merchandise
- **Cost Tracking**: Monitor inventory costs and value
- **Usage Reports**: Track inventory consumption trends

### 👨‍💼 Staff & HR Management
- **Staff Profiles**: Manage trainers, receptionists, maintenance staff
- **Role-based Access**: Admin, Staff, Trainer roles
- **Payroll Tracking**: Salary and employment details
- **Performance Metrics**: Track staff-related statistics
- **Contact Management**: Store and manage staff information

### 📊 Advanced Analytics & Reporting
- **Interactive Dashboard**: Real-time overview of key metrics
- **8+ Report Types**:
  - Revenue Analysis (daily/weekly/monthly)
  - Member Retention Analysis
  - Attendance Trends
  - Staff Performance
  - Inventory Status
  - Conversion Rates
  - Class Popularity
  - Equipment Usage
- **Export Functionality**: Download reports as CSV/PDF
- **Trend Analysis**: Visual charts and graphs
- **Custom Date Ranges**: Filter reports by any period

### 🔔 Real-time Notifications
- **Membership Expiry Alerts**: Notify before expiration
- **Low Stock Warnings**: Alert when inventory is low
- **Payment Reminders**: Remind members of pending payments
- **Class Updates**: Notify of schedule changes
- **System Notifications**: Important gym events

---

## 🛠️ Technology Stack

### Frontend (Next.js + React)
```
┌─────────────────────────────────────────────┐
│ Next.js 14 (App Router)                     │
├─────────────────────────────────────────────┤
│ React 18 (Hooks, Context)                   │
├─────────────────────────────────────────────┤
│ Tailwind CSS 3 (Styling)                    │
├─────────────────────────────────────────────┤
│ shadcn/ui (Component Library)               │
├─────────────────────────────────────────────┤
│ Zustand (State Management)                  │
├─────────────────────────────────────────────┤
│ React Hook Form (Form Management)           │
├─────────────────────────────────────────────┤
│ Recharts (Data Visualization)               │
├─────────────────────────────────────────────┤
│ Axios (HTTP Client)                         │
├─────────────────────────────────────────────┤
│ date-fns (Date Manipulation)                │
├─────────────────────────────────────────────┤
│ Lucide React (Icons)                        │
└─────────────────────────────────────────────┘
```

### Backend (Node.js + Express)
```
┌──────────────────────────────────────────────┐
│ Node.js v18+ & Express.js v4.18+            │
├──────────────────────────────────────────────┤
│ Authentication: JWT + refresh tokens        │
├──────────────────────────────────────────────┤
│ Security: bcrypt, helmet, CORS, rate limit  │
├──────────────────────────────────────────────┤
│ Real-time: Socket.io (WebSockets)           │
├──────────────────────────────────────────────┤
│ Database: PostgreSQL (production)           │
│           JSON file (development)           │
├──────────────────────────────────────────────┤
│ Validation: express-validator               │
├──────────────────────────────────────────────┤
│ DevOps: PM2, Docker, AWS deployment-ready   │
└──────────────────────────────────────────────┘
```

### Infrastructure
- **Hosting**: AWS Elastic Beanstalk (backend) + S3 + CloudFront (frontend)
- **Database**: PostgreSQL (AWS RDS)
- **Containerization**: Docker support
- **CI/CD**: GitHub Actions ready
- **Monitoring**: CloudWatch integration

---

## 📦 Installation & Setup

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/gymflow-nextjs.git
cd gymflow-nextjs
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_JWT_SECRET=your_secret_key_here
```

### 4. Run Development Server
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Connect Backend
- Ensure the backend server is running on `http://localhost:5000`
- The frontend will automatically connect to the API

### 6. Default Credentials
```
Email: admin@gym.com
Password: password123
```

---

## 🚀 Quick Start Guide

### Login
1. Navigate to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter demo credentials (admin@gym.com / password123)
3. Click "Sign In"

### Add Your First Member
1. Go to **Members** page
2. Click **"Add Member"** button
3. Fill in member details:
   - Full Name
   - Email
   - Phone
   - Membership Type
   - Join & Expiry dates
4. Click "Add Member"

### Record Check-in
1. Go to **Attendance** page
2. Click **"Check-in Member"** button
3. Select member from dropdown
4. Add optional notes
5. Click "Check-in"

### Create Invoice
1. Go to **Billing** page
2. Click **"Create Invoice"** button
3. Select member and amount
4. Set due date
5. Click "Create Invoice"

### View Dashboard
1. Navigate to **Dashboard**
2. View real-time statistics:
   - Active members count
   - Today's revenue
   - Daily visits
   - Pending payments
3. Check revenue and attendance charts

---

## 📚 Project Structure

```
gymflow-nextjs/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home/index page
│   ├── globals.css              # Global styles
│   ├── login/                   # Authentication pages
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── dashboard/               # Main features
│   │   └── page.tsx             # Dashboard home
│   ├── members/
│   │   └── page.tsx             # Members management
│   ├── attendance/
│   │   └── page.tsx             # Check-in/Check-out
│   ├── billing/
│   │   └── page.tsx             # Invoices & payments
│   ├── classes/
│   │   └── page.tsx             # Class scheduling
│   ├── inventory/
│   │   └── page.tsx             # Stock management
│   ├── staff/
│   │   └── page.tsx             # HR management
│   ├── notifications/
│   │   └── page.tsx             # Alerts & notifications
│   └── settings/
│       └── page.tsx             # Configuration
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   └── dialog.tsx
│   └── layout/                  # Layout components
│       ├── sidebar.tsx          # Navigation sidebar
│       └── protected-layout.tsx # Auth protection wrapper
│
├── lib/
│   ├── api-client.ts           # Axios HTTP client
│   ├── store.ts                # Zustand state management
│   └── utils.ts                # Utility functions
│
├── hooks/
│   └── index.ts                # Custom React hooks
│
├── utils/
│   └── format.ts               # Formatting utilities
│
├── types/
│   └── index.ts                # TypeScript types & interfaces
│
├── public/                     # Static assets
│
├── .env.local                  # Environment variables
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── README.md                   # This file
```

---

## 🔐 Security Features

- ✅ **JWT Authentication** with 15-minute token expiry
- ✅ **Password Hashing** with bcrypt
- ✅ **Rate Limiting** (10 login attempts per 15 minutes)
- ✅ **XSS Protection** with sanitize-html
- ✅ **CORS** enabled for trusted origins
- ✅ **Secure Headers** via helmet
- ✅ **SQL Injection Prevention** via prepared statements
- ✅ **Refresh Token Rotation** for enhanced security
- ✅ **HTTPS Ready** for production
- ✅ **Role-based Access Control** (RBAC)

---

## 📝 API Integration

The frontend communicates with the backend via RESTful API endpoints:

### Key Endpoints

**Authentication**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

**Members**
- `GET /api/members` - Get all members
- `POST /api/members` - Create member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

**Attendance**
- `GET /api/attendance` - Get records
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/:id/checkout` - Check out

**Billing**
- `GET /api/billing` - Get invoices
- `POST /api/billing` - Create invoice
- `POST /api/payments` - Record payment

**And more...** (Classes, Inventory, Staff, Settings, Notifications)

---

## 🎨 Customization

### Change Brand Colors
Edit `app/globals.css`:
```css
:root {
  --primary: 0 0% 9.0%;  /* Change to your brand color */
  --secondary: 0 0% 96.1%;
  /* ... other colors ... */
}
```

### Add New Pages
1. Create new folder in `app/` (e.g., `app/reports/`)
2. Add `page.tsx`:
```tsx
'use client'
import { ProtectedLayout } from '@/components/layout/protected-layout'

export default function ReportsPage() {
  return (
    <ProtectedLayout>
      {/* Your content here */}
    </ProtectedLayout>
  )
}
```
3. Add navigation item in `components/layout/sidebar.tsx`

### Create New Components
```tsx
// components/custom/MyComponent.tsx
export function MyComponent() {
  return <div>Custom content</div>
}
```

Then import and use:
```tsx
import { MyComponent } from '@/components/custom/MyComponent'
```

---

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

---

## 📊 Analytics & Reporting

The dashboard provides comprehensive analytics:

1. **Real-time Stats**: Active members, revenue, daily visits
2. **Revenue Trends**: Weekly/monthly revenue charts
3. **Attendance Patterns**: Daily visit trends
4. **Member Analytics**: Retention, growth, churn
5. **Payment Status**: Paid vs pending invoices
6. **Inventory Status**: Low stock alerts

### Export Reports
Click "Download" on any report to export as CSV.

---

## 🚀 Deployment

### Deploy to Vercel (Recommended for Frontend)
```bash
npm install -g vercel
vercel
```

### Deploy Backend to Heroku/AWS
See backend repository for deployment instructions.

### Environment Variables for Production
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
NEXT_PUBLIC_JWT_SECRET=your_production_secret
```

---

## 📞 Support & Documentation

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@gymflow.app
- **Documentation**: [Full Docs](./docs/)

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 💡 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-gym support
- [ ] AI-powered member recommendations
- [ ] Video tutorials integration
- [ ] API documentation (Swagger)
- [ ] Automated backups
- [ ] Two-factor authentication
- [ ] Member app/portal
- [ ] Advanced reporting (PDF generation)

---

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI Components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- State management with [Zustand](https://zustand-demo.vercel.app/)

---

## ⭐ Show Your Support

If you find this project helpful, please give it a star! ⭐

---

**Made with 💪 for gym owners and fitness enthusiasts**

Last Updated: April 2026 | Version 2.0.0
