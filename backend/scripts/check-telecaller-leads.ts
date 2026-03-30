import { prisma } from '../src/config/database';

async function checkAssignments() {
  try {
    // Get telecaller2
    const telecaller = await prisma.user.findFirst({
      where: { email: 'telecaller2@demo.com' },
      include: { role: true }
    });

    if (!telecaller) {
      console.log('Telecaller not found');
      return;
    }

    console.log('======================================');
    console.log('Telecaller:', telecaller.firstName, telecaller.lastName);
    console.log('Email:', telecaller.email);
    console.log('Role:', telecaller.role?.name);
    console.log('======================================\n');

    // Get assigned leads
    const assignments = await prisma.leadAssignment.findMany({
      where: {
        assignedToId: telecaller.id,
        isActive: true
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, phone: true }
        }
      }
    });

    console.log('Assigned Leads (' + assignments.length + '):\n');

    if (assignments.length === 0) {
      console.log('  ❌ No leads assigned to this telecaller!');
      console.log('');
      console.log('  To test role-based access:');
      console.log('  1. Login as ADMIN (admin@demo.com / Demo@123)');
      console.log('  2. Go to Leads page');
      console.log('  3. Assign some leads to telecaller2@demo.com');
      console.log('  4. Then login as telecaller to see only assigned leads');
    } else {
      for (const a of assignments) {
        console.log('  ✅ ' + a.lead.firstName + ' ' + (a.lead.lastName || ''));
        console.log('     ID: ' + a.lead.id);
        console.log('     Phone: ' + a.lead.phone);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAssignments();
