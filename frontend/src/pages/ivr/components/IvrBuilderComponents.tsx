/**
 * IVR Builder UI Components
 * Header, Palette, Properties Panel, Settings Modal
 */

import React from 'react';
import { Node } from 'reactflow';
import {
  Save,
  Play,
  Settings,
  X,
  ChevronLeft,
  Trash2,
  Phone,
} from 'lucide-react';
import { FlowState, PaletteItem, MenuOption } from '../ivr-builder.types';
import { PALETTE_ITEMS, TRANSFER_TYPES } from '../ivr-builder.constants';

// Header Component
interface HeaderProps {
  flow: FlowState;
  saving: boolean;
  isNew: boolean;
  onNameChange: (name: string) => void;
  onSettingsClick: () => void;
  onTestClick: () => void;
  onSave: () => void;
  onPublish: () => void;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  flow,
  saving,
  isNew,
  onNameChange,
  onSettingsClick,
  onTestClick,
  onSave,
  onPublish,
  onBack,
}) => (
  <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        className="p-2 hover:bg-gray-100 rounded-lg"
      >
        <ChevronLeft size={20} />
      </button>
      <div>
        <input
          type="text"
          value={flow.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter flow name..."
          className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
        />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onTestClick}
        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg"
        title="Test Call Flow"
      >
        <Phone size={18} />
        Test
      </button>
      <button
        onClick={onSettingsClick}
        className="p-2 hover:bg-gray-100 rounded-lg"
        title="Settings"
      >
        <Settings size={20} />
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
      >
        <Save size={18} />
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={onPublish}
        disabled={isNew}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg disabled:opacity-50"
      >
        <Play size={18} />
        Publish
      </button>
    </div>
  </div>
);

// Node Palette Component
interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => (
  <div className="w-64 bg-white border-r p-4">
    <h3 className="font-medium text-gray-700 mb-3">Drag nodes to canvas</h3>
    <div className="space-y-2">
      {PALETTE_ITEMS.map((item: PaletteItem) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 border border-gray-200"
        >
          <div className={`p-2 rounded ${item.color}`}>
            {item.icon}
          </div>
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

// Node Properties Panel
interface PropertiesPanelProps {
  selectedNode: Node;
  onDelete: () => void;
  onUpdateData: (key: string, value: unknown) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  onDelete,
  onUpdateData,
}) => (
  <div className="w-80 bg-white border-l p-4 overflow-y-auto">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-medium">Node Properties</h3>
      <button
        onClick={onDelete}
        className="p-2 text-red-600 hover:bg-red-50 rounded"
      >
        <Trash2 size={18} />
      </button>
    </div>

    <div className="space-y-4">
      {/* Label - Common to all nodes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label
        </label>
        <input
          type="text"
          value={selectedNode.data.label || ''}
          onChange={(e) => onUpdateData('label', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Play Node Properties */}
      {selectedNode.type === 'play' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text to Speech
            </label>
            <textarea
              value={selectedNode.data.ttsText || ''}
              onChange={(e) => onUpdateData('ttsText', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or Audio URL
            </label>
            <input
              type="text"
              value={selectedNode.data.audioUrl || ''}
              onChange={(e) => onUpdateData('audioUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {/* Menu Node Properties */}
      {selectedNode.type === 'menu' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Menu Options
          </label>
          {(selectedNode.data.options || []).map((opt: MenuOption, i: number) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={opt.digit}
                onChange={(e) => {
                  const newOpts = [...(selectedNode.data.options || [])];
                  newOpts[i] = { ...newOpts[i], digit: e.target.value };
                  onUpdateData('options', newOpts);
                }}
                className="w-16 px-2 py-1 border rounded text-center"
                placeholder="#"
              />
              <input
                type="text"
                value={opt.label}
                onChange={(e) => {
                  const newOpts = [...(selectedNode.data.options || [])];
                  newOpts[i] = { ...newOpts[i], label: e.target.value };
                  onUpdateData('options', newOpts);
                }}
                className="flex-1 px-2 py-1 border rounded"
                placeholder="Option label"
              />
            </div>
          ))}
          <button
            onClick={() => {
              const newOpts = [...(selectedNode.data.options || []), { digit: '', label: '' }];
              onUpdateData('options', newOpts);
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Option
          </button>
        </div>
      )}

      {/* Transfer Node Properties */}
      {selectedNode.type === 'transfer' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer To
            </label>
            <input
              type="text"
              value={selectedNode.data.number || ''}
              onChange={(e) => onUpdateData('number', e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Type
            </label>
            <select
              value={selectedNode.data.transferType || 'cold'}
              onChange={(e) => onUpdateData('transferType', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {TRANSFER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* End Node Properties */}
      {selectedNode.type === 'end' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goodbye Message
          </label>
          <textarea
            value={selectedNode.data.message || ''}
            onChange={(e) => onUpdateData('message', e.target.value)}
            rows={2}
            placeholder="Thank you for calling. Goodbye."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  </div>
);

// Settings Modal
interface SettingsModalProps {
  flow: FlowState;
  onUpdate: (updates: Partial<FlowState>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  flow,
  onUpdate,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-full max-w-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Flow Settings</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
          <X size={20} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={flow.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Welcome Message
          </label>
          <textarea
            value={flow.welcomeMessage}
            onChange={(e) => onUpdate({ welcomeMessage: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Welcome to our company..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeout (seconds)
            </label>
            <input
              type="number"
              value={flow.timeoutSeconds}
              onChange={(e) => onUpdate({ timeoutSeconds: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Retries
            </label>
            <input
              type="number"
              value={flow.maxRetries}
              onChange={(e) => onUpdate({ maxRetries: parseInt(e.target.value) || 3 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);
