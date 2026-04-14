import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  KeyIcon,
  CubeIcon,
  Cog6ToothIcon,
  CalendarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UsersIcon,
  BookOpenIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface ScraperTemplate {
  type: string;
  name: string;
  description: string;
  actorId: string;
  icon: string;
  color: string;
  inputFields: InputField[];
}

interface InputField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'array' | 'select';
  placeholder?: string;
  default?: any;
  options?: string[];
}

const CRM_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'country', label: 'Country' },
  { key: 'industry', label: 'Industry' },
  { key: 'customFields.title', label: 'Job Title (Custom)' },
  { key: 'customFields.linkedinUrl', label: 'LinkedIn URL (Custom)' },
  { key: 'customFields.rating', label: 'Rating (Custom)' },
  { key: 'customFields.reviewsCount', label: 'Reviews Count (Custom)' },
];

const SCHEDULE_OPTIONS = [
  { value: 'HOURLY', label: 'Every Hour' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const steps = [
  { id: 1, name: 'Connect Account', icon: KeyIcon },
  { id: 2, name: 'Select Scraper', icon: CubeIcon },
  { id: 3, name: 'Configure Input', icon: Cog6ToothIcon },
  { id: 4, name: 'Field Mapping', icon: WrenchScrewdriverIcon },
  { id: 5, name: 'Schedule', icon: CalendarIcon },
];

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    'map-pin': MapPinIcon,
    'building-office': BuildingOfficeIcon,
    'users': UsersIcon,
    'book-open': BookOpenIcon,
    'cog': WrenchScrewdriverIcon,
  };
  return icons[iconName] || WrenchScrewdriverIcon;
};

export default function ApifySetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: API Token
  const [apiToken, setApiToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [existingIntegration, setExistingIntegration] = useState<any>(null);

  // Step 2: Select Scraper
  const [templates, setTemplates] = useState<ScraperTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ScraperTemplate | null>(null);

  // Step 3: Configure Input
  const [inputConfig, setInputConfig] = useState<Record<string, any>>({});
  const [scraperName, setScraperName] = useState('');

  // Step 4: Field Mapping
  const [defaultMapping, setDefaultMapping] = useState<Record<string, string>>({});
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // Step 5: Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState('DAILY');

  const [isSaving, setIsSaving] = useState(false);

  // Load existing integration and templates on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load existing integration
        const integrationRes = await api.get('/apify/integration');
        if (integrationRes.data.data) {
          setExistingIntegration(integrationRes.data.data);
          setConnectionValid(true);
          setCurrentStep(2); // Skip to step 2 if already connected
        }

        // Load templates
        const templatesRes = await api.get('/apify/scraper-templates');
        setTemplates(templatesRes.data.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  // Load default field mapping when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const loadFieldMapping = async () => {
        try {
          const res = await api.get(`/apify/field-mappings/${selectedTemplate.type}`);
          const mapping = res.data.data || {};
          setDefaultMapping(mapping);
          setFieldMapping(mapping);
        } catch (error) {
          console.error('Error loading field mapping:', error);
        }
      };
      loadFieldMapping();

      // Set default input config
      const defaults: Record<string, any> = {};
      selectedTemplate.inputFields.forEach(field => {
        if (field.default !== undefined) {
          defaults[field.key] = field.default;
        }
      });
      setInputConfig(defaults);
      setScraperName(`${selectedTemplate.name} - ${new Date().toLocaleDateString()}`);
    }
  }, [selectedTemplate]);

  const testConnection = async () => {
    if (!apiToken.trim()) {
      toast.error('Please enter an API token');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await api.post('/apify/test-connection', { apiToken });
      const data = response.data.data;

      if (data.user) {
        setConnectionValid(true);
        setUserInfo(data.user);
        toast.success(`Connected as ${data.user.username}`);

        // Save the integration
        await api.post('/apify/integration', { apiToken });
        setExistingIntegration({ apiToken });
      } else {
        setConnectionValid(false);
        toast.error('Invalid API token');
      }
    } catch (error: any) {
      setConnectionValid(false);
      toast.error(error.response?.data?.message || 'Connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setInputConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayInputChange = (key: string, value: string) => {
    // Convert comma-separated string to array
    const arr = value.split('\n').map(s => s.trim()).filter(s => s);
    setInputConfig(prev => ({ ...prev, [key]: arr }));
  };

  const handleFieldMappingChange = (sourceField: string, targetField: string) => {
    setFieldMapping(prev => {
      const newMapping = { ...prev };
      if (targetField) {
        newMapping[sourceField] = targetField;
      } else {
        delete newMapping[sourceField];
      }
      return newMapping;
    });
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a scraper type');
      return;
    }

    if (!scraperName.trim()) {
      toast.error('Please enter a name for this scraper');
      return;
    }

    setIsSaving(true);
    try {
      const actorId = selectedTemplate.type === 'CUSTOM'
        ? inputConfig.actorId
        : selectedTemplate.actorId;

      if (!actorId) {
        toast.error('Please specify an Actor ID');
        setIsSaving(false);
        return;
      }

      await api.post('/apify/scrapers', {
        name: scraperName,
        scraperType: selectedTemplate.type,
        actorId,
        inputConfig,
        fieldMapping,
        scheduleEnabled,
        scheduleInterval: scheduleEnabled ? scheduleInterval : 'DAILY',
      });

      toast.success('Scraper configuration saved!');
      navigate('/apify-dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return connectionValid || existingIntegration;
      case 2:
        return selectedTemplate !== null;
      case 3:
        return scraperName.trim() !== '';
      case 4:
        return Object.keys(fieldMapping).length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900">Connect Your Apify Account</h3>
        <p className="mt-1 text-xs text-gray-500">
          Enter your Apify API token to connect your account. You can find it in your{' '}
          <a
            href="https://console.apify.com/account/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700"
          >
            Apify Console &rarr; Settings &rarr; Integrations
          </a>
        </p>
      </div>

      {existingIntegration ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Already Connected</p>
              <p className="text-xs text-emerald-600">
                Your Apify integration is configured. You can proceed to create a scraper.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              API Token
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="flex-1 text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="apify_api_..."
              />
              <button
                onClick={testConnection}
                disabled={isTestingConnection || !apiToken.trim()}
                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {connectionValid && userInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Connected as {userInfo.username}
                  </p>
                  <p className="text-xs text-emerald-600">{userInfo.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900">Select Scraper Type</h3>
        <p className="mt-1 text-xs text-gray-500">
          Choose the type of data you want to scrape. Each scraper is optimized for specific platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template) => {
          const IconComponent = getIconComponent(template.icon);
          const isSelected = selectedTemplate?.type === template.type;

          return (
            <button
              key={template.type}
              onClick={() => setSelectedTemplate(template)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <IconComponent
                    className="h-4 w-4"
                    style={{ color: template.color }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                    {isSelected && (
                      <CheckIcon className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (!selectedTemplate) return null;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Configure {selectedTemplate.name}</h3>
          <p className="mt-1 text-xs text-gray-500">
            Set up the input parameters for your scraper.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Scraper Name *
            </label>
            <input
              type="text"
              value={scraperName}
              onChange={(e) => setScraperName(e.target.value)}
              className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="My Google Maps Scraper"
            />
          </div>

          {selectedTemplate.inputFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {field.type === 'array' ? (
                <textarea
                  value={(inputConfig[field.key] || []).join('\n')}
                  onChange={(e) => handleArrayInputChange(field.key, e.target.value)}
                  rows={3}
                  className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder={`${field.placeholder}\n(One per line)`}
                />
              ) : field.type === 'select' ? (
                <select
                  value={inputConfig[field.key] || field.default || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={inputConfig[field.key] || field.default || ''}
                  onChange={(e) => handleInputChange(field.key, parseInt(e.target.value) || 0)}
                  className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  type="text"
                  value={inputConfig[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const sourceFields = Object.keys(defaultMapping);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Field Mapping</h3>
          <p className="mt-1 text-xs text-gray-500">
            Map scraped data fields to your CRM fields. The default mapping is optimized for this scraper type.
          </p>
        </div>

        <div className="space-y-2">
          {sourceFields.length > 0 ? (
            sourceFields.map((sourceField) => (
              <div key={sourceField} className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700">
                    {sourceField}
                  </label>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <select
                    value={fieldMapping[sourceField] || ''}
                    onChange={(e) => handleFieldMappingChange(sourceField, e.target.value)}
                    className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  >
                    <option value="">-- Skip --</option>
                    {CRM_FIELDS.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p className="text-xs">No default field mapping available for this scraper type.</p>
              <p className="text-xs mt-1">
                Fields will be imported as custom fields automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900">Schedule (Optional)</h3>
        <p className="mt-1 text-xs text-gray-500">
          Set up automatic recurring scrapes to keep your leads fresh.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="scheduleEnabled"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
          />
          <label htmlFor="scheduleEnabled" className="text-xs font-medium text-gray-700">
            Enable scheduled scraping
          </label>
        </div>

        {scheduleEnabled && (
          <div className="ml-6 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={scheduleInterval}
                onChange={(e) => setScheduleInterval(e.target.value)}
                className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                {SCHEDULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <p className="text-xs text-amber-800">
                Scheduled scrapes will automatically import new leads to your Raw Imports.
                Make sure your Apify account has sufficient compute units.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-500">Scraper Name:</dt>
            <dd className="font-medium">{scraperName || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Type:</dt>
            <dd className="font-medium">{selectedTemplate?.name || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Schedule:</dt>
            <dd className="font-medium">
              {scheduleEnabled
                ? SCHEDULE_OPTIONS.find(o => o.value === scheduleInterval)?.label
                : 'Manual only'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Field Mappings:</dt>
            <dd className="font-medium">{Object.keys(fieldMapping).length} configured</dd>
          </div>
        </dl>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/ad-integrations')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Integrations
        </button>
        <h1 className="text-lg font-bold text-gray-900">Set Up Apify Web Scraping</h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure automated lead scraping from Google Maps, LinkedIn, and more.
        </p>
      </div>

      {/* Steps */}
      <nav className="mb-6">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 ${
                  currentStep >= step.id
                    ? 'text-emerald-600'
                    : 'text-gray-400'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    currentStep > step.id
                      ? 'bg-emerald-600 border-emerald-600'
                      : currentStep === step.id
                      ? 'border-emerald-600'
                      : 'border-gray-300'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckIcon className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <step.icon
                      className={`h-3 w-3 ${
                        currentStep === step.id ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    />
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:inline">
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-8 h-0.5 mx-1.5 ${
                    currentStep > step.id ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeftIcon className="h-3 w-3" />
          Previous
        </button>

        {currentStep < steps.length ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving || !canProceed()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Create Scraper'}
            <CheckCircleIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
