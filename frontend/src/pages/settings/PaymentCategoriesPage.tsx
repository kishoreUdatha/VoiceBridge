import { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  DollarSign,
  Percent,
  Tag,
  ArrowUpDown,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Copy,
  Search,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaymentCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  type: 'fee' | 'deposit' | 'refund' | 'discount' | 'tax' | 'other';
  defaultAmount?: number;
  taxRate?: number;
  taxInclusive: boolean;
  isRefundable: boolean;
  isActive: boolean;
  displayOrder: number;
  color: string;
  rules: CategoryRule[];
  createdAt: string;
}

interface CategoryRule {
  id: string;
  condition: 'course' | 'branch' | 'student_type' | 'payment_mode';
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
  action: 'apply' | 'skip' | 'modify_amount';
  actionValue?: number;
}

const CATEGORY_TYPES = [
  { value: 'fee', label: 'Fee', icon: DollarSign, color: '#3B82F6' },
  { value: 'deposit', label: 'Deposit', icon: CreditCard, color: '#10B981' },
  { value: 'refund', label: 'Refund', icon: CreditCard, color: '#EF4444' },
  { value: 'discount', label: 'Discount', icon: Percent, color: '#F59E0B' },
  { value: 'tax', label: 'Tax', icon: Percent, color: '#8B5CF6' },
  { value: 'other', label: 'Other', icon: Tag, color: '#6B7280' },
];

const CATEGORY_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

const DEFAULT_CATEGORIES: PaymentCategory[] = [
  {
    id: '1',
    name: 'Tuition Fee',
    code: 'TUITION',
    description: 'Standard tuition fee for courses',
    type: 'fee',
    defaultAmount: 50000,
    taxRate: 18,
    taxInclusive: false,
    isRefundable: true,
    isActive: true,
    displayOrder: 1,
    color: '#3B82F6',
    rules: [],
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Registration Fee',
    code: 'REG',
    description: 'One-time registration fee',
    type: 'fee',
    defaultAmount: 5000,
    taxRate: 0,
    taxInclusive: true,
    isRefundable: false,
    isActive: true,
    displayOrder: 2,
    color: '#10B981',
    rules: [],
    createdAt: '2024-01-01',
  },
  {
    id: '3',
    name: 'Security Deposit',
    code: 'DEPOSIT',
    description: 'Refundable security deposit',
    type: 'deposit',
    defaultAmount: 10000,
    taxRate: 0,
    taxInclusive: true,
    isRefundable: true,
    isActive: true,
    displayOrder: 3,
    color: '#8B5CF6',
    rules: [],
    createdAt: '2024-01-01',
  },
  {
    id: '4',
    name: 'Early Bird Discount',
    code: 'EARLY_BIRD',
    description: 'Discount for early registration',
    type: 'discount',
    defaultAmount: 5000,
    taxRate: 0,
    taxInclusive: true,
    isRefundable: false,
    isActive: true,
    displayOrder: 4,
    color: '#F59E0B',
    rules: [],
    createdAt: '2024-01-01',
  },
  {
    id: '5',
    name: 'GST',
    code: 'GST',
    description: 'Goods and Services Tax',
    type: 'tax',
    taxRate: 18,
    taxInclusive: false,
    isRefundable: false,
    isActive: true,
    displayOrder: 5,
    color: '#EF4444',
    rules: [],
    createdAt: '2024-01-01',
  },
];

export default function PaymentCategoriesPage() {
  const [categories, setCategories] = useState<PaymentCategory[]>(DEFAULT_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PaymentCategory | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<PaymentCategory | null>(null);

  const [formData, setFormData] = useState<Partial<PaymentCategory>>({
    name: '',
    code: '',
    description: '',
    type: 'fee',
    defaultAmount: 0,
    taxRate: 0,
    taxInclusive: false,
    isRefundable: true,
    isActive: true,
    color: CATEGORY_COLORS[0],
    rules: [],
  });

  const filteredCategories = categories.filter(cat => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || cat.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSave = () => {
    if (!formData.name || !formData.code) return;

    if (editingCategory) {
      setCategories(
        categories.map(c =>
          c.id === editingCategory.id
            ? { ...c, ...formData, id: c.id, createdAt: c.createdAt }
            : c
        )
      );
    } else {
      const newCategory: PaymentCategory = {
        ...(formData as PaymentCategory),
        id: Date.now().toString(),
        displayOrder: categories.length + 1,
        rules: [],
        createdAt: new Date().toISOString(),
      };
      setCategories([...categories, newCategory]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      type: 'fee',
      defaultAmount: 0,
      taxRate: 0,
      taxInclusive: false,
      isRefundable: true,
      isActive: true,
      color: CATEGORY_COLORS[0],
      rules: [],
    });
    setShowAddModal(false);
    setEditingCategory(null);
  };

  const handleEdit = (category: PaymentCategory) => {
    setFormData(category);
    setEditingCategory(category);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const handleDuplicate = (category: PaymentCategory) => {
    const newCategory: PaymentCategory = {
      ...category,
      id: Date.now().toString(),
      name: `${category.name} (Copy)`,
      code: `${category.code}_COPY`,
      displayOrder: categories.length + 1,
      createdAt: new Date().toISOString(),
    };
    setCategories([...categories, newCategory]);
  };

  const handleToggleActive = (id: string) => {
    setCategories(categories.map(c => (c.id === id ? { ...c, isActive: !c.isActive } : c)));
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Payment Categories</h1>
        </div>
        <p className="text-slate-600 mt-1 ml-12">
          Configure fee types, taxes, discounts, and payment rules
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {CATEGORY_TYPES.slice(0, 4).map(type => {
          const count = categories.filter(c => c.type === type.value && c.isActive).length;
          const TypeIcon = type.icon;
          return (
            <div
              key={type.value}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${type.color}20` }}
                >
                  <TypeIcon className="w-5 h-5" style={{ color: type.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-sm text-slate-500">{type.label}s</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              {CATEGORY_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Type</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">
                  Default Amount
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">
                  Tax Rate
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                  Refundable
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCategories.map(category => {
                const typeInfo = CATEGORY_TYPES.find(t => t.value === category.type);
                const TypeIcon = typeInfo?.icon || Tag;
                return (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium text-slate-900">{category.name}</p>
                          <p className="text-xs text-slate-500">{category.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${typeInfo?.color}15`,
                          color: typeInfo?.color,
                        }}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {formatCurrency(category.defaultAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {category.taxRate ? (
                        <span className="text-slate-900">
                          {category.taxRate}%
                          {category.taxInclusive && (
                            <span className="text-xs text-slate-500 ml-1">(incl.)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {category.isRefundable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          <Check className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          <X className="w-3 h-3" />
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(category.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          category.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {category.isActive ? (
                          <>
                            <ToggleRight className="w-4 h-4" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setShowRulesModal(category)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          title="Configure rules"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(category)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCategories.length === 0 && (
          <div className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No categories found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add Payment Category'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tuition Fee"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., TUITION"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {CATEGORY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <div className="flex gap-2">
                    {CATEGORY_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          formData.color === color ? 'border-slate-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Default Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={formData.defaultAmount || ''}
                      onChange={e =>
                        setFormData({ ...formData, defaultAmount: parseFloat(e.target.value) })
                      }
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.taxRate || ''}
                      onChange={e =>
                        setFormData({ ...formData, taxRate: parseFloat(e.target.value) })
                      }
                      placeholder="0"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.taxInclusive}
                    onChange={e =>
                      setFormData({ ...formData, taxInclusive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-primary-600"
                  />
                  <span className="text-sm text-slate-700">Tax Inclusive</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRefundable}
                    onChange={e =>
                      setFormData({ ...formData, isRefundable: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-primary-600"
                  />
                  <span className="text-sm text-slate-700">Refundable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600"
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.code}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {editingCategory ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                Category Rules: {showRulesModal.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Configure conditions when this category should be applied or modified
              </p>
            </div>
            <div className="p-4">
              {showRulesModal.rules.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">No rules configured</p>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    Add First Rule
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {showRulesModal.rules.map(rule => (
                    <div
                      key={rule.id}
                      className="p-3 border border-slate-200 rounded-lg flex items-center justify-between"
                    >
                      <div className="text-sm">
                        If <strong>{rule.condition}</strong> {rule.operator}{' '}
                        <strong>{rule.value}</strong>, then <strong>{rule.action}</strong>
                        {rule.actionValue && ` (${rule.actionValue})`}
                      </div>
                      <button className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-3">Add New Rule</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="course">Course</option>
                    <option value="branch">Branch</option>
                    <option value="student_type">Student Type</option>
                    <option value="payment_mode">Payment Mode</option>
                  </select>
                  <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="apply">Apply</option>
                    <option value="skip">Skip</option>
                    <option value="modify_amount">Modify Amount</option>
                  </select>
                </div>
                <button className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                  Add Rule
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowRulesModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
