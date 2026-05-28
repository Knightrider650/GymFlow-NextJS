import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
    }
  }
}

let prisma: PrismaClient;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const rawUrl = process.env.DATABASE_URL;
  const connectionString = rawUrl ? rawUrl.replace(/sslmode=(require|prefer|verify-ca)/g, 'sslmode=verify-full') : undefined;
  const adapter = new PrismaPg({ connectionString: connectionString! })
  prisma = (global as any).prisma || new PrismaClient({ adapter });
} catch (e) {
  console.warn("Prisma failed to initialize at module level (expected during build). Using dummy client.");
  prisma = {} as PrismaClient;
}

if (process.env.NODE_ENV !== "production") (global as any).prisma = prisma;

export default prisma;
