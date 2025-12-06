import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const base =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? [ 'warn', 'error' ] : [ 'warn', 'error' ],
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URI
        })
    })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base

export const prisma = base
