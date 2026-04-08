/**
 * IT Recruitment Industry Fields Component
 * Displays recruitment-related custom fields for candidate leads
 */

import { IndustryFieldsForm } from './IndustryFieldsForm';

interface RecruitmentFieldsProps {
  leadId: string;
  initialValues?: Record<string, any>;
  onSave?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function RecruitmentFields({
  leadId,
  initialValues,
  onSave,
  readOnly = false,
  compact = false,
}: RecruitmentFieldsProps) {
  return (
    <IndustryFieldsForm
      leadId={leadId}
      industry="IT_RECRUITMENT"
      initialValues={initialValues}
      onSave={onSave}
      readOnly={readOnly}
      compact={compact}
    />
  );
}

export default RecruitmentFields;
