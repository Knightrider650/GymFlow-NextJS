import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  // Create a default gym
  const gym = await prisma.gym.upsert({
    where: { id: 'default-gym' },
    update: {},
    create: {
      id: 'default-gym',
      name: 'GymFlow HQ',
      email: 'contact@gymflow.com',
      phone: '+1 (555) 999-8888',
      address: '123 Fitness Ave, Wellness City',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      invoicePrefix: 'GF-',
    },
  })

  // Create an admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@gym.com' },
    update: {},
    create: {
      email: 'admin@gym.com',
      password: adminPassword,
      fullname: 'Admin User',
      role: 'admin',
      gymId: gym.id,
    },
  })

  // Create CTO user
  const ctoPassword = await bcrypt.hash('cto123', 10)
  await prisma.user.upsert({
    where: { email: 'cto@gym.com' },
    update: {},
    create: {
      email: 'cto@gym.com',
      password: ctoPassword,
      fullname: 'CTO User',
      role: 'admin',
      gymId: gym.id,
    },
  })

  // Create CEO user
  const ceoPassword = await bcrypt.hash('ceo123', 10)
  await prisma.user.upsert({
    where: { email: 'ceo@gym.com' },
    update: {},
    create: {
      email: 'ceo@gym.com',
      password: ceoPassword,
      fullname: 'CEO User',
      role: 'admin',
      gymId: gym.id,
    },
  })

  // Create some initial plans
  await prisma.plan.upsert({
    where: { id: 'plan-1' },
    update: {},
    create: {
      id: 'plan-1',
      name: 'Basic Monthly',
      price: 30,
      durationMonths: 1,
      features: 'Gym Access, Locker Room',
      gymId: gym.id,
    },
  })

  await prisma.plan.upsert({
    where: { id: 'plan-2' },
    update: {},
    create: {
      id: 'plan-2',
      name: 'Annual Premium',
      price: 300,
      durationMonths: 12,
      features: 'Gym Access, Pool, Personal Trainer',
      gymId: gym.id,
    },
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export {}
