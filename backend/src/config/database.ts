import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isProduction = process.env.NODE_ENV === 'production';

// Validate DATABASE_URL has connection pooling in production
if (isProduction) {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('connection_limit') && !dbUrl.includes('pgbouncer')) {
    console.warn(
      '⚠️  WARNING: DATABASE_URL should include connection pooling parameters for production.\n' +
      '   Add ?connection_limit=20&pool_timeout=20 to your DATABASE_URL or use PgBouncer.'
    );
  }
  if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('ssl=true')) {
    console.warn(
      '⚠️  WARNING: DATABASE_URL should include sslmode=require for production security.'
    );
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
    // Connection pool configuration via datasource URL parameters:
    // Production: ?connection_limit=20&pool_timeout=20&sslmode=require
    // These should be set in DATABASE_URL environment variable
  });

// Prevent multiple instances in development (hot reload)
if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('Database disconnected');
}
