import { useState, useEffect } from 'react';
import {
  AcademicCapIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TrophyIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Scholarship {
  id: string;
  name: string;
  type: string;
  amount: number;
  percentage?: number;
  eligibility: string;
  beneficiaries: number;
  totalDisbursed: number;
  isActive: boolean;
}

interface ScholarshipRecipient {
  id: string;
  studentName: string;
  studentId: string;
  course: string;
  scholarship: { name: string; type: string };
  amount: number;
  awardedDate: string;
  status: string;
}

interface Stats {
  totalScholarships: number;
  totalBeneficiaries: number;
  totalDisbursed: number;
  pendingApplications: number;
}

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  MERIT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  NEED_BASED: { bg: 'bg-green-100', text: 'text-green-700' },
  SPORTS: { bg: 'bg-orange-100', text: 'text-orange-700' },
  MINORITY: { bg: 'bg-purple-100', text: 'text-purple-700' },
  SPECIAL: { bg: 'bg-pink-100', text: 'text-pink-700' },
  GOVERNMENT: { bg: 'bg-red-100', text: 'text-red-700' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  DISBURSED: { bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function ScholarshipsPage() {
  const [search, setSearch] = useState('');
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [recipients, setRecipients] = useState<ScholarshipRecipient[]>([]);
  const [stats, setStats] = useState<Stats>({ totalScholarships: 0, totalBeneficiaries: 0, totalDisbursed: 0, pendingApplications: 0 });
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'scholarships' | 'recipients'>('scholarships');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: 'MERIT',
    amount: '',
    percentage: '',
    eligibility: '',
    maxRecipients: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scholarshipsRes, recipientsRes, statsRes] = await Promise.all([
        api.get('/scholarships'),
        api.get('/scholarships/recipients'),
        api.get('/scholarships/stats')
      ]);
      setScholarships(scholarshipsRes.data.data || []);
      setRecipients(recipientsRes.data.data || []);
      setStats(statsRes.data.data || { totalScholarships: 0, totalBeneficiaries: 0, totalDisbursed: 0, pendingApplications: 0 });
    } catch (error) {
      console.error('Failed to load scholarships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScholarship = async () => {
    if (!formData.name || !formData.eligibility) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await api.post('/scholarships', {
        name: formData.name,
        type: formData.type,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        percentage: formData.percentage ? parseInt(formData.percentage) : undefined,
        eligibility: formData.eligibility,
        maxRecipients: formData.maxRecipients ? parseInt(formData.maxRecipients) : undefined
      });
      toast.success('Scholarship created successfully');
      setOpenDialog(false);
      setFormData({ name: '', type: 'MERIT', amount: '', percentage: '', eligibility: '', maxRecipients: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to create scholarship');
    }
  };

  const handleDeleteScholarship = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scholarship?')) return;
    try {
      await api.delete(`/scholarships/${id}`);
      toast.success('Scholarship deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete scholarship');
    }
  };

  const filteredScholarships = scholarships.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRecipients = recipients.filter(r =>
    r.studentName.toLowerCase().includes(search.toLowerCase()) ||
    r.studentId.toLowerCase().includes(search.toLowerCase()) ||
    r.scholarship?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      MERIT: 'Merit',
      NEED_BASED: 'Need Based',
      SPORTS: 'Sports',
      MINORITY: 'Minority',
      SPECIAL: 'Special',
      GOVERNMENT: 'Government',
    };
    return labels[type.toUpperCase()] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <TrophyIcon className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Scholarships</h1>
            <p className="text-xs text-gray-500">Manage scholarship programs and track recipients</p>
          </div>
        </div>
        <button
          onClick={() => setOpenDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Scholarship
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <AcademicCapIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Scholarships</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalScholarships}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Beneficiaries</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalBeneficiaries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <CurrencyRupeeIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Disbursed</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.totalDisbursed)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <ClockIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Applications</p>
              <p className="text-xl font-semibold text-gray-900">{stats.pendingApplications}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab('scholarships')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'scholarships'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Scholarship Programs
            </button>
            <button
              onClick={() => setActiveTab('recipients')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'recipients'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recipients
            </button>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'scholarships' ? 'Search scholarships...' : 'Search recipients...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
            />
          </div>
        </div>

        {/* Scholarships Table */}
        {activeTab === 'scholarships' && (
          <div className="overflow-x-auto">
            {filteredScholarships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AcademicCapIcon className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-900">No scholarships found</p>
                <p className="text-xs text-gray-500 mt-1">Create your first scholarship to get started</p>
                <button
                  onClick={() => setOpenDialog(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Scholarship
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Scholarship</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Type</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Eligibility</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Beneficiaries</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Disbursed</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredScholarships.map((scholarship) => {
                    const typeStyle = TYPE_STYLES[scholarship.type.toUpperCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                    return (
                      <tr key={scholarship.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <TrophyIcon className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{scholarship.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                            {getTypeLabel(scholarship.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {scholarship.percentage
                            ? `${scholarship.percentage}% of fee`
                            : formatCurrency(Number(scholarship.amount) || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 truncate max-w-[200px]" title={scholarship.eligibility}>
                            {scholarship.eligibility}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-gray-900">{scholarship.beneficiaries || 0}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(scholarship.totalDisbursed || 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            scholarship.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {scholarship.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteScholarship(scholarship.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Recipients Table */}
        {activeTab === 'recipients' && (
          <div className="overflow-x-auto">
            {filteredRecipients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserGroupIcon className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-900">No recipients found</p>
                <p className="text-xs text-gray-500 mt-1">Add recipients to scholarships to track them here</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Student</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Student ID</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Course</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Scholarship</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Awarded Date</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecipients.map((recipient) => {
                    const statusStyle = STATUS_STYLES[recipient.status.toUpperCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                    return (
                      <tr key={recipient.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">{recipient.studentName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {recipient.studentId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{recipient.course}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{recipient.scholarship?.name || '-'}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(Number(recipient.amount) || 0)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {recipient.awardedDate ? new Date(recipient.awardedDate).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {recipient.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Scholarship Modal */}
      {openDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Scholarship</h2>
              <button
                onClick={() => setOpenDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Merit Scholarship"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="MERIT">Merit Based</option>
                  <option value="NEED_BASED">Need Based</option>
                  <option value="SPORTS">Sports</option>
                  <option value="MINORITY">Minority</option>
                  <option value="SPECIAL">Special</option>
                  <option value="GOVERNMENT">Government</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Or Percentage (%)</label>
                  <input
                    type="number"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility Criteria *</label>
                <textarea
                  value={formData.eligibility}
                  onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Above 90% in previous exam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Recipients</label>
                <input
                  type="number"
                  value={formData.maxRecipients}
                  onChange={(e) => setFormData({ ...formData, maxRecipients: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setOpenDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateScholarship}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                Add Scholarship
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
