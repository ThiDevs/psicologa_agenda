export type UserRole =
  | 'customer'
  | 'space_admin'
  | 'space_manager'
  | 'professional'
  | 'super_admin';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
};

export type Category = {
  id: string;
  label: string;
  iconName: string;
};

export type OpeningHour = {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime?: string;
  endTime?: string;
};

export type SpaceSettings = {
  bookingLeadTimeMinutes: number;
  bookingMaxDaysAhead: number;
  slotGranularityMinutes: number;
  defaultBufferAfterMinutes: number;
  allowCustomerChooseProfessional: boolean;
  allowAnyProfessional: boolean;
  requireManualApproval: boolean;
  allowOnlineBooking: boolean;
};

export type SpacePaymentSettings = {
  allowPix: boolean;
  allowCreditCard: boolean;
  allowDebitCard: boolean;
  allowPayOnSite: boolean;
  requirePrePayment: boolean;
  requireDeposit: boolean;
  depositType?: 'fixed' | 'percentage';
  depositValue?: number;
  serviceFeePercentage: number;
  reservationExpirationMinutes: number;
};

export type SpaceCancellationPolicy = {
  allowCustomerCancel: boolean;
  freeCancelBeforeHours: number;
  allowReschedule: boolean;
  freeRescheduleBeforeHours: number;
  chargeLateCancelFee: boolean;
  lateCancelFee?: number;
  policyText: string;
};

export type Space = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl: string;
  photos?: SpacePhoto[];
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  whatsapp: string;
  rating: number;
  reviewsCount: number;
  minPrice?: number;
  distanceKm?: number;
  openingHours: OpeningHour[];
  settings: SpaceSettings;
  paymentSettings: SpacePaymentSettings;
  cancellationPolicy: SpaceCancellationPolicy;
  active: boolean;
  published: boolean;
  onboardingCompleted: boolean;
};

export type SpacePhoto = {
  id: string;
  spaceId: string;
  url: string;
  caption?: string;
  sortOrder: number;
  active: boolean;
};

export type Service = {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  durationMinutes: number;
  bufferAfterMinutes?: number;
  iconName: string;
  active: boolean;
  onlineBooking: boolean;
};

export type ProfessionalSchedule = {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  active: boolean;
};

export type Professional = {
  id: string;
  spaceId: string;
  name: string;
  email?: string;
  photoUrl: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  reviewsCount: number;
  serviceIds: string[];
  schedules: ProfessionalSchedule[];
  active: boolean;
};

export type BlockedTime = {
  id: string;
  spaceId: string;
  professionalId?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export type TimeSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  professionalId: string;
  available: boolean;
  reason?: string;
};

export type PaymentMethodId = 'pix' | 'credit_card' | 'debit_card' | 'pay_on_site';

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  iconName: string;
  online: boolean;
};

export type AppointmentStatus =
  | 'pending_payment'
  | 'pending_confirmation'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'not_required';

export type Appointment = {
  id: string;
  code: string;
  customerId: string;
  spaceId: string;
  professionalId?: string;
  anyProfessional: boolean;
  serviceIds: string[];
  startDateTime: string;
  endDateTime: string;
  totalDurationMinutes: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: AppointmentStatus;
  paymentMethodId: PaymentMethodId;
  paymentStatus: PaymentStatus;
  createdAt: string;
  expiresAt?: string;
};

export type OnboardingItem = {
  id: string;
  label: string;
  complete: boolean;
};
