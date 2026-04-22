import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { bulkUploadLeads, clearBulkUploadResult } from '../../store/slices/leadSlice';
import { fetchAssignableUsers } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  UserGroupIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { showToast } from '../../utils/toast';
import api from '../../services/api';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function BulkUploadPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(['leads', 'common', 'notifications']);
  const { isLoading, bulkUploadResult } = useSelector((state: RootState) => state.leads);
  const { assignableUsers } = useSelector((state: RootState) => state.users);

  const [file, setFile] = useState<File | null>(null);
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([]);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'assignableUsers' | 'ai-agent' | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    dispatch(fetchAssignableUsers());
    // Fetch voice agents
    api.get('/voice-ai/agents').then((res) => {
      setVoiceAgents(res.data.data?.agents || []);
    }).catch(() => {
      // Voice agents not available
    });
    return () => {
      dispatch(clearBulkUploadResult());
    };
  }, [dispatch]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    console.log('Files dropped - accepted:', acceptedFiles.length, 'rejected:', rejectedFiles.length);
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      console.log('Accepted file:', f.name, f.type, f.size);
      setFile(f);
    }
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      console.log('Rejected file:', rejection.file.name, 'Errors:', rejection.errors);
      const errorMsg = rejection.errors.map(e => e.message).join(', ');
      showToast.error(errorMsg || 'File rejected');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Accept any file - backend will validate
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleUpload = async () => {
    console.log('handleUpload called, file:', file);
    if (!file) {
      console.log('No file selected');
      showToast.error('Please select a file first');
      return;
    }

    console.log('Uploading file:', file.name, file.size, file.type);
    try {
      const result = await dispatch(
        bulkUploadLeads({
          file,
          // Don't assign during upload - will assign after
        })
      ).unwrap();
      console.log('Upload result:', result);

      // Show informative message based on results
      const inserted = result.insertedRecords || 0;
      const duplicates = result.duplicateRows || 0;
      const invalid = result.invalidRows || 0;
      const total = result.totalRows || 0;

      if (inserted === 0 && duplicates > 0) {
        showToast.error(`No records imported. All ${duplicates} records are duplicates (phone/email already exists in the system).`);
      } else if (inserted === 0 && invalid > 0) {
        showToast.error(`No records imported. All ${invalid} records are invalid (missing required fields).`);
      } else if (inserted === 0) {
        showToast.error('No records were imported. Please check the file format.');
      } else if (duplicates > 0 || invalid > 0) {
        showToast.success(`Imported ${inserted} of ${total} records. ${duplicates} duplicates, ${invalid} invalid.`);
      } else {
        showToast.success(`Successfully imported ${inserted} records!`);
      }

      // Navigate to raw imports detail page if bulkImportId is returned
      if (result.bulkImportId) {
        navigate(`/raw-imports/${result.bulkImportId}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast.error('Bulk upload failed. Check console for details.');
    }
  };

  const toggleCounselor = (id: string) => {
    setSelectedCounselors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAssignToCounselors = async () => {
    if (selectedCounselors.length === 0) {
      showToast.error('Please select at least one counselor');
      return;
    }
    setIsAssigning(true);
    try {
      await api.post('/leads/assign-bulk', {
        source: 'BULK_UPLOAD',
        counselorIds: selectedCounselors,
      });
      showToast.success('Leads assigned to assignableUsers successfully');
      navigate('/leads');
    } catch (error) {
      showToast.error('Failed to assign leads');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStartAICampaign = () => {
    if (!selectedAgent) {
      showToast.error('Please select an AI agent');
      return;
    }
    // Navigate to create campaign with pre-selected agent and source
    navigate(`/outbound-calls/create?source=BULK_UPLOAD&agentId=${selectedAgent}`);
  };

  return (
    <div>
      <button
        onClick={() => navigate('/leads')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        {t('leads:bulkUpload.backToLeads')}
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('leads:bulkUpload.title')}</h1>
      <p className="text-gray-600 mb-6">
        {t('leads:bulkUpload.subtitle')}
      </p>

      {!bulkUploadResult ? (
        <div className="max-w-2xl">
          {/* Upload Area */}
          <div className="card">
            <div className="card-body">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                {file ? (
                  <div>
                    <DocumentIcon className="h-8 w-8 mx-auto text-primary-500 mb-2" />
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-medium text-gray-900 mb-1">
                      {t('leads:bulkUpload.dropFile')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('leads:bulkUpload.supportedFormats')}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Smart Column Detection
                </h3>
                <p className="text-sm text-blue-700">
                  Upload any spreadsheet - we automatically detect name, phone, and email columns
                  regardless of header names. All other columns are saved as custom fields.
                </p>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {t('leads:bulkUpload.requiredColumns')}
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    <span className="font-medium">Name</span> - student name, first_name, stu_name, fname, etc.
                  </li>
                  <li>
                    <span className="font-medium">Phone</span> - phone, mobile, stu_mobileno, contact_number, etc.
                  </li>
                </ul>
                <h3 className="text-sm font-medium text-gray-900 mt-4 mb-2">
                  {t('leads:bulkUpload.optionalColumns')}
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>email, alternate_phone, notes, course_name, gender, etc.</li>
                  <li>{t('leads:bulkUpload.customFieldsNote')}</li>
                </ul>
              </div>

              {/* Debug info */}
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
                <p>File: {file ? `${file.name} (${(file.size/1024).toFixed(1)}KB)` : 'None'}</p>
                <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
                <p>Button disabled: {(!file || isLoading) ? 'Yes' : 'No'}</p>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isLoading}
                className="mt-4 w-full btn btn-primary"
              >
                {isLoading ? t('leads:bulkUpload.uploading') : t('leads:bulkUpload.uploadButton')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Results */
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
              {t('leads:bulkUpload.uploadComplete')}
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {bulkUploadResult.totalRows}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.totalRows')}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {bulkUploadResult.insertedLeads}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.inserted')}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {bulkUploadResult.duplicateRows}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.duplicates')}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {bulkUploadResult.invalidRows}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.invalid')}</p>
              </div>
            </div>

            {bulkUploadResult.duplicates.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  {t('leads:bulkUpload.duplicateEntries')} ({bulkUploadResult.duplicates.length})
                </h3>
                <div className="max-h-40 overflow-y-auto bg-yellow-50 rounded-lg p-3">
                  {bulkUploadResult.duplicates.map((dup, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      {dup.phone} - {dup.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkUploadResult.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                  {t('leads:bulkUpload.validationErrors')} ({bulkUploadResult.errors.length})
                </h3>
                <div className="max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3">
                  {bulkUploadResult.errors.map((err, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      {t('leads:bulkUpload.row')} {err.row}: {err.errors.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment Options */}
            {bulkUploadResult.insertedLeads > 0 && !assignmentType && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Assign {bulkUploadResult.insertedLeads} leads to:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setAssignmentType('assignableUsers')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                  >
                    <UserGroupIcon className="h-10 w-10 text-primary-600 mb-3" />
                    <h4 className="text-lg font-medium text-gray-900">Counselors</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Distribute leads to telecallers using round-robin assignment
                    </p>
                  </button>
                  <button
                    onClick={() => setAssignmentType('ai-agent')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <CpuChipIcon className="h-10 w-10 text-purple-600 mb-3" />
                    <h4 className="text-lg font-medium text-gray-900">AI Agent</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Start an AI calling campaign to call all leads automatically
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Counselor Assignment */}
            {assignmentType === 'assignableUsers' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Counselors</h3>
                  <button
                    onClick={() => setAssignmentType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Leads will be distributed equally among selected assignableUsers using round-robin
                </p>
                {assignableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No assignableUsers available</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {assignableUsers.map((counselor) => (
                      <label
                        key={counselor.id}
                        className="flex items-center p-3 bg-white rounded-lg border hover:border-primary-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCounselors.includes(counselor.id)}
                          onChange={() => toggleCounselor(counselor.id)}
                          className="h-4 w-4 text-primary-600 rounded border-gray-300"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {counselor.firstName} {counselor.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {counselor.activeLeadCount || 0} active leads
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleAssignToCounselors}
                  disabled={selectedCounselors.length === 0 || isAssigning}
                  className="btn btn-primary"
                >
                  {isAssigning ? 'Assigning...' : `Assign to ${selectedCounselors.length} Counselor(s)`}
                </button>
              </div>
            )}

            {/* AI Agent Assignment */}
            {assignmentType === 'ai-agent' && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select AI Agent</h3>
                  <button
                    onClick={() => setAssignmentType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  The AI agent will call all {bulkUploadResult.insertedLeads} leads automatically
                </p>
                {voiceAgents.length === 0 ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">No AI agents available</p>
                    <button
                      onClick={() => navigate('/voice-ai/create')}
                      className="btn btn-secondary"
                    >
                      Create AI Agent
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {voiceAgents.filter(a => a.isActive).map((agent) => (
                        <label
                          key={agent.id}
                          className={`flex items-center p-3 bg-white rounded-lg border cursor-pointer ${
                            selectedAgent === agent.id ? 'border-purple-500 bg-purple-50' : 'hover:border-purple-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="agent"
                            checked={selectedAgent === agent.id}
                            onChange={() => setSelectedAgent(agent.id)}
                            className="h-4 w-4 text-purple-600 border-gray-300"
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                            {agent.description && (
                              <p className="text-xs text-gray-500">{agent.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleStartAICampaign}
                      disabled={!selectedAgent}
                      className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 rounded-xl"
                    >
                      <PhoneIcon className="h-5 w-5" />
                      Start AI Campaign
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  dispatch(clearBulkUploadResult());
                  setFile(null);
                  setAssignmentType(null);
                  setSelectedCounselors([]);
                  setSelectedAgent('');
                }}
                className="btn btn-secondary"
              >
                {t('leads:bulkUpload.uploadAnother')}
              </button>
              <button
                onClick={() => navigate('/leads')}
                className="btn btn-outline"
              >
                {t('leads:bulkUpload.viewLeads')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
