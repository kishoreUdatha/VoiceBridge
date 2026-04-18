import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  UsersIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { AppDispatch, RootState } from '../../store';
import { fetchBranches, deleteBranch } from '../../store/slices/branchSlice';
import { Branch, branchService, BranchUser } from '../../services/branch.service';
import { fetchUsers } from '../../store/slices/userSlice';

export default function BranchesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { branches, isLoading, error } = useSelector((state: RootState) => state.branches);
  const { users: allUsers } = useSelector((state: RootState) => state.users);
  const [deleteConfirm, setDeleteConfirm] = useState<Branch | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // User management modal state
  const [userModalBranch, setUserModalBranch] = useState<Branch | null>(null);
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigningUsers, setAssigningUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchBranches(showInactive ? undefined : true));
    dispatch(fetchUsers({ limit: 500 }));
  }, [dispatch, showInactive]);

  // Load branch users when modal opens
  useEffect(() => {
    if (userModalBranch) {
      setLoadingUsers(true);
      branchService.getBranchUsers(userModalBranch.id)
        .then(users => {
          setBranchUsers(users);
          setSelectedUserIds([]);
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false));
    }
  }, [userModalBranch]);

  const handleAssignUsers = async () => {
    if (!userModalBranch || selectedUserIds.length === 0) return;
    setAssigningUsers(true);
    try {
      await branchService.assignUsers(userModalBranch.id, selectedUserIds);
      const users = await branchService.getBranchUsers(userModalBranch.id);
      setBranchUsers(users);
      setSelectedUserIds([]);
      dispatch(fetchBranches(showInactive ? undefined : true));
    } catch (err) {
      console.error('Failed to assign users:', err);
    } finally {
      setAssigningUsers(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!userModalBranch) return;
    try {
      await branchService.removeUsers(userModalBranch.id, [userId]);
      setBranchUsers(prev => prev.filter(u => u.id !== userId));
      dispatch(fetchBranches(showInactive ? undefined : true));
    } catch (err) {
      console.error('Failed to remove user:', err);
    }
  };

  // Users not already in this branch
  const availableUsers = allUsers.filter(u => !branchUsers.some(bu => bu.id === u.id));

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteBranch(id)).unwrap();
      setDeleteConfirm(null);
    } catch (err) {
      // Error handled by slice
    }
  };

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive ? true : branch.isActive;
    return matchesSearch && matchesStatus;
  });

  const totalStats = {
    users: branches.reduce((acc, b) => acc + (b._count?.users || 0), 0),
    leads: branches.reduce((acc, b) => acc + (b._count?.leads || 0), 0),
    colleges: branches.reduce((acc, b) => acc + (b._count?.colleges || 0), 0),
  };

  return (
    <div className="p-6">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Branches</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Inline Stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500 mr-4">
            <span><strong className="text-slate-700">{branches.filter(b => b.isActive).length}</strong> branches</span>
            <span><strong className="text-slate-700">{totalStats.users}</strong> users</span>
            <span><strong className="text-slate-700">{totalStats.leads}</strong> leads</span>
          </div>
          {/* Search */}
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
              className="w-3.5 h-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Inactive</span>
          </label>
          <Link
            to="/settings/branches/new"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Loading branches...</p>
        </div>
      )}

      {/* Branches Grid */}
      {!isLoading && filteredBranches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onDelete={() => setDeleteConfirm(branch)}
              onManageUsers={() => setUserModalBranch(branch)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBranches.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
          <BuildingOffice2Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-800">No branches found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? 'No branches match your search.'
              : 'Get started by creating your first branch.'}
          </p>
          {!searchQuery && (
            <Link
              to="/settings/branches/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Branch
            </Link>
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
              <h3 className="text-base font-semibold text-slate-900">Delete Branch</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete <span className="font-medium text-slate-800">{deleteConfirm.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-3 py-1.5 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {userModalBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Manage Users - {userModalBranch.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{branchUsers.length} users assigned</p>
              </div>
              <button
                onClick={() => setUserModalBranch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Current Users */}
              <div className="flex-1 border-r border-slate-200 flex flex-col">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <h4 className="text-xs font-medium text-slate-600 uppercase">Current Users</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                  ) : branchUsers.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No users assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {branchUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 group">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-slate-500">{user.role?.name || 'No role'}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from branch"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Users */}
              <div className="flex-1 flex flex-col">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <h4 className="text-xs font-medium text-slate-600 uppercase">Available Users</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">All users assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {availableUsers.map(user => {
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => {
                              setSelectedUserIds(prev =>
                                isSelected ? prev.filter(id => id !== user.id) : [...prev, user.id]
                              );
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                              ${isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-50 border border-transparent'}
                            `}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center
                              ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}
                            `}>
                              {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800 truncate">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-slate-500">{user.role?.name || 'No role'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedUserIds.length > 0 && `${selectedUserIds.length} selected`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUserModalBranch(null)}
                  className="px-3 py-1.5 text-sm text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Close
                </button>
                {selectedUserIds.length > 0 && (
                  <button
                    onClick={handleAssignUsers}
                    disabled={assigningUsers}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {assigningUsers ? 'Assigning...' : `Assign ${selectedUserIds.length} Users`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchCard({ branch, onDelete, onManageUsers }: { branch: Branch; onDelete: () => void; onManageUsers: () => void }) {
  return (
    <div className={`group bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all overflow-hidden ${!branch.isActive ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b border-slate-100 ${branch.isHeadquarters ? 'bg-amber-50' : 'bg-slate-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${branch.isHeadquarters ? 'bg-amber-500' : 'bg-primary-500'}`}>
              <BuildingOffice2Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{branch.name}</h3>
                {branch.isHeadquarters && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">HQ</span>
                )}
              </div>
              <p className="text-xs text-slate-500">{branch.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onManageUsers}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="Manage users"
            >
              <UsersIcon className="h-4 w-4" />
            </button>
            <Link
              to={`/settings/branches/${branch.id}/edit`}
              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
              title="Edit branch"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </Link>
            {!branch.isHeadquarters && (
              <button
                onClick={onDelete}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete branch"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Location */}
        <div className="flex items-center gap-2 text-xs">
          <MapPinIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-600 truncate">{branch.city}, {branch.state}</span>
        </div>

        {/* Manager */}
        <div className="flex items-center gap-2 text-xs">
          <UserCircleIcon className={`w-3.5 h-3.5 flex-shrink-0 ${branch.branchManager ? 'text-slate-400' : 'text-slate-300'}`} />
          {branch.branchManager ? (
            <span className="text-slate-600">{branch.branchManager.firstName} {branch.branchManager.lastName}</span>
          ) : (
            <span className="text-slate-400 italic">No manager</span>
          )}
        </div>

        {/* Contact */}
        {(branch.phone || branch.email) && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {branch.phone && (
              <div className="flex items-center gap-1">
                <PhoneIcon className="w-3 h-3" />
                <span>{branch.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {branch._count && (
          <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1">
              <UsersIcon className="w-3 h-3 text-emerald-500" />
              <span className="font-medium text-slate-700">{branch._count.users}</span>
            </div>
            <div className="flex items-center gap-1">
              <ChartBarIcon className="w-3 h-3 text-violet-500" />
              <span className="font-medium text-slate-700">{branch._count.leads}</span>
            </div>
            <div className="flex items-center gap-1">
              <BuildingOffice2Icon className="w-3 h-3 text-amber-500" />
              <span className="font-medium text-slate-700">{branch._count.colleges}</span>
            </div>
            {!branch.isActive && (
              <span className="ml-auto px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded">Inactive</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
