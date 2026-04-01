import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchUsers, fetchRoles, fetchManagers, createUser, deleteUser } from '../../store/slices/userSlice';
import { useForm, useWatch } from 'react-hook-form';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface CreateUserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  managerId?: string;
}

export default function UsersListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { users, roles, managers, isLoading } = useSelector((state: RootState) => state.users);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateUserFormData>();

  // Watch the selected role to conditionally show manager dropdown
  const selectedRoleId = useWatch({ control, name: 'roleId' });
  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const showManagerDropdown = selectedRole?.slug === 'telecaller' || selectedRole?.slug === 'counselor';

  useEffect(() => {
    dispatch(fetchUsers({ role: roleFilter || undefined }));
    dispatch(fetchRoles());
    dispatch(fetchManagers());
  }, [dispatch, roleFilter]);

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await dispatch(createUser(data)).unwrap();
      toast.success('User created successfully');
      setIsModalOpen(false);
      reset();
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await dispatch(deleteUser(id)).unwrap();
        toast.success('User deleted successfully');
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage team members and their roles.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex space-x-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input w-48"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.slug}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {user.firstName?.[0]}
                            {user.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="badge badge-info">{user.role?.name}</span>
                    </td>
                    <td>
                      {user.manager ? (
                        <span className="text-gray-900">
                          {user.manager.firstName} {user.manager.lastName}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          user.isActive ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button className="text-primary-600 hover:text-primary-900">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
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
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setIsModalOpen(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Add New User</h2>
                <button onClick={() => setIsModalOpen(false)}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      {...register('firstName', { required: 'Required' })}
                      className="input"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      {...register('lastName', { required: 'Required' })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    {...register('email', { required: 'Required' })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    {...register('password', { required: 'Required', minLength: 8 })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Phone</label>
                  <input {...register('phone')} className="input" />
                </div>

                <div>
                  <label className="label">Role</label>
                  <select
                    {...register('roleId', { required: 'Required' })}
                    className="input"
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {showManagerDropdown && (
                  <div>
                    <label className="label">Assign to Manager</label>
                    <select
                      {...register('managerId')}
                      className="input"
                    >
                      <option value="">No manager assigned</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.firstName} {manager.lastName} ({manager.teamMemberCount} team members)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create User
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
