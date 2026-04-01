import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  status?: string;
}

interface CallRecord {
  id: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

const TelecallerCallPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'recording' | 'ended'>('idle');
  const [callRecord, setCallRecord] = useState<CallRecord | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchLeadDetails();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopRecording();
    };
  }, [leadId]);

  const fetchLeadDetails = async () => {
    try {
      // Fetch lead details from telecaller's assigned leads
      const res = await api.get(`/telecaller/leads?search=${leadId}`);
      const leads = res.data.data.leads || [];
      const foundLead = leads.find((l: Lead) => l.id === leadId);
      if (foundLead) {
        setLead(foundLead);
      } else {
        // Try to get lead by ID directly
        const leadRes = await api.get(`/leads/${leadId}`);
        setLead(leadRes.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    if (!lead) return;

    try {
      // Create call record
      const res = await api.post('/telecaller/calls', {
        leadId: lead.id,
        phoneNumber: lead.phone,
        contactName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      });
      setCallRecord(res.data.data);
      setCallState('calling');

      // Start call timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Automatically start recording after a short delay
      setTimeout(() => {
        startRecording();
      }, 1000);
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setCallState('recording');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const endCall = async () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop recording
    stopRecording();

    setCallState('ended');
  };

  const submitCallOutcome = async () => {
    if (!callRecord || !outcome) {
      toast.error('Please select an outcome');
      return;
    }

    setUploading(true);

    try {
      // Update call with outcome
      await api.put(`/telecaller/calls/${callRecord.id}`, {
        status: 'COMPLETED',
        outcome,
        notes,
        duration: callDuration,
        endedAt: new Date().toISOString(),
      });

      // Upload recording if available
      if (audioBlob) {
        const formData = new FormData();
        formData.append('recording', audioBlob, `call-${callRecord.id}.webm`);

        await api.post(`/telecaller/calls/${callRecord.id}/recording`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      toast.success('Call saved successfully!');
      navigate('/telecaller-app');
    } catch (error: any) {
      console.error('Error saving call:', error);
      toast.error('Failed to save call. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Lead not found</p>
          <button
            onClick={() => navigate('/telecaller-app')}
            className="mt-4 text-blue-600 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800">
      {/* Header */}
      <div className="px-4 py-6 text-white">
        <button
          onClick={() => navigate('/telecaller-app')}
          className="flex items-center text-white/80 hover:text-white mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Contact Card */}
      <div className="px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          {/* Avatar */}
          <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-blue-600">
              {lead.firstName.charAt(0).toUpperCase()}
              {lead.lastName?.charAt(0).toUpperCase() || ''}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800">
            {lead.firstName} {lead.lastName || ''}
          </h2>
          <p className="text-gray-500 text-lg mt-1">{lead.phone}</p>
          {lead.email && <p className="text-gray-400 text-sm mt-1">{lead.email}</p>}

          {/* Call Duration */}
          {callState !== 'idle' && (
            <div className="mt-6">
              <div className="text-4xl font-mono font-bold text-gray-800">
                {formatDuration(callDuration)}
              </div>
              <div className="flex items-center justify-center mt-2">
                {callState === 'recording' && (
                  <div className="flex items-center text-red-500">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
                    Recording
                  </div>
                )}
                {callState === 'calling' && (
                  <div className="text-green-500">Connecting...</div>
                )}
                {callState === 'ended' && (
                  <div className="text-gray-500">Call Ended</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="px-4 mt-8">
        {callState === 'idle' && (
          <div className="text-center">
            <p className="text-white/80 mb-6">
              Tap the button below to start the call. Recording will begin automatically.
            </p>
            <button
              onClick={startCall}
              className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>
            <p className="text-white/60 text-sm mt-4">Start Call</p>
          </div>
        )}

        {(callState === 'calling' || callState === 'recording') && (
          <div className="text-center">
            <button
              onClick={endCall}
              className="w-20 h-20 bg-red-500 rounded-full mx-auto flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                />
              </svg>
            </button>
            <p className="text-white/60 text-sm mt-4">End Call</p>
          </div>
        )}

        {callState === 'ended' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Call Outcome</h3>

            {/* Outcome Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { value: 'INTERESTED', label: 'Interested', color: 'bg-green-100 text-green-700 border-green-300' },
                { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'bg-red-100 text-red-700 border-red-300' },
                { value: 'CALLBACK', label: 'Callback', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
                { value: 'CONVERTED', label: 'Converted', color: 'bg-blue-100 text-blue-700 border-blue-300' },
                { value: 'NO_ANSWER', label: 'No Answer', color: 'bg-gray-100 text-gray-700 border-gray-300' },
                { value: 'BUSY', label: 'Busy', color: 'bg-orange-100 text-orange-700 border-orange-300' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOutcome(opt.value)}
                  className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                    outcome === opt.value
                      ? `${opt.color} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about the call..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Recording Status */}
            {audioBlob && (
              <div className="mb-6 p-4 bg-green-50 rounded-xl flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-700">Recording captured ({Math.round(audioBlob.size / 1024)} KB)</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={submitCallOutcome}
              disabled={uploading || !outcome}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
                uploading || !outcome
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelecallerCallPage;
