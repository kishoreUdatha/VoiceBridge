import { prisma } from '../src/config/database';
import { callMonitoringService } from '../src/services/call-monitoring.service';

async function testMonitoringService() {
  console.log('Testing Call Monitoring Service...\n');

  // Get first organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No organization found!');
    await prisma.$disconnect();
    return;
  }
  console.log('Organization:', org.name, '(', org.id, ')');

  // Test date range
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last7Days = new Date(startOfToday);
  last7Days.setDate(last7Days.getDate() - 7);

  console.log('\n--- Testing AI Analytics (Last 7 Days) ---');
  try {
    const aiAnalytics = await callMonitoringService.getCallAnalytics(
      org.id,
      'AI',
      last7Days,
      now
    );
    console.log('Total Calls:', aiAnalytics.totalCalls);
    console.log('Status Distribution:', aiAnalytics.statusDistribution);
    console.log('Queue Distribution:', aiAnalytics.queueDistribution);
    console.log('Volume Data:', aiAnalytics.volumeData);
  } catch (e: any) {
    console.error('AI Analytics Error:', e.message);
  }

  console.log('\n--- Testing HUMAN Analytics (Last 7 Days) ---');
  try {
    const humanAnalytics = await callMonitoringService.getCallAnalytics(
      org.id,
      'HUMAN',
      last7Days,
      now
    );
    console.log('Total Calls:', humanAnalytics.totalCalls);
    console.log('Status Distribution:', humanAnalytics.statusDistribution);
    console.log('Queue Distribution:', humanAnalytics.queueDistribution);
    console.log('Volume Data:', humanAnalytics.volumeData);
  } catch (e: any) {
    console.error('HUMAN Analytics Error:', e.message);
  }

  console.log('\n--- Testing AI Live Calls ---');
  try {
    const aiLiveCalls = await callMonitoringService.getLiveActiveCalls(org.id, 'AI');
    console.log('Live AI Calls:', aiLiveCalls.length);
    if (aiLiveCalls.length > 0) {
      console.log('Sample:', aiLiveCalls[0]);
    }
  } catch (e: any) {
    console.error('AI Live Calls Error:', e.message);
  }

  console.log('\n--- Testing AI Agents ---');
  try {
    const aiAgents = await callMonitoringService.getAgentStatuses(org.id, 'AI');
    console.log('AI Agents:', aiAgents.length);
    if (aiAgents.length > 0) {
      console.log('Sample:', aiAgents[0]);
    }
  } catch (e: any) {
    console.error('AI Agents Error:', e.message);
  }

  await prisma.$disconnect();
  console.log('\nTest complete!');
}

testMonitoringService().catch(console.error);
