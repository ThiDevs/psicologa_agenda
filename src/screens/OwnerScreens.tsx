import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  EmptyState,
  Field,
  HeaderBar,
  InfoStrip,
  MetricPill,
  PrimaryButton,
  ScreenScaffold,
  SectionTitle,
  UI,
} from '@/components/app-ui';
import {
  getOnboardingRoute,
  OwnerSetupProgressCard,
  OwnerSetupQuickNav,
} from '@/components/owner-setup-progress';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import { formatCep, lookupCep, onlyCepDigits } from '@/services/cep-client';
import {
  createSpace as createRemoteSpace,
  getApiErrorMessage,
  getMySpaces,
  getOnboardingChecklist,
  getOwnerDashboard,
  type ApiOwnerDashboard,
} from '@/services/api-client';
import { useOwnerSetupFinish } from '@/hooks/use-owner-setup-finish';
import type { OnboardingItem, Space } from '@/types/domain';
import { formatCurrency } from '@/utils/format';

export function CreateSpaceScreen() {
  const router = useRouter();
  const { categories, createSpace } = useOwnerConfig();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'therapy');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [cepMessageTone, setCepMessageTone] = useState<'info' | 'success' | 'warning'>('info');
  const [resolvingCoordinates, setResolvingCoordinates] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<{
    message: string;
    tone: 'success' | 'warning';
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastLookupCepRef = useRef('');
  const zipCodeDigits = onlyCepDigits(zipCode);
  const addressFieldsLocked = cepLookupLoading || submitting;

  const canSubmit =
    name.trim().length > 2 &&
    address.trim().length > 5 &&
    phone.trim().length > 7 &&
    zipCodeDigits.length === 8 &&
    !cepLookupLoading;

  useEffect(() => {
    const digits = onlyCepDigits(zipCode);

    if (digits.length !== 8) {
      lastLookupCepRef.current = '';
      setCepMessage(null);
      return;
    }

    if (lastLookupCepRef.current === digits) {
      return;
    }

    let mounted = true;
    lastLookupCepRef.current = digits;
    setCepLookupLoading(true);
    setCepMessageTone('info');
    setCepMessage('Buscando endereço pelo CEP...');

    lookupCep(digits)
      .then((result) => {
        if (!mounted) {
          return;
        }

        setZipCode(result.zipCode);

        if (result.address) {
          setAddress(result.address);
        }

        if (result.neighborhood) {
          setNeighborhood(result.neighborhood);
        }

        if (result.city) {
          setCity(result.city);
        }

        if (result.state) {
          setState(result.state);
        }

        setCepMessageTone('success');
        setCepMessage(
          result.address && result.neighborhood
            ? 'Endereço preenchido pelo CEP. Revise e edite se necessário.'
            : 'CEP encontrado. Complete os campos que não vieram na consulta.',
        );
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setCepMessageTone('warning');
        setCepMessage(error instanceof Error ? error.message : 'Não foi possível consultar o CEP agora.');
      })
      .finally(() => {
        if (mounted) {
          setCepLookupLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [zipCode]);

  function handleZipCodeChange(value: string) {
    setZipCode(formatCep(value));
  }

  async function handleUseCurrentLocation() {
    setResolvingCoordinates(true);
    setLocationFeedback(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setCoordinates(null);
        setLocationFeedback({
          tone: 'warning',
          message: 'Permita a localização para usar o consultório no catálogo por proximidade.',
        });
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoordinates({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
      setLocationFeedback({
        tone: 'success',
        message: 'Localização salva. Ela será usada para mostrar o consultório perto dos clientes.',
      });
    } catch {
      setLocationFeedback({
        tone: 'warning',
        message: 'Não foi possível capturar a localização agora. Tente novamente em instantes.',
      });
    } finally {
      setResolvingCoordinates(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const remoteSpace = await createRemoteSpace({
        name,
        description,
        category: categoryId,
        phone,
        whatsapp,
        address,
        neighborhood,
        city,
        state,
        zipCode,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      });

      const space = createSpace({
        id: remoteSpace.id,
        name,
        categoryId,
        description,
        phone,
        whatsapp,
        address,
        neighborhood,
        city,
        state,
        zipCode,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        published: remoteSpace.published,
        onboardingCompleted: remoteSpace.onboardingCompleted,
      });

      router.replace({
        pathname: '/owner-onboarding-checklist',
        params: { spaceId: space.id },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Criar consultório"
        subtitle="A psicóloga cria o consultório real e abre o checklist inicial."
        onBack={() => router.back()}
      />

      <View style={styles.formCard}>
        <Field label="Nome do consultório" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Descrição curta" value={description} onChangeText={setDescription} multiline />
        <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
        <Field
          label="CEP"
          value={zipCode}
          editable={!addressFieldsLocked}
          onChangeText={handleZipCodeChange}
          keyboardType="number-pad"
          maxLength={9}
        />
        <Field
          label="Endereço"
          value={address}
          editable={!addressFieldsLocked}
          onChangeText={setAddress}
          autoCapitalize="words"
        />
        <Field
          label="Bairro"
          value={neighborhood}
          editable={!addressFieldsLocked}
          onChangeText={setNeighborhood}
          autoCapitalize="words"
        />
        <View style={styles.formRow}>
          <View style={styles.formRowBig}>
            <Field
              label="Cidade"
              value={city}
              editable={!addressFieldsLocked}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.formRowSmall}>
            <Field
              label="UF"
              value={state}
              editable={!addressFieldsLocked}
              onChangeText={setState}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>
        <PrimaryButton
          label={coordinates ? 'Localização atual salva' : 'Usar localização atual'}
          icon={coordinates ? 'checkmark-circle-outline' : 'navigate-outline'}
          variant="secondary"
          disabled={submitting}
          loading={resolvingCoordinates}
          onPress={handleUseCurrentLocation}
        />
      </View>

      {locationFeedback && (
        <InfoStrip
          icon={locationFeedback.tone === 'success' ? 'navigate-circle-outline' : 'alert-circle-outline'}
          title="Localização"
          text={locationFeedback.message}
          tone={locationFeedback.tone}
        />
      )}

      {cepMessage && (
        <InfoStrip
          icon={cepLookupLoading ? 'search-outline' : 'location-outline'}
          title="CEP"
          text={cepMessage}
          tone={cepMessageTone}
        />
      )}

      {errorMessage && (
        <InfoStrip
          icon="alert-circle-outline"
          title="Não foi possível salvar"
          text={errorMessage}
          tone="warning"
        />
      )}

      <SectionTitle title="Categoria principal" />
      <View style={styles.categoryRow}>
        {categories.slice(0, 4).map((category) => {
          const selected = category.id === categoryId;

          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              onPress={() => setCategoryId(category.id)}
              style={({ pressed }) => [
                styles.categoryChip,
                selected && styles.categoryChipSelected,
                pressed && styles.pressed,
              ]}>
              {category.iconName.endsWith('-outline') ? (
                <Ionicons
                  name={category.iconName as keyof typeof Ionicons.glyphMap}
                  size={21}
                  color={selected ? UI.surface : UI.primary}
                />
              ) : (
                <MaterialCommunityIcons
                  name={category.iconName as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={21}
                  color={selected ? UI.surface : UI.primary}
                />
              )}
              <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label="Criar e abrir checklist"
        disabled={!canSubmit}
        loading={submitting}
        onPress={handleSubmit}
      />
    </ScreenScaffold>
  );
}

export function OwnerOnboardingChecklistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ spaceId?: string }>();
  const { sessionSource } = useAuth();
  const { spaces, selectedOwnerSpace, getOnboardingItems } = useOwnerConfig();
  const space = spaces.find((item) => item.id === params.spaceId) ?? selectedOwnerSpace;
  const localItems = getOnboardingItems(space?.id ?? null);
  const [remoteItems, setRemoteItems] = useState<OnboardingItem[] | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const { finishOwnerSetup } = useOwnerSetupFinish();
  const items = remoteItems ?? localItems;
  const completedCount = items.filter((item) => item.complete).length;
  const nextItem = items.find((item) => !item.complete) ?? null;
  const canPublish = items.every((item) => item.complete);

  async function handlePrimaryAction() {
    if (!space?.id) {
      return;
    }

    if (!canPublish) {
      router.push(getOnboardingRoute(nextItem?.id));
      return;
    }

    setPublishing(true);
    setRemoteError(null);

    try {
      await finishOwnerSetup(space.id);
    } catch (error) {
      setRemoteError(getApiErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadChecklist() {
      if (sessionSource !== 'api' || !space?.id) {
        return;
      }

      try {
        const checklist = await getOnboardingChecklist(space.id);

        if (mounted) {
          setRemoteItems(checklist);
          setRemoteError(null);
        }
      } catch (error) {
        if (mounted) {
          setRemoteError(getApiErrorMessage(error));
        }
      }
    }

    loadChecklist();

    return () => {
      mounted = false;
    };
  }, [sessionSource, space?.id]);

  return (
    <ScreenScaffold
      bottomOffset={172}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton
            label={canPublish ? 'Finalizar e abrir gestão' : 'Continuar configuração'}
            icon={canPublish ? 'checkmark-circle-outline' : 'construct-outline'}
            loading={publishing}
            disabled={!space?.id}
            onPress={handlePrimaryAction}
          />
          <OwnerSetupQuickNav spaceId={space?.id} hideChecklist />
        </View>
      }>
      <HeaderBar
        title="Checklist inicial"
        subtitle={`${completedCount} de ${items.length} itens completos antes de publicar.`}
        onBack={() => router.back()}
      />

      <OwnerSetupProgressCard
        spaceId={space?.id}
        items={items}
        showContinueButton={Boolean(nextItem)}
      />

      {space ? (
        <SpaceOwnerCard space={space} />
      ) : (
        <EmptyState
          icon="storefront-outline"
          title="Nenhum consultório criado"
          text="Crie um consultório para liberar o checklist da psicóloga."
          action={<PrimaryButton label="Criar consultório" onPress={() => router.replace('/create-space')} />}
        />
      )}

      <View style={styles.checklistCard}>
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            attention={item.id === nextItem?.id}
            onPress={() => router.push(getOnboardingRoute(item.id))}
          />
        ))}
      </View>

      {remoteError && (
        <InfoStrip
          icon="alert-circle-outline"
          title={canPublish ? 'Não foi possível finalizar' : 'Checklist exibido'}
          text={remoteError}
          tone="warning"
        />
      )}

      {canPublish ? (
        <InfoStrip
          icon="checkmark-circle-outline"
          title="Tudo pronto"
          text="Finalize para publicar o consultório, ativar o perfil de atendimento nesta conta e abrir a gestão."
          tone="success"
        />
      ) : (
        <InfoStrip
          icon="eye-outline"
          title="Publicação"
          text="O consultório só aparece para clientes quando está ativo, publicado e com onboarding completo."
        />
      )}
    </ScreenScaffold>
  );
}

export function OwnerDashboardScreen() {
  const router = useRouter();
  const {
    sessionSource,
    user,
    logout,
    professionalProfileActive,
    activateProfessionalProfile,
  } = useAuth();
  const {
    spaces,
    services,
    professionals,
    appointments,
    selectedOwnerSpace,
    selectedOwnerSpaceId,
    setSelectedOwnerSpaceId,
    getOnboardingItems,
    syncSpacesFromApi,
  } = useOwnerConfig();
  const ownerSpace = selectedOwnerSpace;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [remoteDashboard, setRemoteDashboard] = useState<ApiOwnerDashboard | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const spaceServices = services.filter((service) => service.spaceId === ownerSpace?.id);
  const spaceProfessionals = professionals.filter((professional) => professional.spaceId === ownerSpace?.id);
  const spaceAppointments = appointments.filter((appointment) => appointment.spaceId === ownerSpace?.id);
  const todaysRevenue = spaceAppointments.reduce((total, appointment) => total + appointment.total, 0);
  const checklist = getOnboardingItems(ownerSpace?.id ?? null);
  const checklistDone = remoteDashboard?.checklistComplete ?? checklist.every((item) => item.complete);
  const metrics = useMemo(
    () => ({
      appointmentsCount: remoteDashboard?.todayAppointmentsCount ?? spaceAppointments.length,
      revenue: remoteDashboard?.estimatedRevenue ?? todaysRevenue,
      servicesCount: remoteDashboard?.activeServicesCount ?? spaceServices.length,
      professionalsCount: remoteDashboard?.activeProfessionalsCount ?? spaceProfessionals.length,
    }),
    [
      remoteDashboard,
      spaceAppointments.length,
      spaceProfessionals.length,
      spaceServices.length,
      todaysRevenue,
    ],
  );

  function selectOwnerSpace(spaceId: string) {
    setSelectedOwnerSpaceId(spaceId);
    setRemoteDashboard(null);
    setRemoteError(null);
    setProfileMenuOpen(false);
  }

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (sessionSource !== 'api') {
        return;
      }

      try {
        let spaceId = ownerSpace?.id;

        if (!spaceId) {
          const mySpaces = await getMySpaces();

          if (mounted) {
            syncSpacesFromApi(mySpaces);
          }

          spaceId = mySpaces[0]?.id;
        }

        if (!spaceId) {
          return;
        }

        const dashboard = await getOwnerDashboard(spaceId);

        if (mounted) {
          setRemoteDashboard(dashboard);
          setRemoteError(null);
        }
      } catch (error) {
        if (mounted) {
          setRemoteError(getApiErrorMessage(error));
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [ownerSpace?.id, sessionSource, syncSpacesFromApi]);

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Painel da psicóloga"
        subtitle={`Olá, ${user?.name ?? 'psicóloga'}. Acompanhe a operação do consultório.`}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menu do perfil"
            onPress={() => setProfileMenuOpen((current) => !current)}
            style={({ pressed }) => [
              styles.logoutButton,
              professionalProfileActive && styles.logoutButtonProfessional,
              pressed && styles.pressed,
            ]}>
            <Ionicons
              name={professionalProfileActive ? 'briefcase' : 'person-circle-outline'}
              size={24}
              color={professionalProfileActive ? UI.success : UI.text}
            />
          </Pressable>
        }
      />

      {profileMenuOpen && (
        <OwnerProfileMenu
          userName={user?.name ?? 'Psicóloga'}
          userEmail={user?.email ?? ''}
          spaces={spaces}
          selectedSpaceId={selectedOwnerSpaceId ?? ownerSpace?.id ?? null}
          professionalProfileActive={professionalProfileActive}
          onSelectSpace={selectOwnerSpace}
          onCreateSpace={() => {
            setProfileMenuOpen(false);
            router.push('/create-space');
          }}
          onWorkAsProfessional={() => {
            setProfileMenuOpen(false);
            router.push('/professional-agenda');
          }}
          onActivateProfessional={activateProfessionalProfile}
          onLogout={async () => {
            await logout();
            router.replace('/');
          }}
        />
      )}

      {spaces.length > 1 && (
        <OwnerSpaceSwitcher
          spaces={spaces}
          selectedSpaceId={selectedOwnerSpaceId ?? ownerSpace?.id ?? null}
          onSelectSpace={selectOwnerSpace}
          onCreateSpace={() => router.push('/create-space')}
        />
      )}

      {ownerSpace ? <SpaceOwnerCard space={ownerSpace} /> : null}
      {!ownerSpace && (
        <EmptyState
          icon="storefront-outline"
          title="Nenhum consultório criado"
          text="Crie o primeiro consultório da conta ou use o menu do perfil para adicionar outros depois."
          action={<PrimaryButton label="Criar consultório" icon="add-circle-outline" onPress={() => router.push('/create-space')} />}
        />
      )}

      <View style={styles.metricsGrid}>
        <MetricPill icon="calendar-outline" label="Atendimentos" value={String(metrics.appointmentsCount)} />
        <MetricPill icon="cash-outline" label="Receita estimada" value={formatCurrency(metrics.revenue)} />
      </View>
      <View style={styles.metricsGrid}>
        <MetricPill icon="sparkles-outline" label="Consultas" value={String(metrics.servicesCount)} />
        <MetricPill icon="people-outline" label="Psicólogas" value={String(metrics.professionalsCount)} />
      </View>

      {remoteError && (
        <InfoStrip
          icon="alert-circle-outline"
          title="Painel exibido"
          text={remoteError}
          tone="warning"
        />
      )}

      <SectionTitle title="Configuração" actionLabel="Checklist" onAction={() => router.push('/owner-onboarding-checklist')} />
      <View style={styles.statusCard}>
        <View style={[styles.statusIcon, checklistDone && styles.statusIconDone]}>
          <Ionicons
            name={checklistDone ? 'checkmark-circle' : 'alert-circle-outline'}
            size={24}
            color={checklistDone ? UI.success : UI.warning}
          />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>
            {checklistDone ? 'Consultório publicado' : 'Consultório em configuração'}
          </Text>
          <Text style={styles.statusText}>
            {checklistDone
              ? 'Clientes já conseguem encontrar o consultório e agendar horários.'
              : 'Complete os itens obrigatórios para liberar a publicação.'}
          </Text>
        </View>
      </View>

      <SectionTitle title="Atalhos" />
      <View style={styles.shortcuts}>
        <Shortcut icon="pricetag-outline" label="Consultas" value={`${metrics.servicesCount} ativas`} onPress={() => router.push('/manage-services')} />
        <Shortcut icon="people-outline" label="Psicólogas" value={`${metrics.professionalsCount} ativas`} onPress={() => router.push('/manage-professionals')} />
        <Shortcut icon="calendar-outline" label="Agenda" value={`${metrics.appointmentsCount} reservas`} onPress={() => router.push('/owner-agenda')} />
        <Shortcut icon="settings-outline" label="Configurações" value="Agendamento e regras" onPress={() => router.push('/space-settings')} />
        <Shortcut icon="image-outline" label="Fotos" value="Galeria pública" onPress={() => router.push('/space-photos')} />
        <Shortcut icon="notifications-outline" label="Avisos" value="Notificações internas" onPress={() => router.push('/notification-settings')} />
      </View>
    </ScreenScaffold>
  );
}

function OwnerSpaceSwitcher({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  onCreateSpace,
}: {
  spaces: Space[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
  onCreateSpace: () => void;
}) {
  return (
    <View style={styles.spaceSwitcher}>
      <View style={styles.spaceSwitcherHeader}>
        <View style={styles.spaceSwitcherCopy}>
          <Text style={styles.spaceSwitcherTitle}>Consultórios da conta</Text>
          <Text style={styles.spaceSwitcherSubtitle}>Selecione qual consultório deseja gerenciar.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Criar consultório"
          onPress={onCreateSpace}
          style={({ pressed }) => [styles.spaceSwitcherAdd, pressed && styles.pressed]}>
          <Ionicons name="add" size={20} color={UI.primary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spaceSwitcherList}>
        {spaces.map((space) => {
          const selected = space.id === selectedSpaceId;

          return (
            <Pressable
              key={space.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectSpace(space.id)}
              style={({ pressed }) => [
                styles.spaceSwitchItem,
                selected && styles.spaceSwitchItemSelected,
                pressed && styles.pressed,
              ]}>
              <View style={[styles.spaceSwitchIcon, selected && styles.spaceSwitchIconSelected]}>
                <Ionicons
                  name={selected ? 'storefront' : 'storefront-outline'}
                  size={19}
                  color={selected ? UI.surface : UI.primary}
                />
              </View>
              <View style={styles.spaceSwitchCopy}>
                <Text numberOfLines={1} style={[styles.spaceSwitchName, selected && styles.spaceSwitchNameSelected]}>
                  {space.name}
                </Text>
                <Text numberOfLines={1} style={styles.spaceSwitchMeta}>
                  {space.published ? 'Publicado' : 'Rascunho'} • {space.neighborhood}
                </Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={18} color={UI.success} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function OwnerProfileMenu({
  userName,
  userEmail,
  spaces,
  selectedSpaceId,
  professionalProfileActive,
  onSelectSpace,
  onCreateSpace,
  onWorkAsProfessional,
  onActivateProfessional,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  spaces: Space[];
  selectedSpaceId: string | null;
  professionalProfileActive: boolean;
  onSelectSpace: (spaceId: string) => void;
  onCreateSpace: () => void;
  onWorkAsProfessional: () => void;
  onActivateProfessional: () => void;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <View style={[styles.profileMenu, professionalProfileActive && styles.profileMenuProfessional]}>
      <View style={styles.profileMenuHeader}>
        <View style={[styles.profileMenuIcon, professionalProfileActive && styles.profileMenuIconProfessional]}>
          <Ionicons
            name={professionalProfileActive ? 'briefcase' : 'person-outline'}
            size={24}
            color={professionalProfileActive ? UI.surface : UI.primary}
          />
        </View>
        <View style={styles.profileMenuCopy}>
          <Text numberOfLines={1} style={styles.profileMenuName}>
            {userName}
          </Text>
          <Text numberOfLines={1} style={styles.profileMenuEmail}>
            {userEmail}
          </Text>
        </View>
      </View>

      <View style={[styles.professionalModeStrip, professionalProfileActive && styles.professionalModeStripActive]}>
        <Ionicons
          name={professionalProfileActive ? 'checkmark-circle' : 'briefcase-outline'}
          size={19}
          color={professionalProfileActive ? UI.success : UI.primary}
        />
        <View style={styles.professionalModeCopy}>
          <Text style={[styles.professionalModeTitle, professionalProfileActive && styles.professionalModeTitleActive]}>
            {professionalProfileActive ? 'Perfil de atendimento ativo' : 'Perfil de atendimento'}
          </Text>
          <Text style={styles.professionalModeText}>
            {professionalProfileActive
              ? 'Use esta conta para trabalhar em consultórios vinculados ao seu e-mail ou administrar seus próprios consultórios.'
              : 'Ative uma vez para liberar a entrada em consultórios onde seu e-mail estiver vinculado.'}
          </Text>
        </View>
      </View>

      <View style={styles.profileMenuDivider} />

      <Text style={styles.profileMenuSection}>Consultórios da conta</Text>
      <View style={styles.profileSpaceList}>
        {spaces.length > 0 ? (
          spaces.map((space) => {
            const selected = space.id === selectedSpaceId;

            return (
              <Pressable
                key={space.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelectSpace(space.id)}
                style={({ pressed }) => [
                  styles.profileSpaceRow,
                  selected && styles.profileSpaceRowSelected,
                  pressed && styles.pressed,
                ]}>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? UI.primary : UI.textMuted}
                />
                <View style={styles.profileSpaceCopy}>
                  <Text numberOfLines={1} style={styles.profileSpaceName}>
                    {space.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.profileSpaceMeta}>
                    {space.published ? 'Publicado' : 'Rascunho'} • {space.neighborhood}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.profileMenuEmpty}>Nenhum consultório vinculado ainda.</Text>
        )}
      </View>

      <View style={styles.profileMenuActions}>
        {professionalProfileActive ? (
          <PrimaryButton label="Entrar em consultório para trabalhar" icon="calendar-outline" onPress={onWorkAsProfessional} />
        ) : (
          <PrimaryButton label="Ativar perfil de atendimento" icon="briefcase-outline" onPress={onActivateProfessional} />
        )}
        <PrimaryButton label="Criar consultório" icon="add-circle-outline" variant="secondary" onPress={onCreateSpace} />
        <PrimaryButton label="Sair" icon="log-out-outline" variant="secondary" onPress={onLogout} />
      </View>
    </View>
  );
}

function SpaceOwnerCard({ space }: { space: Space }) {
  return (
    <View style={styles.spaceCard}>
      <View style={styles.spaceIcon}>
        <Ionicons name="storefront-outline" size={24} color={UI.primary} />
      </View>
      <View style={styles.spaceCopy}>
        <Text numberOfLines={1} style={styles.spaceName}>
          {space.name}
        </Text>
        <Text numberOfLines={1} style={styles.spaceAddress}>
          {space.address} • {space.neighborhood}
        </Text>
      </View>
      <View style={[styles.publishBadge, space.published && styles.publishBadgeLive]}>
        <Text style={[styles.publishText, space.published && styles.publishTextLive]}>
          {space.published ? 'Publicado' : 'Rascunho'}
        </Text>
      </View>
    </View>
  );
}

function ChecklistRow({
  item,
  attention,
  onPress,
}: {
  item: OnboardingItem;
  attention?: boolean;
  onPress: () => void;
}) {
  const icon = item.complete
    ? 'checkmark-circle'
    : attention
      ? 'alert-circle-outline'
      : 'ellipse-outline';
  const color = item.complete ? UI.success : attention ? UI.warning : UI.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.checklistRow,
        attention && styles.checklistRowAttention,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        name={icon}
        size={23}
        color={color}
      />
      <Text style={styles.checklistText}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={UI.textMuted} />
    </Pressable>
  );
}

function Shortcut({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={UI.primary} />
      <Text style={styles.shortcutLabel}>{label}</Text>
      <Text style={styles.shortcutValue}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: 13,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formRowBig: {
    flex: 1,
  },
  formRowSmall: {
    width: 84,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  categoryChipSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  categoryText: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  categoryTextSelected: {
    color: UI.surface,
  },
  footerStack: {
    gap: 10,
  },
  spaceSwitcher: {
    gap: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  spaceSwitcherHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  spaceSwitcherCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  spaceSwitcherTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  spaceSwitcherSubtitle: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  spaceSwitcherAdd: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  spaceSwitcherList: {
    gap: 10,
    paddingRight: 4,
  },
  spaceSwitchItem: {
    width: 214,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  spaceSwitchItemSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primarySoft,
  },
  spaceSwitchIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: UI.primarySoft,
  },
  spaceSwitchIconSelected: {
    backgroundColor: UI.primary,
  },
  spaceSwitchCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  spaceSwitchName: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  spaceSwitchNameSelected: {
    color: UI.primaryDark,
  },
  spaceSwitchMeta: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  profileMenu: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  profileMenuProfessional: {
    borderColor: 'rgba(22, 163, 74, 0.22)',
    backgroundColor: '#F7FEFA',
  },
  profileMenuHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileMenuIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: UI.primarySoft,
  },
  profileMenuIconProfessional: {
    backgroundColor: UI.success,
  },
  profileMenuCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  profileMenuName: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  profileMenuEmail: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  professionalModeStrip: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: UI.primarySoft,
  },
  professionalModeStripActive: {
    backgroundColor: '#ECFDF3',
  },
  professionalModeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  professionalModeTitle: {
    color: UI.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  professionalModeTitleActive: {
    color: UI.success,
  },
  professionalModeText: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: UI.border,
  },
  profileMenuSection: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  profileSpaceList: {
    gap: 8,
  },
  profileSpaceRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  profileSpaceRowSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primarySoft,
  },
  profileSpaceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  profileSpaceName: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  profileSpaceMeta: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  profileMenuEmpty: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  profileMenuActions: {
    gap: 9,
  },
  spaceCard: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  spaceIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: UI.primarySoft,
  },
  spaceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  spaceName: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
  },
  spaceAddress: {
    color: UI.textMuted,
    fontSize: 13,
  },
  publishBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },
  publishBadgeLive: {
    backgroundColor: '#DCFCE7',
  },
  publishText: {
    color: UI.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  publishTextLive: {
    color: UI.success,
  },
  checklistCard: {
    gap: 1,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  checklistRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  checklistRowAttention: {
    backgroundColor: '#FFFBEB',
  },
  checklistText: {
    flex: 1,
    color: UI.text,
    fontSize: 14,
    fontWeight: '700',
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
  logoutButtonProfessional: {
    backgroundColor: '#ECFDF3',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statusCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  statusIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
  },
  statusIconDone: {
    backgroundColor: '#ECFDF3',
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },
  statusText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcut: {
    width: '48.5%',
    minHeight: 108,
    justifyContent: 'center',
    gap: 7,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  shortcutLabel: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },
  shortcutValue: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
