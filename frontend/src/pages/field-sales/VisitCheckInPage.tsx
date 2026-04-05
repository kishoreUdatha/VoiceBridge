import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { checkIn, checkOut, fetchOpenVisit, fetchTodaySchedule } from '../../store/slices/fieldSales/visitSlice';
import { fetchStates, fetchDistricts, fetchCities } from '../../store/slices/fieldSales/collegeSlice';
import { useForm } from 'react-hook-form';
import {
  MapPinIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  ChartBarIcon,
  LightBulbIcon,
  SparklesIcon,
  FireIcon,
  TrophyIcon,
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  BriefcaseIcon,
  PresentationChartLineIcon,
  CubeIcon,
  UserCircleIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon, MapPinIcon as MapPinSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { VisitPurpose, VisitOutcome, CheckOutData } from '../../services/fieldSales/visit.service';

// Contact person interface
interface ContactPerson {
  id: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
}

// Email template types
type EmailTemplateType = 'workshop' | 'drive' | 'training' | 'projects' | 'commercial' | 'crm';

interface EmailTemplate {
  type: EmailTemplateType;
  label: string;
  icon: React.ReactNode;
  subject: string;
  body: string;
  color: string;
}

// Email templates
const emailTemplates: EmailTemplate[] = [
  {
    type: 'workshop',
    label: 'Workshop',
    icon: <PresentationChartLineIcon className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    subject: 'Technical Workshop Proposal - {{collegeName}}',
    body: `Dear {{contactName}},

Thank you for taking the time to meet with us at {{collegeName}}. It was a pleasure discussing how we can contribute to your students' technical development.

As discussed, we would like to propose a Technical Workshop for your students covering:

📌 Workshop Details:
• Duration: 2-3 days
• Topics: Industry-relevant technologies (AI/ML, Web Development, Cloud Computing)
• Mode: On-campus / Hybrid
• Includes: Hands-on projects, Certification, Learning materials

📌 Key Benefits:
• Industry-expert trainers
• Real-world project experience
• Placement assistance
• Certification recognized by top companies

Please find attached our detailed workshop brochure and previous success stories.

Looking forward to your positive response.

Best regards,
{{senderName}}
{{companyName}}`
  },
  {
    type: 'drive',
    label: 'Campus Drive',
    icon: <BriefcaseIcon className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    subject: 'Campus Recruitment Drive Proposal - {{collegeName}}',
    body: `Dear {{contactName}},

Greetings from {{companyName}}!

Following our productive meeting at {{collegeName}}, we are excited to propose a Campus Recruitment Drive for your students.

📌 Drive Details:
• Date: To be mutually decided
• Positions: Software Engineers, Data Analysts, Business Analysts
• Package: As per industry standards
• Eligibility: Final year students (B.Tech/MCA/BCA)

📌 Process:
1. Pre-placement Talk
2. Online Assessment
3. Technical Interview
4. HR Interview

📌 Documents Required:
• Student database with CGPA
• Infrastructure for online test
• Interview rooms

Please find attached our company profile and JD for the positions.

Kindly confirm your interest so we can finalize the dates.

Best regards,
{{senderName}}
{{companyName}}`
  },
  {
    type: 'training',
    label: 'Training Program',
    icon: <AcademicCapIcon className="w-4 h-4" />,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    subject: 'Corporate Training Program Proposal - {{collegeName}}',
    body: `Dear {{contactName}},

Thank you for the wonderful discussion at {{collegeName}} regarding student skill development.

We are pleased to present our Corporate Training Program designed specifically for engineering students:

📌 Program Highlights:
• Duration: 3-6 months
• Technologies: Full Stack Development, Data Science, DevOps
• Mode: Weekend / Regular batches
• Certification: Industry-recognized

📌 Curriculum Includes:
• Core programming fundamentals
• Industry projects
• Soft skills & communication
• Mock interviews & resume building
• 100% placement assistance

📌 Special Offer:
• Early bird discount for bulk registrations
• Free demo session
• Flexible payment options

Please find attached our detailed curriculum and placement records.

Would love to schedule a demo session for your faculty and students.

Best regards,
{{senderName}}
{{companyName}}`
  },
  {
    type: 'projects',
    label: 'Projects',
    icon: <CubeIcon className="w-4 h-4" />,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    subject: 'Mini/Major Project Collaboration - {{collegeName}}',
    body: `Dear {{contactName}},

Thank you for the productive discussion at {{collegeName}} regarding student project opportunities.

We are excited to propose collaboration on Mini and Major Projects for your students:

📌 Mini Projects (2nd/3rd Year):
• Duration: 4-6 weeks
• Technologies: Web Development, Mobile Apps, IoT, Data Analytics
• Deliverables: Working prototype + Documentation
• Mentorship: Industry experts guidance

📌 Major Projects (Final Year):
• Duration: 3-6 months
• Domain: AI/ML, Blockchain, Cloud Computing, Cybersecurity
• Real-world problem statements from industry
• Publication support for research projects
• Internship opportunities for top performers

📌 What We Provide:
• Problem statements from live industry projects
• Technical mentorship & code reviews
• Cloud credits & development tools
• Certificate of completion
• Letter of recommendation for outstanding work

📌 Collaboration Model:
• Batch-wise project allocation
• Weekly progress reviews
• Final presentation & evaluation
• Best project awards

Please share your academic calendar so we can plan the project batches accordingly.

Best regards,
{{senderName}}
{{companyName}}`
  },
  {
    type: 'commercial',
    label: 'Commercial',
    icon: <ChartBarIcon className="w-4 h-4" />,
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    subject: 'Commercial Partnership Proposal - {{collegeName}}',
    body: `Dear {{contactName}},

Following our meeting at {{collegeName}}, I am pleased to share our commercial proposal for the discussed programs.

📌 Program Options:

Option A - Workshop Package:
• 2-day Technical Workshop
• Up to 100 students
• Investment: ₹XX,XXX + GST
• Includes: Certificates, Materials, Refreshments

Option B - Training Program:
• 3-month Skill Development Program
• Per student fee: ₹X,XXX + GST
• Minimum batch: 30 students
• Includes: LMS access, Projects, Certification

Option C - Campus Recruitment:
• No cost to institution
• Placement assistance for eligible students
• Revenue share model (optional)

📌 Payment Terms:
• 50% advance, 50% on completion
• GST as applicable
• Payment within 15 days of invoice

📌 Special Benefits:
• Early bird discount: 10% (valid till XX/XX/XXXX)
• Volume discount for 100+ students
• Free demo session before commitment

Please let us know which option interests you, and we can customize the proposal accordingly.

Best regards,
{{senderName}}
{{companyName}}
{{senderPhone}}`
  },
  {
    type: 'crm',
    label: 'Follow-up',
    icon: <UserCircleIcon className="w-4 h-4" />,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    subject: 'Follow-up: Our Meeting at {{collegeName}}',
    body: `Dear {{contactName}},

I hope this email finds you well.

Thank you for taking the time to meet with me at {{collegeName}} on {{visitDate}}. It was a pleasure learning about your institution's goals and discussing potential collaboration opportunities.

📌 Key Discussion Points:
• {{discussionPoints}}

📌 Action Items:
• {{actionItems}}

📌 Next Steps:
• {{nextSteps}}

Please feel free to reach out if you have any questions or need additional information.

Looking forward to our continued partnership.

Best regards,
{{senderName}}
{{companyName}}
{{senderPhone}}`
  }
];

const visitPurposes: { value: VisitPurpose; label: string; icon: string }[] = [
  { value: 'FIRST_INTRODUCTION', label: 'First Introduction', icon: '👋' },
  { value: 'FOLLOW_UP', label: 'Follow Up', icon: '🔄' },
  { value: 'PRODUCT_DEMO', label: 'Product Demo', icon: '💻' },
  { value: 'PROPOSAL_PRESENTATION', label: 'Proposal', icon: '📋' },
  { value: 'NEGOTIATION', label: 'Negotiation', icon: '🤝' },
  { value: 'AGREEMENT_SIGNING', label: 'Agreement', icon: '✍️' },
  { value: 'RELATIONSHIP_BUILDING', label: 'Relationship', icon: '💬' },
  { value: 'ISSUE_RESOLUTION', label: 'Issue Resolution', icon: '🔧' },
  { value: 'PAYMENT_FOLLOWUP', label: 'Payment', icon: '💰' },
];

const visitOutcomes: {
  value: VisitOutcome;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
}[] = [
  {
    value: 'POSITIVE',
    label: 'Positive',
    description: 'Good response, interested in our services',
    icon: '😊',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-100'
  },
  {
    value: 'NEUTRAL',
    label: 'Neutral',
    description: 'Neither positive nor negative, needs more info',
    icon: '😐',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200 hover:border-slate-400',
    iconBg: 'bg-slate-100'
  },
  {
    value: 'NEGATIVE',
    label: 'Negative',
    description: 'Not interested or bad timing',
    icon: '😞',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200 hover:border-red-400',
    iconBg: 'bg-red-100'
  },
  {
    value: 'DECISION_PENDING',
    label: 'Decision Pending',
    description: 'Waiting for approval from management',
    icon: '⏳',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200 hover:border-amber-400',
    iconBg: 'bg-amber-100'
  },
  {
    value: 'NEED_FOLLOW_UP',
    label: 'Need Follow-up',
    description: 'Requires another visit or call',
    icon: '📞',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-100'
  },
  {
    value: 'DEAL_WON',
    label: 'Deal Won',
    description: 'Agreement signed, deal closed successfully',
    icon: '🎉',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-100'
  },
  {
    value: 'DEAL_LOST',
    label: 'Deal Lost',
    description: 'Deal rejected or went to competitor',
    icon: '❌',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200 hover:border-red-400',
    iconBg: 'bg-red-100'
  },
  {
    value: 'CLOSED_WON',
    label: 'Closed Won',
    description: 'Payment received, project started',
    icon: '✅',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-100'
  },
];

export default function VisitCheckInPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { openVisit, hasOpenVisit, todaySchedule, isCheckingIn, isCheckingOut } = useAppSelector(
    (state) => state.fieldSalesVisits
  );
  const { states, districts, cities, isLoading: isLoadingLocations } = useAppSelector((state) => state.fieldSalesColleges);

  // Location hierarchy state
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [collegeName, setCollegeName] = useState('');

  const [selectedPurpose, setSelectedPurpose] = useState<VisitPurpose>('FIRST_INTRODUCTION');
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<VisitOutcome | ''>('');

  // Contact persons state
  const [contacts, setContacts] = useState<ContactPerson[]>([
    { id: '1', name: '', designation: '', department: '', phone: '', email: '' }
  ]);

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CheckOutData>();

  // Contact management functions
  const addContact = () => {
    setContacts([...contacts, {
      id: Date.now().toString(),
      name: '',
      designation: '',
      department: '',
      phone: '',
      email: ''
    }]);
  };

  const removeContact = (id: string) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const updateContact = (id: string, field: keyof ContactPerson, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Email functions
  const openEmailModal = (templateType: EmailTemplateType) => {
    const template = emailTemplates.find(t => t.type === templateType);
    // Use openVisit.college for checkout view, or collegeName for check-in view
    const collegeDisplayName = openVisit?.college?.name || openVisit?.visitCollegeName || collegeName || '';
    const visitDate = openVisit?.checkInTime ? new Date(openVisit.checkInTime).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    if (template && (openVisit || collegeName)) {
      let subject = template.subject
        .replace('{{collegeName}}', collegeDisplayName);
      let body = template.body
        .replace(/\{\{collegeName\}\}/g, collegeDisplayName)
        .replace(/\{\{contactName\}\}/g, '{{contactName}}')
        .replace(/\{\{visitDate\}\}/g, visitDate)
        .replace(/\{\{senderName\}\}/g, 'Your Name')
        .replace(/\{\{companyName\}\}/g, 'Your Company')
        .replace(/\{\{senderPhone\}\}/g, 'Your Phone')
        .replace(/\{\{discussionPoints\}\}/g, '')
        .replace(/\{\{actionItems\}\}/g, '')
        .replace(/\{\{nextSteps\}\}/g, '');

      setSelectedTemplate(templateType);
      setEmailSubject(subject);
      setEmailBody(body);
      setSelectedContacts(contacts.filter(c => c.email).map(c => c.id));
      setShowEmailModal(true);
    }
  };

  const sendEmail = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Get selected contact emails
      const recipients = contacts.filter(c => selectedContacts.includes(c.id) && c.email);

      // In a real app, this would call an API to send emails
      // For now, we'll simulate with mailto
      for (const contact of recipients) {
        const personalizedBody = emailBody.replace(/\{\{contactName\}\}/g, contact.name || 'Sir/Madam');
        const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(personalizedBody)}`;
        window.open(mailtoLink, '_blank');
      }

      toast.success(`Email prepared for ${recipients.length} contact(s)`);
      setShowEmailModal(false);
    } catch (error) {
      toast.error('Failed to prepare email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  useEffect(() => {
    dispatch(fetchOpenVisit());
    dispatch(fetchTodaySchedule());
    dispatch(fetchStates());
  }, [dispatch]);

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      dispatch(fetchDistricts(selectedState));
      setSelectedDistrict('');
      setSelectedCity('');
      setCollegeName('');
    }
  }, [dispatch, selectedState]);

  // Fetch cities when district changes
  useEffect(() => {
    if (selectedDistrict) {
      dispatch(fetchCities({ state: selectedState, district: selectedDistrict }));
      setSelectedCity('');
      setCollegeName('');
    }
  }, [dispatch, selectedState, selectedDistrict]);

  useEffect(() => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLoadingLocation(false);
        },
        () => {
          setLocationError('Unable to get location');
          setIsLoadingLocation(false);
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  const handleCheckIn = async () => {
    if (!collegeName.trim()) {
      toast.error('Please enter college name');
      return;
    }
    if (!selectedState) {
      toast.error('Please select a state');
      return;
    }
    try {
      await dispatch(
        checkIn({
          collegeName: collegeName.trim(),
          state: selectedState,
          district: selectedDistrict || undefined,
          city: selectedCity || undefined,
          purpose: selectedPurpose,
          latitude: location?.latitude,
          longitude: location?.longitude,
          address: location?.address,
        })
      ).unwrap();
      toast.success('Checked in successfully');
    } catch (error: any) {
      toast.error(error || 'Failed to check in');
    }
  };

  const handleCheckOut = async (data: CheckOutData) => {
    if (!openVisit) return;
    if (!selectedOutcome) {
      toast.error('Please select an outcome');
      return;
    }

    // Format contacts for saving
    const validContacts = contacts.filter(c => c.name.trim());
    const contactsMetString = validContacts.map(c => {
      const parts = [c.name];
      if (c.designation) parts.push(`(${c.designation})`);
      if (c.department) parts.push(`- ${c.department}`);
      return parts.join(' ');
    }).join(', ');

    try {
      await dispatch(
        checkOut({
          visitId: openVisit.id,
          data: {
            outcome: selectedOutcome,
            summary: data.summary,
            contactsMet: contactsMetString,
            actionItems: data.actionItems,
            nextVisitDate: data.nextVisitDate,
            nextAction: data.nextAction,
            // Store full contact details as JSON for future use
            contactDetails: JSON.stringify(validContacts),
          },
        })
      ).unwrap();
      toast.success('Checked out successfully');
      navigate('/field-sales/visits');
    } catch (error: any) {
      toast.error(error || 'Failed to check out');
    }
  };

  // Check if form is valid for check-in
  const isCheckInFormValid = collegeName.trim() && selectedState;

  // ============ CHECK OUT VIEW ============
  if (hasOpenVisit && openVisit) {
    const duration = openVisit.checkInTime
      ? Math.round((new Date().getTime() - new Date(openVisit.checkInTime).getTime()) / 60000)
      : 0;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const checkInDate = openVisit.checkInTime ? new Date(openVisit.checkInTime) : new Date();

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Compact Header */}
        <div className="bg-emerald-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/field-sales/visits')}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  <span className="text-xs text-emerald-100">Active</span>
                </div>
                <h1 className="text-sm font-semibold">{openVisit.college?.name || openVisit.visitCollegeName}</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{checkInDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{openVisit.college?.city || openVisit.visitCity || openVisit.visitState}</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    openVisit.locationVerified ? 'bg-white/20' : 'bg-red-500/50'
                  }`}>
                    <SignalIcon className="w-3 h-3" />
                    <span>{openVisit.locationVerified ? 'GPS' : 'No GPS'}</span>
                  </div>
                </div>
                <div className="border-l border-emerald-400 pl-4">
                  <div className="text-2xl font-bold font-mono">
                    {hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `0:${minutes.toString().padStart(2, '0')}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column - Form */}
            <div className="lg:col-span-8 space-y-4">
              {/* Outcome Selection */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900">Visit Outcome</h2>
                  </div>
                  {selectedOutcome && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${visitOutcomes.find(o => o.value === selectedOutcome)?.bgColor} ${visitOutcomes.find(o => o.value === selectedOutcome)?.color}`}>
                      {visitOutcomes.find(o => o.value === selectedOutcome)?.icon} {visitOutcomes.find(o => o.value === selectedOutcome)?.label}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {visitOutcomes.map((outcome) => (
                      <button
                        key={outcome.value}
                        type="button"
                        onClick={() => setSelectedOutcome(outcome.value)}
                        className={`relative p-3 rounded-lg border-2 transition-all text-left group ${
                          selectedOutcome === outcome.value
                            ? `${outcome.bgColor} ${outcome.borderColor.split(' ')[0]} ring-2 ring-offset-1 ${outcome.bgColor.replace('bg-', 'ring-')}/50`
                            : `bg-white ${outcome.borderColor} hover:shadow-md`
                        }`}
                      >
                        {selectedOutcome === outcome.value && (
                          <div className="absolute top-2 right-2">
                            <CheckCircleSolidIcon className={`w-4 h-4 ${outcome.color}`} />
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className={`text-lg flex-shrink-0`}>{outcome.icon}</span>
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold ${outcome.color} leading-tight`}>{outcome.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight line-clamp-2">{outcome.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Outcome Next Steps */}
                  {selectedOutcome && (
                    <div className={`mt-3 p-3 rounded-lg border ${visitOutcomes.find(o => o.value === selectedOutcome)?.bgColor} ${visitOutcomes.find(o => o.value === selectedOutcome)?.borderColor.split(' ')[0]}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{visitOutcomes.find(o => o.value === selectedOutcome)?.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${visitOutcomes.find(o => o.value === selectedOutcome)?.color}`}>
                            {visitOutcomes.find(o => o.value === selectedOutcome)?.label}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {selectedOutcome === 'POSITIVE' && 'Schedule a follow-up meeting. Send proposal/brochure. Add to hot leads pipeline.'}
                            {selectedOutcome === 'NEUTRAL' && 'Send more information via email. Schedule a call to address concerns. Keep in warm leads.'}
                            {selectedOutcome === 'NEGATIVE' && 'Document reasons for rejection. Consider revisiting after 3-6 months. Move to cold leads.'}
                            {selectedOutcome === 'DECISION_PENDING' && 'Set reminder to follow up. Prepare additional materials if needed. Track decision timeline.'}
                            {selectedOutcome === 'NEED_FOLLOW_UP' && 'Schedule next visit/call immediately. Prepare answers to pending questions. Send requested documents.'}
                            {selectedOutcome === 'DEAL_WON' && 'Congratulations! Initiate onboarding process. Send agreement documents. Notify operations team.'}
                            {selectedOutcome === 'DEAL_LOST' && 'Document loss reasons for analysis. Request feedback if possible. Consider alternative offerings.'}
                            {selectedOutcome === 'CLOSED_WON' && 'Payment confirmed! Start project delivery. Assign account manager. Schedule kickoff meeting.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts Met Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900">People Met</h2>
                    <span className="text-xs text-slate-500">({contacts.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={addContact}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add Contact
                  </button>
                </div>
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {contacts.map((contact, index) => (
                    <div key={contact.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Contact {index + 1}</span>
                        {contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeContact(contact.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Name *"
                          value={contact.name}
                          onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                          className="col-span-2 sm:col-span-1 px-2.5 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        />
                        <input
                          type="text"
                          placeholder="Designation"
                          value={contact.designation}
                          onChange={(e) => updateContact(contact.id, 'designation', e.target.value)}
                          className="px-2.5 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        />
                        <input
                          type="text"
                          placeholder="Department"
                          value={contact.department}
                          onChange={(e) => updateContact(contact.id, 'department', e.target.value)}
                          className="px-2.5 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={contact.phone}
                          onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                          className="px-2.5 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={contact.email}
                          onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                          className="col-span-2 px-2.5 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Form */}
              <form onSubmit={handleSubmit(handleCheckOut)} className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900">Visit Summary</h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        What happened? <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        {...register('summary', { required: 'Summary is required' })}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                        placeholder="Describe what was discussed and key outcomes..."
                      />
                      {errors.summary && <p className="text-red-500 text-xs mt-1">{errors.summary.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        <CheckCircleIcon className="w-3 h-3 inline mr-1 text-slate-400" />
                        Action Items
                      </label>
                      <input
                        {...register('actionItems')}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                        placeholder="Send proposal, Schedule demo, Share brochure"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Next Visit Date</label>
                        <input
                          type="date"
                          {...register('nextVisitDate')}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Next Action</label>
                        <input
                          {...register('nextAction')}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                          placeholder="Send proposal"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedOutcome
                          ? `Outcome: ${visitOutcomes.find(o => o.value === selectedOutcome)?.label}`
                          : 'Select an outcome to continue'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Duration: {hours}h {minutes}m • {contacts.filter(c => c.name).length} contact(s) recorded
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isCheckingOut || !selectedOutcome}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isCheckingOut ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircleSolidIcon className="w-4 h-4" />
                          Check Out
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column - Info */}
            <div className="lg:col-span-4 space-y-3">
              {/* Quick Checklist */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <h3 className="text-xs font-semibold text-slate-900">Before Checkout</h3>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${selectedOutcome ? 'bg-emerald-100 border-emerald-300' : 'border-slate-300'}`}>
                      {selectedOutcome && <CheckCircleSolidIcon className="w-3 h-3 text-emerald-600" />}
                    </span>
                    <span className={selectedOutcome ? 'text-slate-900' : 'text-slate-500'}>Select outcome</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${contacts.some(c => c.name) ? 'bg-emerald-100 border-emerald-300' : 'border-slate-300'}`}>
                      {contacts.some(c => c.name) && <CheckCircleSolidIcon className="w-3 h-3 text-emerald-600" />}
                    </span>
                    <span className={contacts.some(c => c.name) ? 'text-slate-900' : 'text-slate-500'}>Add contact details</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${contacts.some(c => c.email) ? 'bg-emerald-100 border-emerald-300' : 'border-slate-300'}`}>
                      {contacts.some(c => c.email) && <CheckCircleSolidIcon className="w-3 h-3 text-emerald-600" />}
                    </span>
                    <span className={contacts.some(c => c.email) ? 'text-slate-900' : 'text-slate-500'}>Include email address</span>
                  </li>
                </ul>
              </div>

              {/* Email Templates */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <EnvelopeIcon className="w-3.5 h-3.5 text-blue-500" />
                    <h3 className="text-xs font-semibold text-slate-900">Send Email</h3>
                  </div>
                  <span className="text-xs text-slate-400">{contacts.filter(c => c.email).length} with email</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.type}
                      type="button"
                      onClick={() => openEmailModal(template.type)}
                      disabled={contacts.filter(c => c.email).length === 0}
                      className={`flex items-center gap-1.5 px-2 py-1.5 text-left text-xs rounded border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm ${template.color}`}
                    >
                      {template.icon}
                      <span className="truncate">{template.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Preview */}
              {contacts.filter(c => c.name).length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <UserGroupIcon className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-xs font-semibold text-slate-900">Contacts Added</h3>
                  </div>
                  <div className="space-y-1.5">
                    {contacts.filter(c => c.name).map((contact, idx) => (
                      <div key={contact.id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium text-[10px]">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-900">{contact.name}</span>
                          {contact.designation && <span className="text-slate-400"> • {contact.designation}</span>}
                        </div>
                        {contact.email && <EnvelopeIcon className="w-3 h-3 text-emerald-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <LightBulbIcon className="w-3.5 h-3.5 text-amber-600" />
                  <h3 className="text-xs font-semibold text-amber-900">Tips</h3>
                </div>
                <ul className="space-y-1 text-xs text-amber-800">
                  <li>• Collect decision maker's contact</li>
                  <li>• Add email for follow-up campaigns</li>
                  <li>• Note department for targeting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${emailTemplates.find(t => t.type === selectedTemplate)?.color || ''}`}>
                    {emailTemplates.find(t => t.type === selectedTemplate)?.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {emailTemplates.find(t => t.type === selectedTemplate)?.label} Email
                  </h3>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Select Recipients */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Select Recipients ({selectedContacts.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {contacts.filter(c => c.email).map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => toggleContactSelection(contact.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all ${
                          selectedContacts.includes(contact.id)
                            ? 'bg-primary-100 border-primary-300 text-primary-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedContacts.includes(contact.id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-slate-300'
                        }`}>
                          {selectedContacts.includes(contact.id) && (
                            <CheckCircleSolidIcon className="w-3 h-3 text-white" />
                          )}
                        </span>
                        <span className="font-medium">{contact.name || 'Unnamed'}</span>
                        <span className="text-slate-400">({contact.email})</span>
                      </button>
                    ))}
                    {contacts.filter(c => c.email).length === 0 && (
                      <p className="text-xs text-slate-500">No contacts with email address</p>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                {/* Body */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email Body</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none font-mono"
                  />
                </div>

                {/* Attachments hint */}
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <PaperClipIcon className="w-4 h-4 flex-shrink-0" />
                  <span>You can attach documents (brochures, proposals) from your email client after clicking send.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.type}
                      type="button"
                      onClick={() => {
                        const t = emailTemplates.find(et => et.type === template.type);
                        if (t && openVisit) {
                          setSelectedTemplate(template.type);
                          setEmailSubject(t.subject.replace('{{collegeName}}', openVisit.college?.name || ''));
                          setEmailBody(t.body
                            .replace(/\{\{collegeName\}\}/g, openVisit.college?.name || '')
                            .replace(/\{\{visitDate\}\}/g, new Date(openVisit.checkInTime || '').toLocaleDateString('en-IN'))
                            .replace(/\{\{senderName\}\}/g, 'Your Name')
                            .replace(/\{\{companyName\}\}/g, 'Your Company')
                            .replace(/\{\{senderPhone\}\}/g, 'Your Phone')
                            .replace(/\{\{discussionPoints\}\}/g, '')
                            .replace(/\{\{actionItems\}\}/g, '')
                            .replace(/\{\{nextSteps\}\}/g, '')
                          );
                        }
                      }}
                      className={`p-1.5 rounded border transition-all ${
                        selectedTemplate === template.type
                          ? template.color + ' ring-2 ring-offset-1'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      title={template.label}
                    >
                      {template.icon}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={sendEmail}
                    disabled={isSendingEmail || selectedContacts.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Preparing...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ CHECK IN VIEW ============
  // Get current time info
  const now = new Date();
  const currentHour = now.getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const currentDate = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Stats calculations
  const completedToday = todaySchedule?.completedCount || 0;
  const scheduledToday = todaySchedule?.scheduledVisits?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Green Header */}
      <div className="bg-emerald-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/field-sales/visits')}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-sm font-semibold">Field Visit</h1>
                <p className="text-emerald-200 text-[11px]">{greeting} • {currentDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 bg-white/10 rounded">{completedToday} done</span>
                <span className="px-2 py-0.5 bg-white/10 rounded">{scheduledToday} scheduled</span>
                <span className="font-mono font-semibold">{currentTime}</span>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${location ? 'bg-white/20' : 'bg-amber-500/50'}`}>
                  {isLoadingLocation ? (
                    <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : location ? (
                    <SignalIcon className="w-3 h-3" />
                  ) : (
                    <ExclamationTriangleIcon className="w-3 h-3" />
                  )}
                  <span className="text-[10px]">{location ? 'GPS' : 'No GPS'}</span>
                </div>
              </div>
              <button
                onClick={handleCheckIn}
                disabled={!isCheckInFormValid || isCheckingIn}
                className="px-4 py-1.5 bg-white hover:bg-slate-50 text-emerald-600 text-xs font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isCheckingIn ? (
                  <>
                    <div className="w-3 h-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <MapPinSolidIcon className="w-3.5 h-3.5" />
                    Start Visit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-8 space-y-3">
            {/* Location & College Selection Card */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-semibold text-slate-900">Visit Location</h2>
                </div>
                {isLoadingLocations && (
                  <div className="w-3 h-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                )}
              </div>
              <div className="p-3 space-y-3">
                {/* Location Hierarchy Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* State Dropdown */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">State *</label>
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1em 1em',
                      }}
                    >
                      <option value="">Select State</option>
                      {states.map((s) => (
                        <option key={s.state} value={s.state}>
                          {s.state}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District Dropdown */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">District</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      disabled={!selectedState}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1em 1em',
                      }}
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d.district} value={d.district}>
                          {d.district}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City Dropdown */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">City</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!selectedDistrict}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1em 1em',
                      }}
                    >
                      <option value="">Select City</option>
                      {cities.map((c) => (
                        <option key={c.city} value={c.city}>
                          {c.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* College Name Input */}
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-1">College Name *</label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Enter college/institution name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                {/* Selected Location Preview */}
                {(selectedState || collegeName) && (
                  <div className="p-2.5 bg-emerald-50 rounded border border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-emerald-600 rounded flex items-center justify-center text-white font-semibold text-xs">
                        {collegeName ? collegeName.substring(0, 2).toUpperCase() : 'NA'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-slate-900 truncate">
                          {collegeName || 'Enter college name'}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {selectedCity && (
                            <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                              <MapPinIcon className="w-3 h-3" />
                              {selectedCity}
                            </span>
                          )}
                          {selectedDistrict && (
                            <span className="text-[10px] text-slate-600">
                              {selectedDistrict}
                            </span>
                          )}
                          {selectedState && (
                            <span className="text-[10px] text-emerald-600 font-medium">
                              {selectedState}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Purpose Selection Card */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-semibold text-slate-900">Visit Purpose</h2>
                </div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {visitPurposes.map((purpose) => (
                    <button
                      key={purpose.value}
                      type="button"
                      onClick={() => setSelectedPurpose(purpose.value)}
                      className={`relative p-2 rounded border transition-all text-center ${
                        selectedPurpose === purpose.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base block">{purpose.icon}</span>
                      <span className={`text-[10px] font-medium block mt-0.5 leading-tight ${
                        selectedPurpose === purpose.value ? 'text-emerald-700' : 'text-slate-600'
                      }`}>
                        {purpose.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Person Details */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-4 h-4 text-purple-600" />
                  <h2 className="text-xs font-semibold text-slate-900">Contact Person Details</h2>
                  <span className="text-[10px] text-slate-500">({contacts.length})</span>
                </div>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                >
                  <PlusIcon className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {contacts.map((contact, index) => (
                  <div key={contact.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-medium text-slate-500">Person {index + 1}</span>
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="p-0.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Name *"
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      <input
                        type="text"
                        placeholder="Designation"
                        value={contact.designation}
                        onChange={(e) => updateContact(contact.id, 'designation', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      <input
                        type="text"
                        placeholder="Department"
                        value={contact.department}
                        onChange={(e) => updateContact(contact.id, 'department', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={contact.email}
                        onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                        className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Templates */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-semibold text-slate-900">Send Email</h2>
                </div>
                <span className="text-[10px] text-slate-500">{contacts.filter(c => c.email).length} with email</span>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.type}
                      type="button"
                      onClick={() => openEmailModal(template.type)}
                      disabled={contacts.filter(c => c.email).length === 0}
                      className={`flex flex-col items-center gap-1 p-2 text-center rounded border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm active:scale-95 ${template.color}`}
                    >
                      {template.icon}
                      <span className="text-[9px] font-medium leading-tight">{template.label}</span>
                    </button>
                  ))}
                </div>
                {contacts.filter(c => c.email).length === 0 && (
                  <p className="text-[10px] text-slate-500 text-center mt-2">Add contact email to send</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Column - Side Info */}
          <div className="lg:col-span-4 space-y-3">
            {/* GPS Status Card */}
            <div className={`rounded-lg p-2.5 border ${
              location
                ? 'bg-emerald-50 border-emerald-200'
                : locationError
                ? 'bg-amber-50 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  location ? 'bg-emerald-500' : locationError ? 'bg-amber-500' : 'bg-slate-400'
                }`}>
                  {isLoadingLocation ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <MapPinSolidIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${location ? 'text-emerald-900' : locationError ? 'text-amber-900' : 'text-slate-700'}`}>
                    {isLoadingLocation ? 'Getting Location...' : location ? 'Location Ready' : 'GPS Unavailable'}
                  </p>
                  {location && (
                    <p className="text-[10px] text-emerald-700 font-mono truncate">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Schedule Card */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-2.5 py-2 bg-amber-50 border-b border-amber-100">
                <h3 className="text-[10px] font-semibold text-slate-900 flex items-center gap-1.5">
                  <CalendarDaysIcon className="w-3.5 h-3.5 text-amber-600" />
                  Today's Schedule
                </h3>
              </div>
              <div className="p-1.5 max-h-40 overflow-y-auto">
                {todaySchedule?.scheduledVisits && todaySchedule.scheduledVisits.length > 0 ? (
                  <div className="space-y-1">
                    {todaySchedule.scheduledVisits.map((visit: any) => (
                      <button
                        key={visit.id}
                        onClick={() => {
                          setCollegeName(visit.name || '');
                          if (visit.state) setSelectedState(visit.state);
                          if (visit.city) setSelectedCity(visit.city);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded transition-all flex items-center gap-2 ${
                          collegeName === visit.name
                            ? 'bg-amber-500 text-white'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold ${
                          collegeName === visit.name
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {visit.name?.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate">{visit.name}</p>
                          <p className={`text-[9px] ${collegeName === visit.name ? 'text-amber-100' : 'text-slate-500'}`}>
                            {visit.city}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-slate-400">
                    <CalendarDaysIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                    <p className="text-[10px]">No scheduled visits</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips Card */}
            <div className="bg-indigo-600 rounded-lg p-2.5 text-white">
              <div className="flex items-center gap-1.5 mb-2">
                <LightBulbIcon className="w-3.5 h-3.5" />
                <h3 className="text-[10px] font-semibold">Quick Tips</h3>
              </div>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-1.5 text-[10px] text-indigo-100">
                  <SparklesIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Prepare your pitch beforehand</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] text-indigo-100">
                  <FireIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Understand their needs first</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] text-indigo-100">
                  <TrophyIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Collect decision maker contacts</span>
                </li>
              </ul>
            </div>

            {/* Performance Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-2.5">
              <h3 className="text-[10px] font-semibold text-slate-900 mb-2">Performance</h3>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500">This Week</span>
                    <span className="font-medium text-slate-700">{completedToday * 5}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500">This Month</span>
                    <span className="font-medium text-slate-700">{completedToday * 20}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${emailTemplates.find(t => t.type === selectedTemplate)?.color || ''}`}>
                  {emailTemplates.find(t => t.type === selectedTemplate)?.icon}
                </div>
                <h3 className="text-xs font-semibold text-slate-900">
                  {emailTemplates.find(t => t.type === selectedTemplate)?.label} Email
                </h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Select Recipients */}
              <div className="mb-3">
                <label className="block text-[10px] font-medium text-slate-700 mb-1.5">
                  Recipients ({selectedContacts.length} selected)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {contacts.filter(c => c.email).map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleContactSelection(contact.id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-all ${
                        selectedContacts.includes(contact.id)
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        selectedContacts.includes(contact.id)
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-slate-300'
                      }`}>
                        {selectedContacts.includes(contact.id) && (
                          <CheckCircleSolidIcon className="w-2 h-2 text-white" />
                        )}
                      </span>
                      <span className="font-medium">{contact.name || 'Unnamed'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="mb-3">
                <label className="block text-[10px] font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              {/* Body */}
              <div className="mb-3">
                <label className="block text-[10px] font-medium text-slate-700 mb-1">Email Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none font-mono"
                />
              </div>

              {/* Template switcher */}
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] text-slate-500">Switch template:</span>
                {emailTemplates.map((template) => (
                  <button
                    key={template.type}
                    type="button"
                    onClick={() => {
                      const collegeDisplayName = openVisit?.college?.name || openVisit?.visitCollegeName || collegeName || '';
                      const visitDate = openVisit?.checkInTime ? new Date(openVisit.checkInTime).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
                      setSelectedTemplate(template.type);
                      setEmailSubject(template.subject.replace('{{collegeName}}', collegeDisplayName));
                      setEmailBody(template.body
                        .replace(/\{\{collegeName\}\}/g, collegeDisplayName)
                        .replace(/\{\{visitDate\}\}/g, visitDate)
                        .replace(/\{\{senderName\}\}/g, 'Your Name')
                        .replace(/\{\{companyName\}\}/g, 'Your Company')
                        .replace(/\{\{senderPhone\}\}/g, 'Your Phone')
                        .replace(/\{\{discussionPoints\}\}/g, '')
                        .replace(/\{\{actionItems\}\}/g, '')
                        .replace(/\{\{nextSteps\}\}/g, '')
                      );
                    }}
                    className={`p-1 rounded border transition-all ${
                      selectedTemplate === template.type
                        ? template.color + ' ring-1 ring-offset-1'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    title={template.label}
                  >
                    {template.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-3 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendEmail}
                disabled={isSendingEmail || selectedContacts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-3.5 h-3.5" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
