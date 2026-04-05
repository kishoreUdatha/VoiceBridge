import { useEffect, useState } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PhoneIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { universityService, University, CreateUniversityInput } from '../../services/university.service';

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<University | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [formData, setFormData] = useState<CreateUniversityInput>({
    name: '',
    shortName: '',
    type: '',
    city: '',
    state: '',
    website: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    defaultCommissionPercent: undefined,
    donationCommissionPercent: undefined,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUniversities();
  }, [showInactive]);

  const loadUniversities = async () => {
    try {
      setIsLoading(true);
      const result = await universityService.getAll({
        isActive: showInactive ? undefined : true,
        limit: 100,
      });
      setUniversities(result.universities);
    } catch (err: any) {
      setError(err.message || 'Failed to load universities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await universityService.delete(id);
      setDeleteConfirm(null);
      loadUniversities();
    } catch (err: any) {
      setError(err.message || 'Failed to delete university');
    }
  };

  const openEditModal = (university: University) => {
    setEditingUniversity(university);
    setFormData({
      name: university.name,
      shortName: university.shortName || '',
      type: university.type || '',
      city: university.city || '',
      state: university.state || '',
      website: university.website || '',
      contactPerson: university.contactPerson || '',
      contactPhone: university.contactPhone || '',
      contactEmail: university.contactEmail || '',
      defaultCommissionPercent: university.defaultCommissionPercent || undefined,
      donationCommissionPercent: university.donationCommissionPercent || undefined,
    });
    setShowFormModal(true);
  };

  const openCreateModal = () => {
    setEditingUniversity(null);
    setFormData({
      name: '',
      shortName: '',
      type: '',
      city: '',
      state: '',
      website: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      defaultCommissionPercent: undefined,
      donationCommissionPercent: undefined,
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingUniversity) {
        await universityService.update(editingUniversity.id, formData);
      } else {
        await universityService.create(formData);
      }
      setShowFormModal(false);
      loadUniversities();
    } catch (err: any) {
      setError(err.message || 'Failed to save university');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUniversities = universities.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalStats = {
    admissions: universities.reduce((acc, u) => acc + (u._count?.admissions || 0), 0),
    visits: universities.reduce((acc, u) => acc + (u._count?.studentVisits || 0), 0),
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Partner Universities</h1>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500 mr-4">
            <span><strong className="text-slate-700">{universities.filter(u => u.isActive).length}</strong> universities</span>
            <span><strong className="text-slate-700">{totalStats.admissions}</strong> admissions</span>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 transition-colors outline-none"
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-primary-600"
            />
            <span>Inactive</span>
          </label>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-800">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <XMarkIcon className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Loading universities...</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredUniversities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUniversities.map((university) => (
            <UniversityCard
              key={university.id}
              university={university}
              onEdit={() => openEditModal(university)}
              onDelete={() => setDeleteConfirm(university)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredUniversities.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
          <BuildingLibraryIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-800">No universities found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery ? 'No universities match your search.' : 'Get started by adding partner universities.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add University
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Delete University</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete <span className="font-medium text-slate-800">{deleteConfirm.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="px-3 py-1.5 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingUniversity ? 'Edit University' : 'Add University'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., Amrita University"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Short Name</label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., Amrita"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  >
                    <option value="">Select Type</option>
                    <option value="ENGINEERING">Engineering</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="ARTS">Arts</option>
                    <option value="COMMERCE">Commerce</option>
                    <option value="LAW">Law</option>
                    <option value="MANAGEMENT">Management</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="https://"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Commission %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.defaultCommissionPercent || ''}
                    onChange={(e) => setFormData({ ...formData, defaultCommissionPercent: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Donation Commission %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.donationCommissionPercent || ''}
                    onChange={(e) => setFormData({ ...formData, donationCommissionPercent: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., 15"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingUniversity ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UniversityCard({ university, onEdit, onDelete }: { university: University; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`group bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all overflow-hidden ${!university.isActive ? 'opacity-60' : ''}`}>
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
              <BuildingLibraryIcon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate">{university.name}</h3>
              {university.shortName && <p className="text-xs text-slate-500">{university.shortName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded" title="Edit">
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        {university.type && (
          <div className="flex items-center gap-2 text-xs">
            <AcademicCapIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">{university.type}</span>
          </div>
        )}
        {(university.city || university.state) && (
          <div className="flex items-center gap-2 text-xs">
            <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">{[university.city, university.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {university.contactPerson && (
          <div className="flex items-center gap-2 text-xs">
            <UserCircleIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">{university.contactPerson}</span>
          </div>
        )}
        {university.contactPhone && (
          <div className="flex items-center gap-2 text-xs">
            <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">{university.contactPhone}</span>
          </div>
        )}
        {university.website && (
          <div className="flex items-center gap-2 text-xs">
            <GlobeAltIcon className="w-3.5 h-3.5 text-slate-400" />
            <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">{university.website}</a>
          </div>
        )}

        {university._count && (
          <div className="flex items-center gap-4 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1">
              <AcademicCapIcon className="w-3 h-3 text-emerald-500" />
              <span className="font-medium text-slate-700">{university._count.admissions}</span>
              <span className="text-slate-500">admissions</span>
            </div>
            <div className="flex items-center gap-1">
              <ChartBarIcon className="w-3 h-3 text-violet-500" />
              <span className="font-medium text-slate-700">{university._count.studentVisits}</span>
              <span className="text-slate-500">visits</span>
            </div>
          </div>
        )}

        {(university.defaultCommissionPercent || university.donationCommissionPercent) && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span>Commission: {university.defaultCommissionPercent || 0}%</span>
            {university.donationCommissionPercent && <span>| Donation: {university.donationCommissionPercent}%</span>}
          </div>
        )}
      </div>
    </div>
  );
}
