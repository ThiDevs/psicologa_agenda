import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

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
import {
  OwnerSetupProgressCard,
  OwnerSetupQuickNav,
} from '@/components/owner-setup-progress';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import { useOwnerSetupFinish } from '@/hooks/use-owner-setup-finish';
import {
  completeOwnerAppointment,
  confirmOwnerAppointment,
  createBlockedTime,
  createOwnerProfessional,
  createOwnerService,
  createSpacePhoto,
  deleteSpacePhoto,
  getBookingSettings,
  getNotificationSettings,
  getApiErrorMessage,
  getBlockedTimes,
  getCancellationPolicy,
  getMySpaces,
  getOpeningHours,
  getOwnerAppointments,
  getOwnerAppointmentDetails,
  getOwnerProfessionals,
  getOwnerServices,
  getPaymentSettings,
  getProfessionalSchedule,
  getSpacePhotos,
  markOwnerAppointmentNoShow,
  rejectOwnerAppointment,
  updateBookingSettings,
  updateCancellationPolicy,
  updateNotificationSettings,
  updateOpeningHours,
  updatePaymentSettings,
  updateProfessionalSchedule,
  uploadSpacePhoto,
  type ApiAppointmentDetails,
  type ApiNotificationSettings,
  type ApiSpacePhoto,
} from '@/services/api-client';
import type {
  Appointment,
  BlockedTime,
  SpaceCancellationPolicy,
  SpacePaymentSettings,
  SpaceSettings,
} from '@/types/domain';
import { openOnlineRoom } from '@/utils/open-online-room';
import { buildDateOptions, formatCurrency, formatDateLabel, formatDuration, getIsoDate } from '@/utils/format';
import { buildVideoCallRoute } from '@/utils/video-call';

const weekdays = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sab' },
];

type AgendaCalendarView = 'day' | 'week' | 'month';

type AgendaCalendarPeriod = {
  startDate: string;
  endDate: string;
  title: string;
};

const calendarViewOptions: { id: AgendaCalendarView; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

export function ManageServicesScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, services, syncSpacesFromApi, syncServicesFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const spaceServices = services.filter((service) => service.spaceId === space?.id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [buffer, setBuffer] = useState('10');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { finishOwnerSetupIfReady } = useOwnerSetupFinish();

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const items = await getOwnerServices(space.id);

        if (mounted) {
          syncServicesFromApi(space.id, items);
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
  }, [space?.id, syncServicesFromApi]);

  async function handleSave() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await createOwnerService(space.id, {
        name,
        description,
        category,
        price: Number(price.replace(',', '.')),
        durationMinutes: Number(duration),
        bufferAfterMinutes: Number(buffer),
        onlineBooking: true,
        active: true,
      });

      const items = await getOwnerServices(space.id);
      syncServicesFromApi(space.id, items);
      setName('');
      setDescription('');
      setCategory('');
      setPrice('');
      setDuration('');
      setBuffer('10');
      if (await finishOwnerSetupIfReady(space.id)) {
        return;
      }
      setMessage('Consulta salvo com sucesso.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold footer={<OwnerSetupQuickNav />}>
      <HeaderBar title="Consultas" subtitle="Cadastre consultas reais do consultório." onBack={() => router.back()} />
      <OwnerSetupProgressCard />
      {!space ? <NoSpaceState /> : null}

      <View style={styles.formCard}>
        <Field label="Nome do consulta" value={name} onChangeText={setName} />
        <Field label="Descrição" value={description} onChangeText={setDescription} multiline />
        <Field label="Categoria" value={category} onChangeText={setCategory} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Preço" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={styles.flex}>
            <Field label="Duração min" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </View>
        </View>
        <Field label="Buffer após min" value={buffer} onChangeText={setBuffer} keyboardType="number-pad" />
        <PrimaryButton label="Salvar consulta" loading={loading} disabled={!space || !name || !price || !duration} onPress={handleSave} />
      </View>

      {message && <InfoStrip icon="information-circle-outline" title="Consultas" text={message} />}

      <SectionTitle title="Consultas cadastradas" actionLabel={`${spaceServices.length} itens`} />
      <View style={styles.list}>
        {spaceServices.map((service) => (
          <View key={service.id} style={styles.itemCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={20} color={UI.primary} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{service.name}</Text>
              <Text style={styles.itemText}>
                {formatDuration(service.durationMinutes)} • {formatCurrency(service.price)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton label="Configurar psicólogas" variant="secondary" onPress={() => router.push('/manage-professionals')} />
    </ScreenScaffold>
  );
}

export function ManageProfessionalsScreen() {
  const router = useRouter();
  const {
    selectedOwnerSpace,
    services,
    professionals,
    syncSpacesFromApi,
    syncServicesFromApi,
    syncProfessionalsFromApi,
  } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const spaceServices = services.filter((service) => service.spaceId === space?.id);
  const spaceProfessionals = professionals.filter((professional) => professional.spaceId === space?.id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { finishOwnerSetupIfReady } = useOwnerSetupFinish();

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const [serviceItems, professionalItems] = await Promise.all([
          getOwnerServices(space.id),
          getOwnerProfessionals(space.id),
        ]);

        if (mounted) {
          syncServicesFromApi(space.id, serviceItems);
          syncProfessionalsFromApi(space.id, professionalItems);
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
  }, [space?.id, syncProfessionalsFromApi, syncServicesFromApi]);

  async function handleSave() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await createOwnerProfessional(space.id, {
        name,
        email: email.trim() || null,
        specialty,
        experienceYears: Number(experienceYears),
        serviceIds,
        active: true,
      });

      const items = await getOwnerProfessionals(space.id);
      syncProfessionalsFromApi(space.id, items);
      setName('');
      setEmail('');
      setSpecialty('');
      setExperienceYears('0');
      setServiceIds([]);
      if (await finishOwnerSetupIfReady(space.id)) {
        return;
      }
      setMessage('Psicóloga salva e vinculada aos consultas.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold footer={<OwnerSetupQuickNav />}>
      <HeaderBar title="Psicólogas" subtitle="Vincule cada psicóloga aos consultas que atende." onBack={() => router.back()} />
      <OwnerSetupProgressCard />
      {!space ? <NoSpaceState /> : null}

      <View style={styles.formCard}>
        <Field label="Nome da psicóloga" value={name} onChangeText={setName} />
        <Field label="E-mail de acesso" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Especialidade" value={specialty} onChangeText={setSpecialty} />
        <Field label="Anos de experiência" value={experienceYears} onChangeText={setExperienceYears} keyboardType="number-pad" />
        <SectionTitle title="Consultas atendidas" />
        <View style={styles.chipWrap}>
          {spaceServices.map((service) => (
            <SelectableChip
              key={service.id}
              label={service.name}
              selected={serviceIds.includes(service.id)}
              onPress={() =>
                setServiceIds((current) =>
                  current.includes(service.id)
                    ? current.filter((id) => id !== service.id)
                    : [...current, service.id],
                )
              }
            />
          ))}
        </View>
        <PrimaryButton label="Salvar psicóloga" loading={loading} disabled={!space || !name || serviceIds.length === 0} onPress={handleSave} />
      </View>

      {message && <InfoStrip icon="information-circle-outline" title="Psicólogas" text={message} />}

      <SectionTitle title="Equipe cadastrada" actionLabel={`${spaceProfessionals.length} pessoas`} />
      <View style={styles.list}>
        {spaceProfessionals.map((professional) => (
          <View key={professional.id} style={styles.itemCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-outline" size={20} color={UI.primary} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{professional.name}</Text>
              <Text style={styles.itemText}>
                {professional.specialty} • {professional.email ?? 'sem e-mail'} • {professional.serviceIds.length} consultas
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <PrimaryButton label="Funcionamento" variant="secondary" onPress={() => router.push('/space-opening-hours')} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Agenda" variant="secondary" onPress={() => router.push('/professional-schedule')} />
        </View>
      </View>
    </ScreenScaffold>
  );
}

export function SpaceOpeningHoursScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, syncSpacesFromApi, syncOpeningHoursFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [openDays, setOpenDays] = useState([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { finishOwnerSetupIfReady } = useOwnerSetupFinish();

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const items = await getOpeningHours(space.id);

        if (mounted) {
          syncOpeningHoursFromApi(space.id, items);
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
  }, [space?.id, syncOpeningHoursFromApi]);

  async function handleSave() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const hours = weekdays.map((day) => ({
        dayOfWeek: day.id,
        isOpen: openDays.includes(day.id),
        startTime: openDays.includes(day.id) ? startTime : null,
        endTime: openDays.includes(day.id) ? endTime : null,
      }));
      const items = await updateOpeningHours(space.id, hours);
      syncOpeningHoursFromApi(space.id, items);
      if (await finishOwnerSetupIfReady(space.id)) {
        return;
      }
      setMessage('Horário de funcionamento salvo.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold footer={<OwnerSetupQuickNav />}>
      <HeaderBar title="Funcionamento" subtitle="Defina os dias e horários em que o consultório atende." onBack={() => router.back()} />
      <OwnerSetupProgressCard />
      <View style={styles.formCard}>
        <View style={styles.chipWrap}>
          {weekdays.map((day) => (
            <SelectableChip
              key={day.id}
              label={day.label}
              selected={openDays.includes(day.id)}
              onPress={() =>
                setOpenDays((current) =>
                  current.includes(day.id) ? current.filter((id) => id !== day.id) : [...current, day.id],
                )
              }
            />
          ))}
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Abre" value={startTime} onChangeText={setStartTime} />
          </View>
          <View style={styles.flex}>
            <Field label="Fecha" value={endTime} onChangeText={setEndTime} />
          </View>
        </View>
        <PrimaryButton label="Salvar funcionamento" loading={loading} disabled={!space} onPress={handleSave} />
      </View>
      {message && <InfoStrip icon="time-outline" title="Funcionamento" text={message} />}
      <PrimaryButton label="Configurar agenda psicóloga" variant="secondary" onPress={() => router.push('/professional-schedule')} />
    </ScreenScaffold>
  );
}

export function ProfessionalScheduleScreen() {
  const router = useRouter();
  const {
    selectedOwnerSpace,
    professionals,
    syncSpacesFromApi,
    syncProfessionalsFromApi,
    syncProfessionalSchedulesFromApi,
  } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const professional = professionals.find((item) => item.spaceId === space?.id) ?? null;
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakStartTime, setBreakStartTime] = useState('12:00');
  const [breakEndTime, setBreakEndTime] = useState('13:00');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { finishOwnerSetupIfReady } = useOwnerSetupFinish();

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const items = await getOwnerProfessionals(space.id);

        if (mounted) {
          syncProfessionalsFromApi(space.id, items);
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
  }, [space?.id, syncProfessionalsFromApi]);

  useEffect(() => {
    let mounted = true;

    async function loadSchedule() {
      if (!space?.id || !professional?.id) {
        return;
      }

      try {
        const schedules = await getProfessionalSchedule(space.id, professional.id);
        const firstActiveSchedule = schedules.find((schedule) => schedule.active);

        if (mounted) {
          syncProfessionalSchedulesFromApi(space.id, professional.id, schedules);

          if (firstActiveSchedule) {
            setStartTime(firstActiveSchedule.startTime);
            setEndTime(firstActiveSchedule.endTime);
            setBreakStartTime(firstActiveSchedule.breakStartTime ?? '12:00');
            setBreakEndTime(firstActiveSchedule.breakEndTime ?? '13:00');
          }
        }
      } catch (error) {
        if (mounted) {
          setMessage(getApiErrorMessage(error));
        }
      }
    }

    loadSchedule();

    return () => {
      mounted = false;
    };
  }, [
    professional?.id,
    space?.id,
    syncProfessionalSchedulesFromApi,
  ]);

  async function handleSave() {
    if (!space || !professional) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const schedules = await updateProfessionalSchedule(
        space.id,
        professional.id,
        [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          dayOfWeek,
          startTime,
          endTime,
          breakStartTime,
          breakEndTime,
          active: true,
        })),
      );
      syncProfessionalSchedulesFromApi(space.id, professional.id, schedules);
      if (await finishOwnerSetupIfReady(space.id)) {
        return;
      }
      setMessage(`Agenda salva para ${professional.name}.`);
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold footer={<OwnerSetupQuickNav />}>
      <HeaderBar title="Agenda psicóloga" subtitle={professional ? professional.name : 'Cadastre uma psicóloga primeiro.'} onBack={() => router.back()} />
      <OwnerSetupProgressCard />
      <View style={styles.formCard}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Início" value={startTime} onChangeText={setStartTime} />
          </View>
          <View style={styles.flex}>
            <Field label="Fim" value={endTime} onChangeText={setEndTime} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Pausa início" value={breakStartTime} onChangeText={setBreakStartTime} />
          </View>
          <View style={styles.flex}>
            <Field label="Pausa fim" value={breakEndTime} onChangeText={setBreakEndTime} />
          </View>
        </View>
        <PrimaryButton label="Salvar agenda" loading={loading} disabled={!professional} onPress={handleSave} />
      </View>
      {message && <InfoStrip icon="calendar-outline" title="Agenda" text={message} />}
      <PrimaryButton label="Configurações do consultório" variant="secondary" onPress={() => router.push('/space-settings')} />
    </ScreenScaffold>
  );
}

export function SpaceSettingsScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, syncSpacesFromApi, syncBookingSettingsFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [settings, setSettings] = useState<Pick<SpaceSettings, 'allowOnlineBooking' | 'requireManualApproval'>>({
    allowOnlineBooking: true,
    requireManualApproval: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'warning'>('success');
  const spaceId = space?.id ?? null;
  const currentAllowOnlineBooking = space?.settings.allowOnlineBooking ?? true;
  const currentRequireManualApproval = space?.settings.requireManualApproval ?? false;

  useOwnerBootstrap(spaceId, syncSpacesFromApi);

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    setSettings({
      allowOnlineBooking: currentAllowOnlineBooking,
      requireManualApproval: currentRequireManualApproval,
    });
  }, [spaceId, currentAllowOnlineBooking, currentRequireManualApproval]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!spaceId) {
        return;
      }

      try {
        const result = await getBookingSettings(spaceId);

        if (mounted) {
          setSettings(result);
          syncBookingSettingsFromApi(spaceId, result);
          setMessage(null);
        }
      } catch (error) {
        if (mounted) {
          setMessageTone('warning');
          setMessage(getApiErrorMessage(error));
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [spaceId, syncBookingSettingsFromApi]);

  async function handleSave() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await updateBookingSettings(space.id, settings);
      setSettings(result);
      syncBookingSettingsFromApi(space.id, result);
      setMessageTone('success');
      setMessage('Configurações de agendamento salvas.');
    } catch (error) {
      setMessageTone('warning');
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const modeText = !settings.allowOnlineBooking
    ? 'Clientes não conseguem criar novas reservas enquanto esta opção estiver desligada.'
    : settings.requireManualApproval
      ? 'Novos pedidos entram aguardando aceite da psicóloga antes de aparecerem como confirmados.'
      : 'Novos pedidos entram confirmados automaticamente.';

  return (
    <ScreenScaffold footer={<OwnerSetupQuickNav />}>
      <HeaderBar title="Configurações do consultório" subtitle="Regras para novos agendamentos." onBack={() => router.back()} />
      <OwnerSetupProgressCard />
      {!space ? <NoSpaceState /> : null}

      <View style={styles.formCard}>
        <SettingsSwitchRow
          icon="calendar-outline"
          title="Aceitar novos agendamentos"
          text={settings.allowOnlineBooking ? 'Disponível para clientes reservarem horários.' : 'Novas reservas estão pausadas.'}
          value={settings.allowOnlineBooking}
          onValueChange={(value) => setSettings((current) => ({ ...current, allowOnlineBooking: value }))}
        />

        <View style={styles.settingGroup}>
          <Text style={styles.itemTitle}>Confirmação de agenda</Text>
          <View style={styles.chipWrap}>
            <SelectableChip
              label="Automática"
              selected={!settings.requireManualApproval}
              onPress={() => setSettings((current) => ({ ...current, requireManualApproval: false }))}
            />
            <SelectableChip
              label="Manual"
              selected={settings.requireManualApproval}
              onPress={() => setSettings((current) => ({ ...current, requireManualApproval: true }))}
            />
          </View>
        </View>

        <PrimaryButton label="Salvar configurações" icon="save-outline" loading={loading} disabled={!space} onPress={handleSave} />
      </View>

      <InfoStrip icon="information-circle-outline" title="Agendamentos" text={modeText} />
      {message && <InfoStrip icon="checkmark-circle-outline" title="Configurações" text={message} tone={messageTone} />}

      <PrimaryButton label="Pagamento e cancelamento" icon="wallet-outline" variant="secondary" onPress={() => router.push('/payment-settings')} />
      <PrimaryButton label="Notificações" icon="notifications-outline" variant="secondary" onPress={() => router.push('/notification-settings')} />
    </ScreenScaffold>
  );
}

export function PaymentSettingsScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, syncSpacesFromApi, syncPaymentSettingsFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [settings, setSettings] = useState<SpacePaymentSettings>({
    allowPix: false,
    allowCreditCard: true,
    allowDebitCard: true,
    allowPayOnSite: true,
    requirePrePayment: false,
    requireDeposit: false,
    serviceFeePercentage: 0,
    reservationExpirationMinutes: 10,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { finishOwnerSetupIfReady } = useOwnerSetupFinish();

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const result = await getPaymentSettings(space.id);

        if (mounted) {
          setSettings({
            ...result,
            depositType: result.depositType ?? undefined,
            depositValue: result.depositValue ?? undefined,
          });
          syncPaymentSettingsFromApi(space.id, result);
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
  }, [space?.id, syncPaymentSettingsFromApi]);

  async function handleSave() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await updatePaymentSettings(space.id, settings);
      setSettings({
        ...result,
        depositType: result.depositType ?? undefined,
        depositValue: result.depositValue ?? undefined,
      });
      syncPaymentSettingsFromApi(space.id, result);
      if (await finishOwnerSetupIfReady(space.id)) {
        return;
      }
      setMessage('Regras de pagamento salvas.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold footer={<OwnerSetupQuickNav />}>
      <HeaderBar title="Pagamento" subtitle="Defina as formas de pagamento aceitas pelo consultório." onBack={() => router.back()} />
      <OwnerSetupProgressCard />
      <View style={styles.formCard}>
        <View style={styles.chipWrap}>
          {paymentToggles.map((toggle) => (
            <SelectableChip
              key={toggle.id}
              label={toggle.label}
              selected={Boolean(settings[toggle.id])}
              onPress={() => setSettings((current) => ({ ...current, [toggle.id]: !current[toggle.id] }))}
            />
          ))}
        </View>
        <Field
          label="Expiração da reserva em minutos"
          value={String(settings.reservationExpirationMinutes)}
          onChangeText={(value) => setSettings((current) => ({ ...current, reservationExpirationMinutes: Number(value) || 10 }))}
          keyboardType="number-pad"
        />
        <PrimaryButton label="Salvar pagamento" loading={loading} disabled={!space} onPress={handleSave} />
      </View>
      {message && <InfoStrip icon="wallet-outline" title="Pagamento" text={message} />}
      <PrimaryButton label="Política de cancelamento" variant="secondary" onPress={() => router.push('/cancellation-policy')} />
    </ScreenScaffold>
  );
}

export function CancellationPolicyScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, syncSpacesFromApi, syncCancellationPolicyFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [policy, setPolicy] = useState<SpaceCancellationPolicy>({
    allowCustomerCancel: true,
    freeCancelBeforeHours: 24,
    allowReschedule: true,
    freeRescheduleBeforeHours: 24,
    chargeLateCancelFee: false,
    policyText: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { finishOwnerSetupIfReady } = useOwnerSetupFinish();

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const result = await getCancellationPolicy(space.id);

        if (mounted) {
          setPolicy({
            ...result,
            lateCancelFee: result.lateCancelFee ?? undefined,
          });
          syncCancellationPolicyFromApi(space.id, result);
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
  }, [space?.id, syncCancellationPolicyFromApi]);

  async function handleSave() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await updateCancellationPolicy(space.id, policy);
      setPolicy({
        ...result,
        lateCancelFee: result.lateCancelFee ?? undefined,
      });
      syncCancellationPolicyFromApi(space.id, result);
      if (await finishOwnerSetupIfReady(space.id)) {
        return;
      }
      setMessage('Política salva. O consultório publica quando todos os itens estiverem completos.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold footer={<OwnerSetupQuickNav />}>
      <HeaderBar title="Cancelamento" subtitle="Defina a regra que aparece para a cliente." onBack={() => router.back()} />
      <OwnerSetupProgressCard />
      <View style={styles.formCard}>
        <Field
          label="Texto da política"
          value={policy.policyText}
          onChangeText={(value) => setPolicy((current) => ({ ...current, policyText: value }))}
          multiline
        />
        <Field
          label="Cancelamento grátis até horas antes"
          value={String(policy.freeCancelBeforeHours)}
          onChangeText={(value) => setPolicy((current) => ({ ...current, freeCancelBeforeHours: Number(value) || 0 }))}
          keyboardType="number-pad"
        />
        <PrimaryButton label="Salvar política" loading={loading} disabled={!space || !policy.policyText} onPress={handleSave} />
      </View>
      {message && <InfoStrip icon="document-text-outline" title="Cancelamento" text={message} />}
      <PrimaryButton label="Ver agenda" variant="secondary" onPress={() => router.push('/owner-agenda')} />
    </ScreenScaffold>
  );
}

export function BlockedTimesScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, syncSpacesFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [items, setItems] = useState<BlockedTime[]>([]);
  const [date, setDate] = useState(buildDateOptions(1)[0]?.id ?? '');
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:00');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const blocks = await getBlockedTimes(space.id);

        if (mounted) {
          setItems(blocks.map((block) => ({ ...block, professionalId: block.professionalId ?? undefined })));
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
  }, [space?.id]);

  async function handleSave() {
    if (!space) {
      return;
    }

    try {
      await createBlockedTime(space.id, { date, startTime, endTime, reason });
      const blocks = await getBlockedTimes(space.id);
      setItems(blocks.map((block) => ({ ...block, professionalId: block.professionalId ?? undefined })));
      setReason('');
      setMessage('Bloqueio criado e já considerado na disponibilidade.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar title="Bloqueios" subtitle="Bloqueie horários manualmente para folgas ou pausas." onBack={() => router.back()} />
      <View style={styles.formCard}>
        <Field label="Data" value={date} onChangeText={setDate} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Início" value={startTime} onChangeText={setStartTime} />
          </View>
          <View style={styles.flex}>
            <Field label="Fim" value={endTime} onChangeText={setEndTime} />
          </View>
        </View>
        <Field label="Motivo" value={reason} onChangeText={setReason} />
        <PrimaryButton label="Criar bloqueio" disabled={!space || !reason} onPress={handleSave} />
      </View>
      {message && <InfoStrip icon="ban-outline" title="Bloqueios" text={message} />}
      <View style={styles.list}>
        {items.map((block) => (
          <View key={block.id} style={styles.itemCard}>
            <Ionicons name="ban-outline" size={20} color={UI.primary} />
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{block.reason}</Text>
              <Text style={styles.itemText}>{block.date} • {block.startTime} - {block.endTime}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScreenScaffold>
  );
}

export function SpacePhotosScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, syncSpacesFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [photos, setPhotos] = useState<ApiSpacePhoto[]>([]);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sortedPhotos = useMemo(
    () => [...photos].sort((first, second) => first.sortOrder - second.sortOrder),
    [photos],
  );

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const items = await getSpacePhotos(space.id);
        if (mounted) {
          setPhotos(items);
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
  }, [space?.id]);

  async function refreshPhotos() {
    if (!space) {
      return;
    }

    setPhotos(await getSpacePhotos(space.id));
  }

  async function handlePickPhotos() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setMessage('Permita o acesso à galeria para selecionar fotos do consultório.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        orderedSelection: true,
        quality: 0.86,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const nextSortOrder = photos.length + 1;

      await Promise.all(
        result.assets.map((asset, index) =>
          uploadSpacePhoto(space.id, {
            uri: asset.uri,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
            caption: asset.fileName?.replace(/\.[^.]+$/, '') ?? `Foto ${nextSortOrder + index}`,
            sortOrder: nextSortOrder + index,
            active: true,
          }),
        ),
      );

      await refreshPhotos();
      setMessage(
        result.assets.length === 1
          ? 'Foto adicionada à galeria pública.'
          : `${result.assets.length} fotos adicionadas à galeria pública.`,
      );
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUrl() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await createSpacePhoto(space.id, {
        url,
        caption: caption.trim() || null,
        sortOrder: photos.length + 1,
        active: true,
      });
      await refreshPhotos();
      setUrl('');
      setCaption('');
      setMessage('Foto salva e exibida no consultório publicado.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(photoId: string) {
    if (!space) {
      return;
    }

    try {
      await deleteSpacePhoto(space.id, photoId);
      await refreshPhotos();
      setMessage('Foto removida do catálogo público.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar title="Fotos do consultório" subtitle="Monte a galeria pública vista pela cliente." onBack={() => router.back()} />
      <View style={styles.formCard}>
        <PrimaryButton
          label="Selecionar da galeria"
          icon="images-outline"
          loading={loading}
          disabled={!space}
          onPress={handlePickPhotos}
        />
        <SectionTitle title="Adicionar por URL" />
        <Field label="URL da foto" value={url} onChangeText={setUrl} autoCapitalize="none" />
        <Field label="Legenda" value={caption} onChangeText={setCaption} />
        <PrimaryButton label="Adicionar URL" loading={loading} disabled={!space || !url} onPress={handleSaveUrl} />
      </View>
      {message && <InfoStrip icon="image-outline" title="Fotos" text={message} />}
      <View style={styles.list}>
        {sortedPhotos.length ? (
          sortedPhotos.map((photo) => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.url }} style={styles.photoPreview} contentFit="cover" />
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{photo.caption || 'Foto do consultório'}</Text>
                <Text numberOfLines={1} style={styles.itemText}>{photo.url}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => handleDelete(photo.id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={22} color={UI.danger} />
              </Pressable>
            </View>
          ))
        ) : (
          <EmptyState icon="image-outline" title="Sem fotos" text="Adicione pelo menos uma imagem real para deixar o catálogo mais confiável." />
        )}
      </View>
    </ScreenScaffold>
  );
}

export function NotificationSettingsScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, syncSpacesFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [settings, setSettings] = useState<ApiNotificationSettings>({
    notifyCustomerOnBooking: true,
    notifyCustomerOnCancel: true,
    notifyCustomerOnReschedule: true,
    notifyOwnerOnBooking: true,
    notifyProfessionalOnBooking: true,
    reminderHoursBefore: 24,
    active: true,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const result = await getNotificationSettings(space.id);
        if (mounted) {
          setSettings(result);
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
  }, [space?.id]);

  async function handleSave() {
    if (!space) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      setSettings(await updateNotificationSettings(space.id, settings));
      setMessage('Notificações salvas para cliente, psicóloga e psicóloga.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar title="Notificações" subtitle="Controle os avisos enviados para cliente, psicóloga e psicóloga." onBack={() => router.back()} />
      <View style={styles.formCard}>
        <View style={styles.chipWrap}>
          <SelectableChip
            label="Cliente ao agendar"
            selected={settings.notifyCustomerOnBooking}
            onPress={() => setSettings((current) => ({ ...current, notifyCustomerOnBooking: !current.notifyCustomerOnBooking }))}
          />
          <SelectableChip
            label="Cliente ao cancelar"
            selected={settings.notifyCustomerOnCancel}
            onPress={() => setSettings((current) => ({ ...current, notifyCustomerOnCancel: !current.notifyCustomerOnCancel }))}
          />
          <SelectableChip
            label="Cliente ao reagendar"
            selected={settings.notifyCustomerOnReschedule}
            onPress={() => setSettings((current) => ({ ...current, notifyCustomerOnReschedule: !current.notifyCustomerOnReschedule }))}
          />
          <SelectableChip
            label="Psicóloga recebe reservas"
            selected={settings.notifyOwnerOnBooking}
            onPress={() => setSettings((current) => ({ ...current, notifyOwnerOnBooking: !current.notifyOwnerOnBooking }))}
          />
          <SelectableChip
            label="Psicóloga recebe agenda"
            selected={settings.notifyProfessionalOnBooking}
            onPress={() => setSettings((current) => ({ ...current, notifyProfessionalOnBooking: !current.notifyProfessionalOnBooking }))}
          />
        </View>
        <Field
          label="Lembrete horas antes"
          value={String(settings.reminderHoursBefore)}
          onChangeText={(value) => setSettings((current) => ({ ...current, reminderHoursBefore: Number(value) || 24 }))}
          keyboardType="number-pad"
        />
        <PrimaryButton label="Salvar notificações" loading={loading} disabled={!space} onPress={handleSave} />
      </View>
      {message && <InfoStrip icon="notifications-outline" title="Notificações" text={message} />}
    </ScreenScaffold>
  );
}

export function OwnerAgendaScreen() {
  const router = useRouter();
  const { selectedOwnerSpace, appointments, syncSpacesFromApi, syncAppointmentsFromApi } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<AgendaCalendarView>('day');
  const [selectedDate, setSelectedDate] = useState(getIsoDate(new Date()));
  const spaceAppointments = appointments.filter((appointment) => appointment.spaceId === space?.id);

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id) {
        return;
      }

      try {
        const items = await getOwnerAppointments(space.id);

        if (mounted) {
          syncAppointmentsFromApi(items);
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
  }, [space?.id, syncAppointmentsFromApi]);

  const totals = useMemo(
    () => ({
      revenue: spaceAppointments
        .filter((appointment) => !['cancelled', 'expired', 'rejected'].includes(appointment.status))
        .reduce((sum, appointment) => sum + appointment.total, 0),
      reserved: spaceAppointments.filter((appointment) => appointment.status === 'pending_payment').length,
      pendingConfirmation: spaceAppointments.filter((appointment) => appointment.status === 'pending_confirmation').length,
    }),
    [spaceAppointments],
  );
  const period = useMemo(() => getCalendarPeriod(selectedDate, calendarView), [calendarView, selectedDate]);
  const visibleAppointments = useMemo(
    () =>
      spaceAppointments
        .filter((appointment) => isAppointmentInsidePeriod(appointment, period))
        .sort((first, second) => first.startDateTime.localeCompare(second.startDateTime)),
    [period, spaceAppointments],
  );

  async function refreshAppointments() {
    if (!space?.id) {
      return;
    }

    const items = await getOwnerAppointments(space.id);
    syncAppointmentsFromApi(items);
  }

  async function updateStatus(appointmentId: string, action: 'complete' | 'no_show') {
    if (!space) {
      return;
    }

    setUpdatingId(appointmentId);
    setMessage(null);

    try {
      if (action === 'complete') {
        await completeOwnerAppointment(space.id, appointmentId);
      } else {
        await markOwnerAppointmentNoShow(space.id, appointmentId);
      }

      await refreshAppointments();
      setMessage(action === 'complete' ? 'Atendimento marcado como concluído.' : 'Falta registrada.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmAppointment(appointmentId: string) {
    if (!space) {
      return;
    }

    setUpdatingId(appointmentId);
    setMessage(null);

    try {
      await confirmOwnerAppointment(space.id, appointmentId);
      await refreshAppointments();
      setMessage('Agendamento aceito e confirmado.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  }

  function handleOpenRoom(url: string) {
    const route = buildVideoCallRoute(url);

    if (route) {
      router.push(route);
      return;
    }

    void openOnlineRoom(url);
  }

  function moveCalendar(direction: -1 | 1) {
    setSelectedDate((current) => shiftCalendarDate(current, calendarView, direction));
  }

  return (
    <ScreenScaffold>
      <HeaderBar title="Agenda" subtitle="Acompanhe agendamentos, reservas e atendimentos do consultório." onBack={() => router.back()} />
      <View style={styles.row}>
        <Metric icon="calendar-outline" label="Agendamentos" value={String(spaceAppointments.length)} />
        <Metric icon="cash-outline" label="Receita" value={formatCurrency(totals.revenue)} />
      </View>
      <View style={styles.row}>
        <Metric icon="checkmark-circle-outline" label="A aceitar" value={String(totals.pendingConfirmation)} />
        <Metric icon="time-outline" label="Pagamento" value={String(totals.reserved)} />
      </View>
      {message && <InfoStrip icon="alert-circle-outline" title="Agenda" text={message} tone="warning" />}
      <AgendaCalendar
        appointments={spaceAppointments}
        period={period}
        selectedDate={selectedDate}
        view={calendarView}
        onChangeDate={setSelectedDate}
        onChangeView={setCalendarView}
        onNext={() => moveCalendar(1)}
        onPrevious={() => moveCalendar(-1)}
        onToday={() => setSelectedDate(getIsoDate(new Date()))}
      />
      <SectionTitle title="Agenda do período" actionLabel={`${visibleAppointments.length} itens`} />
      <View style={styles.list}>
        {visibleAppointments.length ? (
          visibleAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              updating={updatingId === appointment.id}
              onOpen={() => router.push({ pathname: '/owner-appointment-details', params: { appointmentId: appointment.id } })}
              onConfirm={() => confirmAppointment(appointment.id)}
              onComplete={() => updateStatus(appointment.id, 'complete')}
              onNoShow={() => updateStatus(appointment.id, 'no_show')}
              onOpenRoom={handleOpenRoom}
            />
          ))
        ) : (
          <EmptyState icon="calendar-outline" title="Nenhum agendamento" text="Não há agendamentos no período selecionado." />
        )}
      </View>
      <PrimaryButton label="Bloquear horário" variant="secondary" onPress={() => router.push('/blocked-times')} />
      <PrimaryButton label="Notificações" variant="secondary" onPress={() => router.push('/notification-settings')} />
    </ScreenScaffold>
  );
}

export function OwnerAppointmentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const {
    selectedOwnerSpace,
    syncSpacesFromApi,
    syncAppointmentsFromApi,
  } = useOwnerConfig();
  const space = selectedOwnerSpace;
  const [details, setDetails] = useState<ApiAppointmentDetails | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'confirm' | 'reject' | null>(null);
  const [rejectFormVisible, setRejectFormVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const appointment = details?.appointment ?? null;

  useOwnerBootstrap(space?.id ?? null, syncSpacesFromApi);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!space?.id || !params.appointmentId) {
        return;
      }

      try {
        const result = await getOwnerAppointmentDetails(space.id, params.appointmentId);

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
  }, [params.appointmentId, space?.id]);

  async function refreshAppointments() {
    if (!space?.id) {
      return;
    }

    syncAppointmentsFromApi(await getOwnerAppointments(space.id));
  }

  async function confirmAppointment() {
    if (!space?.id || !appointment) {
      return;
    }

    setLoadingAction('confirm');
    setMessage(null);

    try {
      const updated = await confirmOwnerAppointment(space.id, appointment.id);
      setDetails((current) => current ? { ...current, appointment: updated } : current);
      await refreshAppointments();
      setRejectFormVisible(false);
      setRejectReason('');
      setMessage('Agendamento aceito. A sala online já está disponível.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  }

  async function rejectAppointment() {
    if (!space?.id || !appointment) {
      return;
    }

    const reason = rejectReason.trim();

    if (reason.length < 3 || reason.length > 500) {
      setMessage('Informe um motivo entre 3 e 500 caracteres.');
      return;
    }

    setLoadingAction('reject');
    setMessage(null);

    try {
      const updated = await rejectOwnerAppointment(space.id, appointment.id, reason);
      setDetails((current) => current ? { ...current, appointment: updated } : current);
      await refreshAppointments();
      setRejectFormVisible(false);
      setMessage('Agendamento recusado. A cliente receberá o motivo no app.');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  }

  function handleOpenRoom(url: string) {
    const route = buildVideoCallRoute(url);

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
        <EmptyState icon="calendar-outline" title="Agendamento não encontrado" text="Abra o detalhe a partir da agenda." />
      </ScreenScaffold>
    );
  }

  if (!space) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Agendamento" onBack={() => router.back()} />
        <NoSpaceState />
      </ScreenScaffold>
    );
  }

  const needsConfirmation = appointment?.status === 'pending_confirmation';
  const roomAvailable = appointment?.status === 'confirmed' && appointment.onlineRoomUrl;

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Detalhe do pedido"
        subtitle={appointment ? `Pedido ${appointment.code}` : 'Carregando agendamento'}
        onBack={() => router.back()}
      />

      {message && <InfoStrip icon="information-circle-outline" title="Agendamento" text={message} tone="warning" />}

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

          {roomAvailable ? (
            <InfoStrip
              icon="videocam-outline"
              title="Sala online disponível"
              text="Cliente, proprietária e profissional podem entrar por este link."
              tone="success"
            />
          ) : null}

          <View style={styles.formCard}>
            <OwnerDetailRow icon="person-outline" label="Cliente" value={details.customer.name} />
            <OwnerDetailRow icon="mail-outline" label="Contato" value={details.customer.phone ?? details.customer.email} />
            <OwnerDetailRow icon="business-outline" label="Consultório" value={details.space.name} />
            <OwnerDetailRow icon="people-outline" label="Psicóloga" value={details.professional.name} />
            <OwnerDetailRow icon="calendar-outline" label="Data" value={formatDateLabel(appointment.startDateTime.slice(0, 10)).full} />
            <OwnerDetailRow icon="time-outline" label="Horário" value={`${appointment.startDateTime.slice(11, 16)} - ${appointment.endDateTime.slice(11, 16)}`} />
            <OwnerDetailRow icon="wallet-outline" label="Valor" value={formatCurrency(appointment.total)} />
            <OwnerDetailRow icon="ellipse-outline" label="Status" value={appointmentStatusLabel(appointment.status)} />
          </View>

          <SectionTitle title="Consultas" />
          <View style={styles.formCard}>
            {details.services.map((service) => (
              <OwnerDetailRow
                key={service.id}
                icon="checkmark-circle-outline"
                label={service.name}
                value={`${formatDuration(service.durationMinutes)} • ${formatCurrency(service.price)}`}
              />
            ))}
          </View>

          {roomAvailable ? (
            <PrimaryButton label="Entrar na sala" icon="videocam-outline" onPress={() => handleOpenRoom(appointment.onlineRoomUrl!)} />
          ) : null}

          {needsConfirmation ? (
            <View style={styles.formCard}>
              <View style={styles.actionRow}>
                <View style={styles.flex}>
                  <PrimaryButton
                    label="Aceitar"
                    icon="checkmark-circle-outline"
                    loading={loadingAction === 'confirm'}
                    onPress={confirmAppointment}
                  />
                </View>
                <View style={styles.flex}>
                  <PrimaryButton
                    label="Reprovar"
                    icon="close-circle-outline"
                    variant="secondary"
                    disabled={loadingAction === 'confirm'}
                    onPress={() => setRejectFormVisible((current) => !current)}
                  />
                </View>
              </View>

              {rejectFormVisible ? (
                <>
                  <Field
                    label="Motivo para a cliente"
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                  />
                  <PrimaryButton
                    label="Enviar reprovação"
                    icon="send-outline"
                    variant="ghost"
                    loading={loadingAction === 'reject'}
                    onPress={rejectAppointment}
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState icon="calendar-outline" title="Carregando detalhe" text="Buscando os dados do agendamento." />
      )}
    </ScreenScaffold>
  );
}

function useOwnerBootstrap(
  currentSpaceId: string | null,
  syncSpacesFromApi: (items: Awaited<ReturnType<typeof getMySpaces>>) => void,
) {
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (currentSpaceId) {
        return;
      }

      try {
        const spaces = await getMySpaces();

        if (mounted) {
          syncSpacesFromApi(spaces);
        }
      } catch {
        // A tela mostra o estado vazio e o próximo submit traz o erro da API.
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [currentSpaceId, syncSpacesFromApi]);
}

function NoSpaceState() {
  const router = useRouter();

  return (
    <EmptyState
      icon="storefront-outline"
      title="Crie um consultório"
      text="Crie um consultório para liberar as configurações."
      action={<PrimaryButton label="Criar consultório" onPress={() => router.replace('/create-space')} />}
    />
  );
}

function AgendaCalendar({
  appointments,
  period,
  selectedDate,
  view,
  onChangeDate,
  onChangeView,
  onNext,
  onPrevious,
  onToday,
}: {
  appointments: Appointment[];
  period: AgendaCalendarPeriod;
  selectedDate: string;
  view: AgendaCalendarView;
  onChangeDate: (date: string) => void;
  onChangeView: (view: AgendaCalendarView) => void;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
}) {
  const appointmentsByDate = useMemo(() => groupAppointmentsByDate(appointments), [appointments]);
  const visibleDays = useMemo(
    () => getVisibleCalendarDays(selectedDate, view, period),
    [period, selectedDate, view],
  );
  const periodAppointmentsCount = appointments.filter((appointment) =>
    isAppointmentInsidePeriod(appointment, period),
  ).length;
  const selectedAppointments = appointmentsByDate.get(selectedDate) ?? [];
  const weekHeaderVisible = view !== 'day';

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <CalendarIconButton icon="chevron-back" label="Período anterior" onPress={onPrevious} />
        <View style={styles.calendarTitleCopy}>
          <Text style={styles.calendarTitle}>{period.title}</Text>
          <Text style={styles.calendarSubtitle}>{periodAppointmentsCount} agendamentos no período</Text>
        </View>
        <CalendarIconButton icon="chevron-forward" label="Próximo período" onPress={onNext} />
      </View>

      <View style={styles.calendarToolbar}>
        <View style={styles.calendarSegment}>
          {calendarViewOptions.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: view === option.id }}
              onPress={() => onChangeView(option.id)}
              style={({ pressed }) => [
                styles.calendarSegmentItem,
                view === option.id && styles.calendarSegmentItemSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.calendarSegmentText, view === option.id && styles.calendarSegmentTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onToday}
          style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}>
          <Text style={styles.todayButtonText}>Hoje</Text>
        </Pressable>
      </View>

      {weekHeaderVisible && (
        <View style={styles.calendarWeekHeader}>
          {weekdays.map((day) => (
            <Text key={day.id} style={styles.calendarWeekHeaderText}>{day.label}</Text>
          ))}
        </View>
      )}

      <View
        style={[
          styles.calendarGrid,
          view === 'day' && styles.calendarGridDay,
          view === 'week' && styles.calendarGridWeek,
          view === 'month' && styles.calendarGridMonth,
        ]}>
        {visibleDays.map((date) => (
          <CalendarDayCell
            key={date}
            appointments={appointmentsByDate.get(date) ?? []}
            date={date}
            muted={view === 'month' && !date.startsWith(selectedDate.slice(0, 7))}
            selected={date === selectedDate}
            view={view}
            onPress={() => onChangeDate(date)}
          />
        ))}
      </View>

      <View style={styles.calendarSelectedSummary}>
        <View style={styles.calendarSelectedIcon}>
          <Ionicons name="calendar-outline" size={18} color={UI.primary} />
        </View>
        <View style={styles.itemCopy}>
          <Text style={styles.itemTitle}>{formatDateLabel(selectedDate).full}</Text>
          <Text style={styles.itemText}>
            {selectedAppointments.length
              ? `${selectedAppointments.length} agendamentos neste dia`
              : 'Nenhum agendamento neste dia'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CalendarIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.calendarIconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={21} color={UI.text} />
    </Pressable>
  );
}

function CalendarDayCell({
  appointments,
  date,
  muted,
  selected,
  view,
  onPress,
}: {
  appointments: Appointment[];
  date: string;
  muted: boolean;
  selected: boolean;
  view: AgendaCalendarView;
  onPress: () => void;
}) {
  const parsed = parseLocalDate(date);
  const labels = formatDateLabel(date);
  const appointmentPreview = appointments.slice(0, view === 'day' ? 3 : 2);
  const compact = view === 'month';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.calendarDayCell,
        compact && styles.calendarDayCellCompact,
        view === 'week' && styles.calendarDayCellWeek,
        view === 'day' && styles.calendarDayCellLarge,
        selected && styles.calendarDayCellSelected,
        muted && styles.calendarDayCellMuted,
        pressed && styles.pressed,
      ]}>
      <View style={styles.calendarDayTop}>
        <Text style={[styles.calendarDayNumber, selected && styles.calendarDayNumberSelected, muted && styles.calendarDayMutedText]}>
          {parsed.getDate()}
        </Text>
        {appointments.length > 0 && (
          <View style={[styles.calendarCountBadge, selected && styles.calendarCountBadgeSelected]}>
            <Text style={[styles.calendarCountText, selected && styles.calendarCountTextSelected]}>
              {appointments.length}
            </Text>
          </View>
        )}
      </View>
      {!compact && (
        <Text style={[styles.calendarDayLabel, selected && styles.calendarDayLabelSelected]}>
          {labels.weekday}
        </Text>
      )}
      {appointmentPreview.map((appointment) => (
        <View key={appointment.id} style={[styles.calendarAppointmentPill, selected && styles.calendarAppointmentPillSelected]}>
          <Text
            numberOfLines={1}
            style={[styles.calendarAppointmentText, selected && styles.calendarAppointmentTextSelected]}>
            {appointment.startDateTime.slice(11, 16)} {appointmentStatusLabel(appointment.status)}
          </Text>
        </View>
      ))}
      {appointments.length > appointmentPreview.length && (
        <Text style={[styles.calendarMoreText, selected && styles.calendarDayLabelSelected]}>
          +{appointments.length - appointmentPreview.length}
        </Text>
      )}
    </Pressable>
  );
}

function SelectableChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SettingsSwitchRow({
  icon,
  title,
  text,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingSwitchRow}>
      <View style={styles.settingSwitchIcon}>
        <Ionicons name={icon} size={20} color={UI.primary} />
      </View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemText}>{text}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? UI.surface : '#F8FAFC'}
        trackColor={{ false: '#CBD5E1', true: UI.primary }}
      />
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={19} color={UI.primary} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function OwnerDetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.itemCardFlat}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={20} color={UI.primary} />
      </View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{label}</Text>
        <Text style={styles.itemText}>{value}</Text>
      </View>
    </View>
  );
}

function AppointmentCard({
  appointment,
  updating,
  onOpen,
  onConfirm,
  onComplete,
  onNoShow,
  onOpenRoom,
}: {
  appointment: Appointment;
  updating?: boolean;
  onOpen?: () => void;
  onConfirm?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  onOpenRoom?: (url: string) => void;
}) {
  const needsConfirmation = appointment.status === 'pending_confirmation';
  const canClose = !needsConfirmation && !['cancelled', 'expired', 'completed', 'no_show', 'rejected'].includes(appointment.status);

  return (
    <View style={styles.appointmentManagerCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.itemCardFlat, pressed && styles.pressed]}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={20} color={UI.primary} />
        </View>
        <View style={styles.itemCopy}>
          <Text style={styles.itemTitle}>Pedido {appointment.code}</Text>
          <Text style={styles.itemText}>
            {appointment.startDateTime.slice(0, 10)} • {appointment.startDateTime.slice(11, 16)} - {appointment.endDateTime.slice(11, 16)}
          </Text>
          <Text style={styles.itemText}>{formatCurrency(appointment.total)} • {appointmentStatusLabel(appointment.status)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={UI.textMuted} />
      </Pressable>
      {needsConfirmation && (
        <View style={styles.actionRow}>
          <View style={styles.flex}>
            <PrimaryButton label="Aceitar" icon="checkmark-circle-outline" loading={updating} onPress={onConfirm} />
          </View>
          <View style={styles.flex}>
            <PrimaryButton label="Detalhes" icon="document-text-outline" variant="secondary" onPress={onOpen} />
          </View>
        </View>
      )}
      {canClose && (
        <View style={styles.actionRow}>
          {appointment.status === 'confirmed' && appointment.onlineRoomUrl ? (
            <View style={styles.flex}>
              <PrimaryButton label="Sala" icon="videocam-outline" loading={updating} onPress={() => onOpenRoom?.(appointment.onlineRoomUrl!)} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <PrimaryButton label="Concluir" icon="checkmark-outline" loading={updating} onPress={onComplete} />
          </View>
          <View style={styles.flex}>
            <PrimaryButton label="Falta" icon="close-outline" variant="secondary" loading={updating} onPress={onNoShow} />
          </View>
        </View>
      )}
    </View>
  );
}

function appointmentStatusLabel(status: Appointment['status'] | 'reserved') {
  const labels: Record<Appointment['status'] | 'reserved', string> = {
    reserved: 'Reservado',
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

function getCalendarPeriod(selectedDate: string, view: AgendaCalendarView): AgendaCalendarPeriod {
  const parsed = parseLocalDate(selectedDate);

  if (view === 'day') {
    return {
      startDate: selectedDate,
      endDate: selectedDate,
      title: formatDateLabel(selectedDate).full,
    };
  }

  if (view === 'week') {
    const start = addDays(parsed, -parsed.getDay());
    const end = addDays(start, 6);

    return {
      startDate: getIsoDate(start),
      endDate: getIsoDate(end),
      title: `${formatShortDate(start)} - ${formatShortDate(end)}`,
    };
  }

  const monthStart = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  const monthEnd = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);

  return {
    startDate: getIsoDate(monthStart),
    endDate: getIsoDate(monthEnd),
    title: capitalizeCalendarText(parsed.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })),
  };
}

function getVisibleCalendarDays(
  selectedDate: string,
  view: AgendaCalendarView,
  period: AgendaCalendarPeriod,
) {
  if (view === 'day') {
    return [selectedDate];
  }

  if (view === 'week') {
    return buildDateRange(period.startDate, period.endDate);
  }

  const monthStart = parseLocalDate(period.startDate);
  const monthEnd = parseLocalDate(period.endDate);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const gridEnd = addDays(monthEnd, 6 - monthEnd.getDay());

  return buildDateRange(getIsoDate(gridStart), getIsoDate(gridEnd));
}

function isAppointmentInsidePeriod(appointment: Appointment, period: AgendaCalendarPeriod) {
  const date = appointment.startDateTime.slice(0, 10);

  return date >= period.startDate && date <= period.endDate;
}

function shiftCalendarDate(date: string, view: AgendaCalendarView, direction: -1 | 1) {
  const parsed = parseLocalDate(date);

  if (view === 'day') {
    return getIsoDate(addDays(parsed, direction));
  }

  if (view === 'week') {
    return getIsoDate(addDays(parsed, direction * 7));
  }

  return getIsoDate(new Date(parsed.getFullYear(), parsed.getMonth() + direction, Math.min(parsed.getDate(), 28)));
}

function groupAppointmentsByDate(appointments: Appointment[]) {
  const grouped = new Map<string, Appointment[]>();

  appointments.forEach((appointment) => {
    const date = appointment.startDateTime.slice(0, 10);
    const items = grouped.get(date) ?? [];
    items.push(appointment);
    grouped.set(date, items.sort((first, second) => first.startDateTime.localeCompare(second.startDateTime)));
  });

  return grouped;
}

function buildDateRange(startDate: string, endDate: string) {
  const days: string[] = [];
  const cursor = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  while (cursor <= end) {
    days.push(getIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);

  return next;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function capitalizeCalendarText(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const paymentToggles: { id: keyof Pick<SpacePaymentSettings, 'allowPix' | 'allowCreditCard' | 'allowDebitCard' | 'allowPayOnSite' | 'requirePrePayment'>; label: string }[] = [
  { id: 'allowPix', label: 'Pix combinado' },
  { id: 'allowCreditCard', label: 'Cartão de crédito combinado' },
  { id: 'allowDebitCard', label: 'Cartão de débito combinado' },
  { id: 'allowPayOnSite', label: 'Pagamento combinado' },
  { id: 'requirePrePayment', label: 'Sinal antecipado' },
];

const styles = StyleSheet.create({
  formCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  list: {
    gap: 10,
  },
  itemCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  appointmentManagerCard: {
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  calendarCard: {
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  calendarHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarTitleCopy: {
    flex: 1,
    gap: 2,
  },
  calendarTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  calendarSubtitle: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  calendarIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: UI.primarySoft,
  },
  calendarToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarSegment: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    backgroundColor: UI.primarySoft,
  },
  calendarSegmentItem: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  calendarSegmentItemSelected: {
    backgroundColor: UI.primary,
  },
  calendarSegmentText: {
    color: UI.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  calendarSegmentTextSelected: {
    color: UI.surface,
  },
  todayButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  todayButtonText: {
    color: UI.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    gap: 6,
  },
  calendarWeekHeaderText: {
    flex: 1,
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarGridDay: {
    flexDirection: 'column',
  },
  calendarGridWeek: {
    flexWrap: 'nowrap',
  },
  calendarGridMonth: {
    flexWrap: 'wrap',
  },
  calendarSelectedSummary: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  calendarSelectedIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: UI.primarySoft,
  },
  calendarDayCell: {
    minHeight: 96,
    flex: 1,
    gap: 6,
    padding: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  calendarDayCellCompact: {
    minWidth: '13%',
    minHeight: 82,
    padding: 7,
  },
  calendarDayCellWeek: {
    minWidth: 0,
  },
  calendarDayCellLarge: {
    minHeight: 132,
  },
  calendarDayCellSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  calendarDayCellMuted: {
    opacity: 0.48,
  },
  calendarDayTop: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  calendarDayNumber: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  calendarDayNumberSelected: {
    color: UI.surface,
  },
  calendarDayMutedText: {
    color: UI.textMuted,
  },
  calendarCountBadge: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: UI.primarySoft,
  },
  calendarCountBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  calendarCountText: {
    color: UI.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  calendarCountTextSelected: {
    color: UI.surface,
  },
  calendarDayLabel: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  calendarDayLabelSelected: {
    color: UI.surface,
  },
  calendarAppointmentPill: {
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: UI.primarySoft,
  },
  calendarAppointmentPillSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  calendarAppointmentText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '800',
  },
  calendarAppointmentTextSelected: {
    color: UI.surface,
  },
  calendarMoreText: {
    color: UI.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  itemCardFlat: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoCard: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  photoPreview: {
    width: 66,
    height: 66,
    borderRadius: 14,
    backgroundColor: UI.primarySoft,
  },
  iconCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: UI.primarySoft,
  },
  itemCopy: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  itemText: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  chipSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  chipText: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  chipTextSelected: {
    color: UI.surface,
  },
  settingGroup: {
    gap: 10,
  },
  settingSwitchRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingSwitchIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: UI.primarySoft,
  },
  metric: {
    flex: 1,
    gap: 5,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  metricLabel: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
