import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchColleges,
  fetchCollegeStats,
  fetchCities,
  fetchStates,
  fetchDistricts,
  deleteCollege,
  createCollege,
  setPage,
} from '../../store/slices/fieldSales/collegeSlice';
import { useForm } from 'react-hook-form';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { CreateCollegeData, CollegeType, InstitutionStatus, CollegeCategory } from '../../services/fieldSales/college.service';

const collegeTypes: { value: CollegeType; label: string }[] = [
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'COMMERCE', label: 'Commerce' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'POLYTECHNIC', label: 'Polytechnic' },
  { value: 'ITI', label: 'ITI' },
  { value: 'OTHER', label: 'Other' },
];

const institutionStatuses: { value: InstitutionStatus; label: string }[] = [
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'AUTONOMOUS', label: 'Autonomous' },
  { value: 'AFFILIATED', label: 'Affiliated' },
  { value: 'DEEMED', label: 'Deemed' },
  { value: 'STANDALONE', label: 'Standalone' },
];

const categoryColors: Record<CollegeCategory, string> = {
  HOT: 'bg-red-500',
  WARM: 'bg-orange-500',
  COLD: 'bg-blue-500',
  LOST: 'bg-gray-400',
};

export default function CollegeListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { colleges, stats, cities, states, districts, total, page, isLoading } = useAppSelector(
    (state) => state.fieldSalesColleges
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    city: '',
    collegeType: '',
    category: '',
    search: '',
  });

  const limit = 15;
  const totalPages = Math.ceil(total / limit);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateCollegeData>();

  useEffect(() => {
    dispatch(fetchColleges({ filter: filters as any, page, limit }));
    dispatch(fetchCollegeStats(undefined));
    dispatch(fetchStates());
  }, [dispatch, page, filters]);

  useEffect(() => {
    if (filters.state) {
      dispatch(fetchDistricts(filters.state));
    }
  }, [dispatch, filters.state]);

  useEffect(() => {
    dispatch(fetchCities({ state: filters.state || undefined, district: filters.district || undefined }));
  }, [dispatch, filters.state, filters.district]);

  const handleStateChange = (val: string) => {
    setFilters({ ...filters, state: val, district: '', city: '' });
    dispatch(setPage(1));
  };

  const handleDistrictChange = (val: string) => {
    setFilters({ ...filters, district: val, city: '' });
    dispatch(setPage(1));
  };

  const updateFilter = (key: string, val: string) => {
    setFilters({ ...filters, [key]: val });
    dispatch(setPage(1));
  };

  const clearFilters = () => {
    setFilters({ state: '', district: '', city: '', collegeType: '', category: '', search: '' });
    dispatch(setPage(1));
  };

  const hasFilters = Object.values(filters).some(v => v);

  const onSubmit = async (data: CreateCollegeData) => {
    try {
      await dispatch(createCollege(data)).unwrap();
      toast.success('College created');
      setIsModalOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err || 'Failed');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this college?')) {
      try {
        await dispatch(deleteCollege(id)).unwrap();
        toast.success('Deleted');
      } catch (err: any) {
        toast.error(err || 'Failed');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Compact Header with Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Title & Stats */}
          <div className="flex items-center gap-2 min-w-fit">
            <h1 className="text-sm font-semibold text-gray-800">Colleges</h1>
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{total.toLocaleString()}</span>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <span className="text-xs"><span className="w-2 h-2 inline-block rounded-full bg-red-500 mr-1" />{stats?.categoryBreakdown?.HOT || 0} Hot</span>
            <span className="text-xs"><span className="w-2 h-2 inline-block rounded-full bg-orange-500 mr-1" />{stats?.categoryBreakdown?.WARM || 0} Warm</span>
            <span className="text-xs"><span className="w-2 h-2 inline-block rounded-full bg-blue-500 mr-1" />{stats?.categoryBreakdown?.COLD || 0} Cold</span>
          </div>

          <div className="h-4 w-px bg-gray-200" />

          {/* Inline Filters */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-36 pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <select
              value={filters.state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white max-w-[100px]"
            >
              <option value="">State</option>
              {states.map((s) => (
                <option key={s.state} value={s.state}>{s.state}</option>
              ))}
            </select>

            <select
              value={filters.district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!filters.state}
              className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white max-w-[100px] disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">District</option>
              {districts.map((d) => (
                <option key={d.district} value={d.district}>{d.district}</option>
              ))}
            </select>

            <select
              value={filters.city}
              onChange={(e) => updateFilter('city', e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white max-w-[90px]"
            >
              <option value="">City</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>{c.city}</option>
              ))}
            </select>

            <select
              value={filters.collegeType}
              onChange={(e) => updateFilter('collegeType', e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white max-w-[85px]"
            >
              <option value="">Type</option>
              {collegeTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white max-w-[80px]"
            >
              <option value="">Lead</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-1.5 py-1 text-xs text-gray-500 hover:text-red-600"
                title="Clear filters"
              >
                <ArrowPathIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Add Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">District</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">State</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Type</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 w-16">Lead</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Assigned</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 w-16">Visits</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 w-14"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : colleges.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  No colleges found
                </td>
              </tr>
            ) : (
              colleges.map((college) => (
                <tr
                  key={college.id}
                  onClick={() => navigate(`/field-sales/colleges/${college.id}`)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <td className="px-3 py-1.5">
                    <span className="text-gray-900 font-medium truncate block max-w-[280px]" title={college.name}>
                      {college.name}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">{college.district || college.city || '-'}</td>
                  <td className="px-3 py-1.5 text-gray-600">{college.state}</td>
                  <td className="px-3 py-1.5 text-gray-500">{college.collegeType}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${categoryColors[college.category]}`} title={college.category} />
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">
                    {college.assignedTo ? `${college.assignedTo.firstName} ${college.assignedTo.lastName?.charAt(0) || ''}.` : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-500">{college._count?.visits || 0}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/field-sales/colleges/${college.id}`); }}
                        className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(college.id, e)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Compact Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 bg-white text-xs">
          <span className="text-gray-500">
            {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => dispatch(setPage(1))}
              disabled={page === 1}
              className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
            >
              First
            </button>
            <button
              onClick={() => dispatch(setPage(page - 1))}
              disabled={page === 1}
              className="p-0.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => dispatch(setPage(pageNum))}
                  className={`w-6 h-6 rounded ${
                    page === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => dispatch(setPage(page + 1))}
              disabled={page >= totalPages}
              className="p-0.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
            >
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => dispatch(setPage(totalPages))}
              disabled={page >= totalPages}
              className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Add College</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input
                    {...register('name', { required: true })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                    placeholder="College name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                  <select {...register('collegeType', { required: true })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500">
                    <option value="">Select</option>
                    {collegeTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
                  <select {...register('institutionStatus', { required: true })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500">
                    <option value="">Select</option>
                    {institutionStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
                  <input {...register('address', { required: true })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500" placeholder="Address" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                  <input {...register('city', { required: true })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500" placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                  <input {...register('state', { required: true })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500" placeholder="State" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input {...register('phone')} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500" placeholder="Phone" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" {...register('email')} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500" placeholder="Email" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
