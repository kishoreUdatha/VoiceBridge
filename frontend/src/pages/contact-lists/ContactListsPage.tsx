import React, { useState, useEffect } from 'react';
import {
  RectangleStackIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  type: 'STATIC' | 'DYNAMIC' | 'IMPORTED';
  contactCount: number;
  activeCount: number;
  tags: string[];
  isActive: boolean;
  createdAt: string;
}

const ContactListsPage: React.FC = () => {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchLists();
  }, [search]);

  const fetchLists = async () => {
    try {
      const response = await api.get('/contact-lists', { params: { search } });
      setLists(response.data.data);
    } catch (error) {
      console.error('Failed to fetch contact lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (data: { name: string; description: string; type: string }) => {
    try {
      await api.post('/contact-lists', data);
      fetchLists();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact list?')) return;
    try {
      await api.delete(`/contact-lists/${id}`);
      fetchLists();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const handleExport = async (id: string) => {
    try {
      const response = await api.get(`/contact-lists/${id}/export`);
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${id}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Lists</h1>
          <p className="text-gray-600 mt-1">Manage your contact lists for campaigns and messaging</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Create List
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lists..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lists */}
      {lists.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <RectangleStackIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Contact Lists</h3>
          <p className="text-gray-600 mt-1">Create your first contact list to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <div key={list.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{list.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{list.description || 'No description'}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  list.type === 'STATIC' ? 'bg-blue-100 text-blue-700' :
                  list.type === 'DYNAMIC' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {list.type}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>{list.contactCount} contacts</span>
                </div>
                <div className="text-sm text-green-600">
                  {list.activeCount} active
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-xs text-gray-500">Created {formatDate(list.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport(list.id)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Export"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateList}
        />
      )}
    </div>
  );
};

// Create List Modal
interface CreateListModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; description: string; type: string }) => void;
}

const CreateListModal: React.FC<CreateListModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('STATIC');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ name, description, type });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create Contact List</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="STATIC">Static (manual contacts)</option>
              <option value="DYNAMIC">Dynamic (auto-updated)</option>
              <option value="IMPORTED">Imported</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactListsPage;
