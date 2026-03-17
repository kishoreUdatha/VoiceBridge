/**
 * Instagram Lead Setup Page
 * Connect Instagram Business Account to automatically capture leads
 */

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useInstagramLeadSetup } from './hooks';
import {
  ProgressStepper,
  ConnectAccountStep,
  SelectPageFormsStep,
  FieldMappingStep,
  WebhookSetupStep,
  NavigationFooter,
} from './components';

export default function InstagramLeadSetupPage() {
  const {
    currentStep,
    setCurrentStep,
    canProceed,
    handleNext,
    navigateBack,
    accessToken,
    setAccessToken,
    isTestingConnection,
    connectionValid,
    setConnectionValid,
    pages,
    testConnection,
    selectedPage,
    setSelectedPage,
    forms,
    selectedForms,
    setSelectedForms,
    isLoadingForms,
    formFields,
    fieldMapping,
    setFieldMapping,
    webhookInfo,
    isSaving,
    copyToClipboard,
  } = useInstagramLeadSetup();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={navigateBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Social Media Ads
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Instagram Lead Ads Setup</h1>
        <p className="text-slate-500 mt-1">
          Connect your Instagram Business Account to automatically capture leads
        </p>
      </div>

      {/* Progress Steps */}
      <ProgressStepper currentStep={currentStep} />

      {/* Step Content */}
      <div className="card">
        <div className="card-body">
          {currentStep === 1 && (
            <ConnectAccountStep
              accessToken={accessToken}
              setAccessToken={setAccessToken}
              isTestingConnection={isTestingConnection}
              connectionValid={connectionValid}
              setConnectionValid={setConnectionValid}
              pages={pages}
              onTestConnection={testConnection}
            />
          )}

          {currentStep === 2 && (
            <SelectPageFormsStep
              pages={pages}
              selectedPage={selectedPage}
              setSelectedPage={setSelectedPage}
              forms={forms}
              selectedForms={selectedForms}
              setSelectedForms={setSelectedForms}
              isLoadingForms={isLoadingForms}
            />
          )}

          {currentStep === 3 && (
            <FieldMappingStep
              formFields={formFields}
              fieldMapping={fieldMapping}
              setFieldMapping={setFieldMapping}
            />
          )}

          {currentStep === 4 && (
            <WebhookSetupStep webhookInfo={webhookInfo} onCopyToClipboard={copyToClipboard} />
          )}
        </div>

        {/* Navigation */}
        <NavigationFooter
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          canProceed={canProceed()}
          isSaving={isSaving}
          onNext={handleNext}
        />
      </div>
    </div>
  );
}
