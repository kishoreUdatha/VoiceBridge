/**
 * Instagram Lead Setup Types
 */

export interface FacebookPage {
  id: string;
  name: string;
  hasInstagram: boolean;
  instagramAccount?: {
    id: string;
    username: string;
    profile_picture_url?: string;
    followers_count?: number;
  };
}

export interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count: number;
  locale: string;
  created_time: string;
}

export interface FormField {
  key: string;
  label: string;
  type: string;
}

export interface FieldMapping {
  [key: string]: string;
}

export interface WebhookInfo {
  webhookUrl: string;
  verifyToken: string;
  instructions: string[];
}

export interface SetupStep {
  id: number;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}
