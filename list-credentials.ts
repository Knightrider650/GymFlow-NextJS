import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  try {
    const gyms = await prisma.gym.findMany()
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        fullname: true,
        gymId: true
      }
    })
    
    console.log('--- GYMS ---')
    console.table(gyms.map(g => ({ id: g.id, name: g.name, email: g.email })))
    
    console.log('\n--- USERS ---')
    console.table(users)
  } catch (err) {
    console.error('Database connection failed:', err.message)
    console.log('Note: If this is a local environment without a database, check .env.local or mock-server.js')
  } finally {
    await prisma.$disconnect()
  }
}

main()
