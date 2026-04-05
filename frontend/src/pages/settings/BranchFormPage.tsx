import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { AppDispatch, RootState } from '../../store';
import { fetchBranchById, createBranch, updateBranch, clearCurrentBranch } from '../../store/slices/branchSlice';
import { fetchUsers } from '../../store/slices/userSlice';
import { CreateBranchInput, UpdateBranchInput } from '../../services/branch.service';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

// Input Field Component - defined outside to prevent remounting on every render
function InputField({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  value,
  onChange,
  error,
  disabled = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors outline-none
          ${error
            ? 'border-red-300 bg-red-50 focus:border-red-500'
            : 'border-slate-200 bg-white hover:border-slate-300 focus:border-primary-500'
          }
          ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
        `}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function BranchFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { currentBranch, isLoading, error } = useSelector((state: RootState) => state.branches);
  const { users } = useSelector((state: RootState) => state.users);

  const [formData, setFormData] = useState<CreateBranchInput>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    phone: '',
    email: '',
    isHeadquarters: false,
    branchManagerId: undefined,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    dispatch(fetchUsers({ limit: 100 }));
    if (isEditing && id) {
      dispatch(fetchBranchById(id));
    }
    return () => {
      dispatch(clearCurrentBranch());
    };
  }, [dispatch, isEditing, id]);

  useEffect(() => {
    if (isEditing && currentBranch) {
      setFormData({
        name: currentBranch.name,
        code: currentBranch.code,
        address: currentBranch.address,
        city: currentBranch.city,
        state: currentBranch.state,
        country: currentBranch.country,
        pincode: currentBranch.pincode || '',
        phone: currentBranch.phone || '',
        email: currentBranch.email || '',
        isHeadquarters: currentBranch.isHeadquarters,
        branchManagerId: currentBranch.branchManagerId || undefined,
      });
    }
  }, [isEditing, currentBranch]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Branch name is required';
    if (!formData.code.trim()) errors.code = 'Branch code is required';
    else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      errors.code = 'Code must be uppercase letters, numbers, and hyphens only';
    }
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setFormData(prev => ({ ...prev, code: value }));
    if (formErrors.code) {
      setFormErrors(prev => ({ ...prev, code: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      if (isEditing && id) {
        const updateData: UpdateBranchInput = {
          ...formData,
          branchManagerId: formData.branchManagerId || null,
        };
        await dispatch(updateBranch({ id, data: updateData })).unwrap();
        setSuccessMessage('Branch updated successfully!');
        setTimeout(() => navigate('/settings/branches'), 1500);
      } else {
        await dispatch(createBranch(formData)).unwrap();
        setSuccessMessage('Branch created successfully!');
        setTimeout(() => navigate('/settings/branches'), 1500);
      }
    } catch (err) {
      // Error handled by slice
    } finally {
      setIsSubmitting(false);
    }
  };

  const potentialManagers = users.filter(u =>
    u.role?.slug === 'admin' || u.role?.slug === 'manager'
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/branches')}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit Branch' : 'New Branch'}
          </h1>
        </div>
        {(successMessage || error) && (
          <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${successMessage ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {successMessage ? (
              <>
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">{successMessage}</span>
              </>
            ) : (
              <>
                <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </>
            )}
          </div>
        )}

      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          {/* All fields in a grid */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
            {/* Row 1: Basic Info */}
            <InputField
              label="Branch Name"
              name="name"
              placeholder="e.g., Hyderabad Office"
              required
              value={formData.name}
              onChange={handleChange}
              error={formErrors.name}
            />
            <InputField
              label="Branch Code"
              name="code"
              placeholder="e.g., HYD-01"
              required
              value={formData.code}
              onChange={handleCodeChange}
              error={formErrors.code}
            />
            <InputField
              label="City"
              name="city"
              placeholder="Enter city"
              required
              value={formData.city}
              onChange={handleChange}
              error={formErrors.city}
            />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors outline-none bg-white
                  ${formErrors.state
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-slate-200 hover:border-slate-300 focus:border-primary-500'
                  }
                `}
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {formErrors.state && <p className="mt-1 text-xs text-red-600">{formErrors.state}</p>}
            </div>

            {/* Row 2: Address spans 2 cols, then pincode, phone */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter full street address"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors outline-none
                  ${formErrors.address
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 focus:border-primary-500'
                  }
                `}
              />
              {formErrors.address && <p className="mt-1 text-xs text-red-600">{formErrors.address}</p>}
            </div>
            <InputField
              label="Pincode"
              name="pincode"
              placeholder="Enter pincode"
              value={formData.pincode || ''}
              onChange={handleChange}
            />
            <InputField
              label="Phone"
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone || ''}
              onChange={handleChange}
            />

            {/* Row 3: Email, Manager, HQ checkbox */}
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="branch@company.com"
              value={formData.email || ''}
              onChange={handleChange}
              error={formErrors.email}
            />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Branch Manager</label>
              <select
                name="branchManagerId"
                value={formData.branchManagerId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:border-primary-500 transition-colors outline-none"
              >
                <option value="">Select manager (optional)</option>
                {potentialManagers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-primary-300 cursor-pointer transition-colors w-full">
                <input
                  type="checkbox"
                  name="isHeadquarters"
                  checked={formData.isHeadquarters}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Headquarters</span>
                {formData.isHeadquarters && (
                  <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">HQ</span>
                )}
              </label>
            </div>
          </div>

          {/* Footer with actions */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={() => navigate('/settings/branches')}
              className="px-4 py-1.5 text-sm text-slate-600 font-medium hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className={`px-4 py-1.5 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors
                ${(isSubmitting || isLoading) ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Branch' : 'Create Branch')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
