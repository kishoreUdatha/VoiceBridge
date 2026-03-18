import { Router, Request, Response } from 'express';
import { exotelService } from '../integrations/exotel.service';
import { voiceAIService } from '../integrations/voice-ai.service';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

const VOICE_PROVIDER = process.env.VOICE_PROVIDER || 'exotel';

/**
 * Test page for making calls
 * Access at: http://localhost:3000/test-call
 */
router.get('/', (req: Request, res: Response) => {
  const baseUrl = config.baseUrl;
  const provider = VOICE_PROVIDER;

  const exotelConfigured = exotelService.isConfigured();
  const isDemoMode = provider === 'demo';

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Voice Call Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        input, select { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        input:focus, select:focus { outline: none; border-color: #4CAF50; }
        button { background: #4CAF50; color: white; padding: 15px 30px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%; }
        button:hover { background: #45a049; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .status { margin-top: 20px; padding: 15px; border-radius: 6px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .warning { background: #fff3cd; color: #856404; }
        .info { background: #e7f3ff; color: #004085; margin-bottom: 20px; padding: 15px; border-radius: 6px; }
        .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        .config-item { padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 14px; }
        .config-item.active { background: #d4edda; }
        .config-item.inactive { background: #f8d7da; }
        pre { background: #f5f5f5; padding: 15px; overflow: auto; border-radius: 6px; font-size: 13px; }
        .provider-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
        .provider-exotel { background: #00b386; color: white; }
        .provider-demo { background: #ff9800; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📞 Voice Call Test
          <span class="provider-badge provider-${provider}">${provider.toUpperCase()}</span>
        </h1>
        <p class="subtitle">Test your AI voice calling integration</p>

        <div class="info">
          <strong>Configuration Status:</strong>
          <div class="config-grid">
            <div class="config-item ${exotelConfigured ? 'active' : 'inactive'}">
              Exotel: ${exotelConfigured ? '✅ Configured' : '❌ Not configured'}
            </div>
            <div class="config-item ${isDemoMode ? 'active' : ''}">
              Demo Mode: ${isDemoMode ? '✅ ACTIVE (No real calls)' : '❌ Off'}
            </div>
            <div class="config-item">
              Active Provider: <strong>${provider}</strong>
            </div>
            <div class="config-item">
              Webhook URL: ${baseUrl}
            </div>
          </div>
        </div>

        <form id="callForm">
          <div class="form-group">
            <label for="phoneNumber">Phone Number to Call:</label>
            <input type="tel" id="phoneNumber" placeholder="+919908787055" value="+91${process.env.TEST_PHONE_NUMBER?.replace('+91', '').replace('+', '') || ''}" required>
            <small style="color:#666">Include country code (e.g., +91 for India)</small>
          </div>

          <div class="form-group">
            <label for="message">Test Message (TTS):</label>
            <input type="text" id="message" value="Hello! This is a test call from your CRM AI Voice system. The integration is working correctly. Goodbye!" />
          </div>

          <button type="submit" id="callBtn">📞 Make Test Call</button>
        </form>

        <div id="result"></div>
      </div>

      <script>
        document.getElementById('callForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const phone = document.getElementById('phoneNumber').value;
          const message = document.getElementById('message').value;
          const resultDiv = document.getElementById('result');
          const btn = document.getElementById('callBtn');

          btn.disabled = true;
          btn.textContent = '📞 Calling...';
          resultDiv.innerHTML = '<div class="status warning">Initiating call... Please wait...</div>';

          try {
            const response = await fetch('/test-call/make', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: phone, message })
            });

            const data = await response.json();

            if (data.success) {
              resultDiv.innerHTML = '<div class="status success">✅ Call initiated successfully!<br><br><strong>Call SID:</strong> ' + data.callSid + '<pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
            } else {
              resultDiv.innerHTML = '<div class="status error">❌ Call failed: ' + data.error + '<pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
            }
          } catch (err) {
            resultDiv.innerHTML = '<div class="status error">❌ Error: ' + err.message + '</div>';
          } finally {
            btn.disabled = false;
            btn.textContent = '📞 Make Test Call';
          }
        });
      </script>
    </body>
    </html>
  `);
});

/**
 * Make a test call
 */
router.post('/make', async (req: Request, res: Response) => {
  const { to, message } = req.body;

  if (!to) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const baseUrl = config.baseUrl;
  const ttsMessage = message || 'Hello! This is a test call from your CRM system.';

  try {
    if (VOICE_PROVIDER === 'exotel') {
      // Use Exotel
      if (!exotelService.isConfigured()) {
        return res.status(400).json({
          success: false,
          error: 'Exotel is not configured. Check EXOTEL_* variables in .env'
        });
      }

      const result = await exotelService.makeCall({
        to,
        statusCallback: `${baseUrl}/api/exotel/webhook/status`,
        customField: 'test-call-' + Date.now(),
      });

      return res.json({
        ...result,
        provider: 'exotel',
      });

    } else if (VOICE_PROVIDER === 'demo') {
      // Demo mode - simulate a call without actually calling
      const demoCallSid = 'DEMO_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      console.log(`[DEMO MODE] Simulating call to ${to}`);
      console.log(`[DEMO MODE] Message: ${ttsMessage}`);

      // Simulate call progression
      setTimeout(() => console.log(`[DEMO MODE] Call ${demoCallSid}: RINGING`), 1000);
      setTimeout(() => console.log(`[DEMO MODE] Call ${demoCallSid}: ANSWERED`), 3000);
      setTimeout(() => console.log(`[DEMO MODE] Call ${demoCallSid}: COMPLETED`), 10000);

      return res.json({
        success: true,
        callSid: demoCallSid,
        status: 'queued',
        provider: 'demo',
        from: 'DEMO_NUMBER',
        to: to,
        message: 'Demo mode - no real call made. Check server logs for simulated progression.',
      });

    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown voice provider: ${VOICE_PROVIDER}. Use 'exotel' or 'demo'.`
      });
    }

  } catch (error: any) {
    console.error('Test call error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.moreInfo || error.response?.data,
    });
  }
});

/**
 * Check account balance/status
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    if (VOICE_PROVIDER === 'exotel') {
      const result = await exotelService.getAccountDetails();
      return res.json({ ...result, provider: 'exotel' });

    } else if (VOICE_PROVIDER === 'demo') {
      return res.json({
        success: true,
        provider: 'demo',
        status: 'active',
        type: 'Demo/Test Mode',
        balance: 'Unlimited (Demo)',
        message: 'Demo mode active. No real calls will be made.',
      });

    } else {
      return res.status(400).json({ success: false, error: 'Unknown provider' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send a test SMS
 */
router.post('/sms', async (req: Request, res: Response) => {
  const { to, message } = req.body;

  if (!to) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const smsMessage = message || 'Hello! This is a test SMS from your CRM system.';

  try {
    if (VOICE_PROVIDER === 'exotel') {
      // Use Exotel for SMS
      if (!exotelService.isConfigured()) {
        return res.status(400).json({
          success: false,
          error: 'Exotel is not configured. Check EXOTEL_* variables in .env'
        });
      }

      const result = await exotelService.sendSMS({
        to,
        body: smsMessage,
      });

      return res.json({
        ...result,
        provider: 'exotel',
      });

    } else {
      return res.status(400).json({
        success: false,
        error: `SMS not supported for provider: ${VOICE_PROVIDER}. Use 'exotel'.`
      });
    }

  } catch (error: any) {
    console.error('Test SMS error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ExoML endpoint for AI agent calls
 * Returns TTS response when Exotel answers the call
 */
router.all('/exoml/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    console.log(`ExoML request for call ${callId}:`, req.body);

    // Get call details with agent
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      res.set('Content-Type', 'application/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="female">Sorry, this call cannot be processed. Goodbye.</Say>
          <Hangup/>
        </Response>`);
    }

    const agent = call.agent;
    const greeting = agent.greeting || `Hello! I'm ${agent.name}. How can I help you today?`;
    const baseUrl = config.baseUrl;

    // Return simple ExoML with TTS greeting
    res.set('Content-Type', 'text/xml');
    const exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>${greeting}</Say>
    <Say>Thank you for your interest. Our team will contact you shortly. Goodbye!</Say>
    <Hangup/>
</Response>`;
    console.log('Sending ExoML:', exoml);
    res.send(exoml);

    // Update call status
    await prisma.outboundCall.update({
      where: { id: callId },
      data: { status: 'IN_PROGRESS', answeredAt: new Date() },
    });

  } catch (error) {
    console.error('ExoML error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="female">An error occurred. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

/**
 * Handle user response after recording
 */
router.post('/exoml-response/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { RecordingUrl, Digits } = req.body;

    console.log(`ExoML response for call ${callId}:`, req.body);

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    // For now, thank the user and end the call
    // In production, you would process the recording with speech-to-text
    // and generate an AI response
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="female" language="en-IN">Thank you for your response. A member of our team will follow up with you shortly. Have a great day!</Say>
        <Hangup/>
      </Response>`);

    // Update call with recording
    if (RecordingUrl) {
      await prisma.outboundCall.update({
        where: { id: callId },
        data: { recordingUrl: RecordingUrl },
      });
    }

  } catch (error) {
    console.error('ExoML response error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="female">Thank you for calling. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

/**
 * Get or create a test AI agent
 */
router.get('/agent', async (req: Request, res: Response) => {
  try {
    // Find existing test agent or create one
    let agent = await prisma.voiceAgent.findFirst({
      where: { name: 'Test AI Agent' },
    });

    if (!agent) {
      // Get first organization
      const org = await prisma.organization.findFirst();
      if (!org) {
        return res.status(400).json({
          success: false,
          error: 'No organization found. Please create an organization first.',
        });
      }

      // Create test agent
      agent = await prisma.voiceAgent.create({
        data: {
          organizationId: org.id,
          name: 'Test AI Agent',
          industry: 'CUSTOMER_CARE',
          greeting: 'Hello! This is an AI assistant from SmartGrow. How can I help you today?',
          voiceId: 'alloy',
          language: 'en-IN',
          isActive: true,
          systemPrompt: 'You are a helpful customer care AI assistant. Be polite, professional, and helpful. Ask how you can assist the caller and try to understand their needs.',
          questions: [
            { question: 'What is your name?', field: 'name' },
            { question: 'How can I help you today?', field: 'query' },
          ],
        },
      });
    }

    return res.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        industry: agent.industry,
        greeting: agent.greeting,
        isActive: agent.isActive,
      },
    });
  } catch (error: any) {
    console.error('Get agent error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List all AI agents
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.voiceAgent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        industry: true,
        greeting: true,
        isActive: true,
      },
    });

    return res.json({ success: true, agents });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Make an AI agent call
 */
router.post('/agent-call', async (req: Request, res: Response) => {
  const { to, agentId } = req.body;

  if (!to) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  try {
    // Get or create agent
    let agent;
    if (agentId) {
      agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });
    } else {
      agent = await prisma.voiceAgent.findFirst({ where: { isActive: true } });
    }

    if (!agent) {
      // Create a default agent
      const org = await prisma.organization.findFirst();
      if (!org) {
        return res.status(400).json({ success: false, error: 'No organization found' });
      }

      agent = await prisma.voiceAgent.create({
        data: {
          organizationId: org.id,
          name: 'Test AI Agent',
          industry: 'CUSTOMER_CARE',
          greeting: 'Hello! This is an AI assistant. How can I help you today?',
          voiceId: 'alloy',
          language: 'en-IN',
          isActive: true,
          systemPrompt: 'You are a helpful AI assistant.',
        },
      });
    }

    const baseUrl = config.baseUrl;

    // Create call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: agent.id,
        phoneNumber: to,
        status: 'INITIATED',
        direction: 'OUTBOUND',
      },
    });

    // Make AI call via Exotel with direct URL (not Passthru App)
    if (exotelService.isConfigured()) {
      // Use direct URL approach - Exotel will hit this URL when call connects
      const webhookUrl = `${baseUrl}/api/exotel/ai-connect/${call.id}`;
      console.log('Making AI call with direct URL:', webhookUrl);

      // Use makeAICall which is specifically designed for outbound IVR/TTS calls
      const result = await exotelService.makeAICall({
        to,
        answerUrl: webhookUrl,  // URL that returns ExoML when customer answers
        customField: JSON.stringify({ callId: call.id, agentId: agent.id }),
        statusCallback: `${baseUrl}/api/exotel/webhook/status`,
        timeLimit: 600,
        timeOut: 30,
      });

      if (result.success) {
        await prisma.outboundCall.update({
          where: { id: call.id },
          data: { twilioCallSid: result.callSid, status: 'QUEUED' },
        });

        return res.json({
          success: true,
          callId: call.id,
          callSid: result.callSid,
          agent: { id: agent.id, name: agent.name },
          greeting: agent.greeting,
          provider: 'exotel',
          message: 'AI call initiated. The agent will greet the caller.',
        });
      } else {
        await prisma.outboundCall.update({
          where: { id: call.id },
          data: { status: 'FAILED' },
        });
        return res.status(500).json({ success: false, error: result.error });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Exotel not configured' });
    }
  } catch (error: any) {
    console.error('Agent call error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AI Agent Call Test Page
 */
router.get('/ai', (req: Request, res: Response) => {
  const baseUrl = config.baseUrl;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Agent Call Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        input, select { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        button { background: #4CAF50; color: white; padding: 15px 30px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%; margin-top: 10px; }
        button:hover { background: #45a049; }
        button:disabled { background: #ccc; }
        button.secondary { background: #2196F3; }
        button.secondary:hover { background: #1976D2; }
        .status { margin-top: 20px; padding: 15px; border-radius: 6px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #e7f3ff; color: #004085; margin-bottom: 20px; padding: 15px; border-radius: 6px; }
        pre { background: #f5f5f5; padding: 15px; overflow: auto; border-radius: 6px; }
        .agent-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 6px; }
        .agent-card h4 { margin: 0 0 10px 0; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
        .badge-active { background: #d4edda; color: #155724; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 AI Agent Call Test</h1>
        <p class="subtitle">Test AI-powered voice calls through your CRM</p>

        <div class="info">
          <strong>How it works:</strong>
          <ol>
            <li>Select or create an AI agent</li>
            <li>Enter the phone number to call</li>
            <li>The AI will greet and interact with the caller</li>
          </ol>
        </div>

        <div id="agents-section">
          <h3>Available AI Agents</h3>
          <div id="agents-list">Loading agents...</div>
          <button class="secondary" onclick="createAgent()" style="margin-top:10px">+ Create Test Agent</button>
        </div>

        <hr style="margin: 30px 0">

        <form id="callForm">
          <div class="form-group">
            <label for="agentSelect">Select AI Agent:</label>
            <select id="agentSelect">
              <option value="">Loading...</option>
            </select>
          </div>

          <div class="form-group">
            <label for="phoneNumber">Phone Number to Call:</label>
            <input type="tel" id="phoneNumber" placeholder="+919908787055" required>
            <small style="color:#666">Include country code (e.g., +91 for India)</small>
          </div>

          <button type="submit" id="callBtn">📞 Make AI Agent Call</button>
        </form>

        <div id="result"></div>
      </div>

      <script>
        // Load agents on page load
        async function loadAgents() {
          try {
            const response = await fetch('/test-call/agents');
            const data = await response.json();

            const agentsList = document.getElementById('agents-list');
            const agentSelect = document.getElementById('agentSelect');

            if (data.agents && data.agents.length > 0) {
              agentsList.innerHTML = data.agents.map(agent =>
                '<div class="agent-card">' +
                  '<h4>' + agent.name + ' <span class="badge badge-active">Active</span></h4>' +
                  '<p>Industry: ' + agent.industry + '</p>' +
                  '<small>' + (agent.greeting || '').substring(0, 100) + '...</small>' +
                '</div>'
              ).join('');

              agentSelect.innerHTML = data.agents.map(agent =>
                '<option value="' + agent.id + '">' + agent.name + ' (' + agent.industry + ')</option>'
              ).join('');
            } else {
              agentsList.innerHTML = '<p>No agents found. Click "Create Test Agent" to create one.</p>';
              agentSelect.innerHTML = '<option value="">No agents - will create one</option>';
            }
          } catch (err) {
            document.getElementById('agents-list').innerHTML = '<p style="color:red">Error loading agents</p>';
          }
        }

        async function createAgent() {
          try {
            const response = await fetch('/test-call/agent');
            const data = await response.json();
            if (data.success) {
              alert('Agent created: ' + data.agent.name);
              loadAgents();
            } else {
              alert('Error: ' + data.error);
            }
          } catch (err) {
            alert('Error creating agent');
          }
        }

        document.getElementById('callForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const phone = document.getElementById('phoneNumber').value;
          const agentId = document.getElementById('agentSelect').value;
          const resultDiv = document.getElementById('result');
          const btn = document.getElementById('callBtn');

          btn.disabled = true;
          btn.textContent = '📞 Calling...';
          resultDiv.innerHTML = '<div class="status" style="background:#fff3cd;color:#856404">Initiating AI agent call...</div>';

          try {
            const response = await fetch('/test-call/agent-call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: phone, agentId: agentId || undefined })
            });

            const data = await response.json();

            if (data.success) {
              resultDiv.innerHTML = '<div class="status success">✅ AI Agent Call Initiated!<br><br>' +
                '<strong>Agent:</strong> ' + data.agent.name + '<br>' +
                '<strong>Call ID:</strong> ' + data.callId + '<br>' +
                '<strong>Provider:</strong> ' + data.provider +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
            } else {
              resultDiv.innerHTML = '<div class="status error">❌ Call failed: ' + data.error + '</div>';
            }
          } catch (err) {
            resultDiv.innerHTML = '<div class="status error">❌ Error: ' + err.message + '</div>';
          } finally {
            btn.disabled = false;
            btn.textContent = '📞 Make AI Agent Call';
          }
        });

        // Load agents on page load
        loadAgents();
      </script>
    </body>
    </html>
  `);
});

/**
 * Update Alex agent to Java Developer Recruiter
 */
router.post('/update-alex-agent', async (req: Request, res: Response) => {
  try {
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        OR: [
          { name: 'Alex - IT Recruiter' },
          { name: 'Alex - Java Developer Recruiter' }
        ]
      },
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Alex agent not found' });
    }

    const updatedAgent = await prisma.voiceAgent.update({
      where: { id: agent.id },
      data: {
        name: 'Alex - Java Developer Recruiter',
        systemPrompt: `You are Alex, a professional IT recruiter specializing in hiring Java Developers. Your role is to:

SCREENING OBJECTIVES:
- Screen candidates for Senior Java Developer positions
- Assess Core Java knowledge (Collections, Multithreading, OOP concepts)
- Evaluate Spring Boot and Microservices experience
- Check database skills (SQL, MySQL, PostgreSQL, MongoDB)
- Understand their experience with REST APIs and system design
- Collect salary expectations and availability

TECHNICAL ASSESSMENT AREAS:
1. Core Java: Collections framework, Streams API, Lambda expressions, Multithreading, Exception handling
2. Spring Framework: Spring Boot, Spring MVC, Spring Security, Spring Data JPA
3. Microservices: Service design, API Gateway, Service Discovery, Circuit Breaker patterns
4. Database: SQL queries, JPA/Hibernate, database optimization
5. Tools: Git, Maven/Gradle, Docker, Jenkins, AWS/Azure basics
6. Design Patterns: Singleton, Factory, Builder, Observer, Strategy

CONVERSATION STYLE:
- Be professional, friendly, and encouraging
- Ask one question at a time and wait for the response
- Provide brief acknowledgment before moving to next question
- If candidate seems nervous, reassure them this is just a preliminary screening
- Keep technical questions practical, not tricky`,
        greeting: "Hello! I'm Alex, an AI recruiter from SmartGrow Technologies. Thank you for applying for our Senior Java Developer position. I'll be conducting a brief screening call to understand your background and technical expertise. This should take about 10-15 minutes. Shall we begin?",
        fallbackMessage: "I didn't quite catch that. Could you please repeat your answer?",
        transferMessage: "Based on your profile, I'd like to connect you with our technical hiring manager for the next round. Please hold.",
        endMessage: "Excellent! Thank you for your time today. Your profile looks promising for our Java Developer role. Our HR team will reach out within 2-3 business days with next steps. Have a great day!",
        widgetTitle: 'Java Developer Hiring',
        widgetSubtitle: 'Senior Java Developer Position',
        questions: [
          { id: 'name', question: 'May I have your full name please?', field: 'firstName', required: true },
          { id: 'experience', question: 'How many years of experience do you have working with Java?', field: 'experience', required: true },
          { id: 'current_role', question: 'What is your current job title and company?', field: 'currentRole', required: true },
          { id: 'java_version', question: 'Which versions of Java have you worked with? Are you familiar with Java 8 features like Streams and Lambda expressions?', field: 'javaVersion', required: true },
          { id: 'spring_boot', question: 'Do you have experience with Spring Boot? Can you briefly describe a project where you used it?', field: 'springBoot', required: true },
          { id: 'microservices', question: 'Have you worked with Microservices architecture? What tools did you use for service communication?', field: 'microservices', required: true },
          { id: 'database', question: 'Which databases have you worked with? Are you comfortable writing complex SQL queries?', field: 'database', required: true },
          { id: 'rest_api', question: 'Can you explain your experience building REST APIs? What about API security and authentication?', field: 'restApi', required: true },
          { id: 'devops', question: 'Are you familiar with Docker, Kubernetes, or any CI/CD tools like Jenkins?', field: 'devops', required: false },
          { id: 'current_ctc', question: 'What is your current CTC or salary package?', field: 'currentCtc', required: true },
          { id: 'expected_ctc', question: 'What are your salary expectations for this role?', field: 'expectedCtc', required: true },
          { id: 'notice_period', question: 'What is your notice period? Are you open to early joining if required?', field: 'noticePeriod', required: true },
          { id: 'location', question: 'Are you open to working from our Hyderabad office, or do you prefer remote work?', field: 'location', required: true },
        ],
        faqs: [
          { question: 'What is the job role?', answer: 'We are hiring for a Senior Java Developer position. You will be working on building scalable backend services using Java, Spring Boot, and Microservices architecture.' },
          { question: 'What is the salary range?', answer: 'The salary range for this position is between 12 to 25 LPA, depending on experience and skills.' },
          { question: 'Is remote work available?', answer: 'Yes, we offer a hybrid model with 3 days in office and 2 days remote. Fully remote options may be available for senior candidates.' },
          { question: 'What is the tech stack?', answer: 'Our tech stack includes Java 17, Spring Boot 3, PostgreSQL, MongoDB, Kafka, Docker, Kubernetes, and AWS.' },
          { question: 'What are the interview rounds?', answer: 'There are 4 rounds: This AI screening, followed by a technical coding round, a system design round, and finally an HR discussion.' },
        ],
      },
    });

    return res.json({
      success: true,
      message: 'Alex agent updated to Java Developer Recruiter',
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        greeting: updatedAgent.greeting,
      },
    });
  } catch (error: any) {
    console.error('Update agent error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
