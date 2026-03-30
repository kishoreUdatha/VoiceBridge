const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function main() {
  const integration = await prisma.apifyIntegration.findFirst();
  const apiToken = integration.apiToken;
  
  const runId = 'Dt20JRI31UeyWBM7B';
  const datasetId = 'DhftoJOwoZlo4oRni';
  
  console.log('Checking run status...');
  
  // Poll for completion
  let status = 'RUNNING';
  let attempts = 0;
  
  while (status === 'RUNNING' || status === 'READY') {
    attempts++;
    
    const response = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}`,
      { params: { token: apiToken } }
    );
    
    status = response.data.data.status;
    console.log(`Attempt ${attempts}: Status = ${status}`);
    
    if (status === 'RUNNING' || status === 'READY') {
      if (attempts > 30) {
        console.log('Timeout - scrape taking too long. Check Apify console.');
        return;
      }
      console.log('Waiting 10 seconds...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  
  if (status === 'SUCCEEDED') {
    console.log('\n✅ Scrape completed! Fetching results...');
    
    // Get dataset items
    const dataResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      { params: { token: apiToken, format: 'json' } }
    );
    
    const items = dataResponse.data;
    console.log(`\nFound ${items.length} results:\n`);
    
    for (const item of items) {
      console.log('---');
      console.log('Name:', item.title || item.name);
      console.log('Phone:', item.phone);
      console.log('Address:', item.address);
      console.log('Website:', item.website);
      console.log('Rating:', item.totalScore);
    }
    
    // Update job status
    await prisma.apifyScrapeJob.updateMany({
      where: { apifyRunId: runId },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date(),
        totalItems: items.length
      }
    });
    
    console.log('\n✅ Job updated in database');
    
  } else {
    console.log('Scrape failed with status:', status);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
