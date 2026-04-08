/**
 * Quotation Builder Page
 * Create and edit quotations with line items
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Package,
  User,
  Calendar,
  IndianRupee,
  Percent,
  Info,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface LineItem {
  id?: string;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  hsnSacCode?: string;
  totalPrice: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unitPrice: number;
  unit?: string;
  hsnSacCode?: string;
  defaultTaxRate?: number;
}

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  companyName?: string;
}

export default function QuotationBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchLead, setSearchLead] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    leadId: '',
    title: '',
    description: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientCompany: '',
    clientAddress: '',
    clientGSTIN: '',
    validUntil: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    taxType: 'GST' as 'GST' | 'VAT' | 'none',
    taxPercentage: 18,
    termsConditions: '',
    notes: '',
    paymentTerms: '',
    currency: 'INR',
  });

  const [items, setItems] = useState<LineItem[]>([
    {
      name: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    },
  ]);

  // Calculated totals
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount =
    formData.discountType === 'percentage'
      ? subtotal * (formData.discountValue / 100)
      : formData.discountValue;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount =
    formData.taxType !== 'none' ? afterDiscount * (formData.taxPercentage / 100) : 0;
  const totalAmount = afterDiscount + taxAmount;

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      // Load products catalog
      const productsRes = await api.get('/quotations/products/catalog');
      setProducts(productsRes.data.data || []);

      // If editing, load existing quotation
      if (isEditing) {
        const quotationRes = await api.get(`/quotations/${id}`);
        const q = quotationRes.data.data;

        setFormData({
          leadId: q.leadId || '',
          title: q.title,
          description: q.description || '',
          clientName: q.clientName,
          clientEmail: q.clientEmail || '',
          clientPhone: q.clientPhone || '',
          clientCompany: q.clientCompany || '',
          clientAddress: q.clientAddress || '',
          clientGSTIN: q.clientGSTIN || '',
          validUntil: q.validUntil ? q.validUntil.split('T')[0] : '',
          discountType: q.discountType || 'percentage',
          discountValue: Number(q.discountValue) || 0,
          taxType: q.taxType || 'GST',
          taxPercentage: Number(q.taxPercentage) || 18,
          termsConditions: q.termsConditions || '',
          notes: q.notes || '',
          paymentTerms: q.paymentTerms || '',
          currency: q.currency || 'INR',
        });

        setItems(
          q.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            sku: item.sku,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            discountPercent: Number(item.discountPercent) || 0,
            taxPercent: Number(item.taxPercent) || 0,
            hsnSacCode: item.hsnSacCode,
            totalPrice: Number(item.totalPrice),
          }))
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const searchLeads = async (query: string) => {
    if (query.length < 2) {
      setLeads([]);
      return;
    }

    try {
      const response = await api.get(`/leads?search=${encodeURIComponent(query)}&limit=10`);
      setLeads(response.data.data.leads || []);
    } catch (error) {
      console.error('Error searching leads:', error);
    }
  };

  const selectLead = (lead: Lead) => {
    setFormData({
      ...formData,
      leadId: lead.id,
      clientName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      clientEmail: lead.email || '',
      clientPhone: lead.phone,
      clientCompany: lead.companyName || '',
    });
    setSearchLead(`${lead.firstName} ${lead.lastName || ''}`.trim());
    setLeads([]);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        name: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<LineItem>) => {
    setItems(
      items.map((item, i) => {
        if (i !== index) return item;

        const updated = { ...item, ...updates };

        // Recalculate total
        let total = updated.quantity * updated.unitPrice;
        if (updated.discountPercent) {
          total -= total * (updated.discountPercent / 100);
        }
        updated.totalPrice = total;

        return updated;
      })
    );
  };

  const addProductToItems = (product: Product) => {
    setItems([
      ...items,
      {
        name: product.name,
        description: product.description,
        sku: product.sku,
        quantity: 1,
        unit: product.unit,
        unitPrice: Number(product.unitPrice),
        taxPercent: product.defaultTaxRate ? Number(product.defaultTaxRate) : undefined,
        hsnSacCode: product.hsnSacCode,
        totalPrice: Number(product.unitPrice),
      },
    ]);
  };

  const handleSave = async (sendAfterSave: boolean = false) => {
    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.clientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      toast.error('All items must have a name');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
        items: items.map((item) => ({
          name: item.name,
          description: item.description,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          hsnSacCode: item.hsnSacCode,
        })),
      };

      let quotationId = id;

      if (isEditing) {
        await api.put(`/quotations/${id}`, payload);
        toast.success('Quotation updated');
      } else {
        const response = await api.post('/quotations', payload);
        quotationId = response.data.data.id;
        toast.success('Quotation created');
      }

      if (sendAfterSave && quotationId) {
        await api.post(`/quotations/${quotationId}/send`, { sendVia: ['email'] });
        toast.success('Quotation sent');
      }

      navigate('/quotations');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Quotation' : 'New Quotation'}
              </h1>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Update quotation details' : 'Create a new quote or proposal'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Save & Send
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quotation Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Website Development Proposal"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of this quotation..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Client Information
            </h2>

            <div className="space-y-4">
              {/* Lead Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Lead (Optional)
                </label>
                <input
                  type="text"
                  value={searchLead}
                  onChange={(e) => {
                    setSearchLead(e.target.value);
                    searchLeads(e.target.value);
                  }}
                  placeholder="Search leads by name, email, or phone..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {leads.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {leads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => selectLead(lead)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{lead.email || lead.phone}</p>
                        </div>
                        {lead.companyName && (
                          <span className="text-xs text-gray-500">{lead.companyName}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.clientCompany}
                    onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={formData.clientGSTIN}
                  onChange={(e) => setFormData({ ...formData, clientGSTIN: e.target.value })}
                  placeholder="e.g., 29AXXXX1234X1Z5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Line Items
              </h2>
              {products.length > 0 && (
                <div className="relative group">
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    + Add from Catalog
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-10">
                    {products.slice(0, 10).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addProductToItems(product)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                      >
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-gray-500">
                          {formatCurrency(Number(product.unitPrice))}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Items Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-4">Item</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Discount %</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items */}
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      placeholder="Item name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-1.5 mt-1 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="text"
                        value={item.unit || ''}
                        onChange={(e) => updateItem(index, { unit: e.target.value })}
                        placeholder="unit"
                        className="w-16 px-2 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        min="0"
                        step="0.01"
                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={item.discountPercent || ''}
                        onChange={(e) =>
                          updateItem(index, { discountPercent: parseFloat(e.target.value) || 0 })
                        }
                        min="0"
                        max="100"
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1 py-2 text-sm font-medium text-gray-900">
                    {formatCurrency(item.totalPrice)}
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Terms & Notes
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g., 50% advance, 50% on delivery"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.termsConditions}
                  onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                  rows={4}
                  placeholder="Enter terms and conditions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes for the client..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          {/* Pricing Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Discount
                  </span>
                  <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  <input
                    type="number"
                    value={formData.discountValue || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    className="w-20 px-2 py-1 text-sm border border-gray-200 rounded"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Tax */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">+{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={formData.taxType}
                    onChange={(e) =>
                      setFormData({ ...formData, taxType: e.target.value as 'GST' | 'VAT' | 'none' })
                    }
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  >
                    <option value="GST">GST</option>
                    <option value="VAT">VAT</option>
                    <option value="none">No Tax</option>
                  </select>
                  {formData.taxType !== 'none' && (
                    <div className="relative w-20">
                      <input
                        type="number"
                        value={formData.taxPercentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            taxPercentage: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        max="100"
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        %
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-primary-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Tips</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Link to a lead to auto-fill client info</li>
              <li>• Add products from your catalog for faster entry</li>
              <li>• Set a valid until date to track expiring quotes</li>
              <li>• Include clear payment terms</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
