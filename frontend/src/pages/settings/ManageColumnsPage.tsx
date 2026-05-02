/**
 * Manage Columns Page - Show/hide columns in tables and lists
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  TableCellsIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { columnVisibilityService } from '../../services/column-visibility.service';

interface Column {
  id: string;
  name: string;
  visible: boolean;
  required: boolean;
  order: number;
}

interface TableConfig {
  id: string;
  name: string;
  description: string;
  columns: Column[];
}

const defaultTableConfigs: TableConfig[] = [
  {
    id: 'leads',
    name: 'Leads Table',
    description: 'Configure columns visible in the leads list',
    columns: [
      { id: 'name', name: 'Lead Name', visible: true, required: true, order: 1 },
      { id: 'phone', name: 'Phone Number', visible: true, required: true, order: 2 },
      { id: 'email', name: 'Email', visible: true, required: false, order: 3 },
      { id: 'source', name: 'Lead Source', visible: true, required: false, order: 4 },
      { id: 'stage', name: 'Stage', visible: true, required: false, order: 5 },
      { id: 'assignee', name: 'Assigned To', visible: true, required: false, order: 6 },
      { id: 'priority', name: 'Priority', visible: true, required: false, order: 7 },
      { id: 'last_contact', name: 'Last Contact', visible: true, required: false, order: 8 },
      { id: 'next_followup', name: 'Next Follow-up', visible: false, required: false, order: 9 },
      { id: 'created_at', name: 'Created Date', visible: false, required: false, order: 10 },
      { id: 'city', name: 'City', visible: false, required: false, order: 11 },
      { id: 'state', name: 'State', visible: false, required: false, order: 12 },
      { id: 'course', name: 'Course Interest', visible: false, required: false, order: 13 },
      { id: 'score', name: 'Lead Score', visible: false, required: false, order: 14 },
      { id: 'tags', name: 'Tags', visible: false, required: false, order: 15 },
    ],
  },
  {
    id: 'calls',
    name: 'Call History Table',
    description: 'Configure columns visible in call history',
    columns: [
      { id: 'contact', name: 'Contact Name', visible: true, required: true, order: 1 },
      { id: 'phone', name: 'Phone Number', visible: true, required: true, order: 2 },
      { id: 'call_type', name: 'Call Type', visible: true, required: false, order: 3 },
      { id: 'status', name: 'Status', visible: true, required: false, order: 4 },
      { id: 'duration', name: 'Duration', visible: true, required: false, order: 5 },
      { id: 'date_time', name: 'Date & Time', visible: true, required: false, order: 6 },
      { id: 'recording', name: 'Recording', visible: true, required: false, order: 7 },
      { id: 'notes', name: 'Notes', visible: false, required: false, order: 8 },
      { id: 'agent', name: 'Agent', visible: false, required: false, order: 9 },
      { id: 'disposition', name: 'Disposition', visible: false, required: false, order: 10 },
    ],
  },
  {
    id: 'tasks',
    name: 'Tasks Table',
    description: 'Configure columns visible in tasks list',
    columns: [
      { id: 'title', name: 'Task Title', visible: true, required: true, order: 1 },
      { id: 'type', name: 'Task Type', visible: true, required: false, order: 2 },
      { id: 'priority', name: 'Priority', visible: true, required: false, order: 3 },
      { id: 'status', name: 'Status', visible: true, required: false, order: 4 },
      { id: 'due_date', name: 'Due Date', visible: true, required: false, order: 5 },
      { id: 'assignee', name: 'Assignee', visible: true, required: false, order: 6 },
      { id: 'related_lead', name: 'Related Lead', visible: false, required: false, order: 7 },
      { id: 'created_at', name: 'Created Date', visible: false, required: false, order: 8 },
      { id: 'completed_at', name: 'Completed Date', visible: false, required: false, order: 9 },
    ],
  },
  {
    id: 'users',
    name: 'Users Table',
    description: 'Configure columns visible in users list',
    columns: [
      { id: 'name', name: 'Name', visible: true, required: true, order: 1 },
      { id: 'email', name: 'Email', visible: true, required: false, order: 2 },
      { id: 'phone', name: 'Phone', visible: true, required: false, order: 3 },
      { id: 'role', name: 'Role', visible: true, required: false, order: 4 },
      { id: 'team', name: 'Team', visible: true, required: false, order: 5 },
      { id: 'status', name: 'Status', visible: true, required: false, order: 6 },
      { id: 'last_login', name: 'Last Login', visible: false, required: false, order: 7 },
      { id: 'created_at', name: 'Created Date', visible: false, required: false, order: 8 },
    ],
  },
];

export default function ManageColumnsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tables, setTables] = useState<TableConfig[]>(defaultTableConfigs);
  const [selectedTable, setSelectedTable] = useState<string>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await columnVisibilityService.getAllColumnVisibility();
        if (data && Object.keys(data).length > 0) {
          // Merge API data with defaults
          setTables(prev => prev.map(table => {
            const apiTable = data[table.id];
            if (apiTable && apiTable.columns) {
              return {
                ...table,
                columns: table.columns.map(col => {
                  const apiCol = apiTable.columns.find((c: any) => c.key === col.id);
                  if (apiCol) {
                    return {
                      ...col,
                      visible: apiCol.visible,
                      order: apiCol.order,
                    };
                  }
                  return col;
                }).sort((a, b) => a.order - b.order),
              };
            }
            return table;
          }));
        }
      } catch (error) {
        console.error('Failed to load column settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const currentTable = tables.find(t => t.id === selectedTable);

  const toggleColumn = (columnId: string) => {
    setTables(prev => prev.map(table => {
      if (table.id === selectedTable) {
        return {
          ...table,
          columns: table.columns.map(col => {
            if (col.id === columnId && !col.required) {
              return { ...col, visible: !col.visible };
            }
            return col;
          }),
        };
      }
      return table;
    }));
  };

  const toggleAll = (visible: boolean) => {
    setTables(prev => prev.map(table => {
      if (table.id === selectedTable) {
        return {
          ...table,
          columns: table.columns.map(col => ({
            ...col,
            visible: col.required ? true : visible,
          })),
        };
      }
      return table;
    }));
  };

  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setTables(prev => prev.map(table => {
        if (table.id === selectedTable) {
          const columns = [...table.columns];
          const draggedIndex = columns.findIndex(c => c.id === draggedColumn);
          const targetIndex = columns.findIndex(c => c.id === columnId);

          const [removed] = columns.splice(draggedIndex, 1);
          columns.splice(targetIndex, 0, removed);

          return {
            ...table,
            columns: columns.map((col, index) => ({ ...col, order: index + 1 })),
          };
        }
        return table;
      }));
    }
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const handleReset = async () => {
    if (window.confirm('Reset all column settings to default?')) {
      try {
        await columnVisibilityService.resetAllColumnVisibility();
        setTables(defaultTableConfigs);
        toast.success('Column settings reset to default');
      } catch (error) {
        toast.error('Failed to reset column settings');
        console.error('Failed to reset column settings:', error);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all tables
      for (const table of tables) {
        const columns = table.columns.map(col => ({
          key: col.id,
          label: col.name,
          visible: col.visible,
          order: col.order,
        }));
        await columnVisibilityService.updateColumnVisibility(table.id, { columns });
      }
      toast.success('Column settings saved successfully');
    } catch (error) {
      toast.error('Failed to save column settings');
      console.error('Failed to save column settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredColumns = currentTable?.columns.filter(col =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const visibleCount = currentTable?.columns.filter(c => c.visible).length || 0;
  const totalCount = currentTable?.columns.length || 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Columns</h1>
            <p className="text-sm text-slate-500">Customize which columns appear in tables</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Reset to Default
        </button>
      </div>

      {/* Table Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-medium text-slate-700 mb-3">Select Table</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedTable === table.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TableCellsIcon className={`w-5 h-5 ${selectedTable === table.id ? 'text-primary-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${selectedTable === table.id ? 'text-primary-700' : 'text-slate-700'}`}>
                  {table.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Column Configuration */}
      {currentTable && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{currentTable.name}</h2>
                <p className="text-sm text-slate-500">{currentTable.description}</p>
              </div>
              <div className="text-sm text-slate-500">
                {visibleCount} of {totalCount} columns visible
              </div>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Show All
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Hide All
              </button>
            </div>
          </div>

          {/* Columns List */}
          <div className="divide-y divide-slate-100">
            {filteredColumns.map((column) => (
              <div
                key={column.id}
                draggable={!column.required}
                onDragStart={() => handleDragStart(column.id)}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${
                  draggedColumn === column.id ? 'opacity-50 bg-slate-100' : ''
                } ${!column.required ? 'cursor-move' : ''}`}
              >
                {/* Drag Handle */}
                <div className={`${column.required ? 'invisible' : ''}`}>
                  <Bars3Icon className="w-5 h-5 text-slate-400" />
                </div>

                {/* Column Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{column.name}</span>
                    {column.required && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                        Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleColumn(column.id)}
                  disabled={column.required}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    column.visible
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  } ${column.required ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                >
                  {column.visible ? (
                    <>
                      <EyeIcon className="w-4 h-4" />
                      Visible
                    </>
                  ) : (
                    <>
                      <EyeSlashIcon className="w-4 h-4" />
                      Hidden
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {filteredColumns.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-500">No columns found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {currentTable?.columns.filter(c => c.visible).map((col) => (
                  <th key={col.id} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                {currentTable?.columns.filter(c => c.visible).map((col) => (
                  <td key={col.id} className="px-4 py-3 whitespace-nowrap text-slate-400">
                    Sample data
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link
          to="/settings"
          className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
