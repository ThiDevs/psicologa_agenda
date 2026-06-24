import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, type ViewStyle, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';

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
import { AccountDeletionCard } from '@/components/account-deletion-card';
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
import type { Appointment, OnboardingItem, Professional, Service, Space } from '@/types/domain';
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
  const isWeb = Platform.OS === 'web';
  const { width: viewportWidth } = useWindowDimensions();
  const compactLayout = !isWeb || viewportWidth < 900;
  const compactWebContentStyle = isWeb && compactLayout
    ? ({ width: 'calc(100vw - 32px)', maxWidth: 430 } as unknown as ViewStyle)
    : undefined;
  const {
    sessionSource,
    user,
    logout,
    deleteAccount,
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
  const [deleteAccountArmed, setDeleteAccountArmed] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [remoteDashboard, setRemoteDashboard] = useState<ApiOwnerDashboard | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const spaceServices = services.filter((service) => service.spaceId === ownerSpace?.id);
  const spaceProfessionals = professionals.filter((professional) => professional.spaceId === ownerSpace?.id);
  const spaceAppointments = appointments.filter((appointment) => appointment.spaceId === ownerSpace?.id);
  const patientsCount = new Set(spaceAppointments.map((appointment) => appointment.customerId)).size;
  const todaysRevenue = spaceAppointments
    .filter((appointment) => !['cancelled', 'expired', 'rejected'].includes(appointment.status))
    .reduce((total, appointment) => total + appointment.total, 0);
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
  const incompleteChecklist = checklist.filter((item) => !item.complete);
  const nextChecklistItem = incompleteChecklist[0] ?? checklist[0] ?? null;
  const checklistPreview = getDefaultOwnerChecklistPreview(ownerSpace != null).map((previewItem) => {
    const sourceItem = checklist.find((item) => item.id === previewItem.id);

    return sourceItem ? { ...previewItem, complete: sourceItem.complete } : previewItem;
  });
  const completedChecklistCount = checklistPreview.filter((item) => item.complete).length;
  const setupProgress = checklistPreview.length > 0
    ? Math.round((completedChecklistCount / checklistPreview.length) * 100)
    : checklistDone
      ? 100
      : 0;
  const upcomingAppointments = [...spaceAppointments]
    .filter((appointment) => ['confirmed', 'pending_payment', 'pending_confirmation'].includes(appointment.status))
    .sort((first, second) => first.startDateTime.localeCompare(second.startDateTime))
    .slice(0, 3);
  const ownerSetupTitle = ownerSpace && checklistDone
    ? 'Seu consultório está pronto para atender'
    : 'Meu consultório ainda não está pronto';
  const ownerSetupText = ownerSpace
    ? compactLayout
      ? 'Revise horários, valores, equipe e recursos.'
      : 'Revise horários, valores, equipe e recursos antes de ampliar sua agenda clínica.'
    : compactLayout
      ? 'Finalize a configuração para começar a atender.'
      : 'Finalize a configuração para começar a atender e organizar sua prática clínica.';
  const primarySetupLabel = !ownerSpace ? 'Criar consultório' : checklistDone ? 'Abrir agenda' : 'Continuar checklist';
  const primarySetupIcon = !ownerSpace
    ? 'add-circle-outline'
    : checklistDone
      ? 'calendar-outline'
      : 'checkmark-done-outline';

  function selectOwnerSpace(spaceId: string) {
    setSelectedOwnerSpaceId(spaceId);
    setRemoteDashboard(null);
    setRemoteError(null);
    setProfileMenuOpen(false);
  }

  async function handleDeleteAccount() {
    if (!deleteAccountArmed) {
      setDeleteAccountArmed(true);
      setDeleteAccountError(null);
      return;
    }

    setDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      await deleteAccount();
      setDeleteAccountArmed(false);
      setProfileMenuOpen(false);
      router.replace('/');
    } catch (error) {
      setDeleteAccountError(error instanceof Error ? error.message : 'Não foi possível excluir a conta agora.');
    } finally {
      setDeletingAccount(false);
    }
  }

  function openPrimarySetup() {
    if (!ownerSpace) {
      router.push('/create-space');
      return;
    }

    if (checklistDone) {
      router.push('/owner-agenda');
      return;
    }

    router.push(nextChecklistItem ? getOnboardingRoute(nextChecklistItem.id) : '/owner-onboarding-checklist');
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
    <ScreenScaffold footer={compactLayout ? <OwnerMobileTabs onNavigate={(route) => router.push(route)} /> : undefined}>
      <Animated.View
        entering={FadeInUp.duration(260)}
        layout={LinearTransition.duration(220)}
        style={[
          styles.ownerDashboardShell,
          compactLayout && styles.ownerDashboardShellMobile,
          compactWebContentStyle,
        ]}>
        {isWeb && !compactLayout && (
          <Animated.View entering={FadeInUp.delay(40).duration(260)} style={styles.ownerSidebar}>
            <View style={styles.ownerBrand}>
              <View style={styles.ownerBrandMark}>
                <Text style={styles.ownerBrandGlyph}>Ψ</Text>
              </View>
              <View style={styles.ownerBrandCopy}>
                <Text style={styles.ownerBrandTitle}>Psi Agenda</Text>
                <Text style={styles.ownerBrandMeta}>Online</Text>
              </View>
            </View>

            <View style={styles.ownerNavList}>
              <OwnerNavItem icon="home-outline" label="Painel" selected onPress={() => undefined} />
              <OwnerNavItem icon="calendar-outline" label="Agenda" onPress={() => router.push('/owner-agenda')} />
              <OwnerNavItem icon="sparkles-outline" label="Consultas" onPress={() => router.push('/manage-services')} />
              <OwnerNavItem icon="people-outline" label="Pacientes" onPress={() => router.push('/owner-agenda')} />
              <OwnerNavItem icon="list-outline" label="Tarefas clínicas" onPress={() => router.push('/clinical-integration')} />
              <OwnerNavItem icon="shield-checkmark-outline" label="Check-ins" onPress={() => router.push('/clinical-integration')} />
              <OwnerNavItem icon="document-lock-outline" label="Plano terapêutico" onPress={() => router.push('/clinical-integration')} />
              <OwnerNavItem icon="file-tray-full-outline" label="Recursos" onPress={() => router.push('/clinical-integration')} />
              <OwnerNavItem icon="cash-outline" label="Financeiro" onPress={() => router.push('/payment-settings')} />
              <OwnerNavItem icon="mail-outline" label="Mensagens" onPress={() => router.push('/notification-settings')} />
              <OwnerNavItem icon="bar-chart-outline" label="Relatórios" onPress={() => router.push('/owner-dashboard')} />
              <OwnerNavItem icon="settings-outline" label="Configurações" onPress={() => router.push('/space-settings')} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Recolher menu"
              style={({ pressed }) => [styles.ownerSidebarCollapse, pressed && styles.pressed]}>
              <Ionicons name="chevron-back" size={16} color={UI.textMuted} />
              <Text style={styles.ownerSidebarCollapseText}>Recolher menu</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={[styles.ownerMain, compactLayout && styles.ownerMainMobile]}>
          <Animated.View
            entering={FadeInUp.delay(80).duration(260)}
            layout={LinearTransition.duration(220)}
            style={[styles.ownerTopBar, compactLayout && styles.ownerTopBarMobile]}>
            <View style={[styles.ownerTopCopy, compactLayout && styles.ownerTopCopyMobile]}>
              {compactLayout && (
                <View style={styles.ownerMobileBrandLine}>
                  <View style={styles.ownerBrandMark}>
                    <Text style={styles.ownerBrandGlyph}>Ψ</Text>
                  </View>
                  <View>
                    <Text style={styles.ownerBrandTitle}>Psi Agenda</Text>
                    <Text style={styles.ownerBrandMeta}>Online</Text>
                  </View>
                </View>
              )}
              <Text style={styles.ownerTitle}>Painel da psicóloga</Text>
              {compactLayout && (
                <Text style={styles.ownerSubtitle}>
                  Acompanhe agenda, equipe e configuração sem misturar prontuário ou memória clínica.
                </Text>
              )}
            </View>

            <View style={[styles.ownerTopActions, compactLayout && styles.ownerTopActionsMobile]}>
              <View style={styles.ownerNotificationButton}>
                <Ionicons name="notifications-outline" size={20} color={UI.text} />
                <View style={styles.ownerNotificationBadge}>
                  <Text style={styles.ownerNotificationBadgeText}>3</Text>
                </View>
              </View>
              <View style={styles.ownerAvailabilityBadge}>
                <View style={styles.ownerAvailabilityDot} />
                <Text style={styles.ownerAvailabilityText}>Disponível</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir menu do perfil"
                onPress={() => setProfileMenuOpen((current) => !current)}
                style={({ pressed }) => [
                  styles.ownerProfileButton,
                  professionalProfileActive && styles.ownerProfileButtonActive,
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.ownerAvatar, professionalProfileActive && styles.ownerAvatarActive]}>
                  <Text style={[styles.ownerAvatarText, professionalProfileActive && styles.ownerAvatarTextActive]}>
                    {getInitials(user?.name ?? 'Psicóloga')}
                  </Text>
                </View>
                {!compactLayout && (
                  <View style={styles.ownerProfileCopy}>
                    <Text numberOfLines={1} style={styles.ownerProfileName}>
                      {user?.name ?? 'Psicóloga'}
                    </Text>
                    <Text numberOfLines={1} style={styles.ownerProfileMeta}>
                      Psicóloga
                    </Text>
                  </View>
                )}
                <Ionicons name={profileMenuOpen ? 'chevron-up' : 'chevron-down'} size={17} color={UI.textMuted} />
              </Pressable>
            </View>
          </Animated.View>

          {profileMenuOpen && (
            <Animated.View entering={FadeInUp.duration(220)} layout={LinearTransition.duration(200)} style={styles.ownerProfileMenuWrap}>
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
              <View style={styles.profileComplianceActions}>
                <PrimaryButton label="Termos de uso" icon="document-text-outline" variant="secondary" onPress={() => router.push('/terms')} />
                <PrimaryButton label="Privacidade" icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push('/privacy')} />
                <PrimaryButton label="Suporte" icon="help-circle-outline" variant="secondary" onPress={() => router.push('/support')} />
              </View>
              <AccountDeletionCard
                armed={deleteAccountArmed}
                loading={deletingAccount}
                errorMessage={deleteAccountError}
                onCancel={() => {
                  setDeleteAccountArmed(false);
                  setDeleteAccountError(null);
                }}
                onDelete={handleDeleteAccount}
              />
            </Animated.View>
          )}

          {spaces.length > 1 && (
            <OwnerSpaceSwitcher
              spaces={spaces}
              selectedSpaceId={selectedOwnerSpaceId ?? ownerSpace?.id ?? null}
              onSelectSpace={selectOwnerSpace}
              onCreateSpace={() => router.push('/create-space')}
            />
          )}

          {remoteError && (
            <InfoStrip
              icon="alert-circle-outline"
              title="Consulta indisponível"
              text={remoteError}
              tone="warning"
            />
          )}

          <View style={[styles.ownerDashboardGrid, compactLayout && styles.ownerDashboardGridMobile]}>
            <View style={[styles.ownerPrimaryColumn, compactLayout && styles.ownerPrimaryColumnMobile]}>
              <View style={[styles.ownerHeroRow, compactLayout && styles.ownerHeroRowMobile]}>
                <Animated.View
                  entering={FadeInUp.delay(120).duration(260)}
                  layout={LinearTransition.duration(220)}
                  style={[styles.ownerActionPanel, compactLayout && styles.ownerActionPanelMobile]}>
                  <View style={[styles.ownerActionIntro, compactLayout && styles.ownerActionIntroMobile]}>
                    <View style={styles.ownerActionIconLarge}>
                      <Ionicons name={ownerSpace ? 'storefront-outline' : 'business-outline'} size={34} color={UI.primary} />
                    </View>
                    <View style={styles.ownerActionCopy}>
                      <Text style={styles.ownerActionTitle}>{ownerSetupTitle}</Text>
                      <Text style={styles.ownerActionText}>{ownerSetupText}</Text>
                      <View style={styles.ownerActionButtonWrap}>
                        <PrimaryButton
                          label={primarySetupLabel}
                          icon={primarySetupIcon}
                          onPress={openPrimarySetup}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.ownerProgressDivider} />
                  <View style={[styles.ownerProgressHeader, compactLayout && styles.ownerProgressHeaderMobile]}>
                    <Text style={styles.ownerProgressTitle}>Checklist de configuração</Text>
                    <Text style={styles.ownerProgressValue}>
                      {completedChecklistCount} de {checklistPreview.length} concluídos
                    </Text>
                  </View>
                  <View style={styles.ownerProgressRail}>
                    <View style={[styles.ownerProgressFill, { width: `${setupProgress}%` }]} />
                  </View>
                </Animated.View>

                <Animated.View
                  entering={FadeInUp.delay(150).duration(260)}
                  layout={LinearTransition.duration(220)}
                  style={[styles.ownerAgendaCard, compactLayout && styles.ownerAgendaCardMobile]}>
                  <View style={[styles.ownerCardHeader, compactLayout && styles.ownerCardHeaderMobile]}>
                    <Text style={styles.ownerCardTitle}>Agenda clínica</Text>
                    <View style={[styles.ownerAgendaControls, compactLayout && styles.ownerAgendaControlsMobile]}>
                      <View style={styles.ownerSegmented}>
                        <OwnerModeChip label="Hoje" selected />
                        <OwnerModeChip label="Semana" />
                        <OwnerModeChip label="Mês" />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir agenda"
                        onPress={() => router.push('/owner-agenda')}
                        style={({ pressed }) => [styles.ownerInlineAction, pressed && styles.pressed]}>
                        <Ionicons name="calendar-outline" size={18} color={UI.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.ownerAgendaBody}>
                    {upcomingAppointments.length > 0 ? (
                      <View style={styles.ownerAppointmentList}>
                        {upcomingAppointments.map((appointment, index) => (
                          <OwnerAppointmentRow
                            key={appointment.id}
                            appointment={appointment}
                            services={services}
                            professionals={professionals}
                            isFirst={index === 0}
                            onPress={() => router.push({ pathname: '/owner-appointment-details', params: { appointmentId: appointment.id } })}
                          />
                        ))}
                      </View>
                    ) : (
                      <View style={styles.ownerAgendaEmpty}>
                        <View style={styles.ownerAgendaEmptyIcon}>
                          <Ionicons name="calendar-outline" size={30} color={UI.primary} />
                        </View>
                        <Text style={styles.ownerEmptyTitle}>Nenhuma consulta agendada para hoje</Text>
                        <Text style={styles.ownerEmptyText}>Sua agenda está livre.</Text>
                        <PrimaryButton
                          label="Ver agenda completa"
                          icon="calendar-outline"
                          variant="secondary"
                          onPress={() => router.push('/owner-agenda')}
                        />
                      </View>
                    )}
                  </View>
                </Animated.View>
              </View>

              <View style={[styles.ownerMetricGrid, compactLayout && styles.ownerMetricGridMobile]}>
                <OwnerMetricCard icon="calendar-outline" label="Atendimentos" value={String(metrics.appointmentsCount)} detail="este mês" />
                <OwnerMetricCard icon="people-outline" label="Consultas" value={String(metrics.servicesCount)} detail="este mês" />
                <OwnerMetricCard icon="people-circle-outline" label="Pacientes" value={String(patientsCount)} detail="em acompanhamento" />
                <OwnerMetricCard icon="logo-usd" label="Receita estimada" value={formatCurrency(metrics.revenue)} detail="este mês" />
              </View>

              <View style={[styles.ownerLowerGrid, compactLayout && styles.ownerLowerGridMobile]}>
                <Animated.View
                  entering={FadeInUp.delay(190).duration(260)}
                  layout={LinearTransition.duration(220)}
                  style={[styles.ownerWideCard, compactLayout && styles.ownerWideCardMobile]}>
                  <Text style={styles.ownerCardTitle}>Próximas ações sugeridas</Text>
                  <View style={styles.ownerSuggestedList}>
                    <OwnerSuggestedAction
                      icon="business-outline"
                      title="Configure seu consultório"
                      text="Inicie completando as informações básicas do seu consultório."
                      onPress={() => router.push(ownerSpace ? '/space-settings' : '/create-space')}
                    />
                    <OwnerSuggestedAction
                      icon="time-outline"
                      title="Defina seus horários"
                      text="Informe sua disponibilidade para consultas."
                      onPress={() => router.push('/space-opening-hours')}
                    />
                    <OwnerSuggestedAction
                      icon="folder-outline"
                      title="Adicione recursos clínicos"
                      text="Questionários, escalas e materiais para suas sessões."
                      onPress={() => router.push('/clinical-integration')}
                    />
                    <OwnerSuggestedAction
                      icon="person-add-outline"
                      title="Convide sua equipe"
                      text="Adicione colaboradores e organize permissões."
                      onPress={() => router.push('/manage-professionals')}
                    />
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(220).duration(260)} layout={LinearTransition.duration(220)} style={styles.ownerTaskCard}>
                  <Text style={styles.ownerCardTitle}>Tarefas clínicas</Text>
                  <View style={styles.ownerTaskEmpty}>
                    <View style={styles.ownerTaskEmptyIcon}>
                      <Ionicons name="clipboard-outline" size={34} color={UI.primary} />
                    </View>
                    <Text style={styles.ownerEmptyTitle}>Nenhuma tarefa por enquanto</Text>
                    <Text style={styles.ownerEmptyText}>Todas as suas tarefas clínicas aparecerão aqui.</Text>
                    <PrimaryButton
                      label="Ver todas as tarefas"
                      icon="list-outline"
                      variant="secondary"
                      onPress={() => router.push('/clinical-integration')}
                    />
                  </View>
                </Animated.View>
              </View>
            </View>

            <View style={[styles.ownerSideColumn, compactLayout && styles.ownerSideColumnMobile]}>
              <Animated.View entering={FadeInUp.delay(140).duration(260)} layout={LinearTransition.duration(220)} style={styles.ownerSideCard}>
                <View style={styles.ownerChecklistHeader}>
                  <Text style={styles.ownerCardTitle}>Checklist</Text>
                  <View style={styles.ownerChecklistProgress}>
                    <View style={styles.ownerChecklistProgressRing} />
                    <Text style={styles.ownerChecklistProgressText}>
                      {completedChecklistCount} / {checklistPreview.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.ownerChecklistPreview}>
                  {checklistPreview.map((item, index) => (
                    <OwnerChecklistItem
                      key={item.id}
                      item={item}
                      isFirst={index === 0}
                      onPress={() => {
                        if (!ownerSpace) {
                          router.push('/create-space');
                          return;
                        }

                        router.push(getOnboardingRoute(item.id));
                      }}
                    />
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/owner-onboarding-checklist')}
                  style={({ pressed }) => [styles.ownerTextAction, pressed && styles.pressed]}>
                  <Text style={styles.ownerTextActionLabel}>Ver checklist completo</Text>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(180).duration(260)} layout={LinearTransition.duration(220)} style={styles.ownerSideCard}>
                <View style={styles.ownerSideCardTitleLine}>
                  <Ionicons name="megaphone-outline" size={18} color={UI.text} />
                  <Text style={styles.ownerCardTitle}>Avisos e novidades</Text>
                </View>
                <View style={styles.ownerAlertBox}>
                  <View style={styles.ownerAlertIcon}>
                    <Ionicons name="alert-circle-outline" size={18} color={UI.warning} />
                  </View>
                  <View style={styles.ownerAlertCopy}>
                    <Text style={styles.ownerAlertTitle}>{remoteError ? 'Consulta indisponível' : 'Painel em configuração'}</Text>
                    <Text style={styles.ownerAlertText}>
                      {remoteError ? 'Painel indisponível no momento. Tente novamente mais tarde.' : 'Complete o checklist antes de publicar.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={UI.textMuted} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/notification-settings')}
                  style={({ pressed }) => [styles.ownerTextAction, pressed && styles.pressed]}>
                  <Text style={styles.ownerTextActionLabel}>Ver todos os avisos</Text>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(220).duration(260)} layout={LinearTransition.duration(220)} style={styles.ownerSideCard}>
                <Text style={styles.ownerCardTitle}>Ações rápidas</Text>
                <View style={styles.ownerCompactActions}>
                  <OwnerCompactAction icon="calendar-outline" label="Nova consulta" onPress={() => router.push('/manage-services')} />
                  <OwnerCompactAction icon="person-add-outline" label="Novo paciente" onPress={() => router.push('/owner-agenda')} />
                  <OwnerCompactAction icon="checkbox-outline" label="Nova tarefa" onPress={() => router.push('/clinical-integration')} />
                  <OwnerCompactAction icon="happy-outline" label="Novo check-in" onPress={() => router.push('/clinical-integration')} />
                </View>
              </Animated.View>
            </View>
          </View>
        </View>
      </Animated.View>
    </ScreenScaffold>
  );
}

function getInitials(value: string) {
  const initials = value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'PS';
}

function getDefaultOwnerChecklistPreview(created: boolean): OnboardingItem[] {
  return [
    { id: 'space-data', label: 'Criar consultório', complete: created },
    { id: 'basic', label: 'Configurar perfil', complete: false },
    { id: 'opening-hours', label: 'Definir horários de atendimento', complete: false },
    { id: 'payment', label: 'Configurar valores', complete: false },
    { id: 'services', label: 'Adicionar recursos', complete: false },
    { id: 'professionals', label: 'Convidar equipe (opcional)', complete: false },
  ];
}

function formatOwnerAppointmentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  }).format(date);
}

function formatOwnerAppointmentTime(start: string, end: string) {
  const startTime = start.includes('T') ? start.slice(11, 16) : start.slice(0, 5);
  const endTime = end.includes('T') ? end.slice(11, 16) : end.slice(0, 5);

  return `${startTime} - ${endTime}`;
}

function getOwnerAppointmentServiceTitle(appointment: Appointment, services: Service[]) {
  const serviceNames = appointment.serviceIds
    .map((serviceId) => services.find((service) => service.id === serviceId)?.name)
    .filter(Boolean);

  return serviceNames.length > 0 ? serviceNames.join(', ') : 'Consulta clínica';
}

function getOwnerAppointmentProfessionalName(appointment: Appointment, professionals: Professional[]) {
  if (!appointment.professionalId) {
    return appointment.anyProfessional ? 'Psicóloga disponível' : 'Profissional a definir';
  }

  return professionals.find((professional) => professional.id === appointment.professionalId)?.name ?? 'Profissional a definir';
}

function getOwnerAppointmentStatus(status: Appointment['status']) {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmada', tone: 'success' as const };
    case 'pending_payment':
      return { label: 'Pagamento pendente', tone: 'warning' as const };
    case 'pending_confirmation':
      return { label: 'Aguardando confirmação', tone: 'warning' as const };
    case 'completed':
      return { label: 'Concluída', tone: 'success' as const };
    case 'no_show':
      return { label: 'Ausência', tone: 'danger' as const };
    case 'cancelled':
      return { label: 'Cancelada', tone: 'danger' as const };
    case 'rejected':
      return { label: 'Recusada', tone: 'danger' as const };
    case 'expired':
    default:
      return { label: 'Expirada', tone: 'info' as const };
  }
}

function OwnerNavItem({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selected ?? false }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ownerNavItem,
        selected && styles.ownerNavItemSelected,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.ownerNavIcon, selected && styles.ownerNavIconSelected]}>
        <Ionicons name={icon} size={18} color={selected ? UI.primary : UI.textMuted} />
      </View>
      <Text style={[styles.ownerNavLabel, selected && styles.ownerNavLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function OwnerMetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(240)} layout={LinearTransition.duration(200)} style={styles.ownerMetricCard}>
      <View style={styles.ownerMetricIcon}>
        <Ionicons name={icon} size={18} color={UI.primary} />
      </View>
      <View style={styles.ownerMetricCopy}>
        <Text style={styles.ownerMetricLabel}>{label}</Text>
        <Text style={styles.ownerMetricValue}>{value}</Text>
        <Text style={styles.ownerMetricDetail}>{detail}</Text>
      </View>
    </Animated.View>
  );
}

function OwnerModeChip({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <View style={[styles.ownerModeChip, selected && styles.ownerModeChipSelected]}>
      <Text style={[styles.ownerModeChipText, selected && styles.ownerModeChipTextSelected]}>{label}</Text>
    </View>
  );
}

function OwnerAppointmentRow({
  appointment,
  services,
  professionals,
  isFirst,
  onPress,
}: {
  appointment: Appointment;
  services: Service[];
  professionals: Professional[];
  isFirst: boolean;
  onPress: () => void;
}) {
  const status = getOwnerAppointmentStatus(appointment.status);
  const statusToneStyle = status.tone === 'success'
    ? styles.ownerAppointmentStatus_success
    : status.tone === 'warning'
      ? styles.ownerAppointmentStatus_warning
      : status.tone === 'danger'
        ? styles.ownerAppointmentStatus_danger
        : styles.ownerAppointmentStatus_info;
  const statusTextToneStyle = status.tone === 'success'
    ? styles.ownerAppointmentStatusText_success
    : status.tone === 'warning'
      ? styles.ownerAppointmentStatusText_warning
      : status.tone === 'danger'
        ? styles.ownerAppointmentStatusText_danger
        : styles.ownerAppointmentStatusText_info;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.ownerAppointmentRow,
        isFirst && styles.ownerAppointmentRowFirst,
        pressed && styles.pressed,
      ]}>
      <View style={styles.ownerAppointmentTime}>
        <Text style={styles.ownerAppointmentDate}>{formatOwnerAppointmentDate(appointment.startDateTime)}</Text>
        <Text style={styles.ownerAppointmentTimeText}>
          {formatOwnerAppointmentTime(appointment.startDateTime, appointment.endDateTime)}
        </Text>
      </View>
      <View style={styles.ownerAppointmentCopy}>
        <Text numberOfLines={1} style={styles.ownerAppointmentTitle}>
          {getOwnerAppointmentServiceTitle(appointment, services)}
        </Text>
        <Text numberOfLines={1} style={styles.ownerAppointmentMeta}>
          {getOwnerAppointmentProfessionalName(appointment, professionals)}
        </Text>
      </View>
      <View style={[styles.ownerAppointmentStatus, statusToneStyle]}>
        <Text style={[styles.ownerAppointmentStatusText, statusTextToneStyle]}>
          {status.label}
        </Text>
      </View>
    </Pressable>
  );
}

function getChecklistItemDescription(itemId: string) {
  switch (itemId) {
    case 'space-data':
      return 'Defina os dados do seu consultório';
    case 'basic':
      return 'Informe sua formação e abordagem';
    case 'opening-hours':
      return 'Configure sua disponibilidade';
    case 'payment':
      return 'Defina preços e formas de pagamento';
    case 'services':
      return 'Questionários, materiais e anotações';
    case 'professionals':
      return 'Adicione colaboradores ao consultório';
    default:
      return 'Complete esta etapa para publicar com segurança';
  }
}

function OwnerChecklistItem({
  item,
  isFirst,
  onPress,
}: {
  item: OnboardingItem;
  isFirst: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.ownerChecklistItem,
        isFirst && styles.ownerChecklistItemFirst,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.ownerChecklistIcon, item.complete && styles.ownerChecklistIconDone]}>
        <Ionicons
          name={item.complete ? 'checkmark' : 'ellipse-outline'}
          size={16}
          color={item.complete ? UI.surface : UI.textMuted}
        />
      </View>
      <View style={styles.ownerChecklistCopy}>
        <Text numberOfLines={1} style={styles.ownerChecklistText}>{item.label}</Text>
        <Text numberOfLines={1} style={styles.ownerChecklistDescription}>{getChecklistItemDescription(item.id)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={UI.textMuted} />
    </Pressable>
  );
}

function OwnerCompactAction({
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
      onPress={onPress}
      style={({ pressed }) => [styles.ownerCompactAction, pressed && styles.pressed]}>
      <View style={styles.ownerCompactIcon}>
        <Ionicons name={icon} size={18} color={UI.primary} />
      </View>
      <Text style={styles.ownerCompactLabel}>{label}</Text>
    </Pressable>
  );
}

function OwnerSuggestedAction({
  icon,
  title,
  text,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ownerSuggestedAction, pressed && styles.pressed]}>
      <View style={styles.ownerSuggestedIcon}>
        <Ionicons name={icon} size={22} color={UI.primary} />
      </View>
      <View style={styles.ownerSuggestedCopy}>
        <Text numberOfLines={1} style={styles.ownerSuggestedTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.ownerSuggestedText}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={UI.textMuted} />
    </Pressable>
  );
}

function OwnerMobileTabs({ onNavigate }: { onNavigate: (route: Href) => void }) {
  return (
    <View style={styles.ownerMobileTabs}>
      <OwnerMobileTab icon="home-outline" label="Painel" selected onPress={() => undefined} />
      <OwnerMobileTab icon="calendar-outline" label="Agenda" onPress={() => onNavigate('/owner-agenda')} />
      <OwnerMobileTab icon="sparkles-outline" label="Consultas" onPress={() => onNavigate('/manage-services')} />
      <OwnerMobileTab icon="people-outline" label="Pacientes" onPress={() => onNavigate('/owner-agenda')} />
      <OwnerMobileTab icon="person-circle-outline" label="Perfil" onPress={() => onNavigate('/owner-dashboard')} />
    </View>
  );
}

function OwnerMobileTab({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selected ?? false }}
      onPress={onPress}
      style={({ pressed }) => [styles.ownerMobileTab, pressed && styles.pressed]}>
      <Ionicons name={icon} size={19} color={selected ? UI.primary : UI.textMuted} />
      <Text numberOfLines={1} style={[styles.ownerMobileTabLabel, selected && styles.ownerMobileTabLabelSelected]}>
        {label}
      </Text>
    </Pressable>
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

const styles = StyleSheet.create({
  ownerDashboardShell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  ownerDashboardShellMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  ownerSidebar: {
    width: 214,
    minHeight: 760,
    gap: 14,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  ownerBrand: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ownerBrandMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  ownerBrandGlyph: {
    color: UI.primary,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  ownerBrandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ownerBrandTitle: {
    color: UI.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  ownerBrandMeta: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  ownerNavList: {
    flex: 1,
    gap: 4,
    paddingTop: 18,
  },
  ownerNavItem: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  ownerNavItemSelected: {
    backgroundColor: UI.primarySoft,
  },
  ownerNavIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: UI.surface,
  },
  ownerNavIconSelected: {
    backgroundColor: UI.surface,
  },
  ownerNavLabel: {
    flex: 1,
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  ownerNavLabelSelected: {
    color: UI.primary,
    fontWeight: '600',
  },
  ownerSidebarCollapse: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  ownerSidebarCollapseText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
  },
  ownerMain: {
    flex: 1,
    minWidth: 320,
    gap: 16,
  },
  ownerMainMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  ownerTopBar: {
    minHeight: 64,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerTopBarMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    flexDirection: 'column',
    minHeight: 92,
    alignItems: 'stretch',
    padding: 12,
  },
  ownerTopCopy: {
    flex: 1,
    minWidth: 250,
    gap: 3,
  },
  ownerTopCopyMobile: {
    flex: 0,
    width: 'auto',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  ownerMobileBrandLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  ownerTitle: {
    color: UI.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
  },
  ownerSubtitle: {
    flexShrink: 1,
    maxWidth: 690,
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  ownerTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ownerTopActionsMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  ownerNotificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNotificationBadge: {
    position: 'absolute',
    top: 6,
    right: 5,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: UI.primary,
  },
  ownerNotificationBadgeText: {
    color: UI.surface,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  ownerAvailabilityBadge: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerAvailabilityDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: UI.success,
  },
  ownerAvailabilityText: {
    color: UI.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  ownerProfileButton: {
    minHeight: 48,
    maxWidth: 270,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerProfileButtonActive: {
    borderColor: 'rgba(43, 154, 114, 0.28)',
    backgroundColor: '#F7FEFA',
  },
  ownerAvatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  ownerAvatarActive: {
    backgroundColor: '#EAF6F0',
  },
  ownerAvatarText: {
    color: UI.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  ownerAvatarTextActive: {
    color: UI.success,
  },
  ownerProfileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  ownerProfileName: {
    color: UI.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  ownerProfileMeta: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  ownerProfileMenuWrap: {
    gap: 10,
  },
  ownerDashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 12,
  },
  ownerDashboardGridMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    flexDirection: 'column',
    gap: 12,
  },
  ownerPrimaryColumn: {
    flex: 1,
    minWidth: 320,
    gap: 12,
  },
  ownerPrimaryColumnMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  ownerHeroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  ownerHeroRowMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  ownerSideColumn: {
    width: 324,
    minWidth: 300,
    gap: 12,
  },
  ownerSideColumnMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  ownerActionPanel: {
    flex: 1.08,
    minWidth: 360,
    gap: 12,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 74, 138, 0.24)',
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  ownerActionPanelMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    minWidth: 0,
    padding: 16,
  },
  ownerActionIntroMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  ownerActionIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  ownerActionIconLarge: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.surface,
  },
  ownerActionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  ownerActionTitle: {
    flexShrink: 1,
    color: UI.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  ownerActionText: {
    flexShrink: 1,
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  ownerActionButtonWrap: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  ownerProgressDivider: {
    height: 1,
    marginTop: 8,
    backgroundColor: UI.border,
  },
  ownerProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ownerProgressHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  ownerProgressTitle: {
    flex: 1,
    minWidth: 0,
    color: UI.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  ownerProgressValue: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  ownerProgressRail: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(96, 112, 133, 0.14)',
  },
  ownerProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: UI.primary,
  },
  ownerMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ownerMetricGridMobile: {
    gap: 8,
  },
  ownerMetricCard: {
    flex: 1,
    minWidth: 174,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerMetricIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  ownerMetricCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ownerMetricLabel: {
    color: UI.textMuted,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '400',
  },
  ownerMetricValue: {
    color: UI.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
  },
  ownerMetricDetail: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  ownerAgendaCard: {
    flex: 1,
    minWidth: 360,
    minHeight: 300,
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  ownerAgendaCardMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: 260,
  },
  ownerCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ownerCardHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  ownerCardTitle: {
    color: UI.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  ownerCardText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  ownerAgendaControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerAgendaControlsMobile: {
    justifyContent: 'space-between',
  },
  ownerSegmented: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 3,
    borderRadius: 7,
    backgroundColor: UI.surfaceMuted,
  },
  ownerModeChip: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  ownerModeChipSelected: {
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  ownerModeChipText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  ownerModeChipTextSelected: {
    color: UI.primary,
    fontWeight: '600',
  },
  ownerAgendaBody: {
    flex: 1,
    justifyContent: 'center',
  },
  ownerAgendaEmpty: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  ownerAgendaEmptyIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: UI.primarySoft,
  },
  ownerAppointmentList: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerAppointmentRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  ownerAppointmentRowFirst: {
    borderTopWidth: 0,
  },
  ownerAppointmentTime: {
    width: 104,
    gap: 2,
  },
  ownerAppointmentDate: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  ownerAppointmentTimeText: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  ownerAppointmentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ownerAppointmentTitle: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  ownerAppointmentMeta: {
    color: UI.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
  },
  ownerAppointmentStatus: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  ownerAppointmentStatus_success: {
    backgroundColor: '#EAF6F0',
  },
  ownerAppointmentStatus_warning: {
    backgroundColor: '#FFF5E6',
  },
  ownerAppointmentStatus_danger: {
    backgroundColor: '#FFF0ED',
  },
  ownerAppointmentStatus_info: {
    backgroundColor: UI.surfaceMuted,
  },
  ownerAppointmentStatusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  ownerAppointmentStatusText_success: {
    color: UI.success,
  },
  ownerAppointmentStatusText_warning: {
    color: UI.warning,
  },
  ownerAppointmentStatusText_danger: {
    color: UI.danger,
  },
  ownerAppointmentStatusText_info: {
    color: UI.textMuted,
  },
  ownerEmptyTitle: {
    flexShrink: 1,
    color: UI.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  ownerEmptyText: {
    flexShrink: 1,
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    textAlign: 'center',
  },
  ownerLowerGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  ownerLowerGridMobile: {
    flexDirection: 'column',
  },
  ownerWideCard: {
    flex: 1.25,
    minWidth: 380,
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  ownerWideCardMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  ownerSuggestedList: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  ownerSuggestedAction: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  ownerSuggestedIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  ownerSuggestedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ownerSuggestedTitle: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  ownerSuggestedText: {
    color: UI.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
  },
  ownerTaskCard: {
    flex: 1,
    minWidth: 300,
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  ownerTaskEmpty: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  ownerTaskEmptyIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: UI.primarySoft,
  },
  ownerSideCard: {
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  ownerSideCardTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerInlineAction: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerChecklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ownerChecklistProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerChecklistProgressRing: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: UI.primary,
    borderLeftColor: UI.border,
  },
  ownerChecklistProgressText: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  ownerChecklistPreview: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
  },
  ownerChecklistItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerChecklistItemFirst: {
    borderTopWidth: 0,
  },
  ownerChecklistIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  ownerChecklistIconDone: {
    borderColor: UI.success,
    backgroundColor: UI.success,
  },
  ownerChecklistCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  ownerChecklistText: {
    color: UI.text,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  ownerChecklistDescription: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  ownerAlertBox: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(199, 122, 27, 0.25)',
    backgroundColor: '#FFF8ED',
  },
  ownerAlertIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: UI.surface,
  },
  ownerAlertCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ownerAlertTitle: {
    color: UI.warning,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  ownerAlertText: {
    color: UI.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
  },
  ownerTextAction: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerTextActionLabel: {
    color: UI.primary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  ownerCompactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ownerCompactAction: {
    width: '48.5%',
    minWidth: 130,
    minHeight: 58,
    gap: 7,
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surfaceMuted,
  },
  ownerCompactIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: UI.surface,
  },
  ownerCompactLabel: {
    color: UI.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  ownerMobileTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  ownerMobileTab: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 8,
  },
  ownerMobileTabLabel: {
    color: UI.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  ownerMobileTabLabelSelected: {
    color: UI.primary,
    fontWeight: '600',
  },
  formCard: {
    gap: 13,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
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
    borderRadius: 6,
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
    fontWeight: '600',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
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
    fontWeight: '600',
  },
  spaceSwitcherSubtitle: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  spaceSwitcherAdd: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    fontWeight: '600',
  },
  spaceSwitchNameSelected: {
    color: UI.primaryDark,
  },
  spaceSwitchMeta: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  profileMenu: {
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
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
    borderRadius: 8,
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
    fontWeight: '600',
  },
  profileMenuEmail: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  professionalModeStrip: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 8,
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
    fontWeight: '600',
  },
  professionalModeTitleActive: {
    color: UI.success,
  },
  professionalModeText: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: UI.border,
  },
  profileMenuSection: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 8,
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
    fontWeight: '600',
  },
  profileSpaceMeta: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  profileMenuEmpty: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  profileMenuActions: {
    gap: 9,
  },
  profileComplianceActions: {
    gap: 9,
  },
  spaceCard: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  spaceIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
  publishTextLive: {
    color: UI.success,
  },
  checklistCard: {
    gap: 1,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
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
    fontWeight: '500',
  },
  logoutButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  statusIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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
    fontWeight: '600',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  shortcutLabel: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '600',
  },
  shortcutValue: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.72,
  },
});
