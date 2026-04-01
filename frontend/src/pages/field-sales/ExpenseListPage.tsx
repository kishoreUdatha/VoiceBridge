import { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchExpenses,
  fetchMySummary,
  submitExpense,
  deleteExpense,
  fetchCategoryLimits,
  createExpense,
  updateExpense,
  fetchPendingApprovals,
  approveOrRejectExpense,
  bulkApprove,
  markAsPaid,
} from '../../store/slices/fieldSales/expenseSlice';
import { fetchColleges } from '../../store/slices/fieldSales/collegeSlice';
import {
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  XMarkIcon,
  PencilIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  UserIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ExpenseStatus, ExpenseCategory, CreateExpenseData, ExpenseLog, expenseService, Expense } from '../../services/fieldSales/expense.service';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

const categoryLabels: Record<ExpenseCategory, string> = {
  TRAVEL_FUEL: 'Fuel',
  TRAVEL_TAXI: 'Taxi',
  TRAVEL_AUTO: 'Auto',
  TRAVEL_BUS: 'Bus',
  TRAVEL_TRAIN: 'Train',
  TRAVEL_FLIGHT: 'Flight',
  TRAVEL_PARKING: 'Parking',
  FOOD_MEALS: 'Meals',
  FOOD_SNACKS: 'Snacks',
  FOOD_ENTERTAINMENT: 'F&B',
  ACCOMMODATION: 'Stay',
  MARKETING_MATERIALS: 'Marketing',
  COMMUNICATION: 'Comm',
  OTHER: 'Other',
};

const categoryColors: Record<ExpenseCategory, string> = {
  TRAVEL_FUEL: 'bg-blue-100 text-blue-700',
  TRAVEL_TAXI: 'bg-blue-100 text-blue-700',
  TRAVEL_AUTO: 'bg-blue-100 text-blue-700',
  TRAVEL_BUS: 'bg-blue-100 text-blue-700',
  TRAVEL_TRAIN: 'bg-blue-100 text-blue-700',
  TRAVEL_FLIGHT: 'bg-blue-100 text-blue-700',
  TRAVEL_PARKING: 'bg-blue-100 text-blue-700',
  FOOD_MEALS: 'bg-orange-100 text-orange-700',
  FOOD_SNACKS: 'bg-orange-100 text-orange-700',
  FOOD_ENTERTAINMENT: 'bg-orange-100 text-orange-700',
  ACCOMMODATION: 'bg-purple-100 text-purple-700',
  MARKETING_MATERIALS: 'bg-emerald-100 text-emerald-700',
  COMMUNICATION: 'bg-pink-100 text-pink-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

type MainTab = 'my-expenses' | 'pending-approvals' | 'approved' | 'paid' | 'rejected';
type UserStatusFilter = '' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED';

export default function ExpenseListPage() {
  const dispatch = useAppDispatch();
  const { expenses, mySummary, pendingApprovals, total, page, isLoading, isSubmitting } = useAppSelector(
    (state) => state.fieldSalesExpenses
  );
  const { colleges } = useAppSelector((state) => state.fieldSalesColleges);
  const { user } = useAppSelector((state) => state.auth);

  // Check if user has approval permissions
  const canApprove = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'owner';

  const [mainTab, setMainTab] = useState<MainTab>('my-expenses');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Approval modal states
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectExpense, setRejectExpense] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [payExpense, setPayExpense] = useState<Expense | null>(null);
  const [paymentRef, setPaymentRef] = useState('');

  const {
    register,
    handleSubmit: handleFormSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateExpenseData>();

  const watchReceiptUrl = watch('receiptUrl');

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  useEffect(() => {
    dispatch(fetchColleges({ filter: {}, page: 1, limit: 100 }));
    dispatch(fetchCategoryLimits());
  }, [dispatch]);

  useEffect(() => {
    if (mainTab === 'my-expenses') {
      // For "My Expenses" - show only current user's expenses with optional status filter
      const filter: any = { userId: user?.id };
      if (userStatusFilter) {
        filter.status = userStatusFilter;
      }
      dispatch(fetchExpenses({
        filter,
        page,
        limit: 20,
      }));
      dispatch(fetchMySummary(undefined));
    } else if (mainTab === 'pending-approvals') {
      dispatch(fetchPendingApprovals());
    } else {
      // approved, paid, rejected tabs - show all for admins
      dispatch(fetchExpenses({
        filter: { status: mainTab.toUpperCase() as ExpenseStatus },
        page: 1,
        limit: 50
      }));
    }
    setSelectedExpenses([]);
  }, [dispatch, page, mainTab, user?.id, userStatusFilter]);

  const onSubmitExpense = async (data: CreateExpenseData) => {
    try {
      if (editingExpense) {
        await dispatch(updateExpense({ id: editingExpense.id, data })).unwrap();
        toast.success('Expense updated successfully');
      } else {
        const result = await dispatch(createExpense(data)).unwrap();
        toast.success('Expense created successfully');
        if (result.warning) {
          toast(result.warning, { icon: '⚠️' });
        }
      }
      setIsModalOpen(false);
      setEditingExpense(null);
      reset();
    } catch (error: any) {
      toast.error(error || (editingExpense ? 'Failed to update expense' : 'Failed to create expense'));
    }
  };

  const handleEdit = async (expense: any) => {
    setEditingExpense(expense);
    setValue('category', expense.category);
    setValue('amount', Number(expense.amount));
    setValue('expenseDate', expense.expenseDate.split('T')[0]);
    setValue('collegeId', expense.collegeId);
    setValue('description', expense.description || '');
    setValue('receiptUrl', expense.receiptUrl || '');
    setIsModalOpen(true);

    // Fetch logs for non-draft expenses
    if (expense.status !== 'DRAFT') {
      setIsLoadingLogs(true);
      try {
        const logs = await expenseService.getExpenseLogs(expense.id);
        setExpenseLogs(logs);
      } catch (error) {
        console.error('Failed to fetch expense logs:', error);
        setExpenseLogs([]);
      } finally {
        setIsLoadingLogs(false);
      }
    } else {
      setExpenseLogs([]);
    }
  };

  const isViewOnly = editingExpense && editingExpense.status !== 'DRAFT';

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setExpenseLogs([]);
    reset();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image (JPG, PNG, GIF, WebP) or PDF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'receipts');
      formData.append('isPublic', 'true');

      const response = await api.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setValue('receiptUrl', response.data.file.url);
        toast.success('Receipt uploaded successfully');
      } else {
        toast.error('Failed to upload receipt');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense?.receiptUrl) {
      toast.error('Please upload a receipt before submitting');
      if (expense) {
        handleEdit(expense);
      }
      return;
    }

    try {
      await dispatch(submitExpense(id)).unwrap();
      toast.success('Expense submitted for approval');
    } catch (error: any) {
      toast.error(error || 'Failed to submit expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this expense?')) {
      try {
        await dispatch(deleteExpense(id)).unwrap();
        toast.success('Expense deleted');
      } catch (error: any) {
        toast.error(error || 'Failed to delete expense');
      }
    }
  };

  // Approval handlers
  const handleApprove = async (expense: Expense) => {
    setIsProcessing(true);
    try {
      await dispatch(approveOrRejectExpense({
        id: expense.id,
        data: { status: 'APPROVED' }
      })).unwrap();
      toast.success('Expense approved');
      dispatch(fetchPendingApprovals());
    } catch (error: any) {
      toast.error(error || 'Failed to approve');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectExpense) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      await dispatch(approveOrRejectExpense({
        id: rejectExpense.id,
        data: { status: 'REJECTED', approverComments: rejectReason }
      })).unwrap();
      toast.success('Expense rejected');
      setRejectExpense(null);
      setRejectReason('');
      dispatch(fetchPendingApprovals());
    } catch (error: any) {
      toast.error(error || 'Failed to reject');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.length === 0) {
      toast.error('Select expenses to approve');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await dispatch(bulkApprove(selectedExpenses)).unwrap();
      toast.success(`${result.approved} expenses approved`);
      setSelectedExpenses([]);
      dispatch(fetchPendingApprovals());
    } catch (error: any) {
      toast.error(error || 'Failed to approve');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!payExpense) return;

    setIsProcessing(true);
    try {
      await dispatch(markAsPaid({
        id: payExpense.id,
        paymentReference: paymentRef || undefined
      })).unwrap();
      toast.success('Expense marked as paid');
      setPayExpense(null);
      setPaymentRef('');
      dispatch(fetchExpenses({ filter: { status: 'APPROVED' }, page: 1, limit: 50 }));
    } catch (error: any) {
      toast.error(error || 'Failed to mark as paid');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectExpense = (id: string) => {
    setSelectedExpenses(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (expenseIds: string[]) => {
    if (selectedExpenses.length === expenseIds.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(expenseIds);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  };

  const formatDateFull = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get all pending expense IDs for bulk select
  const allPendingIds = pendingApprovals?.byUser.flatMap(u => u.expenses.map(e => e.id)) || [];
  const pendingCount = pendingApprovals?.total || 0;
  const pendingAmount = pendingApprovals?.totalAmount || 0;

  return (
    <div className="min-h-screen sm:min-h-0">
      {/* Mobile Header - Sticky */}
      <div className="sm:hidden bg-emerald-600 text-white sticky top-0 z-20 -mx-4 -mt-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Expenses</h1>
            <p className="text-emerald-200 text-[10px]">
              {canApprove ? 'Manage claims' : 'Track claims'}
            </p>
          </div>
          {mainTab === 'my-expenses' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-2 bg-white text-emerald-600 text-xs font-semibold rounded-lg active:scale-95 transition-transform"
            >
              Add Expense
            </button>
          )}
        </div>

        {/* Mobile Summary */}
        {mySummary && mainTab === 'my-expenses' && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">₹{mySummary.draft.amount.toLocaleString()}</p>
              <p className="text-[9px] text-emerald-200">Draft</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">₹{mySummary.submitted.amount.toLocaleString()}</p>
              <p className="text-[9px] text-emerald-200">Pending</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">₹{mySummary.approved.amount.toLocaleString()}</p>
              <p className="text-[9px] text-emerald-200">Approved</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">₹{mySummary.paid.amount.toLocaleString()}</p>
              <p className="text-[9px] text-emerald-200">Paid</p>
            </div>
          </div>
        )}

        {/* Mobile Tab Pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <button
            onClick={() => setMainTab('my-expenses')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              mainTab === 'my-expenses' ? 'bg-white text-emerald-600' : 'bg-white/10 text-white'
            }`}
          >
            My Expenses
          </button>
          {canApprove && (
            <>
              <button
                onClick={() => setMainTab('pending-approvals')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  mainTab === 'pending-approvals' ? 'bg-white text-emerald-600' : 'bg-white/10 text-white'
                }`}
              >
                Pending
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">{pendingCount}</span>
                )}
              </button>
              <button
                onClick={() => setMainTab('approved')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  mainTab === 'approved' ? 'bg-white text-emerald-600' : 'bg-white/10 text-white'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setMainTab('paid')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  mainTab === 'paid' ? 'bg-white text-emerald-600' : 'bg-white/10 text-white'
                }`}
              >
                Paid
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Expenses</h1>
          <p className="text-xs text-slate-500">
            {canApprove ? 'Manage and approve expense claims' : 'Track and submit expense claims'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mainTab === 'pending-approvals' && selectedExpenses.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Approve Selected ({selectedExpenses.length})
            </button>
          )}
          {mainTab === 'my-expenses' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Admin Tabs - Only show for admins */}
      {canApprove && (
        <div className="bg-white rounded-xl border border-slate-200 p-2 mb-4 flex items-center justify-between">
          {/* Left: Main Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMainTab('my-expenses')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mainTab === 'my-expenses'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Expenses
            </button>
            <span className="text-slate-300 mx-1">|</span>
            <button
              onClick={() => setMainTab('pending-approvals')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                mainTab === 'pending-approvals'
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pending Approvals
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMainTab('approved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mainTab === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setMainTab('paid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mainTab === 'paid'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setMainTab('rejected')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mainTab === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rejected
            </button>
          </div>

          {/* Right: Stats or Selected count */}
          <div className="flex items-center gap-3">
            {mainTab === 'pending-approvals' && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-amber-600">
                  Total: <span className="font-semibold">₹{pendingAmount.toLocaleString()}</span>
                </span>
                {selectedExpenses.length > 0 && (
                  <span className="text-slate-500">({selectedExpenses.length} selected)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Expenses Tab Content */}
      {mainTab === 'my-expenses' && (
        <>
          {/* Status Filter for User's Own Expenses */}
          <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
            <button
              onClick={() => setUserStatusFilter('')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                userStatusFilter === ''
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setUserStatusFilter('DRAFT')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                userStatusFilter === 'DRAFT'
                  ? 'border-slate-600 text-slate-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Draft
              {mySummary && mySummary.draft.count > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {mySummary.draft.count} · ₹{mySummary.draft.amount.toLocaleString()}
                </span>
              )}
            </button>
            <button
              onClick={() => setUserStatusFilter('SUBMITTED')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                userStatusFilter === 'SUBMITTED'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Pending
              {mySummary && mySummary.submitted.count > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                  {mySummary.submitted.count} · ₹{mySummary.submitted.amount.toLocaleString()}
                </span>
              )}
            </button>
            <button
              onClick={() => setUserStatusFilter('APPROVED')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                userStatusFilter === 'APPROVED'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Approved
              {mySummary && mySummary.approved.count > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
                  {mySummary.approved.count} · ₹{mySummary.approved.amount.toLocaleString()}
                </span>
              )}
            </button>
            <button
              onClick={() => setUserStatusFilter('PAID')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                userStatusFilter === 'PAID'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Paid
              {mySummary && mySummary.paid.count > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                  {mySummary.paid.count} · ₹{mySummary.paid.amount.toLocaleString()}
                </span>
              )}
            </button>
          </div>

          {/* Expenses List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <CurrencyRupeeIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">No expenses found</p>
              <p className="text-xs text-slate-400 mb-4">Add your first expense to get started</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg"
              >
                Add Expense
              </button>
            </div>
          ) : (
            <>
            {/* Mobile Expense Cards */}
            <div className="sm:hidden space-y-3 pt-4">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  onClick={() => handleEdit(expense)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${categoryColors[expense.category]}`}>
                        {categoryLabels[expense.category]}
                      </span>
                      <p className="text-sm font-medium text-slate-900 mt-1">{expense.description || 'No description'}</p>
                      <p className="text-xs text-slate-500">{expense.college?.name || '-'}</p>
                    </div>
                    <p className="text-base font-bold text-slate-900">₹{Number(expense.amount).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{formatDate(expense.expenseDate)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        expense.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                        expense.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700' :
                        expense.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                        expense.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {expense.status === 'SUBMITTED' ? 'Pending' : expense.status}
                      </span>
                    </div>
                    {expense.status === 'DRAFT' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSubmit(expense.id); }}
                          className="p-1.5 text-emerald-600 bg-emerald-50 rounded"
                        >
                          <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }}
                          className="p-1.5 text-red-500 bg-red-50 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* Header Row */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-[70px_60px_1fr_1fr_85px_80px_85px] gap-4 items-center">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Date</span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Type</span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Description</span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">College</span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Status</span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase text-right">Amount</span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase text-center">Actions</span>
                </div>
              </div>

              {/* Expense Rows */}
              <div>
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <div className="grid grid-cols-[70px_60px_1fr_1fr_85px_80px_85px] gap-4 items-center">
                      <span className="text-sm text-slate-700">{formatDate(expense.expenseDate)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium w-fit ${categoryColors[expense.category] || 'bg-slate-100 text-slate-700'}`}>
                        {categoryLabels[expense.category] || expense.category}
                      </span>
                      <p className="text-sm text-slate-800 truncate">{expense.description || '-'}</p>
                      <p className="text-sm text-slate-600 truncate">{expense.college?.name || '-'}</p>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          expense.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                          expense.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700' :
                          expense.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          expense.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {expense.status === 'SUBMITTED' ? 'Pending' : expense.status.charAt(0) + expense.status.slice(1).toLowerCase()}
                        </span>
                        {expense.status === 'DRAFT' && !expense.receiptUrl && (
                          <ExclamationTriangleIcon
                            className="h-3.5 w-3.5 text-amber-500"
                            title="Receipt required"
                          />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 text-right">₹{Number(expense.amount).toLocaleString()}</p>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title={expense.status === 'DRAFT' ? 'Edit' : 'View'}
                        >
                          {expense.status === 'DRAFT' ? (
                            <PencilIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                        {expense.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => handleSubmit(expense.id)}
                              disabled={isSubmitting}
                              className="p-1.5 text-primary-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors disabled:opacity-50"
                              title="Submit"
                            >
                              <PaperAirplaneIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {total > 20 && (
                <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">
                    {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} of {total}
                  </p>
                  <div className="flex gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => dispatch({ type: 'fieldSales/expenses/setPage', payload: page - 1 })}
                      className="px-2 py-1 text-[10px] border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      disabled={page * 20 >= total}
                      onClick={() => dispatch({ type: 'fieldSales/expenses/setPage', payload: page + 1 })}
                      className="px-2 py-1 text-[10px] border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </>
      )}

      {/* Pending Approvals Tab Content */}
      {mainTab === 'pending-approvals' && canApprove && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingApprovals && pendingApprovals.byUser.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header Row */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedExpenses.length === allPendingIds.length && allPendingIds.length > 0}
                      onChange={() => toggleSelectAll(allPendingIds)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Date</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Employee</span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Category</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Description</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Amount</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Actions</span>
                  </div>
                </div>
              </div>

              {/* Expense Rows */}
              <div className="divide-y divide-slate-100">
                {pendingApprovals.byUser.flatMap((userGroup) =>
                  userGroup.expenses.map((expense) => (
                    <div key={expense.id} className="px-4 py-2.5 hover:bg-slate-50/80 transition-colors">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={() => toggleSelectExpense(expense.id)}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </div>
                        <div className="col-span-1">
                          <span className="text-xs font-medium text-slate-700">{formatDate(expense.expenseDate)}</span>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-slate-900">
                            {userGroup.user.firstName} {userGroup.user.lastName}
                          </p>
                        </div>
                        <div className="col-span-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${categoryColors[expense.category] || 'bg-slate-100 text-slate-700'}`}>
                            {categoryLabels[expense.category] || expense.category}
                          </span>
                        </div>
                        <div className="col-span-3">
                          <p className="text-xs text-slate-700 truncate">{expense.description || 'No description'}</p>
                          <p className="text-[10px] text-slate-400 truncate">{expense.college?.name || '-'}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-semibold text-slate-900">₹{Number(expense.amount).toLocaleString()}</p>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(expense)}
                            disabled={isProcessing}
                            className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded hover:bg-emerald-200 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectExpense(expense)}
                            disabled={isProcessing}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <CheckCircleIcon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">No pending approvals</p>
              <p className="text-xs text-slate-400">All expenses have been reviewed</p>
            </div>
          )}
        </>
      )}

      {/* Approved / Paid / Rejected Tab Content */}
      {(mainTab === 'approved' || mainTab === 'paid' || mainTab === 'rejected') && canApprove && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : expenses.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Date</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Employee</span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Category</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Description</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Amount</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Actions</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <div key={expense.id} className="px-4 py-2.5 hover:bg-slate-50/50">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-slate-700">
                          {formatDateFull(expense.expenseDate)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-700">
                          {expense.user?.firstName} {expense.user?.lastName}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${categoryColors[expense.category]}`}>
                          {categoryLabels[expense.category]}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <p className="text-xs text-slate-700 truncate">{expense.description}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-bold text-slate-900">
                          ₹{Number(expense.amount).toLocaleString()}
                        </p>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {mainTab === 'approved' && (
                          <button
                            onClick={() => setPayExpense(expense)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200"
                          >
                            Mark Paid
                          </button>
                        )}
                        {mainTab === 'paid' && expense.paymentRef && (
                          <span className="text-[10px] text-slate-500">
                            Ref: {expense.paymentRef}
                          </span>
                        )}
                        {mainTab === 'rejected' && expense.rejectionReason && (
                          <span className="text-[10px] text-red-500 truncate max-w-[100px]" title={expense.rejectionReason}>
                            {expense.rejectionReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <CurrencyRupeeIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">No expenses found</p>
              <p className="text-xs text-slate-400">
                {mainTab === 'approved' && 'No approved expenses pending payment'}
                {mainTab === 'paid' && 'No paid expenses yet'}
                {mainTab === 'rejected' && 'No rejected expenses'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Create/Edit/View Expense - Right Side Panel */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" onClick={handleCloseModal}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Panel */}
          <div
            className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isViewOnly ? 'Expense Details' : editingExpense ? 'Edit Expense' : 'New Expense'}
                </h2>
                {editingExpense && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateFull(editingExpense.expenseDate)} • {categoryLabels[editingExpense.category]}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleFormSubmit(onSubmitExpense)} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Show submitter info for view mode */}
                {isViewOnly && editingExpense?.user && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Submitted by</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {editingExpense.user.firstName} {editingExpense.user.lastName}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Category {!isViewOnly && <span className="text-red-500">*</span>}</label>
                    <select
                      {...register('category', { required: !isViewOnly && 'Required' })}
                      disabled={isViewOnly}
                      className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isViewOnly ? 'bg-slate-50 text-slate-600' : ''}`}
                    >
                    <option value="">Select</option>
                    <optgroup label="Travel">
                      <option value="TRAVEL_FUEL">Fuel</option>
                      <option value="TRAVEL_TAXI">Taxi/Cab</option>
                      <option value="TRAVEL_AUTO">Auto</option>
                      <option value="TRAVEL_BUS">Bus</option>
                      <option value="TRAVEL_TRAIN">Train</option>
                      <option value="TRAVEL_FLIGHT">Flight</option>
                      <option value="TRAVEL_PARKING">Parking</option>
                    </optgroup>
                    <optgroup label="Food">
                      <option value="FOOD_MEALS">Meals</option>
                      <option value="FOOD_SNACKS">Snacks</option>
                      <option value="FOOD_ENTERTAINMENT">F&B Entertainment</option>
                    </optgroup>
                    <option value="ACCOMMODATION">Accommodation</option>
                    <option value="MARKETING_MATERIALS">Marketing Materials</option>
                    <option value="COMMUNICATION">Communication</option>
                    <option value="OTHER">Other</option>
                  </select>
                    {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Amount (₹) {!isViewOnly && <span className="text-red-500">*</span>}</label>
                    <input
                      type="number"
                      {...register('amount', { required: !isViewOnly && 'Required', valueAsNumber: true, min: 1 })}
                      disabled={isViewOnly}
                      className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isViewOnly ? 'bg-slate-50 text-slate-600' : ''}`}
                      placeholder="0"
                    />
                    {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Date {!isViewOnly && <span className="text-red-500">*</span>}</label>
                    <input
                      type="date"
                      {...register('expenseDate', { required: !isViewOnly && 'Required' })}
                      disabled={isViewOnly}
                      className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isViewOnly ? 'bg-slate-50 text-slate-600' : ''}`}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">College {!isViewOnly && <span className="text-red-500">*</span>}</label>
                    <select
                      {...register('collegeId', { required: !isViewOnly && 'Required' })}
                      disabled={isViewOnly}
                      className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isViewOnly ? 'bg-slate-50 text-slate-600' : ''}`}
                    >
                      <option value="">Select</option>
                      {colleges.map((college) => (
                        <option key={college.id} value={college.id}>{college.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Description {!isViewOnly && <span className="text-red-500">*</span>}</label>
                  <textarea
                    {...register('description', { required: !isViewOnly && 'Required' })}
                    disabled={isViewOnly}
                    className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isViewOnly ? 'bg-slate-50 text-slate-600' : ''}`}
                    rows={3}
                    placeholder="Describe the expense..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                    Receipt {!isViewOnly && <span className="text-red-500">*</span>}
                    <span className="text-xs text-slate-400 font-normal ml-1">(Required for submission)</span>
                  </label>

                  {!isViewOnly && (
                    <div className="mb-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,.pdf"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CloudArrowUpIcon className="w-5 h-5" />
                            Upload Receipt (Image/PDF)
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <input
                    type="hidden"
                    {...register('receiptUrl', { required: !isViewOnly && 'Receipt is required for submission' })}
                  />

                  {watchReceiptUrl && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      {watchReceiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={watchReceiptUrl} alt="Receipt" className="w-14 h-14 object-cover rounded-lg" />
                      ) : (
                        <DocumentIcon className="w-14 h-14 text-slate-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-600 truncate">{watchReceiptUrl.split('/').pop()}</p>
                        <a
                          href={watchReceiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline font-medium"
                        >
                          View Receipt →
                        </a>
                      </div>
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => setValue('receiptUrl', '')}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
                  </div>
                )}

                  {errors.receiptUrl && <p className="text-xs text-red-500 mt-2">{errors.receiptUrl.message}</p>}
              </div>

              {/* Status info for view mode */}
              {isViewOnly && editingExpense && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Status:</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      editingExpense.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
                      editingExpense.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      editingExpense.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      editingExpense.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {editingExpense.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Transaction Log / Audit Trail */}
              {isViewOnly && (
                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-[10px] font-semibold text-slate-600 uppercase mb-2">Transaction History</h3>
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-3">
                      <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : expenseLogs.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2">No transaction history available</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {expenseLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1 ${
                              log.action === 'CREATED' ? 'bg-slate-400' :
                              log.action === 'SUBMITTED' ? 'bg-amber-500' :
                              log.action === 'APPROVED' ? 'bg-emerald-500' :
                              log.action === 'REJECTED' ? 'bg-red-500' :
                              log.action === 'PAYMENT_PROCESSED' ? 'bg-blue-500' :
                              'bg-slate-400'
                            }`} />
                            <div className="w-px h-full bg-slate-200" />
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                log.action === 'CREATED' ? 'bg-slate-100 text-slate-600' :
                                log.action === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
                                log.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                log.action === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                log.action === 'PAYMENT_PROCESSED' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {log.action.replace('_', ' ')}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(log.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              {log.comments || `By ${log.user.firstName} ${log.user.lastName}`}
                            </p>
                            {log.comments && (
                              <p className="text-[9px] text-slate-400">
                                By {log.user.firstName} {log.user.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

                {/* Footer Actions */}
                <div className="pt-6 mt-6 border-t border-slate-200 flex justify-end gap-3">
                  {isViewOnly ? (
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Close
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        {editingExpense ? 'Update Expense' : 'Create Expense'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectExpense && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectExpense(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Reject Expense</h2>
              <button onClick={() => setRejectExpense(null)} className="p-1 hover:bg-slate-100 rounded">
                <XMarkIcon className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">
                  {rejectExpense.user?.firstName} {rejectExpense.user?.lastName}
                </p>
                <p className="text-sm font-medium text-slate-900">{rejectExpense.description}</p>
                <p className="text-lg font-bold text-slate-900">₹{Number(rejectExpense.amount).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  placeholder="Provide a reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRejectExpense(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {payExpense && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPayExpense(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Mark as Paid</h2>
              <button onClick={() => setPayExpense(null)} className="p-1 hover:bg-slate-100 rounded">
                <XMarkIcon className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">
                  {payExpense.user?.firstName} {payExpense.user?.lastName}
                </p>
                <p className="text-sm font-medium text-slate-900">{payExpense.description}</p>
                <p className="text-lg font-bold text-emerald-600">₹{Number(payExpense.amount).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., NEFT-123456, UPI-xyz"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPayExpense(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
