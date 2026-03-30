import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('Found user:', user.id, user.firstName);

  // Create or get bulk import
  let bulkImport = await prisma.bulkImport.findFirst({
    where: { organizationId: user.organizationId, fileName: 'test-contacts.csv' }
  });

  if (!bulkImport) {
    bulkImport = await prisma.bulkImport.create({
      data: {
        organizationId: user.organizationId,
        uploadedById: user.id,
        fileName: 'test-contacts.csv',
        totalRows: 8,
        validRows: 8,
        status: 'COMPLETED',
      }
    });
    console.log('Created bulk import:', bulkImport.id);
  }

  const contacts = [
    { firstName: 'Rahul', lastName: 'Sharma', phone: '+919876543210', email: 'rahul@test.com' },
    { firstName: 'Priya', lastName: 'Patel', phone: '+919876543211', email: 'priya@test.com' },
    { firstName: 'Amit', lastName: 'Kumar', phone: '+919876543212', email: 'amit@test.com' },
    { firstName: 'Sneha', lastName: 'Gupta', phone: '+919876543213', email: 'sneha@test.com' },
    { firstName: 'Vikram', lastName: 'Singh', phone: '+919876543214', email: 'vikram@test.com' },
    { firstName: 'Anjali', lastName: 'Reddy', phone: '+919876543215', email: 'anjali@test.com' },
    { firstName: 'Karan', lastName: 'Verma', phone: '+919876543216', email: 'karan@test.com' },
    { firstName: 'Neha', lastName: 'Joshi', phone: '+919876543217', email: 'neha@test.com' },
  ];

  for (const c of contacts) {
    try {
      await prisma.rawImportRecord.create({
        data: {
          bulkImportId: bulkImport.id,
          organizationId: user.organizationId,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          email: c.email,
          status: 'ASSIGNED',
          assignedToId: user.id,
          assignedAt: new Date(),
          callAttempts: 0,
        }
      });
      console.log('Created:', c.firstName, c.lastName);
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log('Already exists:', c.firstName);
      } else {
        console.log('Error:', c.firstName, e.message?.substring(0, 50));
      }
    }
  }

  const count = await prisma.rawImportRecord.count({
    where: { assignedToId: user.id, convertedLeadId: null }
  });
  console.log('\nTotal contacts assigned:', count);
}

main().finally(() => prisma.$disconnect());
