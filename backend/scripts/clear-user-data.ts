import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'fieldsales@demo.com';

  // Find the user
  const user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    console.log('User not found:', email);
    return;
  }

  console.log('Found user:', user.firstName, user.lastName, '| ID:', user.id);

  // Delete visits
  const deletedVisits = await prisma.collegeVisit.deleteMany({
    where: { userId: user.id }
  });
  console.log('Deleted visits:', deletedVisits.count);

  // Delete expenses
  const deletedExpenses = await prisma.collegeExpense.deleteMany({
    where: { userId: user.id }
  });
  console.log('Deleted expenses:', deletedExpenses.count);

  console.log('\nAll data cleared for', email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
