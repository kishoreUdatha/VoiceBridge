/**
 * Real Estate Industry Fields Component
 * Displays property-related custom fields for real estate leads
 */

import { IndustryFieldsForm } from './IndustryFieldsForm';

interface RealEstateFieldsProps {
  leadId: string;
  initialValues?: Record<string, any>;
  onSave?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function RealEstateFields({
  leadId,
  initialValues,
  onSave,
  readOnly = false,
  compact = false,
}: RealEstateFieldsProps) {
  return (
    <IndustryFieldsForm
      leadId={leadId}
      industry="REAL_ESTATE"
      initialValues={initialValues}
      onSave={onSave}
      readOnly={readOnly}
      compact={compact}
    />
  );
}

export default RealEstateFields;
