/**
 * E-Commerce Industry Fields Component
 * Displays e-commerce/shopping-related custom fields for leads
 */

import { IndustryFieldsForm } from './IndustryFieldsForm';

interface EcommerceFieldsProps {
  leadId: string;
  initialValues?: Record<string, any>;
  onSave?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function EcommerceFields({
  leadId,
  initialValues,
  onSave,
  readOnly = false,
  compact = false,
}: EcommerceFieldsProps) {
  return (
    <IndustryFieldsForm
      leadId={leadId}
      industry="ECOMMERCE"
      initialValues={initialValues}
      onSave={onSave}
      readOnly={readOnly}
      compact={compact}
    />
  );
}

export default EcommerceFields;
