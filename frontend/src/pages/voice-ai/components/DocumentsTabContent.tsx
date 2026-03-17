import React, { useState } from 'react';
import {
  MessageCircle,
  FileText,
  Image,
  Play,
  Trash2,
  Upload,
  Loader2,
  Check,
  Plus,
} from 'lucide-react';
import type { AgentDocument } from '../types/voiceAgent.types';
import { voiceAgentService } from '../services';

interface DocumentsTabContentProps {
  documents: AgentDocument[];
  onUpdateDocuments: (documents: AgentDocument[]) => void;
}

interface NewDocument {
  name: string;
  type: 'pdf' | 'image' | 'video' | 'document';
  url: string;
  description: string;
  keywords: string;
}

export const DocumentsTabContent: React.FC<DocumentsTabContentProps> = ({
  documents,
  onUpdateDocuments,
}) => {
  const [newDocument, setNewDocument] = useState<NewDocument>({
    name: '',
    type: 'pdf',
    url: '',
    description: '',
    keywords: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const uploadedFile = await voiceAgentService.uploadFile(file, setUploadProgress);

      // Auto-detect document type from mime type
      let docType: 'pdf' | 'image' | 'video' | 'document' = 'document';
      if (uploadedFile.mimeType.startsWith('image/')) docType = 'image';
      else if (uploadedFile.mimeType.startsWith('video/')) docType = 'video';
      else if (uploadedFile.mimeType === 'application/pdf') docType = 'pdf';

      setNewDocument((prev) => ({
        ...prev,
        url: uploadedFile.url,
        type: docType,
        name: prev.name || uploadedFile.originalName.replace(/\.[^/.]+$/, ''),
      }));
      setSelectedFile(file);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleAddDocument = () => {
    if (newDocument.name.trim()) {
      const doc: AgentDocument = {
        id: Date.now().toString(),
        name: newDocument.name.trim(),
        type: newDocument.type,
        url: newDocument.url.trim(),
        description: newDocument.description.trim(),
        keywords: newDocument.keywords
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k),
      };
      onUpdateDocuments([...documents, doc]);
      setNewDocument({ name: '', type: 'pdf', url: '', description: '', keywords: '' });
      setSelectedFile(null);
    }
  };

  const handleRemoveDocument = (index: number) => {
    const newDocs = documents.filter((_, i) => i !== index);
    onUpdateDocuments(newDocs);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText size={20} className="text-red-500" />;
      case 'image':
        return <Image size={20} className="text-blue-500" />;
      case 'video':
        return <Play size={20} className="text-purple-500" />;
      default:
        return <FileText size={20} className="text-gray-500" />;
    }
  };

  const examplePhrases = [
    'Send me the brochure',
    'Fee structure bhej do',
    'Can I see campus photos?',
    'Share syllabus on WhatsApp',
    'Fees details pampandi',
  ];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <MessageCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-medium text-green-800">WhatsApp Document Sharing</p>
          <p className="text-xs text-green-700 mt-1">
            When callers ask for brochures, fee structures, or any documents during the call, the
            AI will automatically send them via WhatsApp.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Existing Documents */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Documents</label>
          <p className="text-xs text-gray-500 mt-0.5">
            Files that can be shared via WhatsApp during calls.
          </p>
        </div>
        <div className="flex-1">
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    {getDocumentIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-sm text-gray-500 truncate">{doc.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(idx)}
                    className="p-2 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No documents added yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add documents below to enable WhatsApp sharing
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Document Form */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Add Document</label>
          <p className="text-xs text-gray-500 mt-0.5">Upload or link a document.</p>
        </div>
        <div className="flex-1">
          <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Document Name *</label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                  placeholder="e.g., Fee Structure 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select
                  value={newDocument.type}
                  onChange={(e) =>
                    setNewDocument({ ...newDocument, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="document">Other Document</option>
                </select>
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Upload File</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isUploading
                    ? 'border-teal-400 bg-teal-50'
                    : selectedFile || newDocument.url
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                }`}
              >
                {isUploading ? (
                  <div className="py-2">
                    <Loader2 className="animate-spin mx-auto text-teal-500 mb-2" size={24} />
                    <p className="text-sm text-teal-600">Uploading... {uploadProgress}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : selectedFile || newDocument.url ? (
                  <div className="py-2">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Check size={20} />
                      <span className="text-sm font-medium">
                        {selectedFile ? selectedFile.name : 'File linked'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setNewDocument((prev) => ({ ...prev, url: '' }));
                      }}
                      className="mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                    <p className="text-sm text-gray-600">
                      Drag & drop a file here, or{' '}
                      <label className="text-teal-600 hover:text-teal-700 cursor-pointer font-medium">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.webm"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, DOC, XLS, Images, Videos (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* URL Input */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Document URL</label>
              <input
                type="url"
                value={newDocument.url}
                onChange={(e) => {
                  setNewDocument({ ...newDocument, url: e.target.value });
                  if (e.target.value) setSelectedFile(null);
                }}
                placeholder="https://example.com/document.pdf"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                disabled={!!selectedFile}
              />
              <p className="text-xs text-gray-400 mt-1">Or paste a publicly accessible URL</p>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description</label>
              <input
                type="text"
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                placeholder="e.g., Complete fee breakdown for all courses"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Keywords (comma separated)
              </label>
              <input
                type="text"
                value={newDocument.keywords}
                onChange={(e) => setNewDocument({ ...newDocument, keywords: e.target.value })}
                placeholder="e.g., fees, cost, price, tuition, charges"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">AI uses these to match user requests</p>
            </div>

            <button
              onClick={handleAddDocument}
              disabled={!newDocument.name.trim() || isUploading}
              className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Document
            </button>
          </div>
        </div>
      </div>

      {/* Example Keywords */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Example Triggers</label>
          <p className="text-xs text-gray-500 mt-0.5">Phrases that trigger document sharing.</p>
        </div>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-2">
              The AI will send documents when callers say things like:
            </p>
            <div className="flex flex-wrap gap-2">
              {examplePhrases.map((phrase, i) => (
                <span
                  key={i}
                  className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full"
                >
                  "{phrase}"
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsTabContent;
