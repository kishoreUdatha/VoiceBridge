/**
 * Insurance Industry Fields Component
 * Displays insurance-related custom fields for leads
 */

import { IndustryFieldsForm } from './IndustryFieldsForm';

interface InsuranceFieldsProps {
  leadId: string;
  initialValues?: Record<string, any>;
  onSave?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function InsuranceFields({
  leadId,
  initialValues,
  onSave,
  readOnly = false,
  compact = false,
}: InsuranceFieldsProps) {
  return (
    <IndustryFieldsForm
      leadId={leadId}
      industry="INSURANCE"
      initialValues={initialValues}
      onSave={onSave}
      readOnly={readOnly}
      compact={compact}
    />
  );
}

export default InsuranceFields;
