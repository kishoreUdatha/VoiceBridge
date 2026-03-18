import React, { useState } from 'react';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  permission: string;
  body?: Record<string, any>;
  response?: Record<string, any>;
  example?: string;
}

const endpoints: Record<string, Endpoint[]> = {
  Agents: [
    {
      method: 'GET',
      path: '/v1/agents',
      description: 'List all available AI agents',
      permission: 'agents:read',
      response: {
        success: true,
        data: [
          { id: 'uuid', name: 'Sales Agent', industry: 'SALES', isActive: true }
        ],
        count: 1
      },
      example: `curl -X GET "${window.location.origin}/api/v1/agents" \\
  -H "Authorization: Bearer sk_live_your_api_key"`
    },
    {
      method: 'GET',
      path: '/v1/agents/:agentId',
      description: 'Get details of a specific agent',
      permission: 'agents:read',
      response: {
        success: true,
        data: {
          id: 'uuid',
          name: 'Sales Agent',
          description: 'AI agent for sales calls',
          industry: 'SALES',
          language: 'en',
          voiceId: 'alloy',
          greeting: 'Hello! How can I help you today?',
          isActive: true
        }
      },
      example: `curl -X GET "${window.location.origin}/api/v1/agents/agent-id" \\
  -H "Authorization: Bearer sk_live_your_api_key"`
    },
  ],
  Sessions: [
    {
      method: 'POST',
      path: '/v1/sessions',
      description: 'Create a new conversation session',
      permission: 'sessions:create',
      body: {
        agentId: 'uuid (required)',
        metadata: '{ optional user info }'
      },
      response: {
        success: true,
        data: {
          sessionId: 'uuid',
          agentId: 'uuid',
          greeting: 'Hello! How can I help you today?',
          createdAt: '2024-01-01T00:00:00Z'
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/sessions" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"agentId": "your-agent-id"}'`
    },
    {
      method: 'POST',
      path: '/v1/sessions/:sessionId/messages',
      description: 'Send a text message to the session',
      permission: 'sessions:message',
      body: {
        message: 'string (required)'
      },
      response: {
        success: true,
        data: {
          sessionId: 'uuid',
          userMessage: 'Hello',
          response: 'Hi there! How can I assist you today?',
          qualification: {},
          shouldEnd: false
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/sessions/session-id/messages" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, I need help"}'`
    },
    {
      method: 'POST',
      path: '/v1/sessions/:sessionId/audio',
      description: 'Send audio message (speech-to-text + AI response)',
      permission: 'sessions:message',
      body: {
        audio: 'file (required, webm/mp3/wav)'
      },
      response: {
        success: true,
        data: {
          sessionId: 'uuid',
          userMessage: 'transcribed text',
          response: 'AI response',
          audio: 'base64 encoded mp3',
          audioFormat: 'mp3'
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/sessions/session-id/audio" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -F "audio=@recording.webm"`
    },
    {
      method: 'GET',
      path: '/v1/sessions/:sessionId',
      description: 'Get session details and transcript',
      permission: 'sessions:read',
      response: {
        success: true,
        data: {
          sessionId: 'uuid',
          status: 'COMPLETED',
          duration: 120,
          summary: 'Customer inquiry about product',
          sentiment: 'positive',
          transcripts: []
        }
      },
      example: `curl -X GET "${window.location.origin}/api/v1/sessions/session-id" \\
  -H "Authorization: Bearer sk_live_your_api_key"`
    },
    {
      method: 'POST',
      path: '/v1/sessions/:sessionId/end',
      description: 'End an active session',
      permission: 'sessions:create',
      body: {
        status: 'COMPLETED | ABANDONED (optional)'
      },
      response: {
        success: true,
        data: {
          sessionId: 'uuid',
          status: 'COMPLETED',
          duration: 120,
          summary: 'Summary of conversation',
          leadCreated: true
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/sessions/session-id/end" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "COMPLETED"}'`
    },
  ],
  Calls: [
    {
      method: 'POST',
      path: '/v1/calls/outbound',
      description: 'Initiate an outbound AI call',
      permission: 'agents:call',
      body: {
        agentId: 'uuid (required)',
        phoneNumber: 'string (required)',
        metadata: '{ optional }'
      },
      response: {
        success: true,
        data: {
          callId: 'uuid',
          agentId: 'uuid',
          phoneNumber: '+919876543210',
          status: 'INITIATED'
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/calls/outbound" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"agentId": "agent-id", "phoneNumber": "+919876543210"}'`
    },
    {
      method: 'GET',
      path: '/v1/calls/:callId',
      description: 'Get call details and transcript',
      permission: 'sessions:read',
      response: {
        success: true,
        data: {
          callId: 'uuid',
          status: 'COMPLETED',
          duration: 180,
          outcome: 'INTERESTED',
          transcript: [],
          recordingUrl: 'https://...'
        }
      },
      example: `curl -X GET "${window.location.origin}/api/v1/calls/call-id" \\
  -H "Authorization: Bearer sk_live_your_api_key"`
    },
  ],
  Leads: [
    {
      method: 'GET',
      path: '/v1/leads',
      description: 'List leads generated by AI agents',
      permission: 'leads:read',
      response: {
        success: true,
        data: [
          { id: 'uuid', name: 'John Doe', email: 'john@example.com', phone: '+91...' }
        ],
        pagination: { page: 1, limit: 20, total: 100 }
      },
      example: `curl -X GET "${window.location.origin}/api/v1/leads?page=1&limit=20" \\
  -H "Authorization: Bearer sk_live_your_api_key"`
    },
    {
      method: 'POST',
      path: '/v1/leads',
      description: 'Create a new lead',
      permission: 'leads:create',
      body: {
        name: 'string (required)',
        email: 'string (optional)',
        phone: 'string (optional)',
        customFields: '{ optional }'
      },
      response: {
        success: true,
        data: {
          id: 'uuid',
          name: 'John Doe',
          createdAt: '2024-01-01T00:00:00Z'
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/leads" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Doe", "email": "john@example.com", "phone": "+919876543210"}'`
    },
  ],
  Analytics: [
    {
      method: 'GET',
      path: '/v1/analytics/overview',
      description: 'Get analytics overview',
      permission: 'analytics:read',
      response: {
        success: true,
        data: {
          period: { start: '...', end: '...', days: 30 },
          sessions: { total: 100, completed: 85, completionRate: '85.0' },
          calls: { total: 50 },
          leads: { generated: 25 }
        }
      },
      example: `curl -X GET "${window.location.origin}/api/v1/analytics/overview?days=30" \\
  -H "Authorization: Bearer sk_live_your_api_key"`
    },
  ],
  Utilities: [
    {
      method: 'POST',
      path: '/v1/tts',
      description: 'Convert text to speech',
      permission: 'sessions:message',
      body: {
        text: 'string (required)',
        voice: 'alloy | echo | fable | onyx | nova | shimmer (optional)'
      },
      response: {
        success: true,
        data: {
          audio: 'base64 encoded mp3',
          format: 'mp3',
          text: 'original text'
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/tts" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello world", "voice": "alloy"}'`
    },
    {
      method: 'POST',
      path: '/v1/stt',
      description: 'Convert speech to text',
      permission: 'sessions:message',
      body: {
        audio: 'file (required)'
      },
      response: {
        success: true,
        data: {
          text: 'transcribed text',
          audioFormat: 'audio/webm'
        }
      },
      example: `curl -X POST "${window.location.origin}/api/v1/stt" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -F "audio=@recording.webm"`
    },
  ],
};

const ApiDocsPage: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('Agents');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
        <p className="text-gray-600 mt-1">
          Integrate your AI agents with external applications
        </p>
      </div>

      {/* Authentication */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h2>
        <p className="text-gray-600 mb-4">
          All API requests require authentication using an API key. Include your API key in the Authorization header:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 relative">
          <code className="text-green-400 text-sm">
            Authorization: Bearer sk_live_your_api_key_here
          </code>
          <button
            onClick={() => copyToClipboard('Authorization: Bearer sk_live_your_api_key_here', 'auth')}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
          >
            {copiedCode === 'auth' ? (
              <CheckIcon className="h-5 w-5 text-green-400" />
            ) : (
              <ClipboardDocumentIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Base URL</h2>
        <div className="bg-gray-900 rounded-lg p-4">
          <code className="text-green-400 text-sm">{window.location.origin}/api/v1</code>
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rate Limiting</h2>
        <p className="text-gray-600">
          API requests are rate limited based on your API key configuration. Default limit is 1000 requests per hour.
          When exceeded, you'll receive a <code className="bg-gray-100 px-1 rounded">429</code> response.
        </p>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Endpoints</h2>

        {Object.entries(endpoints).map(([section, sectionEndpoints]) => (
          <div key={section} className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === section ? '' : section)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
            >
              <h3 className="text-lg font-medium text-gray-900">{section}</h3>
              {expandedSection === section ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {expandedSection === section && (
              <div className="divide-y">
                {sectionEndpoints.map((endpoint, idx) => (
                  <div key={idx} className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${methodColors[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {endpoint.permission}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4">{endpoint.description}</p>

                    {endpoint.body && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Request Body</h4>
                        <pre className="bg-gray-100 rounded p-3 text-sm overflow-x-auto">
                          {JSON.stringify(endpoint.body, null, 2)}
                        </pre>
                      </div>
                    )}

                    {endpoint.response && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Response</h4>
                        <pre className="bg-gray-100 rounded p-3 text-sm overflow-x-auto">
                          {JSON.stringify(endpoint.response, null, 2)}
                        </pre>
                      </div>
                    )}

                    {endpoint.example && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Example</h4>
                        <div className="bg-gray-900 rounded-lg p-4 relative">
                          <pre className="text-green-400 text-sm overflow-x-auto whitespace-pre-wrap">
                            {endpoint.example}
                          </pre>
                          <button
                            onClick={() => copyToClipboard(endpoint.example!, `${section}-${idx}`)}
                            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
                          >
                            {copiedCode === `${section}-${idx}` ? (
                              <CheckIcon className="h-5 w-5 text-green-400" />
                            ) : (
                              <ClipboardDocumentIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error Codes */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Codes</h2>
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-sm font-medium text-gray-700">Code</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700">Description</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b">
              <td className="py-2"><code className="bg-gray-100 px-2 py-0.5 rounded">MISSING_API_KEY</code></td>
              <td className="py-2 text-gray-600">No API key provided in request</td>
            </tr>
            <tr className="border-b">
              <td className="py-2"><code className="bg-gray-100 px-2 py-0.5 rounded">INVALID_API_KEY</code></td>
              <td className="py-2 text-gray-600">API key is invalid or expired</td>
            </tr>
            <tr className="border-b">
              <td className="py-2"><code className="bg-gray-100 px-2 py-0.5 rounded">RATE_LIMIT_EXCEEDED</code></td>
              <td className="py-2 text-gray-600">Too many requests, try again later</td>
            </tr>
            <tr className="border-b">
              <td className="py-2"><code className="bg-gray-100 px-2 py-0.5 rounded">PERMISSION_DENIED</code></td>
              <td className="py-2 text-gray-600">API key lacks required permission</td>
            </tr>
            <tr className="border-b">
              <td className="py-2"><code className="bg-gray-100 px-2 py-0.5 rounded">AGENT_NOT_FOUND</code></td>
              <td className="py-2 text-gray-600">Specified agent does not exist</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-gray-100 px-2 py-0.5 rounded">SESSION_NOT_FOUND</code></td>
              <td className="py-2 text-gray-600">Specified session does not exist</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApiDocsPage;
