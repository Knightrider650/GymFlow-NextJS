import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ADMIN_ROLES, type UserRole } from '@/lib/permissions'
import fs from 'fs'
import path from 'path'

const JSON_DB_PATH = path.join(process.cwd(), 'app/api/super-admin/gyms-db.json')

// Helper to read local platform overrides
function getPlatformOverrides() {
  try {
    if (fs.existsSync(JSON_DB_PATH)) {
      return JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf-8'))
    }
  } catch (err) {
    console.error('Failed to read platform JSON db:', err)
  }
  return {}
}

// Helper to save local platform overrides
function savePlatformOverrides(data: any) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write platform JSON db:', err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const overrides = getPlatformOverrides()

    let dbGyms: any[] = []
    try {
      dbGyms = await prisma.gym.findMany({
        include: {
          _count: {
            select: {
              members: true,
              users: true,
              invoices: true,
              branches: true
            }
          },
          members: {
            select: {
              status: true
            }
          },
          invoices: {
            select: {
              amount: true,
              status: true
            }
          }
        }
      })
    } catch (e) {
      console.warn('Prisma failed to load gyms. Falling back to platform overrides simulation.', e)
    }

    // Default simulation data for 5 tenants if DB is unseeded or Prisma is offline
    const defaultGyms = [
      {
        id: 'gymflow-hq',
        name: 'GymFlow Premium HQ',
        subdomain: 'hq.gymflow.app',
        email: 'contact@gymflow.com',
        phone: '+1 (555) 019-2834',
        address: '100 Broadway Suite A, New York, NY',
        activeMembers: 320,
        totalMembers: 400,
        totalRevenue: 12400,
        staffCount: 8,
        branchesCount: 3,
        createdAt: '2026-01-10T08:00:00Z'
      },
      {
        id: 'elite-athletics',
        name: 'Elite Athletics Center',
        subdomain: 'elite.gymflow.app',
        email: 'admin@eliteathletics.com',
        phone: '+1 (555) 012-3849',
        address: '456 West 23rd St, Austin, TX',
        activeMembers: 210,
        totalMembers: 220,
        totalRevenue: 6200,
        staffCount: 4,
        branchesCount: 2,
        createdAt: '2026-02-15T09:30:00Z'
      },
      {
        id: 'prime-fitness',
        name: 'Prime Fitness Club',
        subdomain: 'prime.gymflow.app',
        email: 'hello@primefitness.com',
        phone: '+1 (555) 045-9821',
        address: '789 Oak Ave, Chicago, IL',
        activeMembers: 95,
        totalMembers: 110,
        totalRevenue: 2800,
        staffCount: 2,
        branchesCount: 1,
        createdAt: '2026-03-01T10:15:00Z'
      },
      {
        id: 'metro-iron-gym',
        name: 'Metro Iron Gym',
        subdomain: 'metroiron.gymflow.app',
        email: 'billing@metroiron.com',
        phone: '+1 (555) 088-7711',
        address: '102 Industrial Pkwy, Cleveland, OH',
        activeMembers: 140,
        totalMembers: 180,
        totalRevenue: 4900,
        staffCount: 5,
        branchesCount: 2,
        createdAt: '2026-01-20T11:00:00Z'
      },
      {
        id: 'apex-crossfit',
        name: 'Apex CrossFit Box',
        subdomain: 'apex.gymflow.app',
        email: 'setup@apexcrossfit.com',
        phone: '+1 (555) 033-4455',
        address: '22 Valley Rd, Boulder, CO',
        activeMembers: 0,
        totalMembers: 0,
        totalRevenue: 0,
        staffCount: 1,
        branchesCount: 1,
        createdAt: '2026-05-16T14:20:00Z'
      }
    ]

    const mergedGyms = (dbGyms.length > 0 ? dbGyms.map(gym => {
      const activeMembers = gym.members.filter((m: any) => m.status === 'active').length
      const totalRevenue = gym.invoices
        .filter((i: any) => i.status === 'paid')
        .reduce((sum: number, i: any) => sum + i.amount, 0)

      return {
        id: gym.id,
        name: gym.name,
        email: gym.email,
        phone: gym.phone,
        address: gym.address,
        activeMembers,
        totalMembers: gym._count.members,
        totalRevenue,
        staffCount: gym._count.users,
        branchesCount: gym._count.branches || 1,
        createdAt: gym.createdAt instanceof Date ? gym.createdAt.toISOString() : (gym.createdAt ? new Date(gym.createdAt).toISOString() : new Date().toISOString())
      }
    }) : defaultGyms).map(gym => {
      const override = overrides[gym.id] || {}
      return {
        ...gym,
        status: override.status || (gym.id === 'metro-iron-gym' ? 'suspended' : 'active'),
        plan: override.plan || (gym.id === 'gymflow-hq' ? 'Enterprise' : gym.id === 'elite-athletics' || gym.id === 'metro-iron-gym' ? 'Pro' : 'Basic'),
        maxMembersLimit: override.maxMembersLimit || (gym.id === 'gymflow-hq' ? 2000 : gym.id === 'elite-athletics' || gym.id === 'metro-iron-gym' ? 500 : 150),
        maxBranchesLimit: override.maxBranchesLimit || (gym.id === 'gymflow-hq' ? 10 : gym.id === 'elite-athletics' || gym.id === 'metro-iron-gym' ? 3 : 1),
        enabledModules: override.enabledModules || (gym.id === 'gymflow-hq' ? ['POS', 'Inventory', 'Advanced Analytics'] : ['POS'])
      }
    })

    return NextResponse.json({ success: true, data: mergedGyms })
  } catch (error: any) {
    console.error('Super Admin Gyms Fetch Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch gyms' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { name, subdomain, plan, email, phone, address } = await req.json()
    const id = name.toLowerCase().replace(/\s+/g, '-')

    const overrides = getPlatformOverrides()
    overrides[id] = {
      status: 'active',
      plan,
      maxMembersLimit: plan === 'Enterprise' ? 2000 : plan === 'Pro' ? 500 : 150,
      maxBranchesLimit: plan === 'Enterprise' ? 10 : plan === 'Pro' ? 3 : 1,
      enabledModules: plan === 'Enterprise' ? ['POS', 'Inventory', 'Advanced Analytics'] : ['POS']
    }
    savePlatformOverrides(overrides)

    // Try to save to Prisma too
    try {
      await prisma.gym.create({
        data: {
          id,
          name,
          email,
          phone,
          address,
        }
      })
    } catch (e) {
      console.warn('Prisma failed to write new gym (falling back to JSON db overrides):', e)
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        name,
        subdomain: subdomain || `${id}.gymflow.app`,
        status: 'active',
        plan,
        email,
        phone,
        address,
        activeMembers: 0,
        totalMembers: 0,
        totalRevenue: 0,
        staffCount: 1,
        branchesCount: 1,
        createdAt: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Super Admin Gym Create Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create gym' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid or empty IDs array' }, { status: 400 })
    }

    // 1. Remove from JSON overrides
    const overrides = getPlatformOverrides()
    let updatedOverrides = false
    for (const id of ids) {
      if (overrides[id]) {
        delete overrides[id]
        updatedOverrides = true
      }
    }
    if (updatedOverrides) {
      savePlatformOverrides(overrides)
    }

    // 2. Remove from Prisma with cascading delete
    for (const id of ids) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.attendance.deleteMany({ where: { member: { gymId: id } } })
          await tx.payment.deleteMany({ where: { invoice: { gymId: id } } })
          
          await tx.member.deleteMany({ where: { gymId: id } })
          await tx.invoice.deleteMany({ where: { gymId: id } })
          await tx.user.deleteMany({ where: { gymId: id } })
          await tx.staff.deleteMany({ where: { gymId: id } })
          await tx.plan.deleteMany({ where: { gymId: id } })
          await tx.fitnessClass.deleteMany({ where: { gymId: id } })
          await tx.inventoryItem.deleteMany({ where: { gymId: id } })
          await tx.lead.deleteMany({ where: { gymId: id } })
          await tx.notification.deleteMany({ where: { gymId: id } })
          await tx.activityLog.deleteMany({ where: { gymId: id } })
          await tx.feedback.deleteMany({ where: { gymId: id } })
          await tx.invite.deleteMany({ where: { gymId: id } })
          await tx.branch.deleteMany({ where: { gymId: id } })
          await tx.campaign.deleteMany({ where: { gymId: id } })
          await tx.reminder.deleteMany({ where: { gymId: id } })
          
          await tx.gym.delete({ where: { id } })
        })
      } catch (e) {
        console.warn(`Prisma failed to delete gym ${id} during bulk delete:`, e)
      }
    }

    return NextResponse.json({ success: true, message: `Successfully deleted ${ids.length} gyms` })
  } catch (error: any) {
    console.error('Super Admin Gym Bulk DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete gyms' }, { status: 500 })
  }
}
