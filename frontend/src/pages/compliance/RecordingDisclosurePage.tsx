import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SpeakerWaveIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const RecordingDisclosurePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [disclosureEnabled, setDisclosureEnabled] = useState(true);
  const [disclosureText, setDisclosureText] = useState('');
  const [requireAcknowledgment, setRequireAcknowledgment] = useState(false);
  const [acknowledgmentPhrase, setAcknowledgmentPhrase] = useState('');
  const [autoPlayDelay, setAutoPlayDelay] = useState(0);
  const [recordingConsent, setRecordingConsent] = useState(true);
  const [consentRequired, setConsentRequired] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/compliance/disclosure');
      const data = response.data.data;
      setDisclosureEnabled(data.disclosureEnabled);
      setDisclosureText(data.disclosureText || '');
      setRequireAcknowledgment(data.requireAcknowledgment);
      setAcknowledgmentPhrase(data.acknowledgmentPhrase || '');
      setAutoPlayDelay(data.autoPlayDelay);
      setRecordingConsent(data.recordingConsent);
      setConsentRequired(data.consentRequired);
    } catch (error) {
      console.error('Failed to fetch disclosure config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/compliance/disclosure', {
        disclosureEnabled,
        disclosureText,
        requireAcknowledgment,
        acknowledgmentPhrase,
        autoPlayDelay,
        recordingConsent,
        consentRequired,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SpeakerWaveIcon className="h-8 w-8 text-blue-600" />
          Recording Disclosure Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Configure how your voice agents disclose call recording to customers
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Legal Requirement:</strong> Many jurisdictions require informing callers that their
              call may be recorded. This setting ensures your voice agents comply with these regulations.
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <span className="text-green-800">Settings saved successfully!</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">
          {/* Enable Disclosure */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Enable Recording Disclosure</label>
              <p className="text-sm text-gray-500">
                When enabled, voice agents will disclose that the call is being recorded
              </p>
            </div>
            <button
              onClick={() => setDisclosureEnabled(!disclosureEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                disclosureEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  disclosureEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {disclosureEnabled && (
            <>
              {/* Disclosure Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disclosure Message
                </label>
                <textarea
                  value={disclosureText}
                  onChange={(e) => setDisclosureText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="This call may be recorded for quality and training purposes..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be played at the beginning of each call
                </p>
              </div>

              {/* Auto Play Delay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto Play Delay (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={autoPlayDelay}
                  onChange={(e) => setAutoPlayDelay(parseInt(e.target.value) || 0)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Seconds to wait before playing the disclosure message (0 = immediate)
                </p>
              </div>

              {/* Require Acknowledgment */}
              <div className="flex items-center justify-between border-t pt-6">
                <div>
                  <label className="text-sm font-medium text-gray-900">Require Acknowledgment</label>
                  <p className="text-sm text-gray-500">
                    Require the caller to acknowledge the recording disclosure
                  </p>
                </div>
                <button
                  onClick={() => setRequireAcknowledgment(!requireAcknowledgment)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    requireAcknowledgment ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      requireAcknowledgment ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {requireAcknowledgment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acknowledgment Phrase
                  </label>
                  <input
                    type="text"
                    value={acknowledgmentPhrase}
                    onChange={(e) => setAcknowledgmentPhrase(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Press 1 to acknowledge and continue..."
                  />
                </div>
              )}

              {/* Recording Consent */}
              <div className="flex items-center justify-between border-t pt-6">
                <div>
                  <label className="text-sm font-medium text-gray-900">Ask for Recording Consent</label>
                  <p className="text-sm text-gray-500">
                    Explicitly ask for consent to record the call
                  </p>
                </div>
                <button
                  onClick={() => setRecordingConsent(!recordingConsent)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    recordingConsent ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      recordingConsent ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {recordingConsent && (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Consent Required to Continue</label>
                    <p className="text-sm text-gray-500">
                      If consent is denied, the call will be ended
                    </p>
                  </div>
                  <button
                    onClick={() => setConsentRequired(!consentRequired)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      consentRequired ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        consentRequired ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={() => navigate('/compliance')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingDisclosurePage;
