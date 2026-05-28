import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const responseStream = new TransformStream()
  const writer = responseStream.writable.getWriter()
  const encoder = new TextEncoder()

  // Send a heartbeat every 15 seconds to keep the SSE connection alive
  const intervalId = setInterval(() => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`))
    } catch (err) {
      clearInterval(intervalId)
    }
  }, 15000)

  req.signal.addEventListener('abort', () => {
    clearInterval(intervalId)
    try {
      writer.close()
    } catch (err) {
      // Stream might already be closed
    }
  })

  // Write initial connection confirmation event
  try {
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream connected' })}\n\n`))
  } catch (err) {
    clearInterval(intervalId)
  }

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
