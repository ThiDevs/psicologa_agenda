import React, { createContext, useCallback, useMemo, useState } from 'react';

import {
  defaultCancellationPolicy,
  defaultOpeningHours,
  defaultPaymentSettings,
  defaultSpaceSettings,
  initialBlockedTimes,
  initialCategories,
  initialProfessionals,
  initialServices,
  initialSpaces,
  paymentMethods,
} from '@/data/initial-owner-config';
import type {
  ApiAppointment,
  ApiCancellationPolicy,
  ApiOpeningHour,
  ApiPaymentSettings,
  ApiProfessional,
  ApiProfessionalSchedule,
  ApiPublicSpaceDetails,
  ApiPublicSpaceListItem,
  ApiService,
  ApiSpace,
  ApiSpaceBookingSettings,
} from '@/services/api-client';
import type {
  Appointment,
  BlockedTime,
  Category,
  OnboardingItem,
  PaymentMethod,
  PaymentMethodId,
  Professional,
  Service,
  Space,
  TimeSlot,
} from '@/types/domain';
import {
  addMinutesToTime,
  combineDateAndTime,
  minutesFromTime,
  timeFromMinutes,
} from '@/utils/format';

type CreateSpaceInput = {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  published?: boolean;
  onboardingCompleted?: boolean;
};

type CreateAppointmentInput = {
  customerId: string;
  spaceId: string;
  serviceIds: string[];
  professionalId: string | null;
  anyProfessional: boolean;
  slot: TimeSlot;
  paymentMethodId: PaymentMethodId;
};

type OwnerConfigContextValue = {
  categories: Category[];
  spaces: Space[];
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  favoriteSpaceIds: string[];
  paymentMethods: PaymentMethod[];
  publishedSpaces: Space[];
  selectedOwnerSpace: Space | null;
  selectedOwnerSpaceId: string | null;
  setSelectedOwnerSpaceId: (spaceId: string) => void;
  syncSpacesFromApi: (items: ApiSpace[]) => void;
  syncPublicSpacesFromApi: (items: ApiPublicSpaceListItem[]) => void;
  syncPublicSpaceDetailsFromApi: (details: ApiPublicSpaceDetails) => void;
  syncServicesFromApi: (spaceId: string, items: ApiService[]) => void;
  syncProfessionalsFromApi: (spaceId: string, items: ApiProfessional[]) => void;
  syncProfessionalSchedulesFromApi: (
    spaceId: string,
    professionalId: string,
    items: ApiProfessionalSchedule[],
  ) => void;
  syncOpeningHoursFromApi: (spaceId: string, items: ApiOpeningHour[]) => void;
  syncBookingSettingsFromApi: (spaceId: string, settings: ApiSpaceBookingSettings) => void;
  syncPaymentSettingsFromApi: (spaceId: string, settings: ApiPaymentSettings) => void;
  syncCancellationPolicyFromApi: (spaceId: string, policy: ApiCancellationPolicy) => void;
  syncAppointmentsFromApi: (items: ApiAppointment[]) => void;
  addAppointmentFromApi: (item: ApiAppointment) => void;
  toggleFavorite: (spaceId: string) => void;
  createSpace: (input: CreateSpaceInput) => Space;
  completeStarterSetup: (spaceId: string) => void;
  getSpace: (spaceId: string | null) => Space | null;
  getServicesForSpace: (spaceId: string | null) => Service[];
  getProfessionalsForSpace: (spaceId: string | null) => Professional[];
  getCompatibleProfessionals: (spaceId: string | null, serviceIds: string[]) => Professional[];
  getOnboardingItems: (spaceId: string | null) => OnboardingItem[];
  getAvailablePaymentMethods: (spaceId: string | null) => PaymentMethod[];
  searchAvailability: (input: {
    spaceId: string | null;
    serviceIds: string[];
    professionalId: string | null;
    anyProfessional: boolean;
    date: string;
  }) => TimeSlot[];
  createAppointment: (input: CreateAppointmentInput) => Appointment | null;
};

const OwnerConfigContext = createContext<OwnerConfigContextValue | null>(null);

export function OwnerConfigProvider({ children }: { children: React.ReactNode }) {
  const [categories] = useState(initialCategories);
  const [spaces, setSpaces] = useState(initialSpaces);
  const [services, setServices] = useState(initialServices);
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [blockedTimes] = useState<BlockedTime[]>(initialBlockedTimes);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [favoriteSpaceIds, setFavoriteSpaceIds] = useState<string[]>([]);
  const [selectedOwnerSpaceId, setSelectedOwnerSpaceIdState] = useState<string | null>(null);

  const publishedSpaces = useMemo(
    () => spaces.filter((space) => space.active && space.published && space.onboardingCompleted),
    [spaces],
  );

  const selectedOwnerSpace = useMemo(
    () => spaces.find((space) => space.id === selectedOwnerSpaceId) ?? null,
    [selectedOwnerSpaceId, spaces],
  );

  const syncSpacesFromApi = useCallback((items: ApiSpace[]) => {
    setSpaces((current) => mergeSpaces(current, items.map((item) => mapApiSpace(item))));
    setSelectedOwnerSpaceIdState((current) =>
      current && items.some((item) => item.id === current)
        ? current
        : items[0]?.id ?? null,
    );
  }, []);

  const setSelectedOwnerSpaceId = useCallback((spaceId: string) => {
    setSelectedOwnerSpaceIdState(spaceId);
  }, []);

  const syncPublicSpacesFromApi = useCallback((items: ApiPublicSpaceListItem[]) => {
    const incomingSpaces = items.map((item) =>
      mapApiSpace({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        phone: item.phone,
        whatsapp: item.whatsapp,
        address: item.address,
        neighborhood: item.neighborhood,
        city: item.city,
        state: item.state,
        zipCode: null,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        active: true,
        published: true,
        onboardingCompleted: true,
      }, undefined, {
        distanceKm: item.distanceKm ?? undefined,
        minPrice: item.minPrice,
      }),
    );

    setSpaces((current) =>
      mergeSpaces(
        current,
        incomingSpaces,
        true,
      ),
    );
  }, []);

  const syncPublicSpaceDetailsFromApi = useCallback((details: ApiPublicSpaceDetails) => {
    setSpaces((current) => mergeSpaces(current, [mapApiSpace(details.space, details)]));
    setServices((current) => replaceForSpace(current, details.space.id, details.services.map(mapApiService)));
    setProfessionals((current) =>
      replaceForSpace(current, details.space.id, details.professionals.map(mapApiProfessional)),
    );
  }, []);

  const syncServicesFromApi = useCallback((spaceId: string, items: ApiService[]) => {
    setServices((current) => replaceForSpace(current, spaceId, items.map(mapApiService)));
  }, []);

  const syncProfessionalsFromApi = useCallback((spaceId: string, items: ApiProfessional[]) => {
    setProfessionals((current) => replaceForSpace(current, spaceId, items.map(mapApiProfessional)));
  }, []);

  const syncProfessionalSchedulesFromApi = useCallback((
    spaceId: string,
    professionalId: string,
    items: ApiProfessionalSchedule[],
  ) => {
    setProfessionals((current) =>
      current.map((professional) =>
        professional.spaceId === spaceId && professional.id === professionalId
          ? { ...professional, schedules: items.map(mapApiProfessionalSchedule) }
          : professional,
      ),
    );
  }, []);

  const syncOpeningHoursFromApi = useCallback((spaceId: string, items: ApiOpeningHour[]) => {
    setSpaces((current) =>
      current.map((space) =>
        space.id === spaceId
          ? { ...space, openingHours: items.map(mapApiOpeningHour) }
          : space,
      ),
    );
  }, []);

  const syncBookingSettingsFromApi = useCallback((spaceId: string, settings: ApiSpaceBookingSettings) => {
    setSpaces((current) =>
      current.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              settings: {
                ...space.settings,
                allowOnlineBooking: settings.allowOnlineBooking,
                requireManualApproval: settings.requireManualApproval,
              },
            }
          : space,
      ),
    );
  }, []);

  const syncPaymentSettingsFromApi = useCallback((spaceId: string, settings: ApiPaymentSettings) => {
    setSpaces((current) =>
      current.map((space) =>
        space.id === spaceId
          ? { ...space, paymentSettings: mapApiPaymentSettings(settings) }
          : space,
      ),
    );
  }, []);

  const syncCancellationPolicyFromApi = useCallback((spaceId: string, policy: ApiCancellationPolicy) => {
    setSpaces((current) =>
      current.map((space) =>
        space.id === spaceId
          ? { ...space, cancellationPolicy: mapApiCancellationPolicy(policy) }
          : space,
      ),
    );
  }, []);

  const syncAppointmentsFromApi = useCallback((items: ApiAppointment[]) => {
    setAppointments(items.map(mapApiAppointment));
  }, []);

  const addAppointmentFromApi = useCallback((item: ApiAppointment) => {
    setAppointments((current) => [mapApiAppointment(item), ...current]);
  }, []);

  const getSpace = useCallback(
    (spaceId: string | null) => spaces.find((space) => space.id === spaceId) ?? null,
    [spaces],
  );

  const getServicesForSpace = useCallback(
    (spaceId: string | null) =>
      services.filter(
        (service) =>
          service.spaceId === spaceId &&
          service.active &&
          service.onlineBooking &&
          service.price > 0 &&
          service.durationMinutes > 0 &&
          professionals.some(
            (professional) =>
              professional.spaceId === spaceId &&
              professional.active &&
              professional.serviceIds.includes(service.id),
          ),
      ),
    [professionals, services],
  );

  const getProfessionalsForSpace = useCallback(
    (spaceId: string | null) =>
      professionals.filter((professional) => professional.spaceId === spaceId && professional.active),
    [professionals],
  );

  const getCompatibleProfessionals = useCallback(
    (spaceId: string | null, serviceIds: string[]) =>
      getProfessionalsForSpace(spaceId).filter((professional) =>
        serviceIds.every((serviceId) => professional.serviceIds.includes(serviceId)),
      ),
    [getProfessionalsForSpace],
  );

  const getOnboardingItems = useCallback(
    (spaceId: string | null) => {
      const space = getSpace(spaceId);
      const spaceServices = services.filter((service) => service.spaceId === spaceId && service.active);
      const spaceProfessionals = professionals.filter(
        (professional) => professional.spaceId === spaceId && professional.active,
      );
      const hasProfessionalService = spaceProfessionals.some((professional) =>
        professional.serviceIds.some((serviceId) =>
          spaceServices.some((service) => service.id === serviceId),
        ),
      );
      const hasProfessionalSchedule = spaceProfessionals.some((professional) =>
        professional.schedules.some((schedule) => schedule.active),
      );

      return [
        {
          id: 'space-data',
          label: 'Dados básicos do consultório',
          complete: Boolean(space?.name && space?.address && space?.phone),
        },
        {
          id: 'services',
          label: 'Pelo menos 1 consulta ativa',
          complete: spaceServices.length > 0,
        },
        {
          id: 'professionals',
          label: 'Pelo menos 1 psicóloga ativa',
          complete: spaceProfessionals.length > 0,
        },
        {
          id: 'professional-services',
          label: 'Consultas vinculadas a psicólogas',
          complete: hasProfessionalService,
        },
        {
          id: 'opening-hours',
          label: 'Horário de funcionamento',
          complete: Boolean(space?.openingHours.some((hour) => hour.isOpen)),
        },
        {
          id: 'professional-schedule',
          label: 'Agenda da psicóloga',
          complete: hasProfessionalSchedule,
        },
        {
          id: 'payment',
          label: 'Forma de pagamento configurada',
          complete: Boolean(
            space &&
              (space.paymentSettings.allowPix ||
                space.paymentSettings.allowCreditCard ||
                space.paymentSettings.allowDebitCard ||
                space.paymentSettings.allowPayOnSite),
          ),
        },
        {
          id: 'cancellation',
          label: 'Política de cancelamento',
          complete: Boolean(space?.cancellationPolicy.policyText),
        },
      ];
    },
    [getSpace, professionals, services],
  );

  const toggleFavorite = useCallback((spaceId: string) => {
    setFavoriteSpaceIds((current) =>
      current.includes(spaceId)
        ? current.filter((id) => id !== spaceId)
        : [...current, spaceId],
    );
  }, []);

  const createSpace = useCallback((input: CreateSpaceInput) => {
    const id = input.id ?? `space-${Date.now()}`;
    const nextSpace: Space = {
      id,
      name: input.name.trim() || 'Novo consultório',
      description: input.description.trim() || 'Consultório em configuração.',
      categoryId: input.categoryId,
      imageUrl: '',
      photos: [],
      address: input.address.trim() || 'Endereço pendente',
      neighborhood: input.neighborhood.trim() || 'Bairro',
      city: input.city.trim() || 'Cidade',
      state: input.state.trim() || 'UF',
      zipCode: input.zipCode?.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim(),
      rating: 0,
      reviewsCount: 0,
      openingHours: defaultOpeningHours.map((hour) => ({ ...hour })),
      settings: { ...defaultSpaceSettings },
      paymentSettings: { ...defaultPaymentSettings },
      cancellationPolicy: { ...defaultCancellationPolicy },
      active: true,
      published: input.published ?? false,
      onboardingCompleted: input.onboardingCompleted ?? false,
    };

    setSpaces((current) => [nextSpace, ...current]);
    setSelectedOwnerSpaceIdState(nextSpace.id);

    return nextSpace;
  }, []);

  const completeStarterSetup = useCallback((spaceId: string) => {
    setSpaces((current) =>
      current.map((space) =>
        space.id === spaceId
          ? { ...space, published: true, onboardingCompleted: true }
          : space,
      ),
    );
  }, []);

  const getAvailablePaymentMethods = useCallback(
    (spaceId: string | null) => {
      const space = getSpace(spaceId);

      if (!space) {
        return [];
      }

      return paymentMethods.filter((method) => {
        switch (method.id) {
          case 'pix':
            return space.paymentSettings.allowPix;
          case 'credit_card':
            return space.paymentSettings.allowCreditCard;
          case 'debit_card':
            return space.paymentSettings.allowDebitCard;
          case 'pay_on_site':
            return space.paymentSettings.allowPayOnSite;
          default:
            return false;
        }
      });
    },
    [getSpace],
  );

  const searchAvailability = useCallback(
    ({
      spaceId,
      serviceIds,
      professionalId,
      anyProfessional,
      date,
    }: {
      spaceId: string | null;
      serviceIds: string[];
      professionalId: string | null;
      anyProfessional: boolean;
      date: string;
    }) => {
      const space = getSpace(spaceId);

      if (!space || !space.settings.allowOnlineBooking || serviceIds.length === 0) {
        return [];
      }

      const selectedServices = services.filter((service) => serviceIds.includes(service.id));
      const totalMinutes = selectedServices.reduce(
        (total, service) => total + service.durationMinutes + (service.bufferAfterMinutes ?? 0),
        0,
      );
      const candidateProfessionals = anyProfessional
        ? getCompatibleProfessionals(spaceId, serviceIds)
        : getCompatibleProfessionals(spaceId, serviceIds).filter(
            (professional) => professional.id === professionalId,
          );
      const dateObject = new Date(`${date}T12:00:00`);
      const dayOfWeek = dateObject.getDay();
      const openingHour = space.openingHours.find((hour) => hour.dayOfWeek === dayOfWeek);

      if (!openingHour?.isOpen || !openingHour.startTime || !openingHour.endTime) {
        return [];
      }

      const slotsByStartTime = new Map<string, TimeSlot>();

      candidateProfessionals.forEach((professional) => {
        const schedule = professional.schedules.find(
          (item) => item.dayOfWeek === dayOfWeek && item.active,
        );

        if (!schedule) {
          return;
        }

        const startMinute = Math.max(
          minutesFromTime(openingHour.startTime ?? schedule.startTime),
          minutesFromTime(schedule.startTime),
        );
        const endMinute = Math.min(
          minutesFromTime(openingHour.endTime ?? schedule.endTime),
          minutesFromTime(schedule.endTime),
        );

        for (
          let cursor = startMinute;
          cursor + totalMinutes <= endMinute;
          cursor += space.settings.slotGranularityMinutes
        ) {
          const startTime = timeFromMinutes(cursor);
          const endTime = addMinutesToTime(startTime, totalMinutes);

          if (
            overlapsBreak(cursor, cursor + totalMinutes, schedule.breakStartTime, schedule.breakEndTime) ||
            overlapsBlockedTime({
              blockedTimes,
              appointments,
              date,
              spaceId: space.id,
              professionalId: professional.id,
              startTime,
              endTime,
            })
          ) {
            continue;
          }

          if (!slotsByStartTime.has(startTime)) {
            slotsByStartTime.set(startTime, {
              id: `${date}-${professional.id}-${startTime}`,
              date,
              startTime,
              endTime,
              professionalId: professional.id,
              available: true,
            });
          }
        }
      });

      return Array.from(slotsByStartTime.values()).sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
    },
    [
      appointments,
      blockedTimes,
      getCompatibleProfessionals,
      getSpace,
      services,
    ],
  );

  const createAppointment = useCallback(
    (input: CreateAppointmentInput) => {
      const space = getSpace(input.spaceId);
      const selectedServices = services.filter((service) => input.serviceIds.includes(service.id));
      const selectedMethod = paymentMethods.find((method) => method.id === input.paymentMethodId);

      if (!space || !space.settings.allowOnlineBooking || selectedServices.length === 0 || !selectedMethod) {
        return null;
      }

      const totalDurationMinutes = selectedServices.reduce(
        (total, service) => total + service.durationMinutes,
        0,
      );
      const subtotal = selectedServices.reduce((total, service) => total + service.price, 0);
      const serviceFee = Math.round(subtotal * (space.paymentSettings.serviceFeePercentage / 100));
      const total = subtotal + serviceFee;
      const id = `appointment-${Date.now()}`;
      const requiresManualApproval = !selectedMethod.online && space.settings.requireManualApproval;
      const appointment: Appointment = {
        id,
        code: `PSI-${String(appointments.length + 1).padStart(5, '0')}`,
        customerId: input.customerId,
        spaceId: input.spaceId,
        professionalId: input.professionalId ?? input.slot.professionalId,
        anyProfessional: input.anyProfessional,
        serviceIds: input.serviceIds,
        startDateTime: combineDateAndTime(input.slot.date, input.slot.startTime),
        endDateTime: combineDateAndTime(input.slot.date, input.slot.endTime),
        totalDurationMinutes,
        subtotal,
        serviceFee,
        total,
        status: selectedMethod.online
          ? 'pending_payment'
          : requiresManualApproval
            ? 'pending_confirmation'
            : 'confirmed',
        paymentMethodId: input.paymentMethodId,
        paymentStatus: selectedMethod.online ? 'pending' : 'not_required',
        createdAt: new Date().toISOString(),
        expiresAt: selectedMethod.online
          ? new Date(Date.now() + space.paymentSettings.reservationExpirationMinutes * 60 * 1000)
              .toISOString()
          : undefined,
      };

      setAppointments((current) => [appointment, ...current]);

      return appointment;
    },
    [appointments.length, getSpace, services],
  );

  const value = useMemo(
    () => ({
      categories,
      spaces,
      services,
      professionals,
      appointments,
      favoriteSpaceIds,
      paymentMethods,
      publishedSpaces,
      selectedOwnerSpace,
      selectedOwnerSpaceId,
      setSelectedOwnerSpaceId,
      syncSpacesFromApi,
      syncPublicSpacesFromApi,
      syncPublicSpaceDetailsFromApi,
      syncServicesFromApi,
      syncProfessionalsFromApi,
      syncProfessionalSchedulesFromApi,
      syncOpeningHoursFromApi,
      syncBookingSettingsFromApi,
      syncPaymentSettingsFromApi,
      syncCancellationPolicyFromApi,
      syncAppointmentsFromApi,
      addAppointmentFromApi,
      toggleFavorite,
      createSpace,
      completeStarterSetup,
      getSpace,
      getServicesForSpace,
      getProfessionalsForSpace,
      getCompatibleProfessionals,
      getOnboardingItems,
      getAvailablePaymentMethods,
      searchAvailability,
      createAppointment,
    }),
    [
      appointments,
      addAppointmentFromApi,
      categories,
      completeStarterSetup,
      createAppointment,
      createSpace,
      favoriteSpaceIds,
      getAvailablePaymentMethods,
      getCompatibleProfessionals,
      getOnboardingItems,
      getProfessionalsForSpace,
      getServicesForSpace,
      getSpace,
      professionals,
      publishedSpaces,
      selectedOwnerSpace,
      selectedOwnerSpaceId,
      setSelectedOwnerSpaceId,
      searchAvailability,
      services,
      spaces,
      syncAppointmentsFromApi,
      syncOpeningHoursFromApi,
      syncBookingSettingsFromApi,
      syncPaymentSettingsFromApi,
      syncCancellationPolicyFromApi,
      syncProfessionalSchedulesFromApi,
      syncProfessionalsFromApi,
      syncPublicSpaceDetailsFromApi,
      syncPublicSpacesFromApi,
      syncServicesFromApi,
      syncSpacesFromApi,
      toggleFavorite,
    ],
  );

  return <OwnerConfigContext.Provider value={value}>{children}</OwnerConfigContext.Provider>;
}

export function useOwnerConfig() {
  const context = React.use(OwnerConfigContext);

  if (!context) {
    throw new Error('useOwnerConfig must be used inside OwnerConfigProvider');
  }

  return context;
}

function mergeSpaces(current: Space[], incoming: Space[], incomingFirst = false) {
  if (incomingFirst) {
    const currentById = new Map(current.map((space) => [space.id, space]));
    const incomingIds = new Set(incoming.map((space) => space.id));

    return [
      ...incoming.map((space) => ({
        ...(currentById.get(space.id) ?? space),
        ...space,
      })),
      ...current.filter((space) => !incomingIds.has(space.id)),
    ];
  }

  const nextById = new Map(current.map((space) => [space.id, space]));

  incoming.forEach((space) => {
    nextById.set(space.id, {
      ...(nextById.get(space.id) ?? space),
      ...space,
    });
  });

  return Array.from(nextById.values());
}

function replaceForSpace<T extends { spaceId: string }>(current: T[], spaceId: string, incoming: T[]) {
  return [...incoming, ...current.filter((item) => item.spaceId !== spaceId)];
}

function mapApiSpace(
  apiSpace: ApiSpace,
  details?: ApiPublicSpaceDetails,
  publicMetadata?: { distanceKm?: number; minPrice?: number },
): Space {
  return {
    id: apiSpace.id,
    name: apiSpace.name,
    description: apiSpace.description,
    categoryId: apiSpace.category,
    imageUrl: details?.photos?.[0]?.url ?? '',
    photos: details?.photos?.map((photo) => ({
      id: photo.id,
      spaceId: photo.spaceId,
      url: photo.url,
      caption: photo.caption ?? undefined,
      sortOrder: photo.sortOrder,
      active: photo.active,
    })) ?? [],
    address: apiSpace.address,
    neighborhood: apiSpace.neighborhood,
    city: apiSpace.city,
    state: apiSpace.state,
    zipCode: apiSpace.zipCode ?? undefined,
    latitude: apiSpace.latitude ?? undefined,
    longitude: apiSpace.longitude ?? undefined,
    phone: apiSpace.phone,
    whatsapp: apiSpace.whatsapp,
    rating: 0,
    reviewsCount: 0,
    ...(publicMetadata?.minPrice === undefined ? {} : { minPrice: publicMetadata.minPrice }),
    ...(publicMetadata?.distanceKm === undefined ? {} : { distanceKm: publicMetadata.distanceKm }),
    openingHours: details?.openingHours.map(mapApiOpeningHour) ?? defaultOpeningHours.map((hour) => ({ ...hour })),
    settings: {
      ...defaultSpaceSettings,
      allowOnlineBooking: apiSpace.allowOnlineBooking ?? defaultSpaceSettings.allowOnlineBooking,
      requireManualApproval: apiSpace.requireManualApproval ?? defaultSpaceSettings.requireManualApproval,
    },
    paymentSettings: details?.paymentSettings
      ? mapApiPaymentSettings(details.paymentSettings)
      : { ...defaultPaymentSettings },
    cancellationPolicy: details?.cancellationPolicy
      ? mapApiCancellationPolicy(details.cancellationPolicy)
      : { ...defaultCancellationPolicy },
    active: apiSpace.active,
    published: apiSpace.published,
    onboardingCompleted: apiSpace.onboardingCompleted,
  };
}

function mapApiService(service: ApiService): Service {
  return {
    id: service.id,
    spaceId: service.spaceId,
    name: service.name,
    description: service.description,
    categoryId: service.category,
    price: service.price,
    durationMinutes: service.durationMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    iconName: 'videocam-outline',
    active: service.active,
    onlineBooking: service.onlineBooking,
  };
}

function mapApiProfessional(professional: ApiProfessional): Professional {
  return {
    id: professional.id,
    spaceId: professional.spaceId,
    name: professional.name,
    email: professional.email ?? undefined,
    photoUrl: '',
    specialty: professional.specialty,
    experienceYears: professional.experienceYears,
    rating: 0,
    reviewsCount: 0,
    serviceIds: professional.serviceIds,
    schedules: [],
    active: professional.active,
  };
}

function mapApiProfessionalSchedule(schedule: ApiProfessionalSchedule) {
  return {
    id: schedule.id,
    professionalId: schedule.professionalId,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    breakStartTime: schedule.breakStartTime ?? undefined,
    breakEndTime: schedule.breakEndTime ?? undefined,
    active: schedule.active,
  };
}

function mapApiOpeningHour(hour: ApiOpeningHour) {
  return {
    id: hour.id || `open-${hour.dayOfWeek}`,
    dayOfWeek: hour.dayOfWeek,
    isOpen: hour.isOpen,
    startTime: hour.startTime ?? undefined,
    endTime: hour.endTime ?? undefined,
  };
}

function mapApiPaymentSettings(settings: ApiPaymentSettings) {
  return {
    allowPix: settings.allowPix,
    allowCreditCard: settings.allowCreditCard,
    allowDebitCard: settings.allowDebitCard,
    allowPayOnSite: settings.allowPayOnSite,
    requirePrePayment: settings.requirePrePayment,
    requireDeposit: settings.requireDeposit,
    depositType: settings.depositType ?? undefined,
    depositValue: settings.depositValue ?? undefined,
    serviceFeePercentage: settings.serviceFeePercentage,
    reservationExpirationMinutes: settings.reservationExpirationMinutes,
  };
}

function mapApiCancellationPolicy(policy: ApiCancellationPolicy) {
  return {
    allowCustomerCancel: policy.allowCustomerCancel,
    freeCancelBeforeHours: policy.freeCancelBeforeHours,
    allowReschedule: policy.allowReschedule,
    freeRescheduleBeforeHours: policy.freeRescheduleBeforeHours,
    chargeLateCancelFee: policy.chargeLateCancelFee,
    lateCancelFee: policy.lateCancelFee ?? undefined,
    policyText: policy.policyText,
  };
}

function mapApiAppointment(appointment: ApiAppointment): Appointment {
  return {
    id: appointment.id,
    code: appointment.code,
    customerId: appointment.customerId,
    spaceId: appointment.spaceId,
    professionalId: appointment.professionalId,
    anyProfessional: appointment.anyProfessional,
    serviceIds: appointment.serviceIds,
    startDateTime: appointment.startDateTime,
    endDateTime: appointment.endDateTime,
    totalDurationMinutes: appointment.totalDurationMinutes,
    subtotal: appointment.subtotal,
    serviceFee: appointment.serviceFee,
    total: appointment.total,
    status: appointment.status === 'reserved' ? 'pending_payment' : appointment.status,
    paymentMethodId: appointment.paymentMethodId,
    paymentStatus: appointment.paymentStatus,
    createdAt: appointment.createdAt,
    expiresAt: appointment.expiresAt ?? undefined,
  };
}

function overlapsBreak(
  startMinute: number,
  endMinute: number,
  breakStartTime?: string,
  breakEndTime?: string,
) {
  if (!breakStartTime || !breakEndTime) {
    return false;
  }

  return startMinute < minutesFromTime(breakEndTime) && endMinute > minutesFromTime(breakStartTime);
}

function overlapsBlockedTime({
  blockedTimes,
  appointments,
  date,
  spaceId,
  professionalId,
  startTime,
  endTime,
}: {
  blockedTimes: BlockedTime[];
  appointments: Appointment[];
  date: string;
  spaceId: string;
  professionalId: string;
  startTime: string;
  endTime: string;
}) {
  const startMinute = minutesFromTime(startTime);
  const endMinute = minutesFromTime(endTime);

  const blocked = blockedTimes.some((blockedTime) => {
    const appliesToDate = blockedTime.date === '' || blockedTime.date === date;
    const appliesToSpace = blockedTime.spaceId === spaceId;
    const appliesToProfessional =
      !blockedTime.professionalId || blockedTime.professionalId === professionalId;

    return (
      appliesToDate &&
      appliesToSpace &&
      appliesToProfessional &&
      startMinute < minutesFromTime(blockedTime.endTime) &&
      endMinute > minutesFromTime(blockedTime.startTime)
    );
  });

  if (blocked) {
    return true;
  }

  return appointments.some((appointment) => {
    if (
      appointment.spaceId !== spaceId ||
      appointment.professionalId !== professionalId ||
      !['confirmed', 'pending_payment', 'pending_confirmation'].includes(appointment.status)
    ) {
      return false;
    }

    const appointmentDate = appointment.startDateTime.slice(0, 10);
    const appointmentStart = appointment.startDateTime.slice(11, 16);
    const appointmentEnd = appointment.endDateTime.slice(11, 16);

    return (
      appointmentDate === date &&
      startMinute < minutesFromTime(appointmentEnd) &&
      endMinute > minutesFromTime(appointmentStart)
    );
  });
}
