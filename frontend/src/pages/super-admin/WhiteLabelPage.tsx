import { useState, useEffect } from 'react';
import {
  PaintBrushIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

export default function WhiteLabelPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configsRes, domainsRes] = await Promise.all([
        api.get('/super-admin/white-label'),
        api.get('/super-admin/white-label/domains/all'),
      ]);

      setConfigs(configsRes.data.data || []);
      setDomains(domainsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch white-label data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const hasCustomBranding = (config: any) => {
    return config.branding?.logo || config.branding?.primaryColor !== '#3B82F6';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">White-Label Management</h1>
        <p className="text-slate-500">Manage branding, custom domains, and themes</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <PaintBrushIcon className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-slate-500">Custom Branding</p>
              <p className="text-2xl font-bold text-slate-900">
                {configs.filter(c => hasCustomBranding(c)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <GlobeAltIcon className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-slate-500">Custom Domains</p>
              <p className="text-2xl font-bold text-slate-900">{domains.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-slate-500">SSL Active</p>
              <p className="text-2xl font-bold text-green-600">
                {domains.filter(d => d.domain?.sslStatus === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-slate-500">Custom Email</p>
              <p className="text-2xl font-bold text-slate-900">
                {configs.filter(c => c.emailTemplates?.fromEmail !== 'noreply@myleadx.ai').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Domains */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Custom Domains</h2>
        {domains.length === 0 ? (
          <p className="text-slate-500 text-sm">No custom domains configured</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Organization</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Domain</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">DNS Verified</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">SSL Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{item.organizationName}</td>
                    <td className="py-3 px-4 text-sm text-blue-600">{item.domain?.domain}</td>
                    <td className="py-3 px-4">
                      {item.domain?.dnsVerified ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircleIcon className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 text-sm">
                          <XCircleIcon className="w-4 h-4" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.domain?.sslStatus === 'active'
                          ? 'bg-green-100 text-green-700'
                          : item.domain?.sslStatus === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {item.domain?.sslStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {item.domain?.lastChecked
                        ? new Date(item.domain.lastChecked).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Configs */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All White-Label Configurations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.slice(0, 12).map((config, idx) => (
            <div
              key={idx}
              className="p-4 border border-slate-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors"
              onClick={() => setSelectedOrg(config)}
            >
              <div className="flex items-center gap-3 mb-3">
                {config.branding?.logo ? (
                  <img src={config.branding.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: config.branding?.primaryColor || '#3B82F6' }}
                  >
                    {config.organizationName?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-slate-900">{config.organizationName}</p>
                  <p className="text-xs text-slate-500">
                    {config.customDomain?.domain || 'No custom domain'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: config.branding?.primaryColor }}
                  title="Primary color"
                />
                <div
                  className="w-4 h-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: config.branding?.secondaryColor }}
                  title="Secondary color"
                />
                <div
                  className="w-4 h-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: config.branding?.accentColor }}
                  title="Accent color"
                />
                {hasCustomBranding(config) && (
                  <span className="ml-auto text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    Customized
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedOrg(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{selectedOrg.organizationName}</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Branding</p>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm">Primary: {selectedOrg.branding?.primaryColor}</p>
                  <p className="text-sm">Secondary: {selectedOrg.branding?.secondaryColor}</p>
                  <p className="text-sm">Font: {selectedOrg.branding?.fontFamily}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Email Settings</p>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm">From: {selectedOrg.emailTemplates?.fromName}</p>
                  <p className="text-sm">Email: {selectedOrg.emailTemplates?.fromEmail}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Login Page</p>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm">Show Powered By: {selectedOrg.loginPage?.showPoweredBy ? 'Yes' : 'No'}</p>
                  <p className="text-sm">Social Login: {selectedOrg.loginPage?.socialLoginEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrg(null)}
              className="mt-6 w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
