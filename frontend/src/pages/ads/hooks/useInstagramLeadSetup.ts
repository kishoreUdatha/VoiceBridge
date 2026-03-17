/**
 * Instagram Lead Setup Hook
 * Handles state management and API calls for Instagram lead setup wizard
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import {
  FacebookPage,
  LeadForm,
  FormField,
  FieldMapping,
  WebhookInfo,
} from '../instagram-lead-setup.types';
import { AUTO_MAP } from '../instagram-lead-setup.constants';

interface UseInstagramLeadSetupReturn {
  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  canProceed: () => boolean;
  handleNext: () => void;
  navigateBack: () => void;

  // Step 1: Connect Account
  accessToken: string;
  setAccessToken: (token: string) => void;
  isTestingConnection: boolean;
  connectionValid: boolean;
  setConnectionValid: (valid: boolean) => void;
  pages: FacebookPage[];
  testConnection: () => Promise<void>;

  // Step 2: Select Page & Forms
  selectedPage: FacebookPage | null;
  setSelectedPage: (page: FacebookPage | null) => void;
  forms: LeadForm[];
  selectedForms: string[];
  setSelectedForms: (forms: string[]) => void;
  isLoadingForms: boolean;

  // Step 3: Field Mapping
  formFields: FormField[];
  fieldMapping: FieldMapping;
  setFieldMapping: (mapping: FieldMapping) => void;

  // Step 4: Webhook Setup
  webhookInfo: WebhookInfo | null;
  isSaving: boolean;

  // Utils
  copyToClipboard: (text: string) => void;
}

export function useInstagramLeadSetup(): UseInstagramLeadSetupReturn {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Connect Account
  const [accessToken, setAccessToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);

  // Step 2: Select Page & Forms
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  // Step 3: Field Mapping
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});

  // Step 4: Webhook Setup
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const testConnection = useCallback(async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter an access token');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await api.post('/instagram/test-connection', { accessToken });
      const data = response.data.data;

      if (data.valid) {
        setConnectionValid(true);
        setPages(
          data.pages.map((p: any) => ({
            id: p.id,
            name: p.name,
            hasInstagram: p.hasInstagram,
          }))
        );
        toast.success(`Connected! Found ${data.pagesCount} page(s)`);
      } else {
        setConnectionValid(false);
        toast.error(data.error || 'Invalid access token');
      }
    } catch (error: any) {
      setConnectionValid(false);
      toast.error(error.response?.data?.message || 'Connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  }, [accessToken]);

  const loadPagesWithDetails = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await api.get('/instagram/pages', {
        params: { accessToken },
      });

      const pagesData = response.data.data || [];
      setPages(
        pagesData.map((p: any) => ({
          id: p.id,
          name: p.name,
          hasInstagram: !!p.instagram_business_account,
          instagramAccount: p.instagram_business_account,
        }))
      );
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  }, [accessToken]);

  const loadForms = useCallback(
    async (pageId: string) => {
      setIsLoadingForms(true);
      try {
        const response = await api.get(`/instagram/pages/${pageId}/forms`, {
          params: { accessToken },
        });
        setForms(response.data.data || []);
      } catch (error: any) {
        toast.error('Failed to load lead forms');
      } finally {
        setIsLoadingForms(false);
      }
    },
    [accessToken]
  );

  const loadFormFields = useCallback(async () => {
    if (selectedForms.length === 0) return;

    try {
      const response = await api.get(`/instagram/forms/${selectedForms[0]}/fields`, {
        params: { accessToken },
      });
      const fields = response.data.data || [];
      setFormFields(fields);

      // Auto-map common fields
      const autoMapping: FieldMapping = {};
      fields.forEach((field: FormField) => {
        const mappedKey = AUTO_MAP[field.key.toLowerCase()];
        if (mappedKey) {
          autoMapping[field.key] = mappedKey;
        }
      });
      setFieldMapping(autoMapping);
    } catch (error) {
      console.error('Failed to load form fields:', error);
    }
  }, [selectedForms, accessToken]);

  const loadWebhookInfo = useCallback(async () => {
    try {
      const response = await api.get('/instagram/webhook-url');
      setWebhookInfo(response.data.data);
    } catch (error) {
      console.error('Failed to load webhook info:', error);
    }
  }, []);

  const saveIntegration = useCallback(async () => {
    if (!selectedPage) {
      toast.error('Please select a page');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/instagram/integrations', {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        instagramAccountId: selectedPage.instagramAccount?.id,
        instagramUsername: selectedPage.instagramAccount?.username,
        accessToken,
        selectedLeadForms: selectedForms.map((formId) => {
          const form = forms.find((f) => f.id === formId);
          return { id: formId, name: form?.name };
        }),
        fieldMapping,
      });

      toast.success('Instagram integration saved successfully!');
      navigate('/social-media-ads');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save integration');
    } finally {
      setIsSaving(false);
    }
  }, [selectedPage, accessToken, selectedForms, forms, fieldMapping, navigate]);

  // Effects
  useEffect(() => {
    if (currentStep === 2 && connectionValid) {
      loadPagesWithDetails();
    }
  }, [currentStep, connectionValid, loadPagesWithDetails]);

  useEffect(() => {
    if (selectedPage) {
      loadForms(selectedPage.id);
    }
  }, [selectedPage, loadForms]);

  useEffect(() => {
    if (currentStep === 3) {
      loadFormFields();
    }
  }, [currentStep, loadFormFields]);

  useEffect(() => {
    if (currentStep === 4) {
      loadWebhookInfo();
    }
  }, [currentStep, loadWebhookInfo]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return connectionValid;
      case 2:
        return selectedPage !== null && selectedForms.length > 0;
      case 3:
        return Object.keys(fieldMapping).length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, connectionValid, selectedPage, selectedForms, fieldMapping]);

  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      saveIntegration();
    }
  }, [currentStep, saveIntegration]);

  const navigateBack = useCallback(() => {
    navigate('/social-media-ads');
  }, [navigate]);

  const copyToClipboardFn = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  return {
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
    copyToClipboard: copyToClipboardFn,
  };
}

export default useInstagramLeadSetup;
