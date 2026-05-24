import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { memberId } = await req.json()
    if (!memberId) {
      return NextResponse.json({ success: false, error: 'Member ID is required' }, { status: 400 })
    }

    const gymId = getGymIdContext(user, req)

    const member = await prisma.member.findFirst({
      where: { 
        id: memberId,
        ...(gymId ? { gymId } : {})
      }
    })

    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if already checked in today without checking out
    const activeCheckin = await prisma.attendance.findFirst({
      where: {
        memberId,
        recordedDate: today,
        checkOutTime: null
      }
    })

    if (activeCheckin) {
      // Perform Check-Out
      const updatedRecord = await prisma.attendance.update({
        where: { id: activeCheckin.id },
        data: { checkOutTime: new Date() },
        include: {
          member: {
            select: { name: true, membershipType: true, status: true }
          }
        }
      })

      await prisma.activityLog.create({
        data: {
          action: 'Check Out',
          details: `${member.name} checked out via QR scan`,
          entityType: 'Attendance',
          entityId: updatedRecord.id,
          userName: user.email,
          userId: user.userId,
          gymId: member.gymId
        }
      })

      const formattedData = {
        ...updatedRecord,
        memberName: updatedRecord.member.name,
        membershipType: updatedRecord.member.membershipType,
        memberStatus: updatedRecord.member.status
      }

      return NextResponse.json({
        success: true,
        action: 'checkout',
        message: `${member.name} checked out successfully`,
        data: formattedData
      })
    } else {
      // Perform Check-In
      // If member is expired, let's still allow it but return a warning in the response
      const isExpired = member.status === 'expired' || new Date(member.expiryDate) < new Date()

      const record = await prisma.attendance.create({
        data: {
          memberId,
          notes: 'Checked in via QR scan',
          recordedDate: today,
          branchId: member.branchId
        },
        include: {
          member: {
            select: { name: true, membershipType: true, status: true }
          }
        }
      })

      await prisma.activityLog.create({
        data: {
          action: 'Check In',
          details: `${member.name} checked in via QR scan${isExpired ? ' (Membership Expired/Warning)' : ''}`,
          entityType: 'Attendance',
          entityId: record.id,
          userName: user.email,
          userId: user.userId,
          gymId: member.gymId
        }
      })

      const formattedData = {
        ...record,
        memberName: record.member.name,
        membershipType: record.member.membershipType,
        memberStatus: record.member.status
      }

      return NextResponse.json({
        success: true,
        action: 'checkin',
        warning: isExpired ? 'Membership is expired or inactive' : null,
        message: `${member.name} checked in successfully`,
        data: formattedData
      })
    }
  } catch (error: any) {
    console.error('Scan attendance error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process QR code scan' }, { status: 500 })
  }
}
