import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  EmptyState,
  Field,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  ScreenScaffold,
  SectionTitle,
  UI,
} from '@/components/app-ui';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import {
  cancelCustomerAppointment,
  createAppointmentReview,
  getApiErrorMessage,
  getCustomerAppointmentDetails,
  getCustomerAppointments,
  rescheduleCustomerAppointment,
  searchAvailability,
  type ApiAppointmentDetails,
  type ApiTimeSlot,
} from '@/services/api-client';
import { openOnlineRoom } from '@/utils/open-online-room';
import { buildDateOptions, formatCurrency, formatDateLabel, formatDuration } from '@/utils/format';
import { buildVideoCallRoute } from '@/utils/video-call';

export function AppointmentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const { syncAppointmentsFromApi } = useOwnerConfig();
  const [details, setDetails] = useState<ApiAppointmentDetails | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const appointment = details?.appointment ?? null;
  const canChange = appointment ? ['confirmed', 'pending_payment', 'pending_confirmation'].includes(appointment.status) : false;

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!params.appointmentId) {
        return;
      }

      try {
        const result = await getCustomerAppointmentDetails(params.appointmentId);
        if (mounted) {
          setDetails(result);
          setMessage(null);
        }
      } catch (error) {
        if (mounted) {
          setMessage(getApiErrorMessage(error));
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [params.appointmentId]);

  async function refreshList() {
    syncAppointmentsFromApi(await getCustomerAppointments());
  }

  async function handleCancel() {
    if (!appointment) {
      return;
    }

    setLoadingAction(true);
    setMessage(null);

    try {
      const updated = await cancelCustomerAppointment(appointment.id, 'Cancelado pela cliente no app.');
      setDetails((current) => current ? { ...current, appointment: updated } : current);
      await refreshList();
      setMessage('Agendamento cancelado conforme a política do consultório.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoadingAction(false);
    }
  }

  function handleOpenRoom(url: string) {
    const route = buildVideoCallRoute(url, {
      displayName: details?.customer.name ?? 'Paciente',
      role: 'patient',
    });

    if (route) {
      router.push(route);
      return;
    }

    void openOnlineRoom(url);
  }

  if (!params.appointmentId) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Agendamento" onBack={() => router.back()} />
        <EmptyState icon="calendar-outline" title="Agendamento não encontrado" text="Abra o detalhe a partir da sua agenda." />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      <HeaderBar title="Detalhe do agendamento" subtitle={appointment ? `Pedido ${appointment.code}` : undefined} onBack={() => router.back()} />
      {message && <InfoStrip icon="information-circle-outline" title="Agendamento" text={message} tone={appointment ? 'info' : 'warning'} />}

      {details && appointment ? (
        <>
          {appointment.status === 'rejected' && appointment.ownerDecisionReason ? (
            <InfoStrip
              icon="close-circle-outline"
              title="Agendamento recusado"
              text={appointment.ownerDecisionReason}
              tone="warning"
            />
          ) : null}
          <View style={styles.detailCard}>
            <DetailRow icon="business-outline" label="Consultório" value={details.space.name} />
            <DetailRow icon="person-outline" label="Psicóloga" value={details.professional.name} />
            <DetailRow icon="calendar-outline" label="Data" value={formatDateLabel(appointment.startDateTime.slice(0, 10)).full} />
            <DetailRow icon="time-outline" label="Horário" value={`${appointment.startDateTime.slice(11, 16)} - ${appointment.endDateTime.slice(11, 16)}`} />
            <DetailRow icon="wallet-outline" label="Valor" value={formatCurrency(appointment.total)} />
            <DetailRow icon="ellipse-outline" label="Status" value={statusLabel(appointment.status)} />
          </View>

          <SectionTitle title="Consultas" />
          <View style={styles.detailCard}>
            {details.services.map((service) => (
              <DetailRow
                key={service.id}
                icon="checkmark-circle-outline"
                label={service.name}
                value={`${formatDuration(service.durationMinutes)} • ${formatCurrency(service.price)}`}
              />
            ))}
          </View>

          {details.review ? (
            <InfoStrip icon="star-outline" title="Avaliação enviada" text={`${details.review.rating} estrelas`} tone="success" />
          ) : null}

          <View style={styles.actionStack}>
            {appointment.status === 'confirmed' && appointment.onlineRoomUrl ? (
              <PrimaryButton
                label="Entrar na sala"
                icon="videocam-outline"
                onPress={() => handleOpenRoom(appointment.onlineRoomUrl!)}
              />
            ) : null}
            {canChange && (
              <>
                <PrimaryButton label="Reagendar" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: '/reschedule-appointment', params: { appointmentId: appointment.id } })} />
                <PrimaryButton label="Cancelar" icon="close-outline" variant="ghost" loading={loadingAction} onPress={handleCancel} />
              </>
            )}
            {appointment.status === 'completed' && !details.review && (
              <PrimaryButton label="Avaliar atendimento" icon="star-outline" onPress={() => router.push({ pathname: '/review-appointment', params: { appointmentId: appointment.id } })} />
            )}
          </View>
        </>
      ) : (
        <EmptyState icon="calendar-outline" title="Carregando detalhe" text="Buscando os detalhes do agendamento." />
      )}
    </ScreenScaffold>
  );
}

export function RescheduleAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const { syncAppointmentsFromApi } = useOwnerConfig();
  const dateOptions = buildDateOptions(7);
  const [details, setDetails] = useState<ApiAppointmentDetails | null>(null);
  const [date, setDate] = useState(dateOptions[0]?.id ?? '');
  const [slots, setSlots] = useState<ApiTimeSlot[]>([]);
  const [slot, setSlot] = useState<ApiTimeSlot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDetails() {
      if (!params.appointmentId) {
        return;
      }

      try {
        const result = await getCustomerAppointmentDetails(params.appointmentId);
        if (mounted) {
          setDetails(result);
        }
      } catch (error) {
        if (mounted) {
          setMessage(getApiErrorMessage(error));
        }
      }
    }

    loadDetails();

    return () => {
      mounted = false;
    };
  }, [params.appointmentId]);

  useEffect(() => {
    let mounted = true;

    async function loadSlots() {
      if (!details || !date) {
        return;
      }

      try {
        const result = await searchAvailability({
          spaceId: details.appointment.spaceId,
          serviceIds: details.appointment.serviceIds,
          professionalId: details.appointment.professionalId,
          anyProfessional: false,
          date,
        });

        if (mounted) {
          setSlots(result);
          setSlot(null);
          setMessage(null);
        }
      } catch (error) {
        if (mounted) {
          setSlots([]);
          setMessage(getApiErrorMessage(error));
        }
      }
    }

    loadSlots();

    return () => {
      mounted = false;
    };
  }, [date, details]);

  async function handleSubmit() {
    if (!details || !slot) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await rescheduleCustomerAppointment(details.appointment.id, {
        professionalId: slot.professionalId,
        anyProfessional: false,
        date: slot.date,
        startTime: slot.startTime,
      });
      syncAppointmentsFromApi(await getCustomerAppointments());
      router.replace({ pathname: '/appointment-details', params: { appointmentId: details.appointment.id } });
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar title="Reagendar" subtitle={details?.space.name} onBack={() => router.back()} />
      {message && <InfoStrip icon="alert-circle-outline" title="Reagendamento" text={message} tone="warning" />}
      <SectionTitle title="Nova data" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {dateOptions.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => setDate(option.id)}
            style={({ pressed }) => [styles.dayChip, date === option.id && styles.dayChipSelected, pressed && styles.pressed]}>
            <Text style={[styles.dayText, date === option.id && styles.dayTextSelected]}>{option.weekday}</Text>
            <Text style={[styles.dayTextStrong, date === option.id && styles.dayTextSelected]}>{option.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <SectionTitle title="Horários" actionLabel={`${slots.length} livres`} />
      <View style={styles.timeGrid}>
        {slots.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => setSlot(item)}
            style={({ pressed }) => [styles.timeChip, slot?.id === item.id && styles.timeChipSelected, pressed && styles.pressed]}>
            <Text style={[styles.timeText, slot?.id === item.id && styles.timeTextSelected]}>{item.startTime}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton label="Confirmar reagendamento" loading={submitting} disabled={!slot} onPress={handleSubmit} />
    </ScreenScaffold>
  );
}

export function ReviewAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!params.appointmentId) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await createAppointmentReview(params.appointmentId, { rating, comment: comment.trim() || null });
      router.replace({ pathname: '/appointment-details', params: { appointmentId: params.appointmentId } });
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar title="Avaliar atendimento" subtitle="Sua avaliação ajuda o consultório a melhorar." onBack={() => router.back()} />
      <View style={styles.detailCard}>
        <SectionTitle title="Nota" />
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} accessibilityRole="button" onPress={() => setRating(value)} hitSlop={8}>
              <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={32} color={UI.star} />
            </Pressable>
          ))}
        </View>
        <Field label="Comentário" value={comment} onChangeText={setComment} multiline />
      </View>
      {message && <InfoStrip icon="alert-circle-outline" title="Avaliação" text={message} tone="warning" />}
      <PrimaryButton label="Enviar avaliação" icon="star-outline" loading={submitting} onPress={handleSubmit} />
    </ScreenScaffold>
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    reserved: 'Reservado',
    pending_payment: 'Pendente',
    pending_confirmation: 'Aguardando confirmação',
    confirmed: 'Confirmado',
    expired: 'Expirado',
    cancelled: 'Cancelado',
    completed: 'Concluído',
    no_show: 'Falta',
    rejected: 'Recusado',
  };

  return labels[status] ?? status;
}

const styles = StyleSheet.create({
  detailCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  detailRow: {
    minHeight: 30,
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
  actionStack: {
    gap: 10,
  },
  dayRow: {
    gap: 8,
    paddingBottom: 2,
  },
  dayChip: {
    width: 78,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  dayChipSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  dayText: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  dayTextStrong: {
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
  timeChip: {
    width: '30.8%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  timeChipSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  timeText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  timeTextSelected: {
    color: UI.surface,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.72,
  },
});
