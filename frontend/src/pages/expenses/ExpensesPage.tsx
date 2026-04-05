import { useEffect, useState } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  businessExpenseService,
  BusinessExpense,
  CreateExpenseInput,
  ExpenseCategory,
  EXPENSE_CATEGORY_LABELS,
} from '../../services/business-expense.service';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  MARKETING: 'bg-purple-100 text-purple-700',
  SALARY: 'bg-blue-100 text-blue-700',
  RENT: 'bg-amber-100 text-amber-700',
  TRAVEL: 'bg-green-100 text-green-700',
  UTILITIES: 'bg-cyan-100 text-cyan-700',
  OFFICE_SUPPLIES: 'bg-indigo-100 text-indigo-700',
  COMMISSION_PAYOUT: 'bg-emerald-100 text-emerald-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BusinessExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BusinessExpense | null>(null);
  const [formData, setFormData] = useState<CreateExpenseInput>({
    category: 'OTHER',
    description: '',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    vendorName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, [searchQuery, categoryFilter, pagination.page]);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      const result = await businessExpenseService.getAll({
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setExpenses(result.expenses);
      setPagination((prev) => ({ ...prev, ...result.pagination }));
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormData({
      category: 'OTHER',
      description: '',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      vendorName: '',
    });
    setShowFormModal(true);
  };

  const openEditModal = (expense: BusinessExpense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate.split('T')[0],
      vendorName: expense.vendorName || '',
      receiptUrl: expense.receiptUrl || '',
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingExpense) {
        await businessExpenseService.update(editingExpense.id, formData);
      } else {
        await businessExpenseService.create(formData);
      }
      setShowFormModal(false);
      loadExpenses();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await businessExpenseService.delete(id);
      setDeleteConfirm(null);
      loadExpenses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Business Expenses</h1>
          <p className="text-sm text-slate-500">Total: {formatCurrency(totalAmount)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | '')}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
          >
            <option value="">All Categories</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
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
          <p className="mt-3 text-sm text-slate-500">Loading expenses...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && expenses.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Vendor</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Created By</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-900">{formatDate(expense.expenseDate)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[expense.category]}`}>
                      {EXPENSE_CATEGORY_LABELS[expense.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900 truncate max-w-[250px]">{expense.description}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {expense.vendorName || '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {expense.createdBy.firstName} {expense.createdBy.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(expense)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(expense)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && expenses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
          <DocumentTextIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-800">No expenses found</h3>
          <p className="text-sm text-slate-500 mt-1">Start tracking your business expenses.</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Delete Expense</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete this expense of <span className="font-medium text-slate-800">{formatCurrency(deleteConfirm.amount)}</span>?
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                >
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  placeholder="What was this expense for?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
                <input
                  type="text"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  placeholder="e.g., Google Ads, Zomato, etc."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingExpense ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
