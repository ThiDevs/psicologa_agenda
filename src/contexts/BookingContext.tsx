import React, { createContext, useCallback, useMemo, useState } from 'react';

import type { PaymentMethodId, TimeSlot } from '@/types/domain';

type BookingState = {
  selectedSpaceId: string | null;
  selectedServiceIds: string[];
  selectedProfessionalId: string | null;
  anyProfessional: boolean;
  selectedDate: string | null;
  selectedTimeSlot: TimeSlot | null;
  paymentMethodId: PaymentMethodId | null;
  appointmentId: string | null;
};

type BookingContextValue = {
  state: BookingState;
  selectSpace: (spaceId: string) => void;
  toggleService: (serviceId: string) => void;
  clearServices: () => void;
  selectProfessional: (professionalId: string) => void;
  selectAnyProfessional: () => void;
  selectDate: (date: string) => void;
  selectTimeSlot: (slot: TimeSlot) => void;
  selectPaymentMethod: (methodId: PaymentMethodId) => void;
  setAppointmentId: (appointmentId: string) => void;
  resetBooking: () => void;
};

const initialState: BookingState = {
  selectedSpaceId: null,
  selectedServiceIds: [],
  selectedProfessionalId: null,
  anyProfessional: false,
  selectedDate: null,
  selectedTimeSlot: null,
  paymentMethodId: null,
  appointmentId: null,
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState);

  const selectSpace = useCallback((spaceId: string) => {
    setState({
      ...initialState,
      selectedSpaceId: spaceId,
    });
  }, []);

  const toggleService = useCallback((serviceId: string) => {
    setState((current) => {
      const selectedServiceIds = current.selectedServiceIds.includes(serviceId)
        ? current.selectedServiceIds.filter((id) => id !== serviceId)
        : [...current.selectedServiceIds, serviceId];

      return {
        ...current,
        selectedServiceIds,
        selectedProfessionalId: null,
        anyProfessional: false,
        selectedDate: null,
        selectedTimeSlot: null,
        appointmentId: null,
      };
    });
  }, []);

  const clearServices = useCallback(() => {
    setState((current) => ({
      ...current,
      selectedServiceIds: [],
      selectedProfessionalId: null,
      anyProfessional: false,
      selectedDate: null,
      selectedTimeSlot: null,
      appointmentId: null,
    }));
  }, []);

  const selectProfessional = useCallback((professionalId: string) => {
    setState((current) => ({
      ...current,
      selectedProfessionalId: professionalId,
      anyProfessional: false,
      selectedDate: null,
      selectedTimeSlot: null,
      appointmentId: null,
    }));
  }, []);

  const selectAnyProfessional = useCallback(() => {
    setState((current) => ({
      ...current,
      selectedProfessionalId: null,
      anyProfessional: true,
      selectedDate: null,
      selectedTimeSlot: null,
      appointmentId: null,
    }));
  }, []);

  const selectDate = useCallback((date: string) => {
    setState((current) => ({
      ...current,
      selectedDate: date,
      selectedTimeSlot: null,
      appointmentId: null,
    }));
  }, []);

  const selectTimeSlot = useCallback((slot: TimeSlot) => {
    setState((current) => ({
      ...current,
      selectedDate: slot.date,
      selectedTimeSlot: slot,
      selectedProfessionalId: current.anyProfessional ? slot.professionalId : current.selectedProfessionalId,
      appointmentId: null,
    }));
  }, []);

  const selectPaymentMethod = useCallback((methodId: PaymentMethodId) => {
    setState((current) => ({
      ...current,
      paymentMethodId: methodId,
    }));
  }, []);

  const setAppointmentId = useCallback((appointmentId: string) => {
    setState((current) => ({
      ...current,
      appointmentId,
    }));
  }, []);

  const resetBooking = useCallback(() => setState(initialState), []);

  const value = useMemo(
    () => ({
      state,
      selectSpace,
      toggleService,
      clearServices,
      selectProfessional,
      selectAnyProfessional,
      selectDate,
      selectTimeSlot,
      selectPaymentMethod,
      setAppointmentId,
      resetBooking,
    }),
    [
      clearServices,
      resetBooking,
      selectAnyProfessional,
      selectDate,
      selectPaymentMethod,
      selectProfessional,
      selectSpace,
      selectTimeSlot,
      setAppointmentId,
      state,
      toggleService,
    ],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = React.use(BookingContext);

  if (!context) {
    throw new Error('useBooking must be used inside BookingProvider');
  }

  return context;
}
