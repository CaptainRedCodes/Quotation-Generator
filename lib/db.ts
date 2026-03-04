import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your .env file.\n' +
      'Example: DATABASE_URL=postgresql://user:password@host:5432/dbname'
    )
  }

  console.log("DB: Connecting to database...")
  
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const db = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
