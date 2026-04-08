/**
 * Lead Detail Modals - Extracted modal components
 */

import { useState, useEffect, useRef } from 'react';
import { LeadPayment, LeadDocument } from '../../../services/leadDetails.service';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ModalWrapper({ isOpen, title, children }: ModalWrapperProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: { title: string; description: string; dueDate: string; priority: string; assigneeId: string }) => void;
  counselors: Array<{ id: string; firstName: string; lastName: string }>;
}

export function TaskModal({ isOpen, onClose, onSubmit, counselors }: TaskModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    assigneeId: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assigneeId: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Task">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
        <input
          type="datetime-local"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="LOW">Low Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">Assign to me</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.title.trim()} className="btn btn-primary">Create Task</button>
      </div>
    </ModalWrapper>
  );
}

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (followUp: { scheduledAt: string; message: string; notes: string; assigneeId: string }) => void;
  counselors: Array<{ id: string; firstName: string; lastName: string }>;
}

export function FollowUpModal({ isOpen, onClose, onSubmit, counselors }: FollowUpModalProps) {
  const [form, setForm] = useState({
    scheduledAt: '',
    message: '',
    notes: '',
    assigneeId: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ scheduledAt: '', message: '', notes: '', assigneeId: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Schedule Follow-up">
      <div className="space-y-4">
        <input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="text"
          placeholder="Message (optional)"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
        <select
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">Assign to me</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.scheduledAt} className="btn btn-primary">Schedule</button>
      </div>
    </ModalWrapper>
  );
}

interface QueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void;
}

export function QueryModal({ isOpen, onClose, onSubmit }: QueryModalProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    onSubmit(query);
    setQuery('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Query">
      <textarea
        placeholder="Enter query..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        rows={4}
      />
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!query.trim()} className="btn btn-primary">Add Query</button>
      </div>
    </ModalWrapper>
  );
}

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (programName: string) => void;
}

export function ApplicationModal({ isOpen, onClose, onSubmit }: ApplicationModalProps) {
  const [programName, setProgramName] = useState('');

  const handleSubmit = () => {
    onSubmit(programName);
    setProgramName('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Application">
      <input
        type="text"
        placeholder="Program Name (optional)"
        value={programName}
        onChange={(e) => setProgramName(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
      />
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} className="btn btn-primary">Create Application</button>
      </div>
    </ModalWrapper>
  );
}

interface InterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (interest: { name: string; category: string; notes: string }) => void;
}

export function InterestModal({ isOpen, onClose, onSubmit }: InterestModalProps) {
  const [form, setForm] = useState({ name: '', category: '', notes: '' });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ name: '', category: '', notes: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Interest">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Interest name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="text"
          placeholder="Category (optional)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.name.trim()} className="btn btn-primary">Add Interest</button>
      </div>
    </ModalWrapper>
  );
}

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (callLog: { phoneNumber: string; direction: string; status: string; duration: number; notes: string }) => void;
  defaultPhone?: string;
}

export function CallLogModal({ isOpen, onClose, onSubmit, defaultPhone = '' }: CallLogModalProps) {
  const [form, setForm] = useState({
    phoneNumber: defaultPhone,
    direction: 'OUTBOUND',
    status: 'COMPLETED',
    duration: 0,
    notes: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ phoneNumber: defaultPhone, direction: 'OUTBOUND', status: 'COMPLETED', duration: 0, notes: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Log Call">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Phone number"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <select
          value={form.direction}
          onChange={(e) => setForm({ ...form, direction: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="OUTBOUND">Outbound</option>
          <option value="INBOUND">Inbound</option>
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="COMPLETED">Completed</option>
          <option value="MISSED">Missed</option>
          <option value="NO_ANSWER">No Answer</option>
          <option value="BUSY">Busy</option>
        </select>
        <input
          type="number"
          placeholder="Duration (seconds)"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.phoneNumber} className="btn btn-primary">Log Call</button>
      </div>
    </ModalWrapper>
  );
}

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message: string; mediaUrl: string }) => void;
  phone: string;
}

export function WhatsAppModal({ isOpen, onClose, onSubmit, phone }: WhatsAppModalProps) {
  const [form, setForm] = useState({ message: '', mediaUrl: '' });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ message: '', mediaUrl: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Send WhatsApp Message">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">To: {phone}</p>
        </div>
        <textarea
          placeholder="Type your message..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={4}
        />
        <input
          type="url"
          placeholder="Media URL (optional)"
          value={form.mediaUrl}
          onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.message.trim()} className="btn btn-primary">Send WhatsApp</button>
      </div>
    </ModalWrapper>
  );
}

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  phone: string;
}

export function SmsModal({ isOpen, onClose, onSubmit, phone }: SmsModalProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    onSubmit(message);
    setMessage('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Send SMS">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">To: {phone}</p>
        </div>
        <textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={4}
        />
        <p className="text-xs text-slate-400">Character count: {message.length}/160</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!message.trim()} className="btn btn-primary">Send SMS</button>
      </div>
    </ModalWrapper>
  );
}

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditLeadFormData) => void;
  lead: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    country?: string;
    address?: string;
    pincode?: string;
    company?: string;
    designation?: string;
    source?: string;
    priority?: string;
  } | null;
}

export interface EditLeadFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  country: string;
  address: string;
  pincode: string;
  company: string;
  designation: string;
  source: string;
  priority: string;
}

export function EditLeadModal({ isOpen, onClose, onSubmit, lead }: EditLeadModalProps) {
  const [form, setForm] = useState<EditLeadFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    country: '',
    address: '',
    pincode: '',
    company: '',
    designation: '',
    source: '',
    priority: '',
  });

  // Reset form when modal opens with lead data
  useEffect(() => {
    if (isOpen && lead) {
      setForm({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        phone: lead.phone || '',
        email: lead.email || '',
        city: lead.city || '',
        state: lead.state || '',
        country: lead.country || '',
        address: lead.address || '',
        pincode: lead.pincode || '',
        company: lead.company || '',
        designation: lead.designation || '',
        source: lead.source || '',
        priority: lead.priority || '',
      });
    }
  }, [isOpen, lead]);

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  const handleChange = (field: keyof EditLeadFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Edit Lead Details</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Personal Info */}
          <div className="col-span-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Personal Information</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">First Name *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="First Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Last Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          {/* Work Info */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Work Information</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Company Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Designation</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Job Title"
            />
          </div>

          {/* Address Info */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Address</p>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Street Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Street Address"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => handleChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="State"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Country"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Pincode</label>
            <input
              type="text"
              value={form.pincode}
              onChange={(e) => handleChange('pincode', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Pincode"
            />
          </div>

          {/* Lead Info */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Lead Information</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Source</label>
            <select
              value={form.source}
              onChange={(e) => handleChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Source</option>
              <optgroup label="Direct Sources">
                <option value="MANUAL">Manual</option>
                <option value="WEBSITE">Website</option>
                <option value="WALK_IN">Walk In</option>
                <option value="PHONE">Phone Inquiry</option>
                <option value="EMAIL">Email Inquiry</option>
                <option value="REFERRAL">Referral</option>
              </optgroup>
              <optgroup label="Social Media">
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE">Google Ads</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="TWITTER">Twitter</option>
                <option value="TIKTOK">TikTok</option>
              </optgroup>
              <optgroup label="Indian Lead Sources">
                <option value="JUSTDIAL">JustDial</option>
                <option value="INDIAMART">IndiaMART</option>
                <option value="SULEKHA">Sulekha</option>
                <option value="TAWKTO">Tawk.to Chat</option>
              </optgroup>
              <optgroup label="Real Estate Portals">
                <option value="99ACRES">99Acres</option>
                <option value="MAGICBRICKS">MagicBricks</option>
                <option value="HOUSING">Housing.com</option>
              </optgroup>
              <optgroup label="Other">
                <option value="OTHER">Other</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.firstName.trim() || !form.phone.trim()}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== PAYMENT MODAL ====================

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payment: Omit<LeadPayment, 'id' | 'createdAt'>) => void;
}

export function PaymentModal({ isOpen, onClose, onSubmit }: PaymentModalProps) {
  const [form, setForm] = useState({
    amount: '',
    currency: 'INR',
    paymentType: 'TUITION' as LeadPayment['paymentType'],
    paymentMethod: 'UPI' as LeadPayment['paymentMethod'],
    status: 'PENDING' as LeadPayment['status'],
    transactionId: '',
    receiptNo: '',
    dueDate: '',
    notes: '',
  });

  const handleSubmit = () => {
    onSubmit({
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      paymentType: form.paymentType,
      paymentMethod: form.paymentMethod,
      status: form.status,
      transactionId: form.transactionId || undefined,
      receiptNo: form.receiptNo || undefined,
      dueDate: form.dueDate || undefined,
      paidAt: form.status === 'COMPLETED' ? new Date().toISOString() : undefined,
      notes: form.notes || undefined,
    });
    setForm({
      amount: '',
      currency: 'INR',
      paymentType: 'TUITION',
      paymentMethod: 'UPI',
      status: 'PENDING',
      transactionId: '',
      receiptNo: '',
      dueDate: '',
      notes: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Add Payment</h3>

        <div className="space-y-4">
          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Amount *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Payment Type *</label>
            <select
              value={form.paymentType}
              onChange={(e) => setForm({ ...form, paymentType: e.target.value as LeadPayment['paymentType'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="REGISTRATION">Registration Fee</option>
              <option value="TUITION">Tuition Fee</option>
              <option value="EXAM">Exam Fee</option>
              <option value="HOSTEL">Hostel Fee</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Payment Method *</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as LeadPayment['paymentMethod'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as LeadPayment['status'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="PARTIAL">Partial</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Transaction ID</label>
            <input
              type="text"
              value={form.transactionId}
              onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="TXN123456789"
            />
          </div>

          {/* Receipt No */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Receipt Number</label>
            <input
              type="text"
              value={form.receiptNo}
              onChange={(e) => setForm({ ...form, receiptNo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="RCP-2024-001"
            />
          </div>

          {/* Due Date (only show for pending payments) */}
          {form.status === 'PENDING' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.amount || parseFloat(form.amount) <= 0}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== DOCUMENT MODAL ====================

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, documentType: LeadDocument['documentType'], documentName: string) => void;
}

export function DocumentModal({ isOpen, onClose, onSubmit }: DocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    documentType: 'OTHER' as LeadDocument['documentType'],
    documentName: '',
    file: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({
        ...form,
        file,
        documentName: form.documentName || file.name.replace(/\.[^/.]+$/, ''), // Use filename without extension as default name
      });
    }
  };

  const handleSubmit = () => {
    if (form.file && form.documentName) {
      onSubmit(form.file, form.documentType, form.documentName);
      setForm({
        documentType: 'OTHER',
        documentName: '',
        file: null,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Upload Document</h3>

        <div className="space-y-4">
          {/* Document Type */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Document Type *</label>
            <select
              value={form.documentType}
              onChange={(e) => setForm({ ...form, documentType: e.target.value as LeadDocument['documentType'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="ID_PROOF">ID Proof (Aadhar, PAN, Passport)</option>
              <option value="ADDRESS_PROOF">Address Proof</option>
              <option value="PHOTO">Photo</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="MARKSHEET">Marksheet</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Document Name *</label>
            <input
              type="text"
              value={form.documentName}
              onChange={(e) => setForm({ ...form, documentName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g., Aadhar Card, 10th Marksheet"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">File *</label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                form.file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {form.file ? (
                <div>
                  <p className="text-sm font-medium text-green-700">{form.file.name}</p>
                  <p className="text-xs text-green-600 mt-1">{formatFileSize(form.file.size)}</p>
                  <p className="text-xs text-slate-500 mt-2">Click to change file</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-slate-600 mt-2">Click to upload</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC (max 10MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={() => {
              setForm({ documentType: 'OTHER', documentName: '', file: null });
              if (fileInputRef.current) fileInputRef.current.value = '';
              onClose();
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.file || !form.documentName.trim()}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload Document
          </button>
        </div>
      </div>
    </div>
  );
}
