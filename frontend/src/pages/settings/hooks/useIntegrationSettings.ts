/**
 * Integration Settings Hook
 * Handles state management and API calls for integration settings
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  CRMIntegration,
  CustomEndpoint,
  FieldMapping,
  NewEndpointForm,
  ActiveSection,
} from '../integration-settings.types';
import {
  INITIAL_FIELD_MAPPINGS,
  INITIAL_NEW_ENDPOINT,
} from '../integration-settings.constants';

interface UseIntegrationSettingsReturn {
  // State
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  loading: boolean;
  saving: boolean;
  testingConnection: string | null;

  // CRM
  crmIntegrations: CRMIntegration[];
  showApiKey: Record<string, boolean>;
  setShowApiKey: (value: Record<string, boolean>) => void;

  // Endpoints
  customEndpoints: CustomEndpoint[];
  newEndpoint: NewEndpointForm;
  setNewEndpoint: (endpoint: NewEndpointForm) => void;

  // Field Mappings
  fieldMappings: FieldMapping[];
  setFieldMappings: (mappings: FieldMapping[]) => void;

  // Webhook
  inboundWebhookUrl: string;
  webhookSecret: string;

  // Actions
  connectCRM: (provider: string) => Promise<void>;
  disconnectCRM: (integrationId: string) => Promise<void>;
  testConnection: (integrationId: string) => Promise<void>;
  addCustomEndpoint: () => Promise<void>;
  deleteEndpoint: (endpointId: string) => Promise<void>;
  testEndpoint: (endpointId: string) => Promise<void>;
  saveFieldMappings: () => Promise<void>;
  addFieldMapping: () => void;
  removeFieldMapping: (index: number) => void;
}

export function useIntegrationSettings(): UseIntegrationSettingsReturn {
  const [activeSection, setActiveSection] = useState<ActiveSection>('crm');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // CRM Integrations
  const [crmIntegrations, setCrmIntegrations] = useState<CRMIntegration[]>([]);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Custom Webhooks/APIs
  const [customEndpoints, setCustomEndpoints] = useState<CustomEndpoint[]>([]);
  const [newEndpoint, setNewEndpoint] = useState<NewEndpointForm>(INITIAL_NEW_ENDPOINT);

  // Field Mappings
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(INITIAL_FIELD_MAPPINGS);

  // Webhook URL
  const [inboundWebhookUrl, setInboundWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const [crmRes, endpointsRes] = await Promise.all([
        api.get('/integrations/crm'),
        api.get('/integrations/custom-api'),
      ]);

      if (crmRes.data.success) {
        setCrmIntegrations(crmRes.data.data);
      }
      if (endpointsRes.data.success) {
        setCustomEndpoints(endpointsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateWebhookUrl = useCallback(() => {
    const orgId = localStorage.getItem('organizationId') || 'demo';
    setInboundWebhookUrl(`${window.location.origin}/api/webhooks/inbound/${orgId}`);
    setWebhookSecret(`whsec_${Math.random().toString(36).substring(2, 15)}`);
  }, []);

  useEffect(() => {
    fetchIntegrations();
    generateWebhookUrl();
  }, [fetchIntegrations, generateWebhookUrl]);

  const connectCRM = useCallback(
    async (provider: string) => {
      try {
        if (provider === 'custom') {
          setActiveSection('webhook');
          return;
        }

        const response = await api.get(`/integrations/calendar/auth/${provider}`);
        if (response.data.success && response.data.data.authUrl) {
          const popup = window.open(response.data.data.authUrl, 'crm-auth', 'width=600,height=700');

          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed);
              fetchIntegrations();
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Failed to connect CRM:', err);
      }
    },
    [fetchIntegrations]
  );

  const disconnectCRM = useCallback(
    async (integrationId: string) => {
      try {
        await api.delete(`/integrations/crm/${integrationId}`);
        fetchIntegrations();
      } catch (err) {
        console.error('Failed to disconnect CRM:', err);
      }
    },
    [fetchIntegrations]
  );

  const testConnection = useCallback(async (integrationId: string) => {
    setTestingConnection(integrationId);
    try {
      const response = await api.post(`/integrations/crm/${integrationId}/test`);
      if (response.data.success) {
        alert('Connection successful!');
      }
    } catch (err) {
      alert('Connection failed. Please check your credentials.');
    } finally {
      setTestingConnection(null);
    }
  }, []);

  const addCustomEndpoint = useCallback(async () => {
    if (!newEndpoint.name || !newEndpoint.url) return;

    setSaving(true);
    try {
      const response = await api.post('/integrations/custom-api', newEndpoint);
      if (response.data.success) {
        setCustomEndpoints((prev) => [...prev, response.data.data]);
        setNewEndpoint(INITIAL_NEW_ENDPOINT);
      }
    } catch (err) {
      console.error('Failed to add endpoint:', err);
    } finally {
      setSaving(false);
    }
  }, [newEndpoint]);

  const deleteEndpoint = useCallback(async (endpointId: string) => {
    try {
      await api.delete(`/integrations/custom-api/${endpointId}`);
      setCustomEndpoints((prev) => prev.filter((e) => e.id !== endpointId));
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  }, []);

  const testEndpoint = useCallback(async (endpointId: string) => {
    setTestingConnection(endpointId);
    try {
      const response = await api.post(`/integrations/custom-api/${endpointId}/test`, {
        sampleData: {
          firstName: 'Test',
          lastName: 'User',
          phone: '+1234567890',
          email: 'test@example.com',
        },
      });
      if (response.data.success) {
        alert('Webhook test successful!');
      }
    } catch (err) {
      alert('Webhook test failed. Please check the URL and credentials.');
    } finally {
      setTestingConnection(null);
    }
  }, []);

  const saveFieldMappings = useCallback(async () => {
    setSaving(true);
    try {
      await api.post('/integrations/field-mappings', { mappings: fieldMappings });
      alert('Field mappings saved!');
    } catch (err) {
      console.error('Failed to save field mappings:', err);
    } finally {
      setSaving(false);
    }
  }, [fieldMappings]);

  const addFieldMapping = useCallback(() => {
    setFieldMappings([...fieldMappings, { sourceField: 'firstName', targetField: '' }]);
  }, [fieldMappings]);

  const removeFieldMapping = useCallback(
    (index: number) => {
      setFieldMappings(fieldMappings.filter((_, i) => i !== index));
    },
    [fieldMappings]
  );

  return {
    activeSection,
    setActiveSection,
    loading,
    saving,
    testingConnection,
    crmIntegrations,
    showApiKey,
    setShowApiKey,
    customEndpoints,
    newEndpoint,
    setNewEndpoint,
    fieldMappings,
    setFieldMappings,
    inboundWebhookUrl,
    webhookSecret,
    connectCRM,
    disconnectCRM,
    testConnection,
    addCustomEndpoint,
    deleteEndpoint,
    testEndpoint,
    saveFieldMappings,
    addFieldMapping,
    removeFieldMapping,
  };
}

export default useIntegrationSettings;
