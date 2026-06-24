import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { OnboardingItem, User, UserRole } from '@/types/domain';

const ACCESS_TOKEN_KEY = 'psi_agenda_online.access_token';
const REFRESH_TOKEN_KEY = 'psi_agenda_online.refresh_token';
const DEFAULT_API_BASE_URL = 'https://api.felicio.app';

export const API_BASE_URL = resolveApiBaseUrl();

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
};

type FormDataRequestOptions = {
  method?: 'POST' | 'PUT';
  authenticated?: boolean;
};

type ApiAuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: ApiUser;
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole | 'Customer' | 'SpaceAdmin' | 'Professional' | 'SuperAdmin' | 'SpaceManager';
};

type RefreshedAuthSession = {
  user: User;
  expiresAt: string;
};

type AuthSessionExpiredListener = () => void;

const authSessionExpiredListeners = new Set<AuthSessionExpiredListener>();
let refreshSessionPromise: Promise<RefreshedAuthSession> | null = null;

export type ApiSpace = {
  id: string;
  name: string;
  description: string;
  category: string;
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  active: boolean;
  published: boolean;
  onboardingCompleted: boolean;
  allowOnlineBooking?: boolean;
  requireManualApproval?: boolean;
};

export type ApiService = {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  bufferAfterMinutes: number;
  active: boolean;
  onlineBooking: boolean;
};

export type ApiProfessional = {
  id: string;
  spaceId: string;
  name: string;
  email?: string | null;
  specialty: string;
  experienceYears: number;
  serviceIds: string[];
  active: boolean;
};

export type ApiOpeningHour = {
  id: string;
  spaceId: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type ApiProfessionalSchedule = {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  active: boolean;
};

export type ApiBlockedTime = {
  id: string;
  spaceId: string;
  professionalId?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  active: boolean;
};

export type ApiPaymentSettings = {
  allowPix: boolean;
  allowCreditCard: boolean;
  allowDebitCard: boolean;
  allowPayOnSite: boolean;
  requirePrePayment: boolean;
  requireDeposit: boolean;
  depositType?: 'fixed' | 'percentage' | null;
  depositValue?: number | null;
  serviceFeePercentage: number;
  reservationExpirationMinutes: number;
};

export type ApiSpaceBookingSettings = {
  allowOnlineBooking: boolean;
  requireManualApproval: boolean;
};

export type ApiCancellationPolicy = {
  allowCustomerCancel: boolean;
  freeCancelBeforeHours: number;
  allowReschedule: boolean;
  freeRescheduleBeforeHours: number;
  chargeLateCancelFee: boolean;
  lateCancelFee?: number | null;
  policyText: string;
};

export type ApiSpacePhoto = {
  id: string;
  spaceId: string;
  url: string;
  caption?: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

export type ApiNotificationSettings = {
  notifyCustomerOnBooking: boolean;
  notifyCustomerOnCancel: boolean;
  notifyCustomerOnReschedule: boolean;
  notifyOwnerOnBooking: boolean;
  notifyProfessionalOnBooking: boolean;
  reminderHoursBefore: number;
  active: boolean;
};

export type ApiNotification = {
  id: string;
  userId?: string | null;
  spaceId?: string | null;
  appointmentId?: string | null;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type ApiReview = {
  id: string;
  appointmentId: string;
  spaceId: string;
  customerId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

export type ApiPublicSpaceListItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  minPrice: number;
  servicesCount: number;
  professionalsCount: number;
};

export type ApiPublicSpaceDetails = {
  space: ApiSpace;
  photos: ApiSpacePhoto[];
  categories: { id: string; spaceId: string; name: string; active: boolean }[];
  services: ApiService[];
  professionals: ApiProfessional[];
  openingHours: ApiOpeningHour[];
  paymentSettings: ApiPaymentSettings;
  cancellationPolicy: ApiCancellationPolicy;
};

export type ApiTimeSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  professionalId: string;
  professionalName: string;
  available: boolean;
  reason?: string | null;
};

export type ApiAppointment = {
  id: string;
  code: string;
  customerId: string;
  spaceId: string;
  professionalId: string;
  anyProfessional: boolean;
  serviceIds: string[];
  startDateTime: string;
  endDateTime: string;
  totalDurationMinutes: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: 'reserved' | 'pending_payment' | 'pending_confirmation' | 'confirmed' | 'expired' | 'cancelled' | 'completed' | 'no_show' | 'rejected';
  paymentMethodId: 'pix' | 'credit_card' | 'debit_card' | 'pay_on_site';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'not_required';
  createdAt: string;
  expiresAt?: string | null;
  ownerDecisionReason?: string | null;
  ownerDecisionAt?: string | null;
  onlineRoomUrl?: string | null;
};

export type ApiAppointmentDetails = {
  appointment: ApiAppointment;
  space: ApiSpace;
  professional: ApiProfessional;
  services: ApiService[];
  customer: ApiUser;
  review?: ApiReview | null;
};

export type ApiClinicalTagInput = {
  label: string;
  tone: 'neutral' | 'attention' | 'risk';
};

export type ApiClinicalDraft = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  status: string;
  source: string;
  recordType: string;
  previousRecordId?: string | null;
  sessionNote?: string | null;
  contentText: string;
  tags: ApiClinicalTagInput[];
  aiGenerated: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ApiAppliedClinicalTag = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  label: string;
  tone: 'neutral' | 'attention' | 'risk';
  note?: string | null;
  appliedAt: string;
};

export type ApiClinicalRecord = {
  id: string;
  appointmentId?: string | null;
  draftId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  recordType: string;
  status: string;
  contentText: string;
  tags: ApiClinicalTagInput[];
  version: number;
  previousRecordId?: string | null;
  approvedAt: string;
  createdAt: string;
};

export type ApiClinicalRecordExport = {
  patientId: string;
  professionalId: string;
  spaceId: string;
  exportedAt: string;
  recordsCount: number;
  scope: string;
  notice: string;
  records: {
    id: string;
    appointmentId?: string | null;
    recordType: string;
    version: number;
    previousRecordId?: string | null;
    approvedAt: string;
    tags: ApiClinicalTagInput[];
  }[];
  contentText: string;
};

export type ApiPatientTimelineItem = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  sourceType: string;
  sourceId?: string | null;
  title: string;
  summary: string;
  layer: 'rascunho' | 'prontuario' | 'memoria' | 'compartilhado';
  occurredAt: string;
  archived: boolean;
  archivedAt?: string | null;
  archiveReason?: string | null;
  createdAt: string;
};

export type ApiClinicalAlertSeverity = 'baixo' | 'medio' | 'alto';
export type ApiClinicalAlertStatus = 'pending' | 'confirmed' | 'dismissed' | 'monitoring' | 'resolved';

export type ApiClinicalAlert = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  sourceType: string;
  sourceId?: string | null;
  title: string;
  description: string;
  severity: ApiClinicalAlertSeverity | string;
  status: ApiClinicalAlertStatus | string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiClinicalAlertFilters = {
  severity?: ApiClinicalAlertSeverity | 'all' | null;
  status?: ApiClinicalAlertStatus | 'all' | null;
  sourceType?: string | 'all' | null;
  onlyActive?: boolean | null;
  limit?: number | null;
};

export type ApiClinicalTimelineFilters = {
  sourceType?: string | null;
  layer?: ApiPatientTimelineItem['layer'] | 'all' | null;
  tag?: string | 'all' | null;
  severity?: ApiClinicalTagInput['tone'] | 'all' | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
  limit?: number | null;
};

export type ApiPatientTimelineItemDetail = {
  item: ApiPatientTimelineItem;
  appointmentCode?: string | null;
  appointmentStartDateTime?: string | null;
  sourceLabel: string;
  sourceStatus?: string | null;
  sourceTypeDetail?: string | null;
  sourceVersion?: number | null;
  canOpenSource: boolean;
  canArchive: boolean;
  accessNote: string;
};

export type ApiPatientConsentStatus = 'pending' | 'granted' | 'revoked' | 'expired';

export type ApiPatientConsent = {
  id?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  consentType: string;
  status: ApiPatientConsentStatus;
  termsVersion: string;
  grantedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
  updatedAt?: string | null;
};

export type ApiPatientPortalConsent = ApiPatientConsent & {
  professionalName: string;
  spaceName: string;
};

export type ApiPatientConsentEvent = {
  id: string;
  patientConsentId: string;
  patientId: string;
  professionalId: string;
  spaceId: string;
  appointmentId?: string | null;
  actorUserId: string;
  consentType: string;
  status: ApiPatientConsentStatus;
  action: 'requested' | 'migrated' | ApiPatientConsentStatus | string;
  termsVersion: string;
  grantedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

export type ApiPatientConsentTerm = {
  id: string;
  consentType: string;
  version: string;
  title: string;
  summary: string;
  legalBasis: string;
  retentionPolicy: string;
  reviewNotice: string;
  sensitive: boolean;
  requiresExplicitPatientDecision: boolean;
  isActive: boolean;
  effectiveAt: string;
  retiredAt?: string | null;
};

export type ApiClinicalRetentionPolicy = {
  professionalId: string;
  spaceId: string;
  consentType: string;
  termsVersion: string;
  status: ApiPatientConsentStatus;
  sensitive: boolean;
  dataUseAllowed: boolean;
  patientCanRevoke: boolean;
  activeUntil?: string | null;
  retentionPolicy: string;
  revocationEffect: string;
  expirationEffect: string;
  reviewNotice: string;
};

export type ApiClinicalPermission = {
  key: string;
  label: string;
  granted: boolean;
  reason: string;
  requiresConsent: boolean;
  consentType?: string | null;
};

export type ApiClinicalRoleBoundary = {
  roleKey: string;
  label: string;
  accessLevel: string;
  clinicalContentAllowed: boolean;
  requiresFormalAssignment: boolean;
  scope: string;
  reason: string;
};

export type ApiClinicalPolicyGuardrail = {
  key: string;
  label: string;
  status: 'blocked' | 'attention' | 'clear' | 'ready' | string;
  detail: string;
  relatedConsentType?: string | null;
};

export type ApiClinicalDataProtectionPolicy = {
  enabled: boolean;
  algorithm: string;
  keySource: 'configured' | 'development_fallback' | string;
  legacyPlainTextReadable: boolean;
  protectedFields: string[];
  status: 'active' | 'active_with_development_key' | string;
  rotationNotice: string;
};

export type ApiClinicalAccessPolicy = {
  actorRole: string;
  hasProfessionalPatientRelationship: boolean;
  permissions: ApiClinicalPermission[];
  roleBoundaries: ApiClinicalRoleBoundary[];
  guardrails: ApiClinicalPolicyGuardrail[];
};

export type ApiClinicalSession = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  sessionType: 'online' | 'in_person' | 'phone' | 'other' | string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiTreatmentPlanStatus = 'active' | 'paused' | 'completed' | 'archived';

export type ApiTreatmentPlan = {
  id?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  status: ApiTreatmentPlanStatus | string;
  caseFormulation?: string | null;
  goals: string[];
  strategies: string[];
  obstacles: string[];
  reviewCadence?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiShareableStatus = 'private' | 'shared' | 'completed' | 'archived';

export type ApiPatientTask = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  status: ApiShareableStatus | string;
  acceptsResponse: boolean;
  responseText?: string | null;
  responseSubmittedAt?: string | null;
  sharedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSharedMaterialType = 'text' | 'link';

export type ApiSharedMaterial = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  materialType: ApiSharedMaterialType | string;
  title: string;
  description?: string | null;
  url?: string | null;
  status: ApiShareableStatus | string;
  sharedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiPatientCheckIn = {
  id: string;
  appointmentId?: string | null;
  patientId: string;
  professionalId: string;
  spaceId: string;
  prompt: string;
  contextNote?: string | null;
  dueAt?: string | null;
  status: ApiShareableStatus | 'answered' | string;
  moodScore?: number | null;
  responseText?: string | null;
  respondedAt?: string | null;
  sharedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiClinicalWorkspace = {
  appointmentId: string;
  patientId: string;
  professionalId: string;
  spaceId: string;
  accessPolicy: ApiClinicalAccessPolicy;
  dataProtection: ApiClinicalDataProtectionPolicy;
  session: ApiClinicalSession;
  drafts: ApiClinicalDraft[];
  records: ApiClinicalRecord[];
  tags: ApiAppliedClinicalTag[];
  consents: ApiPatientConsent[];
  consentHistory: ApiPatientConsentEvent[];
  consentTerms: ApiPatientConsentTerm[];
  retentionPolicies: ApiClinicalRetentionPolicy[];
  treatmentPlan: ApiTreatmentPlan;
  tasks: ApiPatientTask[];
  materials: ApiSharedMaterial[];
  checkIns: ApiPatientCheckIn[];
  alerts: ApiClinicalAlert[];
  timeline: ApiPatientTimelineItem[];
};

export type ApiPatientCarePortal = {
  patientId: string;
  tasks: ApiPatientTask[];
  materials: ApiSharedMaterial[];
  checkIns: ApiPatientCheckIn[];
  consents: ApiPatientPortalConsent[];
  sensitiveConsents: ApiPatientPortalConsent[];
  consentHistory: ApiPatientConsentEvent[];
  consentTerms: ApiPatientConsentTerm[];
  retentionPolicies: ApiClinicalRetentionPolicy[];
  dataProtection: ApiClinicalDataProtectionPolicy;
};

export type ApiStarterSetupResponse = {
  space: ApiSpace;
  services: ApiService[];
  professionals: ApiProfessional[];
  checklist: OnboardingItem[];
};

export type ApiOwnerDashboard = {
  space: ApiSpace;
  todayAppointmentsCount: number;
  estimatedRevenue: number;
  futureRevenue: number;
  pendingPaymentCount: number;
  activeServicesCount: number;
  activeProfessionalsCount: number;
  checklistComplete: boolean;
};

export type CreateApiSpaceInput = {
  name: string;
  description: string;
  category: string;
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function subscribeAuthSessionExpired(listener: AuthSessionExpiredListener) {
  authSessionExpiredListeners.add(listener);

  return () => {
    authSessionExpiredListeners.delete(listener);
  };
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  return authenticate('/auth/register/customer', input);
}

export async function registerSpaceAdmin(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  return authenticate('/auth/register/space-admin', input);
}

export async function registerProfessional(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  return authenticate('/auth/register/professional', input);
}

export async function login(input: { email: string; password: string }) {
  return authenticate('/auth/login', input);
}

export async function logout() {
  const refreshToken = await readToken(REFRESH_TOKEN_KEY);

  if (refreshToken) {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    } catch {
      // A sessão do dispositivo ainda deve ser limpa mesmo que a API esteja fora.
    }
  }

  await clearAuthSession();
}

export async function deleteAccount() {
  await request('/auth/me', {
    method: 'DELETE',
    authenticated: true,
  });

  await clearAuthSession();
}

export async function restoreAuthSession() {
  const accessToken = await readToken(ACCESS_TOKEN_KEY);
  const refreshToken = await readToken(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  try {
    const user = await request<ApiUser>('/auth/me', { authenticated: true });

    return mapUser(user);
  } catch (error) {
    if (isUnauthorized(error)) {
      return null;
    }

    throw error;
  }
}

export async function createSpace(input: CreateApiSpaceInput) {
  return request<ApiSpace>('/spaces', {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function updateSpace(spaceId: string, input: CreateApiSpaceInput) {
  return request<ApiSpace>(`/spaces/${spaceId}`, {
    method: 'PUT',
    authenticated: true,
    body: input,
  });
}

export async function getMySpaces() {
  return request<ApiSpace[]>('/spaces/my', { authenticated: true });
}

export async function getOnboardingChecklist(spaceId: string) {
  return request<OnboardingItem[]>(`/spaces/${spaceId}/onboarding-checklist`, {
    authenticated: true,
  });
}

export async function completeStarterSetup(spaceId: string) {
  return request<ApiStarterSetupResponse>(`/spaces/${spaceId}/starter-setup`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function getOwnerDashboard(spaceId: string) {
  return request<ApiOwnerDashboard>(`/spaces/${spaceId}/dashboard`, {
    authenticated: true,
  });
}

export async function getOwnerServices(spaceId: string) {
  return request<ApiService[]>(`/spaces/${spaceId}/services`, { authenticated: true });
}

export async function createOwnerService(spaceId: string, input: {
  name: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  bufferAfterMinutes: number;
  onlineBooking: boolean;
  active: boolean;
}) {
  return request<ApiService>(`/spaces/${spaceId}/services`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function updateOwnerService(spaceId: string, serviceId: string, input: {
  name: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  bufferAfterMinutes: number;
  onlineBooking: boolean;
  active: boolean;
}) {
  return request<ApiService>(`/spaces/${spaceId}/services/${serviceId}`, {
    method: 'PUT',
    authenticated: true,
    body: input,
  });
}

export async function getOwnerProfessionals(spaceId: string) {
  return request<ApiProfessional[]>(`/spaces/${spaceId}/professionals`, { authenticated: true });
}

export async function createOwnerProfessional(spaceId: string, input: {
  name: string;
  email?: string | null;
  specialty: string;
  experienceYears: number;
  serviceIds: string[];
  active: boolean;
}) {
  return request<ApiProfessional>(`/spaces/${spaceId}/professionals`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function updateOwnerProfessional(spaceId: string, professionalId: string, input: {
  name: string;
  email?: string | null;
  specialty: string;
  experienceYears: number;
  serviceIds: string[];
  active: boolean;
}) {
  return request<ApiProfessional>(`/spaces/${spaceId}/professionals/${professionalId}`, {
    method: 'PUT',
    authenticated: true,
    body: input,
  });
}

export async function getOpeningHours(spaceId: string) {
  return request<ApiOpeningHour[]>(`/spaces/${spaceId}/opening-hours`, { authenticated: true });
}

export async function updateOpeningHours(spaceId: string, hours: {
  dayOfWeek: number;
  isOpen: boolean;
  startTime?: string | null;
  endTime?: string | null;
}[]) {
  return request<ApiOpeningHour[]>(`/spaces/${spaceId}/opening-hours`, {
    method: 'PUT',
    authenticated: true,
    body: { hours },
  });
}

export async function getProfessionalSchedule(spaceId: string, professionalId: string) {
  return request<ApiProfessionalSchedule[]>(`/spaces/${spaceId}/professionals/${professionalId}/schedule`, {
    authenticated: true,
  });
}

export async function updateProfessionalSchedule(spaceId: string, professionalId: string, schedules: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  active: boolean;
}[]) {
  return request<ApiProfessionalSchedule[]>(`/spaces/${spaceId}/professionals/${professionalId}/schedule`, {
    method: 'PUT',
    authenticated: true,
    body: { schedules },
  });
}

export async function getBlockedTimes(spaceId: string) {
  return request<ApiBlockedTime[]>(`/spaces/${spaceId}/blocked-times`, { authenticated: true });
}

export async function createBlockedTime(spaceId: string, input: {
  professionalId?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}) {
  return request<ApiBlockedTime>(`/spaces/${spaceId}/blocked-times`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function deleteBlockedTime(spaceId: string, blockedTimeId: string) {
  return request<void>(`/spaces/${spaceId}/blocked-times/${blockedTimeId}`, {
    method: 'DELETE',
    authenticated: true,
  });
}

export async function getBookingSettings(spaceId: string) {
  return request<ApiSpaceBookingSettings>(`/spaces/${spaceId}/booking-settings`, { authenticated: true });
}

export async function updateBookingSettings(spaceId: string, input: ApiSpaceBookingSettings) {
  return request<ApiSpaceBookingSettings>(`/spaces/${spaceId}/booking-settings`, {
    method: 'PUT',
    authenticated: true,
    body: input,
  });
}

export async function getPaymentSettings(spaceId: string) {
  return request<ApiPaymentSettings>(`/spaces/${spaceId}/payment-settings`, { authenticated: true });
}

export async function updatePaymentSettings(spaceId: string, input: ApiPaymentSettings) {
  return request<ApiPaymentSettings>(`/spaces/${spaceId}/payment-settings`, {
    method: 'PUT',
    authenticated: true,
    body: input,
  });
}

export async function getCancellationPolicy(spaceId: string) {
  return request<ApiCancellationPolicy>(`/spaces/${spaceId}/cancellation-policy`, {
    authenticated: true,
  });
}

export async function updateCancellationPolicy(spaceId: string, input: ApiCancellationPolicy) {
  return request<ApiCancellationPolicy>(`/spaces/${spaceId}/cancellation-policy`, {
    method: 'PUT',
    authenticated: true,
    body: input,
  });
}

export async function getOwnerAppointments(spaceId: string) {
  return request<ApiAppointment[]>(`/spaces/${spaceId}/appointments`, { authenticated: true });
}

export async function getOwnerAppointmentDetails(spaceId: string, appointmentId: string) {
  return request<ApiAppointmentDetails>(`/spaces/${spaceId}/appointments/${appointmentId}`, { authenticated: true });
}

export async function completeOwnerAppointment(spaceId: string, appointmentId: string) {
  return request<ApiAppointment>(`/spaces/${spaceId}/appointments/${appointmentId}/complete`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function markOwnerAppointmentNoShow(spaceId: string, appointmentId: string) {
  return request<ApiAppointment>(`/spaces/${spaceId}/appointments/${appointmentId}/no-show`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function confirmOwnerAppointment(spaceId: string, appointmentId: string) {
  return request<ApiAppointment>(`/spaces/${spaceId}/appointments/${appointmentId}/confirm`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function rejectOwnerAppointment(spaceId: string, appointmentId: string, reason: string) {
  return request<ApiAppointment>(`/spaces/${spaceId}/appointments/${appointmentId}/reject`, {
    method: 'POST',
    authenticated: true,
    body: { reason },
  });
}

export async function getSpacePhotos(spaceId: string) {
  return request<ApiSpacePhoto[]>(`/spaces/${spaceId}/photos`, { authenticated: true });
}

export async function createSpacePhoto(spaceId: string, input: {
  url: string;
  caption?: string | null;
  sortOrder: number;
  active: boolean;
}) {
  return request<ApiSpacePhoto>(`/spaces/${spaceId}/photos`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function uploadSpacePhoto(spaceId: string, input: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  sortOrder: number;
  active: boolean;
}) {
  const formData = new FormData();
  const fileName = input.fileName ?? `foto-${Date.now()}.jpg`;
  const mimeType = input.mimeType ?? inferImageMimeType(fileName);

  if (Platform.OS === 'web') {
    const response = await fetch(input.uri);
    const blob = await response.blob();
    formData.append('file', blob, fileName);
  } else {
    formData.append('file', {
      uri: input.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  formData.append('caption', input.caption ?? '');
  formData.append('sortOrder', String(input.sortOrder));
  formData.append('active', String(input.active));

  return requestFormData<ApiSpacePhoto>(`/spaces/${spaceId}/photos/upload`, formData, { authenticated: true });
}

export async function deleteSpacePhoto(spaceId: string, photoId: string) {
  return request<void>(`/spaces/${spaceId}/photos/${photoId}`, {
    method: 'DELETE',
    authenticated: true,
  });
}

export async function getNotificationSettings(spaceId: string) {
  return request<ApiNotificationSettings>(`/spaces/${spaceId}/notification-settings`, { authenticated: true });
}

export async function updateNotificationSettings(spaceId: string, input: ApiNotificationSettings) {
  return request<ApiNotificationSettings>(`/spaces/${spaceId}/notification-settings`, {
    method: 'PUT',
    authenticated: true,
    body: input,
  });
}

export async function getPublishedSpaces(location?: { latitude: number; longitude: number } | null) {
  const query = location
    ? `?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`
    : '';

  return request<ApiPublicSpaceListItem[]>(`/public/spaces${query}`);
}

export async function getPublishedSpaceDetails(spaceId: string) {
  return request<ApiPublicSpaceDetails>(`/public/spaces/${spaceId}`);
}

export async function searchAvailability(input: {
  spaceId: string;
  serviceIds: string[];
  professionalId?: string | null;
  anyProfessional: boolean;
  date: string;
}) {
  return request<ApiTimeSlot[]>('/availability/search', {
    method: 'POST',
    body: input,
  });
}

export async function reserveAppointment(input: {
  spaceId: string;
  serviceIds: string[];
  professionalId?: string | null;
  anyProfessional: boolean;
  date: string;
  startTime: string;
  paymentMethodId: string;
}) {
  return request<ApiAppointment>('/appointments/reserve', {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function getCustomerAppointments() {
  return request<ApiAppointment[]>('/customers/me/appointments', { authenticated: true });
}

export async function getCustomerAppointmentDetails(appointmentId: string) {
  return request<ApiAppointmentDetails>(`/customers/me/appointments/${appointmentId}`, { authenticated: true });
}

export async function getPatientCarePortal() {
  return request<ApiPatientCarePortal>('/patients/me/care', { authenticated: true });
}

export async function completePatientCareTask(taskId: string, input: {
  responseText?: string | null;
}) {
  return request<ApiPatientTask>(`/patients/me/tasks/${taskId}/complete`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function respondPatientCheckIn(checkInId: string, input: {
  moodScore: number;
  responseText?: string | null;
}) {
  return request<ApiPatientCheckIn>(`/patients/me/check-ins/${checkInId}/respond`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function cancelCustomerAppointment(appointmentId: string, reason?: string) {
  return request<ApiAppointment>(`/customers/me/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    authenticated: true,
    body: { reason },
  });
}

export async function rescheduleCustomerAppointment(appointmentId: string, input: {
  professionalId?: string | null;
  anyProfessional: boolean;
  date: string;
  startTime: string;
}) {
  return request<ApiAppointment>(`/customers/me/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function createAppointmentReview(appointmentId: string, input: {
  rating: number;
  comment?: string | null;
}) {
  return request<ApiReview>(`/customers/me/appointments/${appointmentId}/review`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function getProfessionalAppointments() {
  return request<ApiAppointment[]>('/professionals/me/appointments', { authenticated: true });
}

export async function getProfessionalAppointmentDetails(appointmentId: string) {
  return request<ApiAppointmentDetails>(`/professionals/me/appointments/${appointmentId}`, { authenticated: true });
}

export async function completeProfessionalAppointment(appointmentId: string) {
  return request<ApiAppointment>(`/professionals/me/appointments/${appointmentId}/complete`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function markProfessionalAppointmentNoShow(appointmentId: string) {
  return request<ApiAppointment>(`/professionals/me/appointments/${appointmentId}/no-show`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function getClinicalAppointmentWorkspace(appointmentId: string) {
  return request<ApiClinicalWorkspace>(`/clinical/appointments/${appointmentId}/workspace`, { authenticated: true });
}

export async function getClinicalPatientTimeline(patientId: string, filters: ApiClinicalTimelineFilters = {}) {
  const params = new URLSearchParams();

  if (filters.sourceType && filters.sourceType !== 'all') {
    params.set('sourceType', filters.sourceType);
  }

  if (filters.layer && filters.layer !== 'all') {
    params.set('layer', filters.layer);
  }

  if (filters.tag && filters.tag !== 'all') {
    params.set('tag', filters.tag);
  }

  if (filters.severity && filters.severity !== 'all') {
    params.set('severity', filters.severity);
  }

  if (filters.from) {
    params.set('from', filters.from);
  }

  if (filters.to) {
    params.set('to', filters.to);
  }

  if (filters.q?.trim()) {
    params.set('q', filters.q.trim());
  }

  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }

  const query = params.toString();
  return request<ApiPatientTimelineItem[]>(
    `/clinical/patients/${patientId}/timeline${query ? `?${query}` : ''}`,
    { authenticated: true },
  );
}

export async function getClinicalTimelineItemDetail(itemId: string) {
  return request<ApiPatientTimelineItemDetail>(`/clinical/timeline/${itemId}`, { authenticated: true });
}

export async function getClinicalPatientAlerts(patientId: string, filters: ApiClinicalAlertFilters = {}) {
  const params = new URLSearchParams();

  if (filters.severity && filters.severity !== 'all') {
    params.set('severity', filters.severity);
  }

  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }

  if (filters.sourceType && filters.sourceType !== 'all') {
    params.set('sourceType', filters.sourceType);
  }

  if (filters.onlyActive != null) {
    params.set('onlyActive', String(filters.onlyActive));
  }

  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }

  const query = params.toString();
  return request<ApiClinicalAlert[]>(
    `/clinical/patients/${patientId}/alerts${query ? `?${query}` : ''}`,
    { authenticated: true },
  );
}

export async function exportClinicalPatientRecords(patientId: string) {
  return request<ApiClinicalRecordExport>(`/clinical/patients/${patientId}/records/export`, { authenticated: true });
}

export async function archiveClinicalTimelineItem(itemId: string, input: { reason?: string | null } = {}) {
  return request<ApiPatientTimelineItemDetail>(`/clinical/timeline/${itemId}/archive`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function startClinicalAppointmentSession(appointmentId: string) {
  return request<ApiClinicalSession>(`/clinical/appointments/${appointmentId}/session/start`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function completeClinicalAppointmentSession(appointmentId: string) {
  return request<ApiClinicalSession>(`/clinical/appointments/${appointmentId}/session/complete`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function createClinicalAppointmentDraft(appointmentId: string, input: {
  sessionNote?: string | null;
  contentText: string;
  tags: ApiClinicalTagInput[];
}) {
  return request<ApiClinicalDraft>(`/clinical/appointments/${appointmentId}/drafts`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function approveClinicalDraft(draftId: string, input: {
  contentText?: string | null;
}) {
  return request<ApiClinicalRecord>(`/clinical/drafts/${draftId}/approve`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function createClinicalRecordRectification(recordId: string) {
  return request<ApiClinicalDraft>(`/clinical/records/${recordId}/rectifications`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function applyClinicalAppointmentTags(appointmentId: string, input: {
  tags: ApiClinicalTagInput[];
  note?: string | null;
}) {
  return request<ApiAppliedClinicalTag[]>(`/clinical/appointments/${appointmentId}/tags`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function updateClinicalAppointmentConsent(appointmentId: string, consentType: string, input: {
  status: ApiPatientConsentStatus;
  termsVersion?: string | null;
  expiresAt?: string | null;
}) {
  return request<ApiPatientConsent>(`/clinical/appointments/${appointmentId}/consents/${consentType}`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function requestClinicalSensitiveConsents(appointmentId: string, input: {
  consentTypes: string[];
  termsVersion?: string | null;
}) {
  return request<ApiPatientConsent[]>(`/clinical/appointments/${appointmentId}/sensitive-consents/request`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function updatePatientPortalConsent(professionalId: string, consentType: string, input: {
  status: ApiPatientConsentStatus;
  termsVersion?: string | null;
  expiresAt?: string | null;
}) {
  return request<ApiPatientPortalConsent>(`/patients/me/consents/${professionalId}/${consentType}`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function updatePatientSensitiveConsent(professionalId: string, consentType: string, input: {
  status: ApiPatientConsentStatus;
  termsVersion?: string | null;
  expiresAt?: string | null;
}) {
  return request<ApiPatientPortalConsent>(`/patients/me/sensitive-consents/${professionalId}/${consentType}`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function updateClinicalAppointmentTreatmentPlan(appointmentId: string, input: {
  status: ApiTreatmentPlanStatus;
  caseFormulation?: string | null;
  goals: string[];
  strategies: string[];
  obstacles: string[];
  reviewCadence?: string | null;
}) {
  return request<ApiTreatmentPlan>(`/clinical/appointments/${appointmentId}/treatment-plan`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function createClinicalAppointmentTask(appointmentId: string, input: {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  acceptsResponse: boolean;
}) {
  return request<ApiPatientTask>(`/clinical/appointments/${appointmentId}/tasks`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function shareClinicalTask(taskId: string) {
  return request<ApiPatientTask>(`/clinical/tasks/${taskId}/share`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function unshareClinicalTask(taskId: string) {
  return request<ApiPatientTask>(`/clinical/tasks/${taskId}/unshare`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function createClinicalAppointmentMaterial(appointmentId: string, input: {
  materialType: ApiSharedMaterialType;
  title: string;
  description?: string | null;
  url?: string | null;
}) {
  return request<ApiSharedMaterial>(`/clinical/appointments/${appointmentId}/materials`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function shareClinicalMaterial(materialId: string) {
  return request<ApiSharedMaterial>(`/clinical/materials/${materialId}/share`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function unshareClinicalMaterial(materialId: string) {
  return request<ApiSharedMaterial>(`/clinical/materials/${materialId}/unshare`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function createClinicalAppointmentCheckIn(appointmentId: string, input: {
  prompt: string;
  contextNote?: string | null;
  dueAt?: string | null;
}) {
  return request<ApiPatientCheckIn>(`/clinical/appointments/${appointmentId}/check-ins`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function shareClinicalCheckIn(checkInId: string) {
  return request<ApiPatientCheckIn>(`/clinical/check-ins/${checkInId}/share`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function unshareClinicalCheckIn(checkInId: string) {
  return request<ApiPatientCheckIn>(`/clinical/check-ins/${checkInId}/unshare`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function createClinicalAppointmentAlert(appointmentId: string, input: {
  title: string;
  description: string;
  severity: ApiClinicalAlertSeverity;
}) {
  return request<ApiClinicalAlert>(`/clinical/appointments/${appointmentId}/alerts`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function reviewClinicalAlert(
  alertId: string,
  action: 'confirm' | 'dismiss' | 'monitor' | 'resolve',
  input: { reviewNote?: string | null } = {},
) {
  return request<ApiClinicalAlert>(`/clinical/alerts/${alertId}/${action}`, {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function createProfessionalBlockedTime(input: {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}) {
  return request<ApiBlockedTime>('/professionals/me/blocked-times', {
    method: 'POST',
    authenticated: true,
    body: input,
  });
}

export async function getNotifications() {
  return request<ApiNotification[]>('/notifications', { authenticated: true });
}

export async function markNotificationRead(notificationId: string) {
  return request<void>(`/notifications/${notificationId}/read`, {
    method: 'POST',
    authenticated: true,
  });
}

export function isApiOffline(error: unknown) {
  return error instanceof ApiError && error.status === 0;
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Não foi possível concluir a operação agora.';
}

async function authenticate(path: string, body: unknown) {
  const response = await request<ApiAuthResponse>(path, {
    method: 'POST',
    body,
  });

  await saveAuthSession(response.accessToken, response.refreshToken);

  return mapUser(response.user);
}

async function refreshAuthSession(refreshToken: string): Promise<RefreshedAuthSession> {
  const response = await request<ApiAuthResponse>('/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken },
  });

  await saveAuthSession(response.accessToken, response.refreshToken);

  return {
    user: mapUser(response.user),
    expiresAt: response.expiresAt,
  };
}

async function request<T>(path: string, options: RequestOptions = {}, retryAuth = true) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.authenticated) {
    const accessToken = await readToken(ACCESS_TOKEN_KEY);

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Consulta indisponível no momento. Tente novamente em instantes.', 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    if (options.authenticated && response.status === 401) {
      if (retryAuth) {
        await refreshStoredAuthSession();
        return request<T>(path, options, false);
      }

      await clearExpiredAuthSession();
      throw new ApiError('Sua sessão expirou. Entre novamente para continuar.', 401);
    }

    throw new ApiError(
      getPayloadMessage(payload) ?? 'Não foi possível concluir a operação agora.',
      response.status,
    );
  }

  return payload as T;
}

async function requestFormData<T>(
  path: string,
  formData: FormData,
  options: FormDataRequestOptions = {},
  retryAuth = true,
) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.authenticated) {
    const accessToken = await readToken(ACCESS_TOKEN_KEY);

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError('Servico indisponivel no momento. Tente novamente em instantes.', 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    if (options.authenticated && response.status === 401) {
      if (retryAuth) {
        await refreshStoredAuthSession();
        return requestFormData<T>(path, formData, options, false);
      }

      await clearExpiredAuthSession();
      throw new ApiError('Sua sessao expirou. Entre novamente para continuar.', 401);
    }

    throw new ApiError(
      getPayloadMessage(payload) ?? 'Nao foi possivel concluir a operacao agora.',
      response.status,
    );
  }

  return payload as T;
}

async function refreshStoredAuthSession() {
  const refreshToken = await readToken(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    await clearExpiredAuthSession();
    throw new ApiError('Sua sessão expirou. Entre novamente para continuar.', 401);
  }

  refreshSessionPromise ??= refreshAuthSession(refreshToken).finally(() => {
    refreshSessionPromise = null;
  });

  try {
    return await refreshSessionPromise;
  } catch (error) {
    await clearExpiredAuthSession();

    if (isApiOffline(error)) {
      throw error;
    }

    throw new ApiError('Sua sessão expirou. Entre novamente para continuar.', 401);
  }
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getPayloadMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }

  return null;
}

function mapUser(user: ApiUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: normalizeRole(user.role),
  };
}

function normalizeRole(role: ApiUser['role']): UserRole {
  switch (role) {
    case 'Customer':
      return 'customer';
    case 'SpaceAdmin':
      return 'space_admin';
    case 'SpaceManager':
      return 'space_manager';
    case 'Professional':
      return 'professional';
    case 'SuperAdmin':
      return 'super_admin';
    default:
      return role;
  }
}

async function saveAuthSession(accessToken: string, refreshToken: string) {
  await Promise.all([
    writeToken(ACCESS_TOKEN_KEY, accessToken),
    writeToken(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

async function clearAuthSession() {
  await Promise.all([removeToken(ACCESS_TOKEN_KEY), removeToken(REFRESH_TOKEN_KEY)]);
}

async function clearExpiredAuthSession() {
  await clearAuthSession();
  notifyAuthSessionExpired();
}

function notifyAuthSessionExpired() {
  authSessionExpiredListeners.forEach((listener) => {
    listener();
  });
}

async function readToken(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function writeToken(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function removeToken(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

function inferImageMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

function resolveApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const baseUrl = configuredUrl || DEFAULT_API_BASE_URL;
  const normalizedUrl = baseUrl.replace(/\/+$/, '');

  return normalizedUrl.replace(/\/api$/i, '');
}
