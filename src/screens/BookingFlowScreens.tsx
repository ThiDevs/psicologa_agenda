import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  EmptyState,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  RadioMark,
  ScreenScaffold,
  SectionTitle,
  UI,
} from '@/components/app-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import {
  type ApiTimeSlot,
  getApiErrorMessage,
  reserveAppointment,
  searchAvailability as searchAvailabilityApi,
} from '@/services/api-client';
import type { Service, TimeSlot } from '@/types/domain';
import {
  buildDateOptions,
  formatCurrency,
  formatDateLabel,
  formatDuration,
} from '@/utils/format';

export function CalendarSelectionScreen() {
  const router = useRouter();
  const { state, selectDate, selectTimeSlot } = useBooking();
  const { searchAvailability } = useOwnerConfig();
  const flow = useCurrentFlow();
  const dateOptions = buildDateOptions(5);
  const selectedDate = state.selectedDate ?? dateOptions[0]?.id ?? '';
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const selectedSlot = state.selectedTimeSlot?.date === selectedDate ? state.selectedTimeSlot : null;

  useEffect(() => {
    let mounted = true;

    async function loadSlots() {
      if (!flow.space?.id || state.selectedServiceIds.length === 0 || !selectedDate) {
        setSlots([]);
        return;
      }

      try {
        const result = await searchAvailabilityApi({
          spaceId: flow.space.id,
          serviceIds: state.selectedServiceIds,
          professionalId: state.selectedProfessionalId,
          anyProfessional: state.anyProfessional,
          date: selectedDate,
        });

        if (mounted) {
          setSlots(mapApiSlots(result));
          setAvailabilityError(null);
        }
      } catch (error) {
        if (mounted) {
          const localSlots = searchAvailability({
            spaceId: flow.space.id,
            serviceIds: state.selectedServiceIds,
            professionalId: state.selectedProfessionalId,
            anyProfessional: state.anyProfessional,
            date: selectedDate,
          });

          setSlots(localSlots);
          setAvailabilityError(
            localSlots.length
              ? `${getApiErrorMessage(error)} Usando agenda local de demonstração.`
              : getApiErrorMessage(error),
          );
        }
      }
    }

    loadSlots();

    return () => {
      mounted = false;
    };
  }, [
    flow.space?.id,
    searchAvailability,
    selectedDate,
    state.anyProfessional,
    state.selectedProfessionalId,
    state.selectedServiceIds,
  ]);

  if (!flow.space || flow.services.length === 0) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Escolher horário" onBack={() => router.back()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Fluxo incompleto"
          text="Escolha um consultório e consultas antes de selecionar horário."
          action={<PrimaryButton label="Voltar aos consultórios" onPress={() => router.replace('/')} />}
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      bottomOffset={130}
      footer={
        <CompactFooter
          label={selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'Escolha um horário'}
          value={formatCurrency(flow.totalPrice)}
          buttonLabel="Continuar"
          disabled={!selectedSlot}
          onPress={() => router.push('/appointment-review')}
        />
      }>
      <HeaderBar
        title="Escolher horário"
        subtitle="Os horários vêm do funcionamento do consultório, agenda da psicóloga e bloqueios locais."
        onBack={() => router.back()}
      />

      <FlowSummaryCard title={flow.professionalName} services={flow.services} totalMinutes={flow.totalMinutes} totalPrice={flow.totalPrice} />

      <SectionTitle title="Data" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {dateOptions.map((dateOption) => {
          const selected = dateOption.id === selectedDate;

          return (
            <Pressable
              key={dateOption.id}
              accessibilityRole="button"
              onPress={() => selectDate(dateOption.id)}
              style={({ pressed }) => [
                styles.dayButton,
                selected && styles.dayButtonSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.dayWeekday, selected && styles.dayTextSelected]}>{dateOption.weekday}</Text>
              <Text style={[styles.dayLabel, selected && styles.dayTextSelected]}>{dateOption.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle title="Horários disponíveis" actionLabel={`${slots.length} livres`} />
      {availabilityError && (
        <InfoStrip icon="cloud-offline-outline" title="Disponibilidade indisponível" text={availabilityError} tone="warning" />
      )}
      {slots.length > 0 ? (
        <View style={styles.timeGrid}>
          {slots.map((slot) => {
            const selected = selectedSlot?.id === slot.id;

            return (
              <Pressable
                key={slot.id}
                accessibilityRole="button"
                onPress={() => selectTimeSlot(slot)}
                style={({ pressed }) => [
                  styles.timeButton,
                  selected && styles.timeButtonSelected,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.timeText, selected && styles.timeTextSelected]}>{slot.startTime}</Text>
                <Text style={[styles.timeEndText, selected && styles.timeTextSelected]}>{slot.endTime}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="calendar-clear-outline"
          title="Sem horários para este dia"
          text="Escolha outra data ou volte para trocar psicóloga/consultas."
        />
      )}

      <InfoStrip
        icon="time-outline"
        title="Duração calculada"
        text={`${formatDuration(flow.totalMinutes)} de atendimento contínuo.`}
      />
    </ScreenScaffold>
  );
}

export function AppointmentReviewScreen() {
  const router = useRouter();
  const flow = useCurrentFlow();

  if (!flow.space || !flow.selectedSlot) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Revisar" onBack={() => router.back()} />
        <EmptyState
          icon="time-outline"
          title="Escolha um horário"
          text="A revisão precisa de data e horário selecionados."
          action={<PrimaryButton label="Escolher horário" onPress={() => router.replace('/calendar-selection')} />}
        />
      </ScreenScaffold>
    );
  }

  const dateLabel = formatDateLabel(flow.selectedSlot.date).full;

  return (
    <ScreenScaffold
      bottomOffset={130}
      footer={
        <CompactFooter
          label="Total"
          value={formatCurrency(flow.totalPrice)}
          buttonLabel="Pagamento"
          onPress={() => router.push('/payment')}
        />
      }>
      <HeaderBar
        title="Revisar agendamento"
        subtitle="Confira os dados antes de reservar o horário."
        onBack={() => router.back()}
      />

      <FlowSummaryCard title={flow.space.name} services={flow.services} totalMinutes={flow.totalMinutes} totalPrice={flow.totalPrice} />

      <View style={styles.detailCard}>
        <DetailRow icon="person-outline" label="Psicóloga" value={flow.professionalName} />
        <DetailRow icon="calendar-outline" label="Data" value={dateLabel} />
        <DetailRow icon="time-outline" label="Horário" value={`${flow.selectedSlot.startTime} - ${flow.selectedSlot.endTime}`} />
        <DetailRow icon="hourglass-outline" label="Duração" value={formatDuration(flow.totalMinutes)} />
      </View>

      <SectionTitle title="Consultas" />
      <View style={styles.detailCard}>
        {flow.services.map((service) => (
          <DetailRow
            key={service.id}
            icon="checkmark-circle-outline"
            label={service.name}
            value={`${formatDuration(service.durationMinutes)} • ${formatCurrency(service.price)}`}
          />
        ))}
      </View>

      <InfoStrip
        icon="information-circle-outline"
        title="Política do consultório"
        text={flow.space.cancellationPolicy.policyText}
      />
    </ScreenScaffold>
  );
}

export function PaymentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { state, selectPaymentMethod, setAppointmentId } = useBooking();
  const { addAppointmentFromApi, createAppointment, getAvailablePaymentMethods } = useOwnerConfig();
  const flow = useCurrentFlow();
  const methods = getAvailablePaymentMethods(flow.space?.id ?? null);
  const selectedMethodId = state.paymentMethodId ?? methods[0]?.id ?? 'pay_on_site';
  const [submitting, setSubmitting] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);

  if (flow.space && flow.selectedSlot && !user) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Entrar" subtitle="Sua conta é necessária para confirmar a reserva." onBack={() => router.back()} />
        <EmptyState
          icon="person-circle-outline"
          title="Entre para confirmar"
          text="O horário escolhido fica disponível depois que você entra ou cria uma conta de cliente."
          action={
            <View style={styles.authActions}>
              <PrimaryButton label="Entrar" icon="log-in-outline" onPress={() => router.push('/login')} />
              <PrimaryButton
                label="Criar conta"
                icon="person-add-outline"
                variant="secondary"
                onPress={() => router.push('/customer-register')}
              />
            </View>
          }
        />
      </ScreenScaffold>
    );
  }

  if (!flow.space || !flow.selectedSlot || !user) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Confirmação" onBack={() => router.back()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Fluxo incompleto"
          text="Revise o agendamento antes de confirmar a reserva."
        />
      </ScreenScaffold>
    );
  }

  async function handleConfirm() {
    if (!flow.space || !flow.selectedSlot || !user) {
      return;
    }

    setSubmitting(true);
    setReserveError(null);

    try {
      const appointment = await reserveAppointment({
        spaceId: flow.space.id,
        serviceIds: flow.services.map((service) => service.id),
        professionalId: state.selectedProfessionalId,
        anyProfessional: state.anyProfessional,
        date: flow.selectedSlot.date,
        startTime: flow.selectedSlot.startTime,
        paymentMethodId: selectedMethodId,
      });

      addAppointmentFromApi(appointment);
      setAppointmentId(appointment.id);
      router.replace('/booking-success');
    } catch (error) {
      const localAppointment = createAppointment({
        customerId: user.id,
        spaceId: flow.space.id,
        serviceIds: flow.services.map((service) => service.id),
        professionalId: state.selectedProfessionalId,
        anyProfessional: state.anyProfessional,
        slot: flow.selectedSlot,
        paymentMethodId: selectedMethodId,
      });

      if (localAppointment) {
        setAppointmentId(localAppointment.id);
        router.replace('/booking-success');
        return;
      }

      setReserveError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenScaffold
      bottomOffset={130}
      footer={
        <CompactFooter
          label="Total"
          value={formatCurrency(flow.totalPrice)}
          buttonLabel="Confirmar"
          loading={submitting}
          onPress={handleConfirm}
        />
      }>
      <HeaderBar
        title="Confirmação"
        subtitle="Escolha a forma combinada com o consultório."
        onBack={() => router.back()}
      />

      <FlowSummaryCard title="Ambiente seguro" services={flow.services} totalMinutes={flow.totalMinutes} totalPrice={flow.totalPrice} />

      <SectionTitle title="Forma combinada" />
      <View style={styles.methodList}>
        {methods.map((method) => {
          const selected = method.id === selectedMethodId;

          return (
            <Pressable
              key={method.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => selectPaymentMethod(method.id)}
              style={({ pressed }) => [
                styles.methodCard,
                selected && styles.cardSelected,
                pressed && styles.pressed,
              ]}>
              <View style={styles.methodIcon}>
                <Ionicons name={method.iconName as keyof typeof Ionicons.glyphMap} size={21} color={UI.primary} />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodLabel}>{method.label}</Text>
                <Text style={styles.methodHint}>
                  {method.online ? 'Combine os detalhes com o consultório' : 'Confirme e pague no atendimento'}
                </Text>
              </View>
              <RadioMark selected={selected} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.detailCard}>
        <DetailRow icon="receipt-outline" label="Subtotal" value={formatCurrency(flow.subtotal)} />
        <DetailRow icon="pricetag-outline" label="Taxa da plataforma" value={formatCurrency(flow.serviceFee)} />
        <DetailRow icon="wallet-outline" label="Total" value={formatCurrency(flow.totalPrice)} />
      </View>

      <InfoStrip
        icon="lock-closed-outline"
        title="Reserva protegida"
        text="A agenda evita conflito de horário enquanto sua reserva é confirmada."
      />
      {reserveError && <InfoStrip icon="alert-circle-outline" title="Não foi possível reservar" text={reserveError} tone="warning" />}
    </ScreenScaffold>
  );
}

export function BookingSuccessScreen() {
  const router = useRouter();
  const { resetBooking } = useBooking();
  const { appointments, getSpace, getServicesForSpace, getProfessionalsForSpace, paymentMethods } = useOwnerConfig();
  const flow = useCurrentFlow();
  const appointment = appointments.find((item) => item.id === flow.appointmentId) ?? null;
  const space = appointment ? getSpace(appointment.spaceId) : flow.space;
  const services = appointment
    ? getServicesForSpace(appointment.spaceId).filter((service) => appointment.serviceIds.includes(service.id))
    : flow.services;
  const professional =
    appointment?.professionalId
      ? getProfessionalsForSpace(appointment.spaceId).find((item) => item.id === appointment.professionalId)
      : null;
  const methodLabel =
    paymentMethods.find((method) => method.id === appointment?.paymentMethodId)?.label ??
    paymentMethods.find((method) => method.id === flow.paymentMethodId)?.label ??
    'Pagamento combinado';
  const pendingConfirmation = appointment?.status === 'pending_confirmation';
  const pendingPayment = appointment?.status === 'pending_payment';
  const successText = pendingConfirmation
    ? 'O consultório precisa aceitar este pedido antes de ele ficar confirmado.'
    : pendingPayment
      ? `Seu horário foi reservado e aguarda ${methodLabel.toLowerCase()}.`
    : methodLabel === 'Pagamento combinado'
      ? 'Reserva confirmada para pagamento combinado.'
      : `Reserva confirmada. Forma combinada: ${methodLabel}.`;

  function handleDone() {
    resetBooking();
    router.replace('/');
  }

  return (
    <ScreenScaffold
      bottomOffset={130}
      footer={
        <CompactFooter
          label={appointment ? `Pedido ${appointment.code}` : 'Pedido confirmado'}
          value={formatCurrency(appointment?.total ?? flow.totalPrice)}
          buttonLabel="Concluir"
          onPress={handleDone}
        />
      }>
      <HeaderBar
        title={pendingConfirmation ? 'Solicitação enviada' : pendingPayment ? 'Reserva criada' : 'Agendamento confirmado'}
        subtitle={space ? `Seu horário foi reservado no ${space.name}.` : undefined}
      />

      <View style={styles.successHero}>
        <View style={styles.successIcon}>
          <Ionicons name={pendingConfirmation || pendingPayment ? 'time-outline' : 'checkmark'} size={36} color={UI.surface} />
        </View>
        <Text style={styles.successTitle}>
          {pendingConfirmation ? 'Aguardando aceite' : pendingPayment ? 'Aguardando pagamento' : 'Tudo certo!'}
        </Text>
        <Text style={styles.successText}>{successText}</Text>
      </View>

      <View style={styles.detailCard}>
        <DetailRow icon="business-outline" label="Consultório" value={space?.name ?? 'Consultório'} />
        <DetailRow icon="person-outline" label="Psicóloga" value={professional?.name ?? flow.professionalName} />
        <DetailRow
          icon="calendar-outline"
          label="Data"
          value={appointment ? formatDateLabel(appointment.startDateTime.slice(0, 10)).full : flow.dateLabel}
        />
        <DetailRow
          icon="time-outline"
          label="Horário"
          value={
            appointment
              ? `${appointment.startDateTime.slice(11, 16)} - ${appointment.endDateTime.slice(11, 16)}`
              : flow.selectedSlot
                ? `${flow.selectedSlot.startTime} - ${flow.selectedSlot.endTime}`
                : 'Confirmado'
          }
        />
        <DetailRow icon="card-outline" label="Pagamento" value={methodLabel} />
      </View>

      <SectionTitle title={pendingConfirmation ? 'Consultas solicitadas' : 'Consultas confirmadas'} />
      <View style={styles.detailCard}>
        {services.map((service) => (
          <DetailRow
            key={service.id}
            icon="checkmark-circle-outline"
            label={service.name}
            value={formatCurrency(service.price)}
          />
        ))}
      </View>

      <SectionTitle title="Ações rápidas" />
      <View style={styles.quickActions}>
        <QuickAction icon="calendar-outline" label="Adicionar" />
        <QuickAction icon="share-outline" label="Compartilhar" />
        <QuickAction icon="chatbubble-outline" label="Contato" />
      </View>
    </ScreenScaffold>
  );
}

function useCurrentFlow() {
  const { state } = useBooking();
  const {
    publishedSpaces,
    getSpace,
    getServicesForSpace,
    getProfessionalsForSpace,
  } = useOwnerConfig();
  const space = getSpace(state.selectedSpaceId) ?? publishedSpaces[0] ?? null;
  const services = getServicesForSpace(space?.id ?? null).filter((service) =>
    state.selectedServiceIds.includes(service.id),
  );
  const subtotal = services.reduce((total, service) => total + service.price, 0);
  const serviceFee = space ? Math.round(subtotal * (space.paymentSettings.serviceFeePercentage / 100)) : 0;
  const totalMinutes = services.reduce((total, service) => total + service.durationMinutes, 0);
  const selectedProfessional =
    state.selectedProfessionalId && space
      ? getProfessionalsForSpace(space.id).find((professional) => professional.id === state.selectedProfessionalId)
      : null;
  const dateLabel = state.selectedTimeSlot ? formatDateLabel(state.selectedTimeSlot.date).full : '';

  return useMemo(
    () => ({
      space,
      services,
      subtotal,
      serviceFee,
      totalPrice: subtotal + serviceFee,
      totalMinutes,
      selectedSlot: state.selectedTimeSlot,
      professionalName: state.anyProfessional
        ? 'Qualquer psicóloga disponível'
        : selectedProfessional?.name ?? 'Psicóloga selecionada',
      dateLabel,
      paymentMethodId: state.paymentMethodId,
      appointmentId: state.appointmentId,
    }),
    [
      dateLabel,
      selectedProfessional?.name,
      serviceFee,
      services,
      space,
      state.anyProfessional,
      state.appointmentId,
      state.paymentMethodId,
      state.selectedTimeSlot,
      subtotal,
      totalMinutes,
    ],
  );
}

function mapApiSlots(slots: ApiTimeSlot[]) {
  return slots.map((slot) => ({
    id: slot.id,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    professionalId: slot.professionalId,
    available: slot.available,
    reason: slot.reason ?? undefined,
  }));
}

function FlowSummaryCard({
  title,
  services,
  totalMinutes,
  totalPrice,
}: {
  title: string;
  services: Service[];
  totalMinutes: number;
  totalPrice: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryIcon}>
          <Ionicons name="sparkles-outline" size={20} color={UI.surface} />
        </View>
        <View style={styles.summaryCopy}>
          <Text numberOfLines={1} style={styles.summaryTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.summarySubtitle}>{services.map((service) => service.name).join(' + ')}</Text>
        </View>
      </View>
      <View style={styles.summaryMetrics}>
        <MiniMetric icon="time-outline" label="Tempo" value={formatDuration(totalMinutes)} />
        <MiniMetric icon="wallet-outline" label="Total" value={formatCurrency(totalPrice)} />
      </View>
    </View>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniMetric}>
      <Ionicons name={icon} size={17} color={UI.primary} />
      <View>
        <Text style={styles.miniMetricLabel}>{label}</Text>
        <Text style={styles.miniMetricValue}>{value}</Text>
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={UI.primary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function CompactFooter({
  label,
  value,
  buttonLabel,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  value: string;
  buttonLabel: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.compactFooter}>
      <View style={styles.footerCopy}>
        <Text numberOfLines={1} style={styles.footerLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.footerValue}>{value}</Text>
      </View>
      <View style={styles.footerButton}>
        <PrimaryButton label={buttonLabel} disabled={disabled} loading={loading} onPress={onPress} />
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <Ionicons name={icon} size={21} color={UI.primary} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    gap: 8,
    paddingBottom: 2,
  },
  dayButton: {
    width: 78,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  dayButtonSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  dayWeekday: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  dayLabel: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  dayTextSelected: {
    color: UI.surface,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeButton: {
    width: '30.8%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  timeButtonSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  timeText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  timeEndText: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  timeTextSelected: {
    color: UI.surface,
  },
  summaryCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.12)',
    backgroundColor: UI.primarySoft,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: UI.primary,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  summaryTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  summarySubtitle: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  miniMetric: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: UI.surface,
  },
  miniMetricLabel: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  miniMetricValue: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  detailCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  detailRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    flex: 1,
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  detailValue: {
    maxWidth: '56%',
    color: UI.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  methodList: {
    gap: 10,
  },
  authActions: {
    alignSelf: 'stretch',
    gap: 9,
  },
  methodCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.surface,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  cardSelected: {
    borderColor: 'rgba(15, 118, 110, 0.38)',
    backgroundColor: '#F8FFFD',
  },
  methodIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: UI.primarySoft,
  },
  methodCopy: {
    flex: 1,
    gap: 3,
  },
  methodLabel: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  methodHint: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  successHero: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#ECFDF3',
  },
  successIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    backgroundColor: UI.success,
  },
  successTitle: {
    color: UI.text,
    fontSize: 23,
    fontWeight: '900',
  },
  successText: {
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 9,
  },
  quickAction: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  quickActionText: {
    color: UI.text,
    fontSize: 12,
    fontWeight: '900',
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  footerLabel: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  footerValue: {
    color: UI.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  footerButton: {
    minWidth: 164,
  },
  pressed: {
    opacity: 0.72,
  },
});
