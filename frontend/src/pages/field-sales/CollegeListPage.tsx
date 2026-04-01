import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchColleges,
  fetchCollegeStats,
  fetchCities,
  deleteCollege,
  createCollege,
  setPage,
} from '../../store/slices/fieldSales/collegeSlice';
import { useForm } from 'react-hook-form';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  XMarkIcon,
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
  HOT: 'badge-danger',
  WARM: 'badge-warning',
  COLD: 'badge-info',
  LOST: 'badge-secondary',
};

export default function CollegeListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { colleges, stats, cities, total, page, isLoading } = useAppSelector(
    (state) => state.fieldSalesColleges
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    city: '',
    collegeType: '',
    category: '',
    search: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCollegeData>();

  useEffect(() => {
    dispatch(fetchColleges({ filter: filters as any, page, limit: 20 }));
    dispatch(fetchCollegeStats(undefined));
    dispatch(fetchCities());
  }, [dispatch, page, filters]);

  const onSubmit = async (data: CreateCollegeData) => {
    try {
      await dispatch(createCollege(data)).unwrap();
      toast.success('College created successfully');
      setIsModalOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error || 'Failed to create college');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this college?')) {
      try {
        await dispatch(deleteCollege(id)).unwrap();
        toast.success('College deleted successfully');
      } catch (error: any) {
        toast.error(error || 'Failed to delete college');
      }
    }
  };

  return (
    <div className="min-h-screen sm:min-h-0">
      {/* Mobile Header - Sticky */}
      <div className="sm:hidden bg-emerald-600 text-white sticky top-0 z-20 -mx-4 -mt-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Colleges</h1>
            <p className="text-emerald-200 text-[10px]">{stats?.totalColleges || 0} colleges</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-white/20 rounded-lg active:scale-95 transition-transform"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Search */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Search colleges..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-emerald-200 focus:bg-white/20 focus:outline-none"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || filters.city || filters.collegeType || filters.category
                ? 'bg-white text-emerald-600'
                : 'bg-white/10 text-white'
            }`}
          >
            Filter
          </button>
        </div>

        {/* Mobile Filter Pills */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white"
              >
                <option value="" className="text-slate-900">All Categories</option>
                <option value="HOT" className="text-slate-900">Hot</option>
                <option value="WARM" className="text-slate-900">Warm</option>
                <option value="COLD" className="text-slate-900">Cold</option>
              </select>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white"
              >
                <option value="" className="text-slate-900">All Cities</option>
                {cities.map((c) => (
                  <option key={c.city} value={c.city} className="text-slate-900">
                    {c.city}
                  </option>
                ))}
              </select>
              <select
                value={filters.collegeType}
                onChange={(e) => setFilters({ ...filters, collegeType: e.target.value })}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white"
              >
                <option value="" className="text-slate-900">All Types</option>
                {collegeTypes.map((type) => (
                  <option key={type.value} value={type.value} className="text-slate-900">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Colleges</h1>
          <p className="text-xs text-slate-500">Manage college accounts and contacts</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700">
          <PlusIcon className="h-3.5 w-3.5" />
          Add College
        </button>
      </div>

      {/* Mobile Stats */}
      {stats && (
        <div className="sm:hidden grid grid-cols-4 gap-2 py-4">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-slate-100">
            <p className="text-lg font-bold text-primary-600">{stats.totalColleges}</p>
            <p className="text-[9px] text-slate-500">Total</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-slate-100">
            <p className="text-lg font-bold text-red-600">{stats.categoryBreakdown?.HOT || 0}</p>
            <p className="text-[9px] text-slate-500">Hot</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-slate-100">
            <p className="text-lg font-bold text-emerald-600">{stats.recentVisits}</p>
            <p className="text-[9px] text-slate-500">Visits</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-slate-100">
            <p className="text-lg font-bold text-amber-600">{stats.upcomingFollowUps}</p>
            <p className="text-[9px] text-slate-500">Follow-ups</p>
          </div>
        </div>
      )}

      {/* Desktop Stats & Filters Row */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 p-3 mb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Stats - Left Side */}
          {stats && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg">
                <BuildingOfficeIcon className="h-4 w-4 text-primary-600" />
                <div>
                  <p className="text-lg font-bold text-primary-700">{stats.totalColleges}</p>
                  <p className="text-[10px] text-primary-600">Total</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                <span className="text-sm">🔥</span>
                <div>
                  <p className="text-lg font-bold text-red-700">{stats.categoryBreakdown?.HOT || 0}</p>
                  <p className="text-[10px] text-red-600">Hot</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                <MapPinIcon className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-lg font-bold text-emerald-700">{stats.recentVisits}</p>
                  <p className="text-[10px] text-emerald-600">Visits</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                <PhoneIcon className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-lg font-bold text-amber-700">{stats.upcomingFollowUps}</p>
                  <p className="text-[10px] text-amber-600">Follow-ups</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters - Right Side */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg w-40 focus:ring-1 focus:ring-primary-500"
            />
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.count})
                </option>
              ))}
            </select>
            <select
              value={filters.collegeType}
              onChange={(e) => setFilters({ ...filters, collegeType: e.target.value })}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              {collegeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Category</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile College Cards */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : colleges.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">No colleges found</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg"
            >
              Add College
            </button>
          </div>
        ) : (
          colleges.map((college) => (
            <div
              key={college.id}
              onClick={() => navigate(`/field-sales/colleges/${college.id}`)}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{college.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" />
                      {college.city}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{college.collegeType}</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                  college.category === 'HOT' ? 'bg-red-100 text-red-700' :
                  college.category === 'WARM' ? 'bg-amber-100 text-amber-700' :
                  college.category === 'COLD' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {college.category}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="w-3 h-3" />
                    {college._count?.contacts || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3" />
                    {college._count?.visits || 0} visits
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(college.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between py-3">
            <p className="text-xs text-slate-500">
              {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => dispatch(setPage(page - 1))}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => dispatch(setPage(page + 1))}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Colleges Table */}
      <div className="hidden sm:block card">
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th>College</th>
                <th>Type</th>
                <th>City</th>
                <th>Category</th>
                <th>Assigned To</th>
                <th>Contacts</th>
                <th>Visits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    Loading...
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
                  <tr key={college.id} className="hover:bg-gray-50">
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{college.name}</p>
                        {college.shortName && (
                          <p className="text-sm text-gray-500">{college.shortName}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{college.collegeType}</span>
                    </td>
                    <td>{college.city}</td>
                    <td>
                      <span className={`badge ${categoryColors[college.category]}`}>
                        {college.category}
                      </span>
                    </td>
                    <td>
                      {college.assignedTo && (
                        <span>
                          {college.assignedTo.firstName} {college.assignedTo.lastName}
                        </span>
                      )}
                    </td>
                    <td>{college._count?.contacts || 0}</td>
                    <td>{college._count?.visits || 0}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/field-sales/colleges/${college.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(college.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {total > 20 && (
          <div className="card-body border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} colleges
            </p>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => dispatch(setPage(page - 1))}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => dispatch(setPage(page + 1))}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create College Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setIsModalOpen(false)}
            />
            <div className="relative bg-white rounded-lg sm:rounded-lg shadow-xl max-w-2xl w-full p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base sm:text-lg font-medium">Add New College</h2>
                <button onClick={() => setIsModalOpen(false)}>
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">College Name *</label>
                    <input
                      {...register('name', { required: 'Required' })}
                      className="input"
                      placeholder="Enter college name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Short Name</label>
                    <input {...register('shortName')} className="input" placeholder="Abbreviation" />
                  </div>
                  <div>
                    <label className="label">College Type *</label>
                    <select
                      {...register('collegeType', { required: 'Required' })}
                      className="input"
                    >
                      <option value="">Select Type</option>
                      {collegeTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Institution Status *</label>
                    <select
                      {...register('institutionStatus', { required: 'Required' })}
                      className="input"
                    >
                      <option value="">Select Status</option>
                      {institutionStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select {...register('category')} className="input">
                      <option value="WARM">Warm</option>
                      <option value="HOT">Hot</option>
                      <option value="COLD">Cold</option>
                    </select>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="label">Address *</label>
                    <input
                      {...register('address', { required: 'Required' })}
                      className="input"
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <label className="label">City *</label>
                    <input
                      {...register('city', { required: 'Required' })}
                      className="input"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="label">State *</label>
                    <input
                      {...register('state', { required: 'Required' })}
                      className="input"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input {...register('pincode')} className="input" placeholder="Pincode" />
                  </div>
                  <div>
                    <label className="label">Google Maps URL</label>
                    <input {...register('googleMapsUrl')} className="input" placeholder="Maps link" />
                  </div>
                </div>

                <hr className="my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone</label>
                    <input {...register('phone')} className="input" placeholder="Phone number" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" {...register('email')} className="input" placeholder="Email" />
                  </div>
                  <div>
                    <label className="label">Website</label>
                    <input {...register('website')} className="input" placeholder="Website URL" />
                  </div>
                  <div>
                    <label className="label">Student Strength</label>
                    <input
                      type="number"
                      {...register('studentStrength', { valueAsNumber: true })}
                      className="input"
                      placeholder="Total students"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea {...register('notes')} className="input" rows={3} placeholder="Additional notes..." />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create College
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
