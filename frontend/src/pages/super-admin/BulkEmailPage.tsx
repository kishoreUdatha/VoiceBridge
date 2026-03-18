import { useState, useEffect } from 'react';
import { superAdminService, Organization } from '../../services/super-admin.service';
import {
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface SendResult {
  organizationId: string;
  organizationName: string;
  email: string;
  success: boolean;
  error?: string;
}

export default function BulkEmailPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'plan' | 'custom'>('all');
  const [planFilter, setPlanFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState(true);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{
    totalSent: number;
    totalFailed: number;
    results: SendResult[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (filterType === 'custom') {
      fetchOrganizations();
    }
  }, [filterType]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const result = await superAdminService.getOrganizations({ limit: 100 });
      setOrganizations(result.organizations);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      alert('Please fill in both subject and body');
      return;
    }

    setSending(true);
    setResults(null);

    try {
      const filter: any = {};

      if (filterType === 'active') {
        filter.isActive = true;
      } else if (filterType === 'plan') {
        filter.planId = planFilter;
        filter.isActive = activeFilter;
      } else if (filterType === 'custom') {
        filter.orgIds = selectedOrgs;
      }

      const result = await superAdminService.sendBulkEmail({
        subject,
        body,
        html: body.replace(/\n/g, '<br>'),
        filter,
      });

      setResults(result);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const getRecipientCount = () => {
    if (filterType === 'custom') {
      return selectedOrgs.length;
    }
    return 'All matching organizations';
  };

  const personalizePreview = (text: string) => {
    return text
      .replace(/{organizationName}/g, 'Example Corp')
      .replace(/{adminName}/g, 'John Doe');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bulk Email</h1>
        <p className="text-sm text-slate-500 mt-1">Send announcements to all organizations on the platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Composer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Compose Email</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Important: Platform Update for {organizationName}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  placeholder={`Hi {adminName},

We're excited to announce new features for {organizationName}!

[Your message here]

Best regards,
CRM Pro Team`}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Available personalization tags:</p>
                  <ul className="mt-1 space-y-1">
                    <li><code className="bg-blue-100 px-1 rounded">{'{organizationName}'}</code> - Organization name</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{adminName}'}</code> - Admin's full name</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings & Send */}
        <div className="space-y-6">
          {/* Recipient Filter */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Recipients</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Send to
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Organizations</option>
                  <option value="active">Active Organizations Only</option>
                  <option value="plan">By Plan</option>
                  <option value="custom">Select Specific</option>
                </select>
              </div>

              {filterType === 'plan' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Plan
                    </label>
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Plan</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.checked)}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-700">Active only</span>
                  </label>
                </>
              )}

              {filterType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Organizations ({selectedOrgs.length} selected)
                  </label>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y">
                      {organizations.map((org) => (
                        <label
                          key={org.id}
                          className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrgs.includes(org.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrgs([...selectedOrgs, org.id]);
                              } else {
                                setSelectedOrgs(selectedOrgs.filter((id) => id !== org.id));
                              }
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-slate-700">{org.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Recipients: <span className="font-medium text-slate-800">{getRecipientCount()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="space-y-3">
              <button
                onClick={() => setShowPreview(true)}
                className="w-full px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors font-medium"
              >
                Preview Email
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Send Bulk Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Send Results</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Successfully Sent</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{results.totalSent}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircleIcon className="w-5 h-5 text-red-600" />
                <span className="text-red-700 font-medium">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{results.totalFailed}</p>
            </div>
          </div>

          {results.results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Organization</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.results.map((r) => (
                    <tr key={r.organizationId}>
                      <td className="py-3 text-sm font-medium text-slate-800">
                        {r.organizationName}
                      </td>
                      <td className="py-3 text-sm text-slate-600">{r.email}</td>
                      <td className="py-3">
                        {r.success ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <CheckCircleIcon className="w-4 h-4" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-red-600">
                            <XCircleIcon className="w-4 h-4" />
                            {r.error || 'Failed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Email Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-slate-500">Subject:</p>
                <p className="font-medium text-slate-800">{personalizePreview(subject)}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-slate-500 mb-2">Body:</p>
                <div className="bg-slate-50 rounded-lg p-4 whitespace-pre-wrap text-slate-700">
                  {personalizePreview(body)}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setShowPreview(false)}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
