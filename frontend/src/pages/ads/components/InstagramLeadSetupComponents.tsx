/**
 * Instagram Lead Setup Components
 * Step components and progress stepper
 */

import React from 'react';
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import {
  FacebookPage,
  LeadForm,
  FormField,
  FieldMapping,
  WebhookInfo,
} from '../instagram-lead-setup.types';
import { CRM_FIELDS, SETUP_STEPS } from '../instagram-lead-setup.constants';

// Progress Stepper
interface ProgressStepperProps {
  currentStep: number;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStep }) => (
  <div className="mb-8">
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {SETUP_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={`relative ${index !== SETUP_STEPS.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}
          >
            <div className="flex items-center">
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                  currentStep > step.id
                    ? 'bg-primary-600'
                    : currentStep === step.id
                    ? 'border-2 border-primary-600 bg-white'
                    : 'border-2 border-slate-300 bg-white'
                }`}
              >
                {currentStep > step.id ? (
                  <CheckIcon className="h-5 w-5 text-white" />
                ) : (
                  <step.icon
                    className={`h-5 w-5 ${
                      currentStep === step.id ? 'text-primary-600' : 'text-slate-400'
                    }`}
                  />
                )}
              </div>
              <span
                className={`ml-3 text-sm font-medium ${
                  currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                {step.name}
              </span>
            </div>
            {index !== SETUP_STEPS.length - 1 && (
              <div
                className={`absolute top-5 left-10 w-full h-0.5 ${
                  currentStep > step.id ? 'bg-primary-600' : 'bg-slate-300'
                }`}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  </div>
);

// Step 1: Connect Account
interface ConnectAccountStepProps {
  accessToken: string;
  setAccessToken: (token: string) => void;
  isTestingConnection: boolean;
  connectionValid: boolean;
  setConnectionValid: (valid: boolean) => void;
  pages: FacebookPage[];
  onTestConnection: () => void;
}

export const ConnectAccountStep: React.FC<ConnectAccountStepProps> = ({
  accessToken,
  setAccessToken,
  isTestingConnection,
  connectionValid,
  setConnectionValid,
  pages,
  onTestConnection,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Connect Your Facebook/Instagram Account
      </h3>
      <p className="text-slate-600 mb-4">
        Enter your Facebook Page Access Token to connect your Instagram Business Account. You can get
        this from the{' '}
        <a
          href="https://developers.facebook.com/tools/explorer/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          Facebook Graph API Explorer
        </a>
        .
      </p>
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Required Permissions</p>
          <p className="text-sm text-amber-700 mt-1">
            Your access token needs: <code className="bg-amber-100 px-1 rounded">pages_show_list</code>
            , <code className="bg-amber-100 px-1 rounded">leads_retrieval</code>,{' '}
            <code className="bg-amber-100 px-1 rounded">pages_manage_metadata</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Access Token</label>
      <div className="flex gap-3">
        <input
          type="password"
          value={accessToken}
          onChange={(e) => {
            setAccessToken(e.target.value);
            setConnectionValid(false);
          }}
          className="input flex-1"
          placeholder="Enter your Facebook Page access token"
        />
        <button
          onClick={onTestConnection}
          disabled={isTestingConnection || !accessToken.trim()}
          className="btn btn-primary whitespace-nowrap"
        >
          {isTestingConnection ? (
            <span className="spinner"></span>
          ) : connectionValid ? (
            <>
              <CheckCircleIcon className="w-4 h-4" />
              Connected
            </>
          ) : (
            'Test Connection'
          )}
        </button>
      </div>
    </div>

    {connectionValid && pages.length > 0 && (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
          <CheckCircleIcon className="w-5 h-5" />
          Connection Successful
        </div>
        <p className="text-sm text-green-700">
          Found {pages.length} Facebook page(s). Click "Next" to select a page and lead forms.
        </p>
      </div>
    )}
  </div>
);

// Step 2: Select Page & Forms
interface SelectPageFormsStepProps {
  pages: FacebookPage[];
  selectedPage: FacebookPage | null;
  setSelectedPage: (page: FacebookPage | null) => void;
  forms: LeadForm[];
  selectedForms: string[];
  setSelectedForms: (forms: string[]) => void;
  isLoadingForms: boolean;
}

export const SelectPageFormsStep: React.FC<SelectPageFormsStepProps> = ({
  pages,
  selectedPage,
  setSelectedPage,
  forms,
  selectedForms,
  setSelectedForms,
  isLoadingForms,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Page & Lead Forms</h3>
      <p className="text-slate-600 mb-4">
        Choose the Facebook Page with your Instagram Business Account and select the lead forms to
        track.
      </p>
    </div>

    {/* Page Selection */}
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Facebook Page</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => setSelectedPage(page)}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              selectedPage?.id === page.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="font-medium text-slate-900">{page.name}</p>
            <p className="text-sm text-slate-500">ID: {page.id}</p>
            {page.hasInstagram && page.instagramAccount && (
              <div className="flex items-center gap-2 mt-2 text-pink-600">
                <span className="text-xs font-medium bg-pink-100 px-2 py-0.5 rounded">
                  @{page.instagramAccount.username}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Lead Forms */}
    {selectedPage && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">Lead Forms</label>
          {isLoadingForms && <span className="spinner spinner-sm"></span>}
        </div>

        {forms.length === 0 && !isLoadingForms ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-slate-600 mt-2">No lead forms found for this page</p>
            <p className="text-sm text-slate-500">Create lead forms in Facebook Ads Manager</p>
          </div>
        ) : (
          <div className="space-y-2">
            {forms.map((form) => (
              <label
                key={form.id}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedForms.includes(form.id)
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedForms.includes(form.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForms([...selectedForms, form.id]);
                      } else {
                        setSelectedForms(selectedForms.filter((id) => id !== form.id));
                      }
                    }}
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{form.name}</p>
                    <p className="text-sm text-slate-500">
                      {form.leads_count || 0} leads | {form.status}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{form.id}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

// Step 3: Field Mapping
interface FieldMappingStepProps {
  formFields: FormField[];
  fieldMapping: FieldMapping;
  setFieldMapping: (mapping: FieldMapping) => void;
}

export const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  formFields,
  fieldMapping,
  setFieldMapping,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Map Form Fields to CRM</h3>
      <p className="text-slate-600 mb-4">
        Match your lead form fields to the corresponding CRM fields. Common fields are auto-mapped.
      </p>
    </div>

    {formFields.length === 0 ? (
      <div className="text-center py-8 bg-slate-50 rounded-lg">
        <Cog6ToothIcon className="w-12 h-12 mx-auto text-slate-300" />
        <p className="text-slate-600 mt-2">Loading form fields...</p>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200">
          <div className="text-sm font-medium text-slate-700">Form Field</div>
          <div className="text-sm font-medium text-slate-700">CRM Field</div>
        </div>
        {formFields.map((field) => (
          <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
            <div>
              <p className="font-medium text-slate-900">{field.label}</p>
              <p className="text-sm text-slate-500">{field.key}</p>
            </div>
            <select
              value={fieldMapping[field.key] || ''}
              onChange={(e) => {
                setFieldMapping({
                  ...fieldMapping,
                  [field.key]: e.target.value,
                });
              }}
              className="input"
            >
              <option value="">-- Do not map --</option>
              {CRM_FIELDS.map((crmField) => (
                <option key={crmField.key} value={crmField.key}>
                  {crmField.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    )}

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-800">
        <strong>Tip:</strong> Unmapped fields will be stored in the lead's custom fields and can be
        viewed in the lead details.
      </p>
    </div>
  </div>
);

// Step 4: Webhook Setup
interface WebhookSetupStepProps {
  webhookInfo: WebhookInfo | null;
  onCopyToClipboard: (text: string) => void;
}

export const WebhookSetupStep: React.FC<WebhookSetupStepProps> = ({
  webhookInfo,
  onCopyToClipboard,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Configure Webhook in Facebook</h3>
      <p className="text-slate-600 mb-4">
        Set up a webhook in Facebook Business Manager to receive leads in real-time.
      </p>
    </div>

    {webhookInfo && (
      <>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Webhook URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookInfo.webhookUrl}
                className="input flex-1 bg-slate-50"
              />
              <button
                onClick={() => onCopyToClipboard(webhookInfo.webhookUrl)}
                className="btn btn-secondary"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Verify Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookInfo.verifyToken}
                className="input flex-1 bg-slate-50"
              />
              <button
                onClick={() => onCopyToClipboard(webhookInfo.verifyToken)}
                className="btn btn-secondary"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-3">Setup Instructions</h4>
          <ol className="space-y-2">
            {webhookInfo.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                {instruction}
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
            <CheckCircleIcon className="w-5 h-5" />
            Ready to Save
          </div>
          <p className="text-sm text-green-700">
            Your integration is configured. Click "Complete Setup" to save and start receiving leads.
          </p>
        </div>
      </>
    )}
  </div>
);

// Navigation Footer
interface NavigationFooterProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  canProceed: boolean;
  isSaving: boolean;
  onNext: () => void;
}

export const NavigationFooter: React.FC<NavigationFooterProps> = ({
  currentStep,
  setCurrentStep,
  canProceed,
  isSaving,
  onNext,
}) => (
  <div className="card-footer flex justify-between">
    <button
      onClick={() => setCurrentStep(currentStep - 1)}
      disabled={currentStep === 1}
      className="btn btn-secondary"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      Back
    </button>
    <button onClick={onNext} disabled={!canProceed || isSaving} className="btn btn-primary">
      {isSaving ? (
        <span className="spinner"></span>
      ) : currentStep === 4 ? (
        <>
          <CheckCircleIcon className="w-4 h-4" />
          Complete Setup
        </>
      ) : (
        <>
          Next
          <ArrowRightIcon className="w-4 h-4" />
        </>
      )}
    </button>
  </div>
);
