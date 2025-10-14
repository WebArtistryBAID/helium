import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const base =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? [ 'warn', 'error' ] : [ 'warn', 'error' ]
    })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base

export const prisma = base