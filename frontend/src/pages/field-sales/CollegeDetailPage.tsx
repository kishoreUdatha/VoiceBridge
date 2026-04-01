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
  UserPlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  TrashIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  UsersIcon,
  GlobeAltIcon,
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { CreateContactData, CollegeCategory } from '../../services/fieldSales/college.service';
import { visitService, Visit } from '../../services/fieldSales/visit.service';

const categoryConfig: Record<CollegeCategory, { bg: string; text: string; ring: string }> = {
  HOT: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20' },
  WARM: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-600/20' },
  COLD: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-600/20' },
  LOST: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-600/10' },
};

export default function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentCollege, isLoading } = useAppSelector((state) => state.fieldSalesColleges);
  const { currentDeal } = useAppSelector((state) => state.fieldSalesDeals);

  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'visits' | 'deal'>('overview');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [schedulePurpose, setSchedulePurpose] = useState('FIRST_INTRODUCTION');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);

  const { register: registerContact, handleSubmit: handleContactSubmit, reset: resetContact, formState: { errors: contactErrors } } = useForm<CreateContactData>();

  useEffect(() => {
    if (id) {
      dispatch(fetchCollegeById(id));
      dispatch(fetchDealByCollegeId(id));
      loadVisits(id);
    }
    return () => {
      dispatch(clearCurrentCollege());
    };
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
    if (!id || !scheduleDate) {
      toast.error('Please select a date');
      return;
    }
    try {
      await visitService.createVisit({
        collegeId: id,
        visitDate: new Date(scheduleDate).toISOString(),
        purpose: schedulePurpose as any,
        summary: scheduleNotes || `Scheduled visit - ${schedulePurpose.replace(/_/g, ' ')}`,
      });
      toast.success('Visit scheduled successfully');
      setIsScheduleModalOpen(false);
      setScheduleDate('');
      setScheduleNotes('');
      loadVisits(id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to schedule visit');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Calculate visit statistics
  const visitStats = {
    total: visits.length,
    completed: visits.filter(v => v.checkOutTime).length,
    scheduled: visits.filter(v => !v.checkInTime && new Date(v.visitDate) >= new Date()).length,
    totalDuration: visits.reduce((acc, v) => acc + (v.duration || 0), 0),
    avgDuration: visits.filter(v => v.duration).length > 0
      ? Math.round(visits.filter(v => v.duration).reduce((acc, v) => acc + (v.duration || 0), 0) / visits.filter(v => v.duration).length)
      : 0,
    lastVisit: visits.find(v => v.checkOutTime),
    nextScheduled: visits.find(v => !v.checkInTime && new Date(v.visitDate) >= new Date()),
    positiveOutcomes: visits.filter(v => v.outcome === 'POSITIVE' || v.outcome === 'DEAL_WON').length,
  };

  const handleViewVisit = (visit: Visit) => {
    setSelectedVisit(visit);
    setIsVisitDetailModalOpen(true);
  };

  const parseCoursesOffered = () => {
    if (!currentCollege?.coursesOffered) return [];
    try {
      if (Array.isArray(currentCollege.coursesOffered)) {
        return currentCollege.coursesOffered;
      }
      return JSON.parse(currentCollege.coursesOffered as string);
    } catch {
      return [];
    }
  };

  const handleCategoryChange = async (category: CollegeCategory) => {
    if (!id) return;
    try {
      await dispatch(updateCollege({ id, data: { category } })).unwrap();
      toast.success('Category updated');
    } catch (error: any) {
      toast.error(error || 'Failed to update category');
    }
  };

  const handleAddContact = async (data: CreateContactData) => {
    if (!id) return;
    try {
      await dispatch(addContact({ collegeId: id, data })).unwrap();
      toast.success('Contact added');
      setIsContactModalOpen(false);
      resetContact();
    } catch (error: any) {
      toast.error(error || 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!id) return;
    if (window.confirm('Delete this contact?')) {
      try {
        await dispatch(deleteContact({ collegeId: id, contactId })).unwrap();
        toast.success('Contact deleted');
      } catch (error: any) {
        toast.error(error || 'Failed to delete contact');
      }
    }
  };

  const handleCreateDeal = async () => {
    if (!id) return;
    try {
      await dispatch(createDeal({ collegeId: id })).unwrap();
      toast.success('Deal created');
    } catch (error: any) {
      toast.error(error || 'Failed to create deal');
    }
  };

  if (isLoading || !currentCollege) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  const catConfig = categoryConfig[currentCollege.category];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/field-sales/colleges')}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 text-slate-600" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                {currentCollege.shortName?.substring(0, 2) || currentCollege.name.substring(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900">{currentCollege.name}</h1>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catConfig.bg} ${catConfig.text}`}>
                    {currentCollege.category}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3" />
                    {currentCollege.city}, {currentCollege.state}
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{currentCollege.collegeType}</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{currentCollege.institutionStatus}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currentCollege.category}
                onChange={(e) => handleCategoryChange(e.target.value as CollegeCategory)}
                className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
              >
                <option value="HOT">Hot</option>
                <option value="WARM">Warm</option>
                <option value="COLD">Cold</option>
                <option value="LOST">Lost</option>
              </select>
              <button
                onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700"
              >
                <MapPinIcon className="w-3.5 h-3.5" />
                Check In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center">
                <MapPinIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{visitStats.total}</p>
                <p className="text-[10px] text-slate-500">Visits ({visitStats.completed} done)</p>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center">
                <ClockIcon className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{formatDuration(visitStats.totalDuration)}</p>
                <p className="text-[10px] text-slate-500">Time (avg: {formatDuration(visitStats.avgDuration)})</p>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-violet-100 flex items-center justify-center">
                <UsersIcon className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{currentCollege.studentStrength?.toLocaleString() || 'N/A'}</p>
                <p className="text-[10px] text-slate-500">Students</p>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-100 flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{currentCollege.contacts?.length || 0}</p>
                <p className="text-[10px] text-slate-500">Contacts ({visitStats.positiveOutcomes} positive)</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'contacts', label: `Contacts` },
                { key: 'visits', label: `Visits` },
                { key: 'deal', label: 'Deal' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="col-span-8 space-y-4">
            {/* Quick Info Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Last Visit */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-900">Last Visit</h3>
                </div>
                {visitStats.lastVisit ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">{formatDateTime(visitStats.lastVisit.checkOutTime!)}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        visitStats.lastVisit.outcome === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' :
                        visitStats.lastVisit.outcome === 'NEGATIVE' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {visitStats.lastVisit.outcome?.replace(/_/g, ' ') || 'N/A'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                        {visitStats.lastVisit.purpose.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{visitStats.lastVisit.summary}</p>
                    <button onClick={() => handleViewVisit(visitStats.lastVisit!)} className="text-primary-600 text-xs font-medium">
                      View Details →
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No visits yet</p>
                )}
              </div>

              {/* Next Scheduled */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-900">Next Scheduled</h3>
                </div>
                {visitStats.nextScheduled ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-primary-600">{formatDate(visitStats.nextScheduled.visitDate)}</p>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {visitStats.nextScheduled.purpose.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)}
                      className="w-full mt-2 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg"
                    >
                      Check In Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">No upcoming visits</p>
                    <button
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="w-full px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                    >
                      <PlusIcon className="w-3 h-3 inline mr-1" />
                      Schedule Visit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* College Information */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5">
                <BuildingOfficeIcon className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-900">College Information</h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Address</p>
                        <p className="text-xs text-slate-900">{currentCollege.address}</p>
                        <p className="text-xs text-slate-600">{currentCollege.city}, {currentCollege.state} {currentCollege.pincode}</p>
                        {(currentCollege.googleMapsUrl || (currentCollege.latitude && currentCollege.longitude)) && (
                          <a
                            href={currentCollege.googleMapsUrl || `https://www.google.com/maps?q=${currentCollege.latitude},${currentCollege.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 text-[10px] hover:underline"
                          >
                            Open in Maps →
                          </a>
                        )}
                      </div>
                    </div>
                    {currentCollege.phone && (
                      <div className="flex items-start gap-2">
                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Phone</p>
                          <a href={`tel:${currentCollege.phone}`} className="text-xs text-primary-600 hover:underline">{currentCollege.phone}</a>
                        </div>
                      </div>
                    )}
                    {currentCollege.email && (
                      <div className="flex items-start gap-2">
                        <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Email</p>
                          <a href={`mailto:${currentCollege.email}`} className="text-xs text-primary-600 hover:underline">{currentCollege.email}</a>
                        </div>
                      </div>
                    )}
                    {currentCollege.website && (
                      <div className="flex items-start gap-2">
                        <GlobeAltIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Website</p>
                          <a href={currentCollege.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline truncate block max-w-[200px]">{currentCollege.website}</a>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {currentCollege.establishedYear && (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Established</p>
                          <p className="text-xs font-medium text-slate-900">{currentCollege.establishedYear}</p>
                        </div>
                      )}
                      {currentCollege.leadSource && (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Lead Source</p>
                          <p className="text-xs font-medium text-slate-900">{currentCollege.leadSource}</p>
                        </div>
                      )}
                      {currentCollege.annualIntake && (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Annual Intake</p>
                          <p className="text-xs font-medium text-slate-900">{currentCollege.annualIntake}</p>
                        </div>
                      )}
                    </div>
                    {parseCoursesOffered().length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Courses</p>
                        <div className="flex flex-wrap gap-1">
                          {parseCoursesOffered().map((course: string, index: number) => (
                            <span key={index} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{course}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {currentCollege.notes && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Notes</p>
                        <p className="text-xs text-slate-700 mt-0.5">{currentCollege.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-4 space-y-3">
            {/* Deal Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <BriefcaseIcon className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-900">Deal Status</h3>
              </div>
              {currentDeal ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      currentDeal.stage === 'WON' ? 'bg-emerald-100 text-emerald-700' :
                      currentDeal.stage === 'LOST' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{currentDeal.stage}</span>
                    <span className="text-[10px] text-slate-500">{currentDeal.probability}%</span>
                  </div>
                  {currentDeal.dealValue && (
                    <div className="text-center py-2 bg-emerald-50 rounded-lg">
                      <p className="text-lg font-bold text-emerald-700">₹{(currentDeal.dealValue / 100000).toFixed(1)}L</p>
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/field-sales/deals')}
                    className="w-full px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                  >
                    View Deal
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-slate-500 mb-2">No active deal</p>
                  <button onClick={handleCreateDeal} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg">
                    Create Deal
                  </button>
                </div>
              )}
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-900">Assignment</h3>
              </div>
              <div className="space-y-2">
                {currentCollege.assignedTo && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-[10px] font-semibold">
                      {currentCollege.assignedTo.firstName?.[0]}{currentCollege.assignedTo.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-900">{currentCollege.assignedTo.firstName} {currentCollege.assignedTo.lastName}</p>
                      <p className="text-[10px] text-slate-500">Primary</p>
                    </div>
                  </div>
                )}
                {currentCollege.secondaryAssignee && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-semibold">
                      {currentCollege.secondaryAssignee.firstName?.[0]}{currentCollege.secondaryAssignee.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-900">{currentCollege.secondaryAssignee.firstName} {currentCollege.secondaryAssignee.lastName}</p>
                      <p className="text-[10px] text-slate-500">Secondary</p>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  {currentCollege.lastVisitDate && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Last Visit</span>
                      <span className="font-medium">{formatDate(currentCollege.lastVisitDate)}</span>
                    </div>
                  )}
                  {currentCollege.nextFollowUpDate && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Follow-up</span>
                      <span className="font-medium text-primary-600">{formatDate(currentCollege.nextFollowUpDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Engagement */}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ChartBarIcon className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-900">Engagement</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Progress</span>
                    <span className="text-[10px] font-medium">{visitStats.completed}/{visitStats.total}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${visitStats.total > 0 ? (visitStats.completed / visitStats.total) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-emerald-50 rounded-lg">
                    <p className="text-sm font-bold text-emerald-700">{visitStats.positiveOutcomes}</p>
                    <p className="text-[10px] text-emerald-600">Positive</p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <p className="text-sm font-bold text-amber-700">{visitStats.scheduled}</p>
                    <p className="text-[10px] text-amber-600">Scheduled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Actions */}
            {visitStats.lastVisit?.actionItems && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
                <p className="text-[10px] font-semibold text-amber-800 mb-1">Pending Actions</p>
                <p className="text-xs text-amber-900 line-clamp-3">{visitStats.lastVisit.actionItems}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-900">Contacts ({currentCollege.contacts?.length || 0})</h3>
            </div>
            <button onClick={() => setIsContactModalOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-lg">
              <UserPlusIcon className="h-3 w-3" />
              Add
            </button>
          </div>
          <div className="p-3">
            {currentCollege.contacts && currentCollege.contacts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {currentCollege.contacts.map((contact) => (
                  <div key={contact.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                          {contact.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold text-slate-900">{contact.name}</p>
                            {contact.isPrimary && <span className="text-[9px] px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded">Primary</span>}
                            {contact.isDecisionMaker && <span className="text-[9px] px-1 py-0.5 bg-violet-100 text-violet-700 rounded">DM</span>}
                          </div>
                          <p className="text-[10px] text-slate-500">{contact.designation}</p>
                          {contact.department && <p className="text-[10px] text-slate-400">{contact.department}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteContact(contact.id)} className="p-1 text-slate-400 hover:text-red-500">
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-[10px] text-primary-600 hover:underline">
                        <PhoneIcon className="h-3 w-3" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-[10px] text-primary-600 hover:underline">
                          <EnvelopeIcon className="h-3 w-3" />
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 mb-2">No contacts added</p>
                <button onClick={() => setIsContactModalOpen(true)} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg">
                  Add First Contact
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-900">Visit History ({visits.length})</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsScheduleModalOpen(true)} className="flex items-center gap-1 px-2 py-1 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50">
                <CalendarDaysIcon className="h-3 w-3" />
                Schedule
              </button>
              <button
                onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)}
                className="flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-lg"
              >
                <PlusIcon className="h-3 w-3" />
                Check In
              </button>
            </div>
          </div>
          <div className="p-3">
            {isLoadingVisits ? (
              <div className="flex justify-center py-6">
                <div className="spinner spinner-sm"></div>
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-8">
                <MapPinIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No visits recorded</p>
                <p className="text-[10px] text-slate-400 mb-3">Check in at this college to start tracking visits</p>
                <button
                  onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)}
                  className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg"
                >
                  Check In Now
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {visits.map((visit, index) => {
                  const isCompleted = !!visit.checkOutTime;
                  const isOngoing = visit.checkInTime && !visit.checkOutTime;
                  const isScheduled = !visit.checkInTime;
                  const isPast = new Date(visit.visitDate) < new Date() && !visit.checkInTime;

                  return (
                    <div key={visit.id} className="flex gap-2">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-emerald-100' :
                          isOngoing ? 'bg-blue-100' :
                          isPast ? 'bg-red-100' :
                          'bg-slate-100'
                        }`}>
                          {isCompleted ? (
                            <CheckCircleSolidIcon className="w-3.5 h-3.5 text-emerald-600" />
                          ) : isOngoing ? (
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                          ) : isPast ? (
                            <XMarkIcon className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        {index < visits.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                      </div>

                      {/* Visit card */}
                      <div className={`flex-1 p-2.5 rounded-lg border ${
                        isOngoing ? 'ring-1 ring-blue-500 border-blue-200 bg-blue-50/50' :
                        isPast ? 'border-red-200 bg-red-50/30' : 'border-slate-100 bg-slate-50'
                      }`}>
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-slate-900">{formatDate(visit.visitDate)}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                isCompleted ? 'bg-emerald-100 text-emerald-700' :
                                isOngoing ? 'bg-blue-100 text-blue-700' :
                                isPast ? 'bg-red-100 text-red-700' :
                                'bg-slate-200 text-slate-600'
                              }`}>
                                {isCompleted ? 'Done' :
                                 isOngoing ? 'In Progress' :
                                 isPast ? 'Missed' : 'Scheduled'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              {visit.checkInTime && (
                                <span className="flex items-center gap-0.5">
                                  <ClockIcon className="w-3 h-3" />
                                  {formatTime(visit.checkInTime)}
                                  {visit.checkOutTime && ` - ${formatTime(visit.checkOutTime)}`}
                                </span>
                              )}
                              {visit.duration && (
                                <span className="text-slate-400">({formatDuration(visit.duration)})</span>
                              )}
                              {visit.locationVerified && (
                                <span className="text-emerald-600 flex items-center gap-0.5">
                                  <CheckCircleIcon className="w-3 h-3" />
                                  GPS
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            visit.purpose === 'FIRST_INTRODUCTION' ? 'bg-blue-100 text-blue-700' :
                            visit.purpose === 'PRODUCT_DEMO' ? 'bg-violet-100 text-violet-700' :
                            visit.purpose === 'PROPOSAL_PRESENTATION' ? 'bg-indigo-100 text-indigo-700' :
                            visit.purpose === 'NEGOTIATION' ? 'bg-amber-100 text-amber-700' :
                            visit.purpose === 'AGREEMENT_SIGNING' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {visit.purpose.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {visit.summary && (
                          <p className="text-[10px] text-slate-600 mb-1.5 line-clamp-2">{visit.summary}</p>
                        )}

                        {visit.outcome && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[9px] text-slate-500">Outcome:</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              visit.outcome === 'POSITIVE' || visit.outcome === 'DEAL_WON' ? 'bg-emerald-100 text-emerald-700' :
                              visit.outcome === 'NEGATIVE' || visit.outcome === 'DEAL_LOST' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {visit.outcome.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}

                        {visit.actionItems && (
                          <div className="bg-amber-50 border border-amber-100 rounded p-1.5 mt-1">
                            <p className="text-[9px] text-amber-700 font-medium">Action Items:</p>
                            <p className="text-[9px] text-amber-800 line-clamp-1">{visit.actionItems}</p>
                          </div>
                        )}

                        <div className="mt-2 flex gap-1.5">
                          {isCompleted && (
                            <button
                              onClick={() => handleViewVisit(visit)}
                              className="flex items-center gap-1 px-2 py-1 border border-slate-200 text-slate-600 text-[10px] font-medium rounded hover:bg-white"
                            >
                              <EyeIcon className="h-3 w-3" />
                              Details
                            </button>
                          )}
                          {isScheduled && !isPast && (
                            <button
                              onClick={() => navigate(`/field-sales/visits/check-in?collegeId=${currentCollege.id}`)}
                              className="px-2 py-1 bg-primary-600 text-white text-[10px] font-medium rounded"
                            >
                              Check In
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'deal' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5">
            <BriefcaseIcon className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-900">Deal Information</h3>
          </div>
          <div className="p-4">
            {currentDeal ? (
              <div className="max-w-md mx-auto">
                <div className="text-center mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    currentDeal.stage === 'WON' ? 'bg-emerald-100 text-emerald-700' :
                    currentDeal.stage === 'LOST' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {currentDeal.stage}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-2">{currentDeal.dealName}</h2>
                  {currentDeal.dealValue && (
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      ₹{(currentDeal.dealValue / 100000).toFixed(1)}L
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-[10px] text-slate-500">Probability</span>
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${currentDeal.probability}%` }} />
                    </div>
                    <span className="text-xs font-medium">{currentDeal.probability}%</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/field-sales/deals')}
                  className="w-full px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg"
                >
                  View Deal Details
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <BriefcaseIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No deal created yet</p>
                <p className="text-[10px] text-slate-400 mb-3">Create a deal to track sales opportunity</p>
                <button onClick={handleCreateDeal} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg">
                  Create Deal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Schedule Visit Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Schedule Visit</h2>
                <p className="text-[10px] text-slate-500">{currentCollege.name}</p>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <XMarkIcon className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Purpose *</label>
                <select
                  value={schedulePurpose}
                  onChange={(e) => setSchedulePurpose(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                >
                  <option value="FIRST_INTRODUCTION">First Introduction</option>
                  <option value="PRODUCT_DEMO">Product Demo</option>
                  <option value="PROPOSAL_PRESENTATION">Proposal Presentation</option>
                  <option value="NEGOTIATION">Negotiation</option>
                  <option value="DOCUMENT_COLLECTION">Document Collection</option>
                  <option value="AGREEMENT_SIGNING">Agreement Signing</option>
                  <option value="RELATIONSHIP_BUILDING">Relationship Building</option>
                  <option value="ISSUE_RESOLUTION">Issue Resolution</option>
                  <option value="PAYMENT_FOLLOWUP">Payment Follow-up</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Notes</label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                  rows={2}
                  placeholder="What do you plan to discuss?"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsScheduleModalOpen(false)} className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleScheduleVisit} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg">
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsContactModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Add Contact</h2>
                <p className="text-[10px] text-slate-500">{currentCollege.name}</p>
              </div>
              <button onClick={() => setIsContactModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <XMarkIcon className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleContactSubmit(handleAddContact)}>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Name *</label>
                  <input {...registerContact('name', { required: 'Required' })} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg" placeholder="Full name" />
                  {contactErrors.name && <p className="text-[10px] text-red-500 mt-0.5">{contactErrors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Designation *</label>
                    <input {...registerContact('designation', { required: 'Required' })} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg" placeholder="Principal" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Department</label>
                    <input {...registerContact('department')} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg" placeholder="CSE" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Phone *</label>
                    <input {...registerContact('phone', { required: 'Required' })} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg" placeholder="+91 98765" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">WhatsApp</label>
                    <input {...registerContact('whatsapp')} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg" placeholder="WhatsApp" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600 uppercase mb-1 block">Email</label>
                  <input type="email" {...registerContact('email')} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg" placeholder="email@example.com" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" {...registerContact('isPrimary')} className="w-3.5 h-3.5 rounded border-slate-300" />
                    <span className="text-[10px] text-slate-700">Primary</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" {...registerContact('isDecisionMaker')} className="w-3.5 h-3.5 rounded border-slate-300" />
                    <span className="text-[10px] text-slate-700">Decision Maker</span>
                  </label>
                </div>
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsContactModalOpen(false)} className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-white">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg">
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visit Detail Modal */}
      {isVisitDetailModalOpen && selectedVisit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsVisitDetailModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Visit Details</h2>
                <p className="text-[10px] text-slate-500">{currentCollege.name}</p>
              </div>
              <button onClick={() => setIsVisitDetailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <XMarkIcon className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Status Banner */}
              <div className={`p-3 rounded-lg ${
                selectedVisit.outcome === 'POSITIVE' || selectedVisit.outcome === 'DEAL_WON' ? 'bg-emerald-50 border border-emerald-200' :
                selectedVisit.outcome === 'NEGATIVE' || selectedVisit.outcome === 'DEAL_LOST' ? 'bg-red-50 border border-red-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      selectedVisit.outcome === 'POSITIVE' || selectedVisit.outcome === 'DEAL_WON' ? 'bg-emerald-100 text-emerald-700' :
                      selectedVisit.outcome === 'NEGATIVE' || selectedVisit.outcome === 'DEAL_LOST' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedVisit.outcome?.replace(/_/g, ' ') || 'No Outcome'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{selectedVisit.purpose.replace(/_/g, ' ')}</span>
                  </div>
                  {selectedVisit.locationVerified && (
                    <span className="flex items-center gap-0.5 text-emerald-600 text-[10px]">
                      <CheckCircleIcon className="h-3 w-3" />
                      GPS
                    </span>
                  )}
                </div>
              </div>

              {/* Time Grid */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Date', value: formatDate(selectedVisit.visitDate) },
                  { label: 'In', value: selectedVisit.checkInTime ? formatTime(selectedVisit.checkInTime) : '-' },
                  { label: 'Out', value: selectedVisit.checkOutTime ? formatTime(selectedVisit.checkOutTime) : '-' },
                  { label: 'Duration', value: selectedVisit.duration ? formatDuration(selectedVisit.duration) : '-' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[9px] text-slate-500 uppercase">{item.label}</p>
                    <p className="text-xs font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                  <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Summary</h4>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-700 whitespace-pre-line">{selectedVisit.summary || 'No summary provided'}</p>
                </div>
              </div>

              {/* Action Items */}
              {selectedVisit.actionItems && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Action Items</h4>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    <ul className="space-y-1">
                      {selectedVisit.actionItems.split('\n').filter(Boolean).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-[9px] font-semibold text-amber-800 flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] text-amber-900">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {(selectedVisit.nextVisitDate || selectedVisit.nextAction) && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Next Steps</h4>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1">
                    {selectedVisit.nextVisitDate && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-600">Next Visit:</span>
                        <span className="text-[10px] font-medium text-blue-700">
                          {new Date(selectedVisit.nextVisitDate).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {selectedVisit.nextAction && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] text-slate-600">Action:</span>
                        <span className="text-[10px] text-slate-900">{selectedVisit.nextAction}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {selectedVisit.checkInLatitude && selectedVisit.checkInLongitude && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Location</h4>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-600">
                        {selectedVisit.checkInLatitude.toFixed(6)}, {selectedVisit.checkInLongitude.toFixed(6)}
                      </p>
                      {selectedVisit.distanceFromCollege !== undefined && (
                        <p className="text-[9px] text-slate-500">
                          {selectedVisit.distanceFromCollege.toFixed(0)}m from college
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedVisit.checkInLatitude},${selectedVisit.checkInLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 border border-slate-200 text-slate-600 text-[10px] font-medium rounded hover:bg-white"
                    >
                      Open Map
                    </a>
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="border-t border-slate-100 pt-3 text-[9px] text-slate-400 space-y-0.5">
                <p>ID: {selectedVisit.id.substring(0, 8)}...</p>
                <p>Created: {formatDateTime(selectedVisit.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
