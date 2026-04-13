const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  try {
    // Get all raw import records that have been called
    const records = await prisma.rawImportRecord.findMany({
      where: {
        lastCallAt: { not: null },
        status: { notIn: ['PENDING', 'ASSIGNED', 'CALLING'] }
      }
    });

    console.log('Records to backfill:', records.length);

    let created = 0;
    for (const record of records) {
      // Check if call already exists for this phone/user combo
      const exists = await prisma.telecallerCall.findFirst({
        where: {
          phoneNumber: record.phone,
          telecallerId: record.assignedToId,
        }
      });

      if (!exists && record.assignedToId) {
        const outcomeMap = {
          'INTERESTED': 'INTERESTED',
          'NOT_INTERESTED': 'NOT_INTERESTED',
          'NO_ANSWER': 'NO_ANSWER',
          'CALLBACK_REQUESTED': 'CALLBACK',  // Map to valid enum value
          'CONVERTED': 'CONVERTED',
        };

        await prisma.telecallerCall.create({
          data: {
            organizationId: record.organizationId,
            telecallerId: record.assignedToId,
            phoneNumber: record.phone,
            contactName: `${record.firstName} ${record.lastName || ''}`.trim(),
            status: 'COMPLETED',
            outcome: outcomeMap[record.status] || record.status,
            callType: 'OUTBOUND',
            startedAt: record.lastCallAt,
            endedAt: record.lastCallAt,
            duration: 0,
            notes: `Raw Import Record: ${record.id} (backfilled)`,
          }
        });
        created++;
        console.log(`  Created call for: ${record.firstName} - ${record.status}`);
      }
    }

    console.log('\nCreated', created, 'telecallerCall records');

    // Verify
    const total = await prisma.telecallerCall.count();
    console.log('Total telecallerCall records now:', total);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfill();
