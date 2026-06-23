import type { Ionicons } from '@expo/vector-icons';

export type ClinicalModuleId =
  | 'post_session_record'
  | 'quick_tags'
  | 'patient_timeline'
  | 'treatment_plan'
  | 'next_session_briefing'
  | 'clinical_layers'
  | 'patient_portal'
  | 'between_session_checkins'
  | 'responsible_alerts'
  | 'privacy_security';

export type ClinicalIntegrationStatus = 'connected' | 'partial' | 'pending';

export type ClinicalIntegrationModule = {
  id: ClinicalModuleId;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: ClinicalIntegrationStatus;
  done: string[];
  missing: string[];
};

export type ClinicalQuickTag = {
  id: string;
  label: string;
  tone: 'neutral' | 'attention' | 'risk';
};

export type ClinicalTimelineItem = {
  id: string;
  title: string;
  summary: string;
  dateLabel: string;
  layer: 'rascunho' | 'prontuario' | 'memoria' | 'compartilhado';
};

export type ClinicalTreatmentGoal = {
  id: string;
  title: string;
  status: 'ativo' | 'revisar' | 'pausado';
};

export type ClinicalConsentItem = {
  id: string;
  label: string;
  description: string;
};
