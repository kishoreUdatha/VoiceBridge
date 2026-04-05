import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCollegeStats,
  fetchStates,
  fetchDistricts,
  fetchCities,
  fetchFieldOfficers,
} from '../../store/slices/fieldSales/collegeSlice';
import { fetchVisitStats } from '../../store/slices/fieldSales/visitSlice';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  UserGroupIcon,
  FunnelIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function AdminFieldSalesTracking() {
  const dispatch = useAppDispatch();
  const { stats, states, districts, cities, fieldOfficers, isLoading } = useAppSelector(
    (state) => state.fieldSalesColleges
  );
  const { stats: visitStats } = useAppSelector((state) => state.fieldSalesVisits);

  const [filters, setFilters] = useState({
    state: '',
    district: '',
    city: '',
    officerId: '',
  });

  useEffect(() => {
    dispatch(fetchCollegeStats(filters.officerId || undefined));
    dispatch(fetchVisitStats({ userId: filters.officerId || undefined }));
    dispatch(fetchStates());
    dispatch(fetchFieldOfficers());
  }, [dispatch, filters.officerId]);

  // Fetch districts when state changes
  useEffect(() => {
    if (filters.state) {
      dispatch(fetchDistricts(filters.state));
    }
  }, [dispatch, filters.state]);

  // Fetch cities when state or district changes
  useEffect(() => {
    dispatch(fetchCities({ state: filters.state || undefined, district: filters.district || undefined }));
  }, [dispatch, filters.state, filters.district]);

  // Reset dependent filters when parent changes
  const handleStateChange = (newState: string) => {
    setFilters({ ...filters, state: newState, district: '', city: '' });
  };

  const handleDistrictChange = (newDistrict: string) => {
    setFilters({ ...filters, district: newDistrict, city: '' });
  };

  const formatValue = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  // Calculate aggregate stats
  const totalVisits = visitStats?.totalVisits || 0;
  const totalColleges = stats?.totalColleges || 0;
  const activeOfficers = fieldOfficers.filter((o) => o.visitCount > 0).length;
  const totalExpenses = fieldOfficers.reduce((sum, o) => sum + o.totalExpenses, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold">Field Sales Tracking</h1>
              <p className="text-indigo-200 text-xs">Admin Overview</p>
            </div>
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">State</label>
              <select
                value={filters.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All States</option>
                {states.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">District</label>
              <select
                value={filters.district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                disabled={!filters.state}
              >
                <option value="">All Districts</option>
                {districts.map((d) => (
                  <option key={d.district} value={d.district}>
                    {d.district}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">City</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Cities</option>
                {cities.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Field Officer</label>
              <select
                value={filters.officerId}
                onChange={(e) => setFilters({ ...filters, officerId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Officers</option>
                {fieldOfficers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.firstName} {officer.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <MapPinIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Visits</p>
                <p className="text-2xl font-bold text-slate-900">{totalVisits}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Colleges</p>
                <p className="text-2xl font-bold text-slate-900">{totalColleges}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <CurrencyRupeeIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-900">{formatValue(totalExpenses)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Active Officers</p>
                <p className="text-2xl font-bold text-slate-900">{activeOfficers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Officer Performance Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">Officer Performance</h3>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden p-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : fieldOfficers.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No field officers found</p>
              </div>
            ) : (
              fieldOfficers.map((officer) => (
                <div
                  key={officer.id}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-indigo-600">
                          {officer.firstName[0]}{officer.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {officer.firstName} {officer.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{officer.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-white rounded-lg">
                      <p className="text-lg font-bold text-emerald-600">{officer.visitCount}</p>
                      <p className="text-[10px] text-slate-500">Visits</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{officer.collegeCount}</p>
                      <p className="text-[10px] text-slate-500">Colleges</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg">
                      <p className="text-lg font-bold text-amber-600">{formatValue(officer.totalExpenses)}</p>
                      <p className="text-[10px] text-slate-500">Expenses</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Officer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Visits</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Colleges</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Expenses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : fieldOfficers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No field officers found
                    </td>
                  </tr>
                ) : (
                  fieldOfficers.map((officer) => (
                    <tr key={officer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-indigo-600">
                              {officer.firstName[0]}{officer.lastName[0]}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {officer.firstName} {officer.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{officer.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          {officer.visitCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {officer.collegeCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-amber-600">
                        {formatValue(officer.totalExpenses)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
