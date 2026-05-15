import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
    }
  }
}

const prisma = (global as any).prisma || new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
});

if (process.env.NODE_ENV !== "production") (global as any).prisma = prisma;

export default prisma;
