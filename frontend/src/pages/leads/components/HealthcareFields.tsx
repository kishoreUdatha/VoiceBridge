/**
 * Healthcare Industry Fields Component
 * Displays medical/healthcare-related custom fields for leads
 */

import { IndustryFieldsForm } from './IndustryFieldsForm';

interface HealthcareFieldsProps {
  leadId: string;
  initialValues?: Record<string, any>;
  onSave?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function HealthcareFields({
  leadId,
  initialValues,
  onSave,
  readOnly = false,
  compact = false,
}: HealthcareFieldsProps) {
  return (
    <IndustryFieldsForm
      leadId={leadId}
      industry="HEALTHCARE"
      initialValues={initialValues}
      onSave={onSave}
      readOnly={readOnly}
      compact={compact}
    />
  );
}

export default HealthcareFields;
