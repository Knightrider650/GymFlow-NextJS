<USER_REQUEST>
fix the following # GymFlow — Full Feature Audit & Bug Report

Here's a comprehensive breakdown of every feature tested, what works, what needs improvement, and all identified bugs.

***

## ✅ WORKING FEATURES

### 1. Login / Authentication
- Login with email + password works correctly [gymflow-nextjs.vercel](https://gymflow-nextjs.vercel.app/login)
- Role-based access (CEO = Global View) is applied after login
- Session persists across page navigation

### 2. Dashboard (Main)
- Loads correctly with 6 stat cards: Active Members, Today's Revenue, Monthly Revenue, Today's Visits, Pending Payments, Data Consistency [gymflow-nextjs.vercel](https://gymflow-nextjs.vercel.app/dashboard)
- Revenue Trend and Attendance Trend charts render (though empty with no data)
- "Refresh Live Data" button is present
- Data Consistency shows 98% — meaningful metric

### 3. Global Dashboard (`/super-dashboard`)
- Fully functional CEO-level view [gymflow-nextjs.vercel](https://gymflow-nextjs.vercel.app/super-dashboard)
- Shows Total Gyms (1), Global Members (3 active), Total Revenue ($0), Avg Retention (84.2%)
- Gym Directory table lists "GymFlow HQ" with 3 Active Members, 4 Staff, and a "Manage Gym" action
- "Search gyms..." and "Platform Settings" buttons exist (not tested further)

### 4. Leads / CRM (`/leads`)
- Add Lead form works — creates leads with name, email, phone, status, notes [gymflow-nextjs.vercel](https://gymflow-nextjs.vercel.app/leads)
- Edit Lead works — status can be updated (New → Contacted → Converted → Lost) [gymflow-nextjs.vercel](https://gymflow-nextjs.vercel.app/leads)
- "Convert Lead to Member" modal opens with membership plan selector [gymflow-nextjs.vercel](https://gymflow-nextjs.vercel.app/leads)
- Search bar is present and functional UI-wise
- Lead list displays correctly with all columns

### 5. Plans / Membership Plans (`/plans`)
- Full CRUD works: View, Add, Edit, Delete plans [gymflow-nextjs.vercel](https://gymflow-nextjs.vercel.app/plans
<truncated 10884 bytes>
** | No tax rate configuration visible | Add tax configuration to Settings (once Settings works) |
| **Import Excel (Members)** | Button exists but untested | Needs validation, column mapping, and error handling |
| **Member Search** | Can't find anyone due to Bug #2 | Fix underlying data fetch first |
| **Classes — Instructors** | Only "None / Unassigned" | Need a way to add/manage instructors (likely via Staff HR once fixed) |

***

## 📊 SUMMARY TABLE

| Section | Status | Severity |
|---|---|---|
| Login | ✅ Working | — |
| Dashboard (Main) | ✅ Working | — |
| Global Dashboard | ✅ Working | — |
| Leads / CRM | ✅ Mostly Working | Medium (conversion bug) |
| Plans | ✅ Working | Low (typo, duration units) |
| Billing | ⚠️ Partial | High (can't create invoices) |
| Attendance | ⚠️ Partial | High (no members to check in) |
| Calendar | ⚠️ Read-only | Medium |
| Communications | ⚠️ Partial | Critical (campaign broken) |
| Notifications | ⚠️ Empty | Medium |
| Members | ❌ Broken | Critical |
| Classes | ❌ Broken | Critical |
| Inventory | ❌ Broken | Critical |
| Reports | ❌ Crashes | Critical |
| Activity Log | ❌ Crashes | Critical |
| Team Management | ❌ Crashes | Critical |
| Staff HR | ❌ Inaccessible | Critical |
| Settings | ❌ Inaccessible | Critical |
| Feedback | ❌ Inaccessible | Critical |
| Invites | ❌ Inaccessible | Critical |

**The most urgent fix** is the **Branch Management system** — creating it will unblock Members, Classes, Inventory, Attendance, and Billing all at once. After that, the page crashes (Reports, Activity Log, Team) need to be addressed.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-20T11:25:23+05:30.

The user's current state is as follows:
Active Document: c:\Users\prash\GymFlow-NextJS\.git\COMMIT_EDITMSG (LANGUAGE_UNSPECIFIED)
Cursor is on line: 15
Other open documents:
- c:\Users\prash\GymFlow-NextJS\.git\COMMIT_EDITMSG (LANGUAGE_UNSPECIFIED)
</ADDITIONAL_METADATA>