import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { fetchLeads, deleteLead } from '../../store/slices/leadSlice';
import { showToast } from '../../utils/toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  PhoneIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeSolidIcon } from '@heroicons/react/24/solid';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  NEW: { bg: 'bg-primary-50', text: 'text-primary-700', dot: 'bg-primary-500' },
  CONTACTED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  QUALIFIED: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  PROPOSAL: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  NEGOTIATION: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  FOLLOW_UP: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  ENROLLED: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  WON: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  LOST: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function LeadsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(['leads', 'common', 'notifications']);
  const { leads, total, isLoading, page, limit } = useSelector(
    (state: RootState) => state.leads
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [assignedToId] = useState(searchParams.get('assignedToId') || '');
  const [conversionFilter, setConversionFilter] = useState<'all' | 'active' | 'converted'>(
    searchParams.get('isConverted') === 'true' ? 'converted' :
    searchParams.get('isConverted') === 'false' ? 'active' : 'all'
  );

  const statusOptions = [
    { value: '', label: t('leads:filters.allStatuses') },
    { value: 'NEW', label: t('leads:status.NEW') },
    { value: 'CONTACTED', label: t('leads:status.CONTACTED') },
    { value: 'QUALIFIED', label: t('leads:status.QUALIFIED') },
    { value: 'NEGOTIATION', label: t('leads:status.NEGOTIATION') },
    { value: 'WON', label: t('leads:status.WON') },
    { value: 'LOST', label: t('leads:status.LOST') },
    { value: 'FOLLOW_UP', label: t('leads:status.FOLLOW_UP') },
  ];

  const sourceOptions = [
    { value: '', label: t('leads:filters.allSources') },
    { value: 'MANUAL', label: t('leads:source.MANUAL') },
    { value: 'BULK_UPLOAD', label: t('leads:source.BULK_UPLOAD') },
    { value: 'FORM', label: t('leads:source.FORM') },
    { value: 'LANDING_PAGE', label: t('leads:source.LANDING_PAGE') },
    { value: 'CHATBOT', label: t('leads:source.CHATBOT') },
    { value: 'AD_FACEBOOK', label: t('leads:source.AD_FACEBOOK') },
    { value: 'AD_INSTAGRAM', label: t('leads:source.AD_INSTAGRAM') },
    { value: 'AD_LINKEDIN', label: t('leads:source.AD_LINKEDIN') },
  ];

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (source) params.source = source;
    if (assignedToId) params.assignedToId = assignedToId;

    // Add conversion filter
    const isConvertedParam = searchParams.get('isConverted');
    if (isConvertedParam !== null) {
      params.isConverted = isConvertedParam;
    }

    dispatch(
      fetchLeads({
        ...params,
        page: parseInt(searchParams.get('page') || '1'),
        limit: 20,
      })
    );
  }, [dispatch, searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    if (assignedToId) params.set('assignedToId', assignedToId);
    if (conversionFilter === 'converted') params.set('isConverted', 'true');
    if (conversionFilter === 'active') params.set('isConverted', 'false');
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleConversionFilterChange = (filter: 'all' | 'active' | 'converted') => {
    setConversionFilter(filter);
    const params = new URLSearchParams(searchParams);
    if (filter === 'converted') {
      params.set('isConverted', 'true');
    } else if (filter === 'active') {
      params.set('isConverted', 'false');
    } else {
      params.delete('isConverted');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('leads:confirm.delete'))) {
      try {
        await dispatch(deleteLead(id)).unwrap();
        showToast.success('leads.deleted');
      } catch (error) {
        showToast.error('error.delete');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Single Row Header: Title, Tabs, Search, Filters, Add Button */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Title */}
          <h1 className="text-lg font-bold text-slate-900 whitespace-nowrap">{t('leads:title')}</h1>

          {/* Conversion Tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => handleConversionFilterChange('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                conversionFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleConversionFilterChange('active')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                conversionFilter === 'active'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleConversionFilterChange('converted')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                conversionFilter === 'converted'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckBadgeSolidIcon className="h-3 w-3" />
              Converted
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); }}
            className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); }}
            className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Filter Button */}
          <button onClick={handleSearch} className="px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5">
            <FunnelIcon className="h-3.5 w-3.5" />
            Filter
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Create Single Lead Button */}
          <Link to="/leads/new" className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <PlusIcon className="h-4 w-4" />
            Create Lead
          </Link>

          {/* Bulk Upload Button */}
          <Link to="/leads/bulk-upload" className="px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap">
            Bulk Upload
          </Link>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.lead')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.contact')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.source')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.status')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.assignedTo')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.created')}</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <span className="spinner spinner-lg"></span>
                      <p className="text-slate-500">{t('leads:loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="empty-state">
                      <UserGroupIcon className="empty-state-icon" />
                      <p className="empty-state-title">{t('leads:empty.title')}</p>
                      <p className="empty-state-text">
                        {t('leads:empty.description')}
                      </p>
                      <Link to="/leads/bulk-upload" className="btn btn-primary mt-4">
                        <PlusIcon className="h-4 w-4" />
                        {t('leads:addLeads')}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const stageName = lead.stage?.name || 'NEW';
                  const stageKey = stageName.toUpperCase().replace(/\s+/g, '_');
                  const statusStyle = statusColors[stageKey] || {
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    dot: 'bg-slate-500',
                  };

                  return (
                    <tr key={lead.id} className="group hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-white font-medium text-[10px] ${
                            lead.isConverted
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                              : 'bg-gradient-to-br from-primary-500 to-primary-600'
                          }`}>
                            {lead.firstName?.[0]}{lead.lastName?.[0]}
                            {lead.isConverted && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <CheckBadgeSolidIcon className="w-2.5 h-2.5 text-emerald-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-slate-900">
                                {lead.firstName} {lead.lastName}
                              </p>
                              {lead.isConverted && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                  <CheckBadgeSolidIcon className="w-2.5 h-2.5" />
                                  Converted
                                </span>
                              )}
                            </div>
                            {lead.convertedAt && (
                              <p className="text-[10px] text-emerald-600">
                                {new Date(lead.convertedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <p className="text-xs text-slate-900">{lead.phone}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{lead.email}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {(lead.source || 'Unknown').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${statusStyle.dot}`}></span>
                          {stageName}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {lead.assignments?.[0]?.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600">
                              {lead.assignments[0].assignedTo.firstName?.[0]}
                              {lead.assignments[0].assignedTo.lastName?.[0]}
                            </div>
                            <span className="text-xs text-slate-700">
                              {lead.assignments[0].assignedTo.firstName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">{t('leads:table.unassigned')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-500">
                          {new Date(lead.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/leads/${lead.id}`}
                            className="p-1.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title={t('leads:viewDetails')}
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                          </Link>
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-1.5 rounded text-slate-400 hover:text-success-600 hover:bg-success-50 transition-colors"
                            title={t('leads:call')}
                          >
                            <PhoneIcon className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                            title={t('common:delete')}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              Showing <span className="font-medium">{(page - 1) * limit + 1}</span>-<span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(page - 1));
                  setSearchParams(params);
                }}
                disabled={page === 1}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeftIcon className="h-3 w-3" />
                Prev
              </button>
              <div className="flex items-center">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set('page', String(pageNum));
                        setSearchParams(params);
                      }}
                      className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(page + 1));
                  setSearchParams(params);
                }}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
