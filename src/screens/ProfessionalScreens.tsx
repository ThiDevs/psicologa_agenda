import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, EmptyState, Field, HeaderBar, InfoStrip, PrimaryButton, ScreenScaffold, SectionTitle, UI } from '@/components/app-ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  completeProfessionalAppointment,
  createProfessionalBlockedTime,
  getApiErrorMessage,
  getProfessionalAppointments,
  markProfessionalAppointmentNoShow,
} from '@/services/api-client';
import type { Appointment } from '@/types/domain';
import { openOnlineRoom } from '@/utils/open-online-room';
import { buildDateOptions, formatCurrency } from '@/utils/format';

export function ProfessionalAgendaScreen() {
  const router = useRouter();
  const {
    user,
    logout,
    professionalProfileActive,
    activateProfessionalProfile,
  } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(buildDateOptions(1)[0]?.id ?? '');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('Pausa');
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const todayAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.startDateTime.slice(0, 10) === date),
    [appointments, date],
  );

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!professionalProfileActive) {
      activateProfessionalProfile();
    }
  }, [activateProfessionalProfile, professionalProfileActive]);

  async function refresh() {
    try {
      const items = await getProfessionalAppointments();
      setAppointments(items.map((appointment) => ({
        ...appointment,
        status: appointment.status === 'reserved' ? 'pending_payment' : appointment.status,
        professionalId: appointment.professionalId,
        expiresAt: appointment.expiresAt ?? undefined,
        ownerDecisionReason: appointment.ownerDecisionReason ?? undefined,
        ownerDecisionAt: appointment.ownerDecisionAt ?? undefined,
        onlineRoomUrl: appointment.onlineRoomUrl ?? undefined,
      })));
      setMessage(null);
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    }
  }

  async function updateStatus(appointmentId: string, action: 'complete' | 'no_show') {
    setUpdatingId(appointmentId);
    setMessage(null);

    try {
      if (action === 'complete') {
        await completeProfessionalAppointment(appointmentId);
      } else {
        await markProfessionalAppointmentNoShow(appointmentId);
      }

      await refresh();
      setMessage(action === 'complete' ? 'Atendimento concluído.' : 'Falta registrada.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleBlock() {
    try {
      await createProfessionalBlockedTime({ date, startTime, endTime, reason });
      setMessage('Bloqueio criado na sua agenda.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Minha agenda"
        subtitle={user?.name}
        onBack={() => router.back()}
        right={
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await logout();
              router.replace('/');
            }}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
            <Ionicons name="log-out-outline" size={22} color={UI.text} />
          </Pressable>
        }
      />
      <View style={styles.professionalModeCard}>
        <View style={styles.professionalModeIcon}>
          <Ionicons name="briefcase" size={24} color={UI.surface} />
        </View>
        <View style={styles.professionalModeCopy}>
          <Text style={styles.professionalModeTitle}>Modo de atendimento ativo</Text>
          <Text style={styles.professionalModeText}>
            Agenda de trabalho para consultórios vinculados ao seu e-mail.
          </Text>
        </View>
      </View>
      {message && <InfoStrip icon="information-circle-outline" title="Agenda" text={message} />}
      <View style={styles.formCard}>
        <Field label="Data" value={date} onChangeText={setDate} />
      </View>
      <SectionTitle title="Atendimentos do dia" actionLabel={`${todayAppointments.length} itens`} />
      <View style={styles.list}>
        {todayAppointments.length ? (
          todayAppointments.map((appointment) => {
            const canClose = appointment.status !== 'pending_confirmation' && !['cancelled', 'expired', 'completed', 'no_show', 'rejected'].includes(appointment.status);

            return (
              <View key={appointment.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Ionicons name="calendar-outline" size={20} color={UI.primary} />
                  <View style={styles.copy}>
                    <Text style={styles.title}>Pedido {appointment.code}</Text>
                    <Text style={styles.text}>
                      {appointment.startDateTime.slice(11, 16)} - {appointment.endDateTime.slice(11, 16)} • {formatCurrency(appointment.total)}
                    </Text>
                    <Text style={styles.text}>{appointmentStatusLabel(appointment.status)}</Text>
                  </View>
                </View>
                {canClose && (
                  <View style={styles.row}>
                    {appointment.status === 'confirmed' && appointment.onlineRoomUrl ? (
                      <View style={styles.flex}>
                        <PrimaryButton label="Sala" icon="videocam-outline" loading={updatingId === appointment.id} onPress={() => openOnlineRoom(appointment.onlineRoomUrl!)} />
                      </View>
                    ) : null}
                    <View style={styles.flex}>
                      <PrimaryButton label="Concluir" icon="checkmark-outline" loading={updatingId === appointment.id} onPress={() => updateStatus(appointment.id, 'complete')} />
                    </View>
                    <View style={styles.flex}>
                      <PrimaryButton label="Falta" icon="close-outline" variant="secondary" loading={updatingId === appointment.id} onPress={() => updateStatus(appointment.id, 'no_show')} />
                    </View>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <EmptyState icon="calendar-outline" title="Sem atendimentos" text="Quando seu e-mail estiver vinculado ao consultório, sua agenda aparece aqui." />
        )}
      </View>
      <SectionTitle title="Bloquear horário" />
      <View style={styles.formCard}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Início" value={startTime} onChangeText={setStartTime} />
          </View>
          <View style={styles.flex}>
            <Field label="Fim" value={endTime} onChangeText={setEndTime} />
          </View>
        </View>
        <Field label="Motivo" value={reason} onChangeText={setReason} />
        <PrimaryButton label="Criar bloqueio" icon="ban-outline" onPress={handleBlock} />
      </View>
    </ScreenScaffold>
  );
}

function appointmentStatusLabel(status: Appointment['status']) {
  const labels: Record<Appointment['status'], string> = {
    pending_payment: 'Pagamento pendente',
    pending_confirmation: 'Aguardando confirmação',
    confirmed: 'Confirmado',
    expired: 'Expirado',
    cancelled: 'Cancelado',
    completed: 'Concluído',
    no_show: 'Falta',
    rejected: 'Recusado',
  };

  return labels[status];
}

const styles = StyleSheet.create({
  professionalModeCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.22)',
    backgroundColor: '#F7FEFA',
    ...cardShadow,
  },
  professionalModeIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: UI.success,
  },
  professionalModeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  professionalModeTitle: {
    color: UI.success,
    fontSize: 16,
    fontWeight: '900',
  },
  professionalModeText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  formCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  list: {
    gap: 10,
  },
  card: {
    gap: 10,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  text: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  logoutButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  pressed: {
    opacity: 0.72,
  },
});
