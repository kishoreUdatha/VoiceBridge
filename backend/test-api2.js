const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst({
      where: { role: { name: { in: ['telecaller', 'Telecaller', 'counselor', 'Counselor'] } } },
      include: { role: true }
    });

    if (!user) {
      console.log('No telecaller found');
      return;
    }

    const token = jwt.sign(
      { userId: user.id, organizationId: user.organizationId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('\n=== Test with curl ===\n');
    console.log('Run this command:\n');
    console.log(`curl -s -H "Authorization: Bearer ${token}" http://localhost:3000/api/telecaller/dashboard-stats | jq .`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
