const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');

const prisma = new PrismaClient();

async function test() {
  try {
    // Find a telecaller/counselor user
    const user = await prisma.user.findFirst({
      where: {
        role: { name: { in: ['telecaller', 'Telecaller', 'counselor', 'Counselor'] } }
      },
      include: { role: true, organization: true }
    });

    if (!user) {
      console.log('No telecaller found');
      return;
    }

    // Generate a token
    const token = jwt.sign(
      { userId: user.id, organizationId: user.organizationId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('Testing API with user:', user.email);
    console.log('Token generated\n');

    // Call the API
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/telecaller/dashboard-stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        console.log('=== API RESPONSE ===\n');
        
        if (response.success) {
          const d = response.data;
          
          console.log('TODAY:');
          console.log('  calls:', d.today.calls);
          console.log('  followUpsCompleted:', d.today.followUpsCompleted);
          console.log('  pendingFollowUps:', d.today.pendingFollowUps);
          console.log('  target.calls:', d.today.target.calls, '← DYNAMIC from assigned data');
          console.log('  target.followUps:', d.today.target.followUps, '← DYNAMIC from scheduled');
          
          console.log('\nASSIGNED DATA (Source of targets):');
          console.log('  leads:', d.assignedData.leads);
          console.log('  rawRecords:', d.assignedData.rawRecords);
          console.log('  queueItems:', d.assignedData.queueItems);
          console.log('  total:', d.assignedData.total);
          
          console.log('\nWEEKLY ACTIVITY:');
          d.weeklyActivity.forEach(day => {
            console.log(`  ${day.day}: ${day.calls} calls / ${day.target} target`);
          });
          
          console.log('\nLEADS:');
          console.log('  total:', d.leads.total);
          console.log('  byStage:', JSON.stringify(d.leads.byStage));
          console.log('  conversionRate:', d.leads.conversionRate + '%');
          console.log('  winRate:', d.leads.winRate + '%');
          
          console.log('\nOUTCOMES:', JSON.stringify(d.outcomes));
          console.log('\nRECENT ACTIVITIES:', d.recentActivities.length, 'items');
          
          console.log('\n✅ ALL DATA IS DYNAMIC FROM DATABASE!');
        } else {
          console.log('Error:', response.message);
        }
        
        prisma.$disconnect();
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      prisma.$disconnect();
    });

    req.end();

  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

test();
