import { NextResponse } from 'next/server'

export async function POST() {
  // In a stateless JWT setup, logout is primarily handled by the client
  // (clearing local storage). This endpoint exists to maintain compatibility
  // with the existing API structure.
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
}
