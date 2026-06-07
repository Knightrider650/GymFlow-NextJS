import prisma from './lib/prisma'
import 'dotenv/config'

async function main() {
  console.log('Fetching users from database...')
  try {
    const users = await prisma.user.findMany({
      include: { gym: true }
    })
    console.log('Total users:', users.length)
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Role: ${u.role}, Gym: ${u.gym?.name}, Password Hash: ${u.password}`)
    })
  } catch (e: any) {
    console.error('Error fetching users:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
