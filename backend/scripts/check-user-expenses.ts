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

  console.log('User:', user.firstName, user.lastName, '| Email:', user.email);

  // Get expense counts by status
  const expenses = await prisma.collegeExpense.groupBy({
    by: ['status'],
    where: { userId: user.id },
    _count: true,
    _sum: { amount: true }
  });

  console.log('\nExpenses by status:');
  expenses.forEach((e: any) => {
    console.log(`  ${e.status}: ${e._count} expenses, Total: ₹${e._sum.amount || 0}`);
  });

  // Get total count
  const totalCount = await prisma.collegeExpense.count({
    where: { userId: user.id }
  });

  console.log(`\nTotal expenses: ${totalCount}`);

  // List all expenses
  const allExpenses = await prisma.collegeExpense.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      category: true,
      amount: true,
      status: true,
      description: true,
      createdAt: true
    }
  });

  console.log('\nAll expenses:');
  allExpenses.forEach((e: any) => {
    console.log(`  [${e.status}] ${e.category}: ₹${e.amount} - ${e.description || 'No description'} (${e.createdAt.toLocaleDateString()})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
