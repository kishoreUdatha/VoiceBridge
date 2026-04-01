import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDraftExpenses() {
  try {
    // Get fieldsales user
    const user = await prisma.user.findFirst({
      where: { email: 'fieldsales@demo.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.firstName, user.lastName);

    // Get a college
    const college = await prisma.college.findFirst({
      where: { organizationId: user.organizationId }
    });

    if (!college) {
      console.log('❌ College not found');
      return;
    }

    console.log('✅ Found college:', college.name);

    // Create draft expenses
    const expense1 = await prisma.collegeExpense.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        collegeId: college.id,
        category: 'TRAVEL_FUEL',
        amount: 350,
        description: 'Petrol - Site visit to college',
        expenseDate: new Date(),
        status: 'DRAFT'
      }
    });

    const expense2 = await prisma.collegeExpense.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        collegeId: college.id,
        category: 'FOOD_MEALS',
        amount: 180,
        description: 'Lunch during college meeting',
        expenseDate: new Date(),
        status: 'DRAFT'
      }
    });

    console.log('');
    console.log('✅ Created 2 draft expenses:');
    console.log('   1. Petrol - ₹350');
    console.log('   2. Lunch - ₹180');
    console.log('');
    console.log('🔄 Refresh the expenses page to see them!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDraftExpenses();
