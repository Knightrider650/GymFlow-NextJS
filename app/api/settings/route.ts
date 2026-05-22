import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

const DEFAULT_SETTINGS = {
  membershipRules: {
    defaultDuration: 30,
    renewalGracePeriod: 7,
    allowBackDatedRenewals: false,
    allowFutureDatedStarts: true,
    minFreezeDays: 7,
    maxFreezeDays: 90,
    allowMultipleFreezes: true,
    inactiveAfterExpiryDays: 30,
    blockExpiredCheckIn: true,
  },
  billing: {
    defaultTaxRate: 0,
    invoicePrefix: 'INV-',
    invoiceFormat: '{PREFIX}{YYYY}{NUMBER}',
    autoGenerateInvoice: true,
    allowPartialPayments: false,
    requireRefundReason: true,
    requireRefundApproval: false,
    defaultPaymentDueDays: 7,
  },
  pos: {
    enabledMethods: ['cash', 'card'],
    autoPrintReceipt: false,
    allowGuestSales: true,
  },
  notifications: {
    enabledChannels: ['email', 'in-app'],
    providers: {},
    automations: [],
  },
  attendanceRules: {
    maxCheckInsPerDay: 2,
    lateCutoffMinutes: 15,
    autoNoShow: true,
    blockExpiredCheckIn: true,
  },
  classRules: {
    defaultDuration: 60,
    defaultCapacity: 20,
    bookingLeadTimeHours: 24,
    bookingCutoffMinutes: 15,
    cancellationWindowMinutes: 120,
    enableWaitlist: true,
    autoFillWaitlist: true,
  },
  inventoryRules: {
    lowStockThreshold: 5,
    allowNegativeStock: false,
    trackBatches: false,
    enablePosModule: true,
  },
  system: {
    weekStartDay: 'Monday',
    timeFormat: '12h',
    itemsPerPage: 10,
    theme: 'auto',
    language: 'en',
    compactMode: false,
    showHelpTooltips: true,
    fontSize: 'medium',
  }
}

function mapGymToSettings(gym: any): any {
  if (!gym) return null
  const parsedConfig = (gym.settingsConfig as any) || {}
  return {
    id: gym.id,
    gymName: gym.name,
    gymEmail: gym.email,
    gymPhone: gym.phone,
    gymAddress: gym.address,
    gymLogo: gym.logo,
    currency: gym.currency,
    dateFormat: gym.dateFormat,
    timeZone: gym.timeZone,
    invoicePrefix: gym.invoicePrefix,
    nextInvoiceNumber: gym.nextInvoiceNumber,
    membershipRules: { ...DEFAULT_SETTINGS.membershipRules, ...parsedConfig.membershipRules },
    billing: { ...DEFAULT_SETTINGS.billing, ...parsedConfig.billing },
    pos: { ...DEFAULT_SETTINGS.pos, ...parsedConfig.pos },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...parsedConfig.notifications },
    attendanceRules: { ...DEFAULT_SETTINGS.attendanceRules, ...parsedConfig.attendanceRules },
    classRules: { ...DEFAULT_SETTINGS.classRules, ...parsedConfig.classRules },
    inventoryRules: { ...DEFAULT_SETTINGS.inventoryRules, ...parsedConfig.inventoryRules },
    system: { ...DEFAULT_SETTINGS.system, ...parsedConfig.system },
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const gymId = getGymIdContext(user, req)
    if (!gymId) {
      const firstGym = await prisma.gym.findFirst()
      return NextResponse.json({ success: true, data: mapGymToSettings(firstGym) })
    }

    const gym = await prisma.gym.findUnique({
      where: { id: gymId }
    })

    return NextResponse.json({ success: true, data: mapGymToSettings(gym) })
  } catch (error: any) {
    console.error('Fetch settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to update gym settings' }, { status: 403 })
    }

    const data = await req.json()
    const gymId = await getRequiredGymId(user, req, data)

    const gym = await prisma.gym.findUnique({
      where: { id: gymId }
    })

    if (!gym) {
      return NextResponse.json({ success: false, error: 'Gym not found' }, { status: 404 })
    }

    const {
      id: dummy,
      gymId: dummy2,
      gymName,
      gymEmail,
      gymPhone,
      gymAddress,
      gymLogo,
      currency,
      dateFormat,
      timeZone,
      invoicePrefix,
      nextInvoiceNumber,
      ...configFields
    } = data

    const currentConfig = (gym.settingsConfig as any) || {}
    const mergedConfig = { ...currentConfig }

    for (const key of Object.keys(configFields)) {
      if (configFields[key] && typeof configFields[key] === 'object' && !Array.isArray(configFields[key])) {
        mergedConfig[key] = {
          ...mergedConfig[key],
          ...configFields[key]
        }
      } else {
        mergedConfig[key] = configFields[key]
      }
    }

    const dbUpdate: any = {}
    if (gymName !== undefined) dbUpdate.name = gymName
    if (gymEmail !== undefined) dbUpdate.email = gymEmail
    if (gymPhone !== undefined) dbUpdate.phone = gymPhone
    if (gymAddress !== undefined) dbUpdate.address = gymAddress
    if (gymLogo !== undefined) dbUpdate.logo = gymLogo
    if (currency !== undefined) dbUpdate.currency = currency
    if (dateFormat !== undefined) dbUpdate.dateFormat = dateFormat
    if (timeZone !== undefined) dbUpdate.timeZone = timeZone
    if (invoicePrefix !== undefined) dbUpdate.invoicePrefix = invoicePrefix
    if (nextInvoiceNumber !== undefined) dbUpdate.nextInvoiceNumber = nextInvoiceNumber

    dbUpdate.settingsConfig = mergedConfig

    const updatedGym = await prisma.gym.update({
      where: { id: gymId },
      data: dbUpdate
    })

    return NextResponse.json({ success: true, data: mapGymToSettings(updatedGym) })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  }
}
