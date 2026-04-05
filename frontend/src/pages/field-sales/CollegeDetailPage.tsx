import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCollegeById,
  updateCollege,
  addContact,
  deleteContact,
  clearCurrentCollege,
} from '../../store/slices/fieldSales/collegeSlice';
import { fetchDealByCollegeId, createDeal } from '../../store/slices/fieldSales/dealSlice';
import { useForm } from 'react-hook-form';
import {
  ArrowLeftIcon,
  MapPinIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { CreateContactData, CollegeCategory } from '../../services/fieldSales/college.service';
import { visitService, Visit } from '../../services/fieldSales/visit.service';

const categoryColors: Record<CollegeCategory, string> = {
  HOT: 'text-red-600 bg-red-50',
  WARM: 'text-orange-600 bg-orange-50',
  COLD: 'text-blue-600 bg-blue-50',
  LOST: 'text-gray-600 bg-gray-100',
};

export default function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentCollege, isLoading } = useAppSelector((state) => state.fieldSalesColleges);
  const { currentDeal } = useAppSelector((state) => state.fieldSalesDeals);

  const [activeTab, setActiveTab] = useState<'details' | 'contacts' | 'visits' | 'deal'>('details');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [schedulePurpose, setSchedulePurpose] = useState('FIRST_INTRODUCTION');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const { register: registerContact, handleSubmit: handleContactSubmit, reset: resetContact } = useForm<CreateContactData>();

  useEffect(() => {
    if (id) {
      dispatch(fetchCollegeById(id));
      dispatch(fetchDealByCollegeId(id));
      loadVisits(id);
    }
    return () => { dispatch(clearCurrentCollege()); };
  }, [dispatch, id]);

  const loadVisits = async (collegeId: string) => {
    setIsLoadingVisits(true);
    try {
      const result = await visitService.getVisits({ collegeId }, 1, 50);
      setVisits(result.visits);
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setIsLoadingVisits(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!id || !scheduleDate) { toast.error('Select date'); return; }
    try {
      await visitService.createVisit({
        collegeId: id,
        visitDate: new Date(scheduleDate).toISOString(),
        purpose: schedulePurpose as any,
        summary: scheduleNotes || `Scheduled - ${schedulePurpose.replace(/_/g, ' ')}`,
      });
      toast.success('Scheduled');
      setIsScheduleModalOpen(false);
      setScheduleDate('');
      loadVisits(id);
    } catch { toast.error('Failed'); }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const today = new Date(); today.setHours(0,0,0,0);
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const formatDuration = (m: number) => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;

  const visitStats = {
    total: visits.length,
    completed: visits.filter(v => v.checkOutTime).length,
    duration: visits.reduce((a, v) => a + (v.duration || 0), 0),
    next: visits.find(v => !v.checkInTime && new Date(v.visitDate) >= new Date()),
  };

  const handleCategoryChange = async (cat: CollegeCategory) => {
    if (!id) return;
    try { await dispatch(updateCollege({ id, data: { category: cat } })).unwrap(); toast.success('Updated'); }
    catch { toast.error('Failed'); }
  };

  const handleAddContact = async (data: CreateContactData) => {
    if (!id) return;
    try { await dispatch(addContact({ collegeId: id, data })).unwrap(); toast.success('Added'); setIsContactModalOpen(false); resetContact(); }
    catch { toast.error('Failed'); }
  };

  const handleDeleteContact = async (cid: string) => {
    if (!id || !confirm('Delete?')) return;
    try { await dispatch(deleteContact({ collegeId: id, contactId: cid })).unwrap(); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  const handleCreateDeal = async () => {
    if (!id) return;
    try { await dispatch(createDeal({ collegeId: id })).unwrap(); toast.success('Created'); }
    catch { toast.error('Failed'); }
  };

  if (isLoading || !currentCollege) {
    return <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Compact Header */}
      <div className="border-b px-4 py-2 flex items-center gap-3">
        <button onClick={() => navigate('/field-sales/colleges')} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeftIcon className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-gray-900 truncate">{currentCollege.name}</h1>
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${categoryColors[currentCollege.category]}`}>{currentCollege.category}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{currentCollege.city}, {currentCollege.state}</span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{currentCollege.collegeType}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">{visitStats.total} visits</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">{currentCollege.contacts?.length || 0} contacts</span>
          {currentDeal && <><span className="text-gray-300">|</span><span className="text-green-600 font-medium">₹{((currentDeal.dealValue||0)/100000).toFixed(1)}L</span></>}
          <select value={currentCollege.category} onChange={e => handleCategoryChange(e.target.value as CollegeCategory)} className="ml-2 px-2 py-1 text-xs border rounded">
            <option value="HOT">Hot</option><option value="WARM">Warm</option><option value="COLD">Cold</option><option value="LOST">Lost</option>
          </select>
          <button onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Check In
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-4 flex gap-4 text-xs">
        {[
          { id: 'details', label: 'Details' },
          { id: 'contacts', label: `Contacts (${currentCollege.contacts?.length || 0})` },
          { id: 'visits', label: `Visits (${visits.length})` },
          { id: 'deal', label: 'Deal' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`py-2 border-b-2 font-medium transition ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 py-1">
          <button onClick={() => setIsScheduleModalOpen(true)} className="px-2 py-1 text-gray-600 border rounded hover:bg-gray-50">+ Schedule</button>
          <button onClick={() => setIsContactModalOpen(true)} className="px-2 py-1 text-gray-600 border rounded hover:bg-gray-50">+ Contact</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'details' && (
          <div className="grid grid-cols-3 gap-4 text-xs">
            {/* Left - Info */}
            <div className="col-span-2 space-y-4">
              <div className="border rounded">
                <div className="px-3 py-2 bg-gray-50 border-b font-medium text-gray-700">College Information</div>
                <div className="p-3 grid grid-cols-3 gap-4">
                  <div><span className="text-gray-500">Address</span><p className="text-gray-900 mt-0.5">{currentCollege.address || '-'}</p><p className="text-gray-600">{currentCollege.city}, {currentCollege.district}, {currentCollege.state}</p></div>
                  <div><span className="text-gray-500">Phone</span><p className="mt-0.5">{currentCollege.phone ? <a href={`tel:${currentCollege.phone}`} className="text-indigo-600">{currentCollege.phone}</a> : '-'}</p></div>
                  <div><span className="text-gray-500">Email</span><p className="mt-0.5">{currentCollege.email ? <a href={`mailto:${currentCollege.email}`} className="text-indigo-600">{currentCollege.email}</a> : '-'}</p></div>
                  <div><span className="text-gray-500">Website</span><p className="mt-0.5">{currentCollege.website ? <a href={currentCollege.website} target="_blank" className="text-indigo-600 truncate block">{currentCollege.website}</a> : '-'}</p></div>
                  <div><span className="text-gray-500">Established</span><p className="text-gray-900 mt-0.5">{currentCollege.establishedYear || '-'}</p></div>
                  <div><span className="text-gray-500">Students</span><p className="text-gray-900 mt-0.5">{currentCollege.studentStrength?.toLocaleString() || '-'}</p></div>
                  <div><span className="text-gray-500">Annual Intake</span><p className="text-gray-900 mt-0.5">{currentCollege.annualIntake || '-'}</p></div>
                  <div><span className="text-gray-500">Lead Source</span><p className="text-gray-900 mt-0.5">{currentCollege.leadSource || '-'}</p></div>
                  <div><span className="text-gray-500">Assigned To</span><p className="text-gray-900 mt-0.5">{currentCollege.assignedTo ? `${currentCollege.assignedTo.firstName} ${currentCollege.assignedTo.lastName}` : '-'}</p></div>
                </div>
                {currentCollege.notes && <div className="px-3 pb-3"><span className="text-gray-500">Notes</span><p className="text-gray-700 mt-0.5 bg-gray-50 p-2 rounded">{currentCollege.notes}</p></div>}
              </div>

              {/* Recent Visits */}
              <div className="border rounded">
                <div className="px-3 py-2 bg-gray-50 border-b font-medium text-gray-700 flex justify-between">
                  <span>Recent Visits</span>
                  <button onClick={() => setActiveTab('visits')} className="text-indigo-600 font-normal">View all →</button>
                </div>
                {visits.length > 0 ? (
                  <table className="w-full">
                    <thead><tr className="border-b bg-gray-50"><th className="text-left px-3 py-1.5 font-medium text-gray-600">Date</th><th className="text-left px-3 py-1.5 font-medium text-gray-600">Purpose</th><th className="text-left px-3 py-1.5 font-medium text-gray-600">Status</th><th className="text-left px-3 py-1.5 font-medium text-gray-600">Outcome</th><th className="px-3 py-1.5"></th></tr></thead>
                    <tbody>
                      {visits.slice(0, 5).map(v => (
                        <tr key={v.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-1.5">{formatDate(v.visitDate)}</td>
                          <td className="px-3 py-1.5 text-gray-600">{v.purpose.replace(/_/g, ' ')}</td>
                          <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.checkOutTime ? 'bg-green-100 text-green-700' : v.checkInTime ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{v.checkOutTime ? 'Done' : v.checkInTime ? 'In Progress' : 'Scheduled'}</span></td>
                          <td className="px-3 py-1.5">{v.outcome ? <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.outcome === 'POSITIVE' ? 'bg-green-100 text-green-700' : v.outcome === 'NEGATIVE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{v.outcome.replace(/_/g, ' ')}</span> : '-'}</td>
                          <td className="px-3 py-1.5"><button onClick={() => setSelectedVisit(v)} className="text-gray-400 hover:text-indigo-600"><EyeIcon className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div className="p-4 text-center text-gray-500">No visits yet</div>}
              </div>
            </div>

            {/* Right - Summary */}
            <div className="space-y-4">
              <div className="border rounded">
                <div className="px-3 py-2 bg-gray-50 border-b font-medium text-gray-700">Visit Summary</div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Total Visits</span><span className="font-medium">{visitStats.total}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Completed</span><span className="font-medium">{visitStats.completed}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Time Spent</span><span className="font-medium">{formatDuration(visitStats.duration)}</span></div>
                  {visitStats.next && <div className="pt-2 border-t"><span className="text-gray-500">Next:</span> <span className="text-indigo-600 font-medium">{formatDate(visitStats.next.visitDate)}</span></div>}
                </div>
              </div>

              <div className="border rounded">
                <div className="px-3 py-2 bg-gray-50 border-b font-medium text-gray-700">Deal</div>
                <div className="p-3">
                  {currentDeal ? (
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-gray-500">Stage</span><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${currentDeal.stage === 'WON' ? 'bg-green-100 text-green-700' : currentDeal.stage === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{currentDeal.stage}</span></div>
                      {currentDeal.dealValue && <div className="flex justify-between"><span className="text-gray-500">Value</span><span className="font-semibold text-green-600">₹{(currentDeal.dealValue/100000).toFixed(1)}L</span></div>}
                      <div className="flex justify-between items-center"><span className="text-gray-500">Probability</span><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-indigo-600 rounded-full" style={{width:`${currentDeal.probability}%`}}/></div><span className="font-medium">{currentDeal.probability}%</span></div></div>
                      <button onClick={() => setActiveTab('deal')} className="w-full mt-2 py-1.5 border rounded text-gray-700 hover:bg-gray-50">View Details</button>
                    </div>
                  ) : (
                    <div className="text-center py-2"><p className="text-gray-500 mb-2">No deal</p><button onClick={handleCreateDeal} className="px-3 py-1.5 bg-indigo-600 text-white rounded">Create Deal</button></div>
                  )}
                </div>
              </div>

              {currentCollege.googleMapsUrl || currentCollege.latitude ? (
                <a href={currentCollege.googleMapsUrl || `https://www.google.com/maps?q=${currentCollege.latitude},${currentCollege.longitude}`} target="_blank" className="flex items-center justify-center gap-2 p-3 border rounded text-indigo-600 hover:bg-indigo-50">
                  <MapPinIcon className="w-4 h-4" /> Open in Google Maps
                </a>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="border rounded">
            <div className="px-3 py-2 bg-gray-50 border-b font-medium text-gray-700 flex justify-between text-xs">
              <span>Contacts ({currentCollege.contacts?.length || 0})</span>
              <button onClick={() => setIsContactModalOpen(true)} className="text-indigo-600">+ Add Contact</button>
            </div>
            {currentCollege.contacts && currentCollege.contacts.length > 0 ? (
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-gray-50"><th className="text-left px-3 py-2 font-medium text-gray-600">Name</th><th className="text-left px-3 py-2 font-medium text-gray-600">Designation</th><th className="text-left px-3 py-2 font-medium text-gray-600">Department</th><th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th><th className="text-left px-3 py-2 font-medium text-gray-600">Email</th><th className="text-center px-3 py-2 font-medium text-gray-600">Tags</th><th className="px-3 py-2"></th></tr></thead>
                <tbody>
                  {currentCollege.contacts.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2 text-gray-600">{c.designation}</td>
                      <td className="px-3 py-2 text-gray-600">{c.department || '-'}</td>
                      <td className="px-3 py-2"><a href={`tel:${c.phone}`} className="text-indigo-600">{c.phone}</a></td>
                      <td className="px-3 py-2">{c.email ? <a href={`mailto:${c.email}`} className="text-indigo-600">{c.email}</a> : '-'}</td>
                      <td className="px-3 py-2 text-center">{c.isPrimary && <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-[10px] mr-1">Primary</span>}{c.isDecisionMaker && <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">DM</span>}</td>
                      <td className="px-3 py-2"><button onClick={() => handleDeleteContact(c.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="p-6 text-center text-xs text-gray-500">No contacts. <button onClick={() => setIsContactModalOpen(true)} className="text-indigo-600">Add one</button></div>}
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="border rounded">
            <div className="px-3 py-2 bg-gray-50 border-b font-medium text-gray-700 flex justify-between text-xs">
              <span>Visits ({visits.length})</span>
              <div className="flex gap-2">
                <button onClick={() => setIsScheduleModalOpen(true)} className="text-gray-600">+ Schedule</button>
                <button onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)} className="text-indigo-600">+ Check In</button>
              </div>
            </div>
            {isLoadingVisits ? <div className="p-6 text-center"><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div> :
            visits.length > 0 ? (
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-gray-50"><th className="text-left px-3 py-2 font-medium text-gray-600">Date</th><th className="text-left px-3 py-2 font-medium text-gray-600">Time</th><th className="text-left px-3 py-2 font-medium text-gray-600">Duration</th><th className="text-left px-3 py-2 font-medium text-gray-600">Purpose</th><th className="text-left px-3 py-2 font-medium text-gray-600">Status</th><th className="text-left px-3 py-2 font-medium text-gray-600">Outcome</th><th className="text-left px-3 py-2 font-medium text-gray-600">Summary</th><th className="px-3 py-2"></th></tr></thead>
                <tbody>
                  {visits.map(v => {
                    const done = !!v.checkOutTime, ongoing = v.checkInTime && !v.checkOutTime, missed = !v.checkInTime && new Date(v.visitDate) < new Date();
                    return (
                      <tr key={v.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{formatDate(v.visitDate)}</td>
                        <td className="px-3 py-2 text-gray-600">{v.checkInTime ? `${formatTime(v.checkInTime)}${v.checkOutTime ? ` - ${formatTime(v.checkOutTime)}` : ''}` : '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{v.duration ? formatDuration(v.duration) : '-'}</td>
                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-gray-100 rounded">{v.purpose.replace(/_/g, ' ')}</span></td>
                        <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${done ? 'bg-green-100 text-green-700' : ongoing ? 'bg-blue-100 text-blue-700' : missed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{done ? 'Done' : ongoing ? 'In Progress' : missed ? 'Missed' : 'Scheduled'}</span></td>
                        <td className="px-3 py-2">{v.outcome ? <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.outcome === 'POSITIVE' || v.outcome === 'DEAL_WON' ? 'bg-green-100 text-green-700' : v.outcome === 'NEGATIVE' || v.outcome === 'DEAL_LOST' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{v.outcome.replace(/_/g,' ')}</span> : '-'}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">{v.summary || '-'}</td>
                        <td className="px-3 py-2"><button onClick={() => setSelectedVisit(v)} className="text-gray-400 hover:text-indigo-600"><EyeIcon className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <div className="p-6 text-center text-xs text-gray-500">No visits. <button onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)} className="text-indigo-600">Check in now</button></div>}
          </div>
        )}

        {activeTab === 'deal' && (
          <div className="border rounded">
            <div className="px-3 py-2 bg-gray-50 border-b font-medium text-gray-700 text-xs">Deal</div>
            <div className="p-4">
              {currentDeal ? (
                <div className="max-w-sm mx-auto text-center text-xs">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${currentDeal.stage === 'WON' ? 'bg-green-100 text-green-700' : currentDeal.stage === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{currentDeal.stage}</span>
                  <p className="font-semibold text-gray-900 mt-2">{currentDeal.dealName}</p>
                  {currentDeal.dealValue && <p className="text-2xl font-bold text-green-600 mt-2">₹{(currentDeal.dealValue/100000).toFixed(1)}L</p>}
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-gray-500">Probability</span>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-indigo-600 rounded-full" style={{width:`${currentDeal.probability}%`}}/></div>
                    <span className="font-medium">{currentDeal.probability}%</span>
                  </div>
                  <button onClick={() => navigate('/field-sales/deals')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">View Full Details</button>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500">No deal created. <button onClick={handleCreateDeal} className="text-indigo-600">Create one</button></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex justify-between items-center"><h3 className="font-semibold text-sm">Schedule Visit</h3><button onClick={() => setIsScheduleModalOpen(false)}><XMarkIcon className="w-4 h-4" /></button></div>
            <div className="p-4 space-y-3 text-xs">
              <div><label className="block font-medium text-gray-700 mb-1">Date & Time</label><input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full px-3 py-2 border rounded" min={new Date().toISOString().slice(0,16)} /></div>
              <div><label className="block font-medium text-gray-700 mb-1">Purpose</label><select value={schedulePurpose} onChange={e => setSchedulePurpose(e.target.value)} className="w-full px-3 py-2 border rounded"><option value="FIRST_INTRODUCTION">First Introduction</option><option value="PRODUCT_DEMO">Product Demo</option><option value="PROPOSAL_PRESENTATION">Proposal</option><option value="NEGOTIATION">Negotiation</option><option value="AGREEMENT_SIGNING">Agreement</option><option value="OTHER">Other</option></select></div>
              <div><label className="block font-medium text-gray-700 mb-1">Notes</label><textarea value={scheduleNotes} onChange={e => setScheduleNotes(e.target.value)} className="w-full px-3 py-2 border rounded" rows={2} /></div>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t flex justify-end gap-2"><button onClick={() => setIsScheduleModalOpen(false)} className="px-3 py-1.5 border rounded">Cancel</button><button onClick={handleScheduleVisit} className="px-3 py-1.5 bg-indigo-600 text-white rounded">Schedule</button></div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setIsContactModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex justify-between items-center"><h3 className="font-semibold text-sm">Add Contact</h3><button onClick={() => setIsContactModalOpen(false)}><XMarkIcon className="w-4 h-4" /></button></div>
            <form onSubmit={handleContactSubmit(handleAddContact)}>
              <div className="p-4 space-y-3 text-xs">
                <div><label className="block font-medium text-gray-700 mb-1">Name *</label><input {...registerContact('name', { required: true })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block font-medium text-gray-700 mb-1">Designation *</label><input {...registerContact('designation', { required: true })} className="w-full px-3 py-2 border rounded" /></div><div><label className="block font-medium text-gray-700 mb-1">Department</label><input {...registerContact('department')} className="w-full px-3 py-2 border rounded" /></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block font-medium text-gray-700 mb-1">Phone *</label><input {...registerContact('phone', { required: true })} className="w-full px-3 py-2 border rounded" /></div><div><label className="block font-medium text-gray-700 mb-1">Email</label><input type="email" {...registerContact('email')} className="w-full px-3 py-2 border rounded" /></div></div>
                <div className="flex gap-4"><label className="flex items-center gap-1.5"><input type="checkbox" {...registerContact('isPrimary')} className="rounded" /><span>Primary</span></label><label className="flex items-center gap-1.5"><input type="checkbox" {...registerContact('isDecisionMaker')} className="rounded" /><span>Decision Maker</span></label></div>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsContactModalOpen(false)} className="px-3 py-1.5 border rounded">Cancel</button><button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded">Add</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVisit(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-white"><h3 className="font-semibold text-sm">Visit Details</h3><button onClick={() => setSelectedVisit(null)}><XMarkIcon className="w-4 h-4" /></button></div>
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded font-medium ${selectedVisit.outcome === 'POSITIVE' || selectedVisit.outcome === 'DEAL_WON' ? 'bg-green-100 text-green-700' : selectedVisit.outcome === 'NEGATIVE' || selectedVisit.outcome === 'DEAL_LOST' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{selectedVisit.outcome?.replace(/_/g, ' ') || 'No Outcome'}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">{selectedVisit.purpose.replace(/_/g, ' ')}</span>
                {selectedVisit.locationVerified && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">GPS ✓</span>}
              </div>
              <div className="grid grid-cols-4 gap-2">{[{l:'Date',v:formatDate(selectedVisit.visitDate)},{l:'In',v:selectedVisit.checkInTime?formatTime(selectedVisit.checkInTime):'-'},{l:'Out',v:selectedVisit.checkOutTime?formatTime(selectedVisit.checkOutTime):'-'},{l:'Duration',v:selectedVisit.duration?formatDuration(selectedVisit.duration):'-'}].map(x=><div key={x.l} className="bg-gray-50 rounded p-2 text-center"><p className="text-gray-500 text-[10px]">{x.l}</p><p className="font-semibold">{x.v}</p></div>)}</div>
              {selectedVisit.summary && <div><p className="text-gray-500 mb-1">Summary</p><div className="bg-gray-50 rounded p-2">{selectedVisit.summary}</div></div>}
              {selectedVisit.actionItems && <div><p className="text-gray-500 mb-1">Action Items</p><div className="bg-amber-50 border border-amber-100 rounded p-2 text-amber-900">{selectedVisit.actionItems}</div></div>}
              {(selectedVisit.nextVisitDate || selectedVisit.nextAction) && <div><p className="text-gray-500 mb-1">Next Steps</p><div className="bg-blue-50 border border-blue-100 rounded p-2">{selectedVisit.nextVisitDate && <p>Next: <span className="font-medium text-blue-700">{formatDate(selectedVisit.nextVisitDate)}</span></p>}{selectedVisit.nextAction && <p>{selectedVisit.nextAction}</p>}</div></div>}
              {selectedVisit.checkInLatitude && <div className="flex justify-between items-center bg-gray-50 rounded p-2"><div><p className="text-gray-500">Location</p><p>{selectedVisit.checkInLatitude.toFixed(5)}, {selectedVisit.checkInLongitude?.toFixed(5)}</p></div><a href={`https://www.google.com/maps?q=${selectedVisit.checkInLatitude},${selectedVisit.checkInLongitude}`} target="_blank" className="px-2 py-1 border rounded hover:bg-white">Map</a></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
