import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Delete all college contacts
  const deleted = await prisma.collegeContact.deleteMany({});
  console.log('Deleted college contacts:', deleted.count);
  
  // Verify
  const remaining = await prisma.collegeContact.count();
  console.log('Remaining contacts:', remaining);
}

main().catch(console.error).finally(() => prisma.$disconnect());
