import type {
  BlockedTime,
  Category,
  OpeningHour,
  PaymentMethod,
  Professional,
  Service,
  Space,
  SpaceCancellationPolicy,
  SpacePaymentSettings,
  SpaceSettings,
} from '@/types/domain';

export const defaultOpeningHours: OpeningHour[] = [
  { id: 'open-mon', dayOfWeek: 1, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { id: 'open-tue', dayOfWeek: 2, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { id: 'open-wed', dayOfWeek: 3, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { id: 'open-thu', dayOfWeek: 4, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { id: 'open-fri', dayOfWeek: 5, isOpen: true, startTime: '08:00', endTime: '18:00' },
  { id: 'open-sat', dayOfWeek: 6, isOpen: false },
  { id: 'open-sun', dayOfWeek: 0, isOpen: false },
];

export const defaultSpaceSettings: SpaceSettings = {
  bookingLeadTimeMinutes: 240,
  bookingMaxDaysAhead: 45,
  slotGranularityMinutes: 30,
  defaultBufferAfterMinutes: 10,
  allowCustomerChooseProfessional: true,
  allowAnyProfessional: false,
  requireManualApproval: false,
  allowOnlineBooking: true,
};

export const defaultPaymentSettings: SpacePaymentSettings = {
  allowPix: true,
  allowCreditCard: true,
  allowDebitCard: false,
  allowPayOnSite: false,
  requirePrePayment: false,
  requireDeposit: false,
  serviceFeePercentage: 0,
  reservationExpirationMinutes: 20,
};

export const defaultCancellationPolicy: SpaceCancellationPolicy = {
  allowCustomerCancel: true,
  freeCancelBeforeHours: 24,
  allowReschedule: true,
  freeRescheduleBeforeHours: 24,
  chargeLateCancelFee: false,
  policyText: 'Cancelamentos e reagendamentos gratuitos até 24h antes da consulta.',
};

export const initialCategories: Category[] = [
  { id: 'therapy', label: 'Terapia', iconName: 'chatbubbles-outline' },
  { id: 'online', label: 'Online', iconName: 'videocam-outline' },
  { id: 'return', label: 'Retorno', iconName: 'refresh-outline' },
  { id: 'family', label: 'Família', iconName: 'people-outline' },
  { id: 'supervision', label: 'Supervisão', iconName: 'school-outline' },
];

export const initialSpaces: Space[] = [
  {
    id: 'clinic-helena-online',
    name: 'Clínica Online Dra. Helena',
    description:
      'Atendimento psicológico online para adultos, ansiedade, autoconhecimento e organização emocional.',
    categoryId: 'therapy',
    imageUrl:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
    photos: [
      {
        id: 'clinic-helena-photo-1',
        spaceId: 'clinic-helena-online',
        url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
        caption: 'Ambiente reservado para teleatendimento',
        sortOrder: 1,
        active: true,
      },
      {
        id: 'clinic-helena-photo-2',
        spaceId: 'clinic-helena-online',
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
        caption: 'Sessões por videochamada',
        sortOrder: 2,
        active: true,
      },
    ],
    address: 'Atendimento online',
    neighborhood: 'Online',
    city: 'Vitória',
    state: 'ES',
    zipCode: '29000-000',
    phone: '(27) 99999-0101',
    whatsapp: '(27) 99999-0101',
    rating: 4.9,
    reviewsCount: 86,
    minPrice: 180,
    openingHours: defaultOpeningHours.map((hour) => ({ ...hour })),
    settings: { ...defaultSpaceSettings },
    paymentSettings: { ...defaultPaymentSettings },
    cancellationPolicy: { ...defaultCancellationPolicy },
    active: true,
    published: true,
    onboardingCompleted: true,
  },
];

export const initialServices: Service[] = [
  {
    id: 'consultation-initial-online',
    spaceId: 'clinic-helena-online',
    name: 'Consulta inicial online',
    description: 'Primeira sessão para acolhimento, escuta inicial e definição dos próximos passos.',
    categoryId: 'online',
    price: 220,
    durationMinutes: 60,
    bufferAfterMinutes: 10,
    iconName: 'videocam-outline',
    active: true,
    onlineBooking: true,
  },
  {
    id: 'therapy-session-online',
    spaceId: 'clinic-helena-online',
    name: 'Sessão de terapia online',
    description: 'Sessão individual de acompanhamento psicológico por videochamada.',
    categoryId: 'therapy',
    price: 180,
    durationMinutes: 50,
    bufferAfterMinutes: 10,
    iconName: 'chatbubbles-outline',
    active: true,
    onlineBooking: true,
  },
  {
    id: 'therapy-return-online',
    spaceId: 'clinic-helena-online',
    name: 'Retorno terapêutico',
    description: 'Sessão de continuidade para clientes já em acompanhamento.',
    categoryId: 'return',
    price: 180,
    durationMinutes: 50,
    bufferAfterMinutes: 10,
    iconName: 'refresh-outline',
    active: true,
    onlineBooking: true,
  },
  {
    id: 'parental-guidance-online',
    spaceId: 'clinic-helena-online',
    name: 'Orientação parental',
    description: 'Encontro online para responsáveis alinharem condutas e próximos passos.',
    categoryId: 'family',
    price: 240,
    durationMinutes: 70,
    bufferAfterMinutes: 10,
    iconName: 'people-outline',
    active: true,
    onlineBooking: true,
  },
];

export const initialProfessionals: Professional[] = [
  {
    id: 'dra-helena-martins',
    spaceId: 'clinic-helena-online',
    name: 'Dra. Helena Martins',
    email: 'helena@psiagenda.local',
    photoUrl: '',
    specialty: 'Psicóloga clínica • CRP 16/12345',
    experienceYears: 11,
    rating: 4.9,
    reviewsCount: 86,
    serviceIds: initialServices.map((service) => service.id),
    schedules: [
      {
        id: 'schedule-helena-mon',
        professionalId: 'dra-helena-martins',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '20:00',
        breakStartTime: '12:00',
        breakEndTime: '13:30',
        active: true,
      },
      {
        id: 'schedule-helena-tue',
        professionalId: 'dra-helena-martins',
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '20:00',
        breakStartTime: '12:00',
        breakEndTime: '13:30',
        active: true,
      },
      {
        id: 'schedule-helena-wed',
        professionalId: 'dra-helena-martins',
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '20:00',
        breakStartTime: '12:30',
        breakEndTime: '14:00',
        active: true,
      },
      {
        id: 'schedule-helena-thu',
        professionalId: 'dra-helena-martins',
        dayOfWeek: 4,
        startTime: '08:00',
        endTime: '19:00',
        breakStartTime: '12:00',
        breakEndTime: '13:30',
        active: true,
      },
      {
        id: 'schedule-helena-fri',
        professionalId: 'dra-helena-martins',
        dayOfWeek: 5,
        startTime: '08:00',
        endTime: '18:00',
        breakStartTime: '12:00',
        breakEndTime: '13:30',
        active: true,
      },
    ],
    active: true,
  },
];

export const initialBlockedTimes: BlockedTime[] = [
  {
    id: 'blocked-clinical-study',
    spaceId: 'clinic-helena-online',
    professionalId: 'dra-helena-martins',
    date: '',
    startTime: '17:30',
    endTime: '18:00',
    reason: 'Intervalo clínico',
  },
];

export const paymentMethods: PaymentMethod[] = [
  { id: 'pix', label: 'Pix combinado', iconName: 'qr-code-outline', online: true },
  { id: 'credit_card', label: 'Cartão combinado', iconName: 'card-outline', online: true },
  { id: 'debit_card', label: 'Débito combinado', iconName: 'wallet-outline', online: true },
  { id: 'pay_on_site', label: 'Pagamento combinado', iconName: 'chatbubble-ellipses-outline', online: false },
];
