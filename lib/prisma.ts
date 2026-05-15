import { PrismaClient } from '@prisma/client'

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
    }
  }
}

let prisma: PrismaClient;

try {
  prisma = (global as any).prisma || new PrismaClient();
} catch (e) {
  console.warn("Prisma failed to initialize at module level (expected during build). Using dummy client.");
  prisma = {} as PrismaClient;
}

if (process.env.NODE_ENV !== "production") (global as any).prisma = prisma;

export default prisma;
