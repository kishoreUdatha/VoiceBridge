/**
 * Finance Industry Fields Component
 * Displays finance/loan-related custom fields for leads
 */

import { IndustryFieldsForm } from './IndustryFieldsForm';

interface FinanceFieldsProps {
  leadId: string;
  initialValues?: Record<string, any>;
  onSave?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function FinanceFields({
  leadId,
  initialValues,
  onSave,
  readOnly = false,
  compact = false,
}: FinanceFieldsProps) {
  return (
    <IndustryFieldsForm
      leadId={leadId}
      industry="FINANCE"
      initialValues={initialValues}
      onSave={onSave}
      readOnly={readOnly}
      compact={compact}
    />
  );
}

export default FinanceFields;
