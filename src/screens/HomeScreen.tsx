import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccountDeletionCard } from '@/components/account-deletion-card';
import { cardShadow, EmptyState, PrimaryButton, ScreenScaffold, SectionTitle, UI } from '@/components/app-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import {
  getApiErrorMessage,
  getCustomerAppointments,
  getPublishedSpaces,
} from '@/services/api-client';
import type { Appointment, Space } from '@/types/domain';
import { formatCurrency, formatRating } from '@/utils/format';

type BottomTab = 'home' | 'appointments' | 'notices' | 'profile';
type Coordinates = { latitude: number; longitude: number };
type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
type HomeCategory = { id: string; label: string; iconName: string };

const CARE_COLORS = {
  canvas: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceBlue: '#F5F9FC',
  surfaceSage: '#F5FAF7',
  ink: '#0F2340',
  muted: '#607085',
  border: 'rgba(15, 35, 64, 0.10)',
  primary: '#064A8A',
  primaryDark: '#03366C',
  primarySoft: '#E7F0FA',
  sage: '#2B9A72',
  sageSoft: '#EAF6F0',
  coral: '#D85B4A',
  coralSoft: '#FFF0ED',
  amber: '#C77A1B',
  amberSoft: '#FFF5E6',
} as const;

const CARE_FONT = 'Source Sans 3, ui-sans-serif, system-ui, sans-serif';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, deleteAccount, professionalProfileActive, activateProfessionalProfile } = useAuth();
  const { selectSpace } = useBooking();
  const {
    categories,
    publishedSpaces,
    appointments,
    favoriteSpaceIds,
    toggleFavorite,
    getServicesForSpace,
    syncAppointmentsFromApi,
    syncPublicSpacesFromApi,
  } = useOwnerConfig();
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [activeTab, setActiveTab] = useState<BottomTab>('home');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [deleteAccountArmed, setDeleteAccountArmed] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  const requestLocation = useCallback(async () => {
    setLocationStatus('requesting');
    setLocationMessage(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setCoordinates(null);
        setLocationStatus('denied');
        setLocationMessage('Permita a localização para ordenar os consultórios mais próximos.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoordinates({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
      setLocationStatus('granted');
    } catch {
      setCoordinates(null);
      setLocationStatus('error');
      setLocationMessage('Não foi possível acessar sua localização agora.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      try {
        const spaceItems = await getPublishedSpaces(coordinates);
        const appointmentItems = user ? await getCustomerAppointments().catch(() => []) : [];

        if (mounted) {
          syncPublicSpacesFromApi(spaceItems);
          syncAppointmentsFromApi(appointmentItems);
          setCatalogError(null);
        }
      } catch (error) {
        if (mounted) {
          setCatalogError(getApiErrorMessage(error));
        }
      }
    }

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, [coordinates, syncAppointmentsFromApi, syncPublicSpacesFromApi, user]);

  const filteredSpaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortSpacesByDistance(
      publishedSpaces.filter((space) => {
        const matchesCategory = activeCategoryId === 'all' || space.categoryId === activeCategoryId;
        const spaceServices = getServicesForSpace(space.id);
        const matchesQuery =
          normalizedQuery.length === 0 ||
          space.name.toLowerCase().includes(normalizedQuery) ||
          space.neighborhood.toLowerCase().includes(normalizedQuery) ||
          space.city.toLowerCase().includes(normalizedQuery) ||
          spaceServices.some((service) => service.name.toLowerCase().includes(normalizedQuery));

        return matchesCategory && matchesQuery;
      }),
    );
  }, [activeCategoryId, getServicesForSpace, publishedSpaces, query]);

  const customerAppointments = appointments.filter((appointment) => appointment.customerId === user?.id);
  const upcomingAppointments = customerAppointments.filter((appointment) =>
    ['confirmed', 'pending_payment', 'pending_confirmation'].includes(appointment.status),
  );
  const paymentHistory = customerAppointments.filter((appointment) =>
    ['confirmed', 'completed'].includes(appointment.status),
  );
  const paymentTotal = paymentHistory.reduce((sum, appointment) => sum + appointment.total, 0);
  const spacesTitle = coordinates ? 'Consultórios perto de você' : 'Consultórios publicados';

  function openSpace(spaceId: string) {
    selectSpace(spaceId);
    router.push('/space-details');
  }

  function openCareWorkspace() {
    if (!user) {
      router.push('/login');
      return;
    }

    router.push('/patient-care');
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
      setActiveTab('home');
      router.replace('/');
    } catch (error) {
      setDeleteAccountError(error instanceof Error ? error.message : 'Não foi possível excluir a conta agora.');
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <ScreenScaffold
      bottomOffset={112}
      footer={isWeb ? undefined : (
        <BottomNavigation activeTab={activeTab} onCarePress={openCareWorkspace} onTabPress={setActiveTab} />
      )}>
      {isWeb ? (
        activeTab === 'home' ? null : (
          <WebTopBar
            activeTab={activeTab}
            userName={user?.name}
            onTabPress={setActiveTab}
            onAccountPress={() => {
              if (user) {
                logout();
                router.replace('/');
                return;
              }

              router.push('/login');
            }}
          />
        )
      ) : activeTab === 'home' ? null : (
        <View style={styles.homeHeader}>
          <View style={styles.greetingCopy}>
            <Text style={styles.greeting}>
              {user ? `Olá, ${user.name.split(' ')[0]}!` : 'Consultórios perto de você'}
            </Text>
            <Text style={styles.subtitle}>
              {user ? 'Encontre um horário sem sair do app.' : 'Explore agora e entre só quando for agendar.'}
            </Text>
          </View>
          {user ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sair"
              onPress={() => {
                logout();
                router.replace('/');
              }}
              style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={23} color={UI.text} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Entrar"
              onPress={() => router.push('/login')}
              style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
              <Ionicons name="log-in-outline" size={23} color={UI.text} />
            </Pressable>
          )}
        </View>
      )}

      {activeTab === 'home' && (
        isWeb ? (
          <WebHomeDashboard
            activeCategoryId={activeCategoryId}
            catalogError={catalogError}
            categories={categories}
            favoriteSpaceIds={favoriteSpaceIds}
            filteredSpaces={filteredSpaces}
            locationMessage={locationMessage}
            locationStatus={locationStatus}
            query={query}
            spacesTitle={spacesTitle}
            upcomingAppointments={upcomingAppointments}
            userName={user?.name}
            getServicesForSpace={getServicesForSpace}
            onAccountPress={() => {
              if (user) {
                logout();
                router.replace('/');
                return;
              }

              router.push('/login');
            }}
            onAppointments={() => setActiveTab('appointments')}
            onCategoryPress={setActiveCategoryId}
            onCare={openCareWorkspace}
            onFavoritePress={toggleFavorite}
            onInPerson={() => setQuery('presencial')}
            onLogin={() => router.push('/login')}
            onNotices={() => setActiveTab('notices')}
            onOnline={() => setQuery('online')}
            onOpenSpace={openSpace}
            onProfile={() => setActiveTab('profile')}
            onQueryChange={setQuery}
            onRegister={() => router.push('/customer-register')}
            onRequestLocation={requestLocation}
            onViewAppointment={(appointmentId) =>
              router.push({ pathname: '/appointment-details', params: { appointmentId } })
            }
          />
        ) : (
          <MobileCareHome
            catalogError={catalogError}
            favoriteSpaceIds={favoriteSpaceIds}
            filteredSpaces={filteredSpaces}
            upcomingAppointments={upcomingAppointments}
            userName={user?.name}
            getServicesForSpace={getServicesForSpace}
            onAppointments={() => setActiveTab('appointments')}
            onCare={openCareWorkspace}
            onFavoritePress={toggleFavorite}
            onMessages={() => setActiveTab('notices')}
            onOpenSpace={openSpace}
            onProfile={() => setActiveTab('profile')}
            onRegister={() => router.push('/customer-register')}
            onViewAppointment={(appointmentId) =>
              router.push({ pathname: '/appointment-details', params: { appointmentId } })
            }
          />
        )
      )}

      {activeTab === 'appointments' && (
        <>
          {user ? (
            <>
              <SectionTitle title="Meus agendamentos" actionLabel={`${customerAppointments.length} pedidos`} />
              {customerAppointments.length ? (
                <View style={styles.appointmentList}>
                  {customerAppointments.map((appointment) => (
                    <CustomerAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onPress={() => router.push({ pathname: '/appointment-details', params: { appointmentId: appointment.id } })}
                    />
                  ))}
                </View>
              ) : (
                <TabEmptyState
                  icon="calendar-outline"
                  title="Sem agendamentos"
                  text="Quando você confirmar um horário, ele aparecerá nesta tela."
                />
              )}
            </>
          ) : (
            <GuestPromptCard
              title="Entre para ver sua agenda"
              text="Seus horários, pagamentos e reagendamentos ficam disponíveis depois do login."
              onLogin={() => router.push('/login')}
              onRegister={() => router.push('/customer-register')}
            />
          )}
        </>
      )}

      {activeTab === 'notices' && (
        <>
          <SectionTitle title="Avisos" />
          <NoticeCard
            icon="checkmark-circle-outline"
            tone="success"
            title="Confirmações"
            text={user ? `${upcomingAppointments.length} agendamento(s) em acompanhamento.` : 'Entre para acompanhar confirmações de reserva.'}
          />
          <NoticeCard
            icon="notifications-outline"
            tone="info"
            title="Lembretes"
            text="Receba avisos de confirmação, reagendamento e atendimento online em um só lugar."
          />
          <NoticeCard
            icon="shield-checkmark-outline"
            tone="rose"
            title="Privacidade"
            text="Dados sensíveis ficam protegidos e aparecem somente quando necessários para o atendimento."
          />
        </>
      )}

      {activeTab === 'profile' && (
        <>
          {user ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.profileIcon}>
                  <Ionicons name="person-outline" size={25} color={UI.primary} />
                </View>
                <View style={styles.profileCopy}>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.profileStats}>
                <View style={styles.profileStat}>
                  <Text style={styles.statLabel}>Pagamentos combinados</Text>
                  <Text style={styles.statValue}>{formatCurrency(paymentTotal)}</Text>
                </View>
                <View style={styles.profileStat}>
                  <Text style={styles.statLabel}>Agendamentos</Text>
                  <Text style={styles.statValue}>{String(customerAppointments.length)}</Text>
                </View>
              </View>
              <ProfessionalProfileCard
                active={professionalProfileActive}
                onActivate={activateProfessionalProfile}
                onWork={() => router.push('/professional-agenda')}
                onCreateSpace={() => router.push('/create-space')}
              />
              <View style={styles.profileLinks}>
                <ProfileLink icon="receipt-outline" label="Histórico de pagamentos" value={`${paymentHistory.length} registros`} />
                <ProfileLink icon="document-text-outline" label="Termos de uso" onPress={() => router.push('/terms')} />
                <ProfileLink icon="shield-checkmark-outline" label="Privacidade e LGPD" onPress={() => router.push('/privacy')} />
                <ProfileLink icon="help-circle-outline" label="Suporte" onPress={() => router.push('/support')} />
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
            </>
          ) : (
            <>
              <GuestPromptCard
                title="Sua conta no Psi Agenda Online"
                text="Entre para acompanhar agendamentos, salvar histórico e confirmar novas reservas."
                onLogin={() => router.push('/login')}
                onRegister={() => router.push('/customer-register')}
              />
              <View style={styles.profileLinks}>
                <ProfileLink icon="document-text-outline" label="Termos de uso" onPress={() => router.push('/terms')} />
                <ProfileLink icon="shield-checkmark-outline" label="Privacidade e LGPD" onPress={() => router.push('/privacy')} />
                <ProfileLink icon="help-circle-outline" label="Suporte" onPress={() => router.push('/support')} />
              </View>
            </>
          )}
        </>
      )}
    </ScreenScaffold>
  );
}

function WebTopBar({
  activeTab,
  userName,
  onAccountPress,
  onTabPress,
}: {
  activeTab: BottomTab;
  userName?: string;
  onAccountPress: () => void;
  onTabPress: (tab: BottomTab) => void;
}) {
  const tabs: { id: BottomTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Início', icon: 'home-outline' },
    { id: 'appointments', label: 'Agenda', icon: 'calendar-outline' },
    { id: 'notices', label: 'Avisos', icon: 'notifications-outline' },
    { id: 'profile', label: 'Perfil', icon: 'person-outline' },
  ];

  return (
    <View style={styles.webTopBar}>
      <View style={styles.webBrand}>
        <View style={styles.webBrandMark}>
          <Text style={styles.webBrandGlyph}>Ψ</Text>
        </View>
        <Text numberOfLines={1} style={styles.webBrandName}>
          Psi Agenda Online
        </Text>
      </View>

      <View style={styles.webTopNav}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              onPress={() => onTabPress(tab.id)}
              style={({ pressed }) => [
                styles.webTopNavItem,
                selected && styles.webTopNavItemSelected,
                pressed && styles.pressed,
              ]}>
              <Ionicons
                name={selected ? selectedIcon(tab.icon) : tab.icon}
                size={19}
                color={selected ? UI.primary : UI.textMuted}
              />
              <Text style={[styles.webTopNavLabel, selected && styles.webTopNavLabelSelected]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onAccountPress}
        style={({ pressed }) => [styles.webAccountButton, pressed && styles.pressed]}>
        <Ionicons name={userName ? 'log-out-outline' : 'person-outline'} size={19} color={UI.primaryDark} />
        <Text numberOfLines={1} style={styles.webAccountText}>
          {userName ? `Sair, ${userName.split(' ')[0]}` : 'Entrar / Criar conta'}
        </Text>
      </Pressable>
    </View>
  );
}

function MobileCareHome({
  catalogError,
  favoriteSpaceIds,
  filteredSpaces,
  upcomingAppointments,
  userName,
  getServicesForSpace,
  onAppointments,
  onCare,
  onFavoritePress,
  onMessages,
  onOpenSpace,
  onProfile,
  onRegister,
  onViewAppointment,
}: {
  catalogError: string | null;
  favoriteSpaceIds: string[];
  filteredSpaces: Space[];
  upcomingAppointments: Appointment[];
  userName?: string;
  getServicesForSpace: (spaceId: string) => { price: number }[];
  onAppointments: () => void;
  onCare: () => void;
  onFavoritePress: (spaceId: string) => void;
  onMessages: () => void;
  onOpenSpace: (spaceId: string) => void;
  onProfile: () => void;
  onRegister: () => void;
  onViewAppointment: (appointmentId: string) => void;
}) {
  const firstName = userName?.split(' ')[0] ?? 'Thiago';
  const nextAppointment = upcomingAppointments[0];
  const discoverySpaces = filteredSpaces.slice(0, 3);
  const sessionTime = nextAppointment ? formatCareDateTime(nextAppointment.startDateTime) : 'Hoje, 15:00';

  function handlePrimaryAction() {
    if (nextAppointment) {
      onViewAppointment(nextAppointment.id);
      return;
    }

    if (discoverySpaces[0]) {
      onOpenSpace(discoverySpaces[0].id);
      return;
    }

    onRegister();
  }

  return (
    <View style={styles.mobileCareHome}>
      <View style={styles.mobileCareHeader}>
        <View style={styles.mobileCareHeaderCopy}>
          <Text style={styles.mobileCareTitle}>Olá, {firstName}</Text>
          <Text style={styles.mobileCareSubtitle}>Seu plano de cuidado para hoje</Text>
        </View>
        <View style={styles.mobileCareHeaderActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mensagens"
            onPress={onMessages}
            style={({ pressed }) => [styles.mobileCareCircleButton, pressed && styles.pressed]}>
            <Ionicons name="notifications-outline" size={22} color={CARE_COLORS.ink} />
            <View style={styles.mobileCareSmallDot} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Perfil"
            onPress={onProfile}
            style={({ pressed }) => [styles.mobileCareCircleButton, pressed && styles.pressed]}>
            <Ionicons name="person-outline" size={22} color={CARE_COLORS.ink} />
          </Pressable>
        </View>
      </View>

      <MobileModeSwitch />

      <View style={styles.mobileSessionCard}>
        <View style={styles.mobileSessionHeader}>
          <View>
            <Text style={styles.mobileEyebrow}>PRÓXIMA SESSÃO</Text>
            <Text style={styles.mobileSessionTime}>{sessionTime}</Text>
          </View>
          <View style={styles.mobileConfirmedPill}>
            <View style={styles.mobileConfirmedDot} />
            <Text style={styles.mobileConfirmedText}>Confirmada</Text>
          </View>
        </View>

        <View style={styles.mobileTherapistRow}>
          <View style={styles.mobileSessionIcon}>
            <Ionicons name="calendar-outline" size={27} color={CARE_COLORS.primary} />
          </View>
          <View style={styles.mobileTherapistCopy}>
            <Text style={styles.mobileTherapistName}>Dra. Helena Martins</Text>
            <View style={styles.mobileTinyRow}>
              <Ionicons name="videocam-outline" size={16} color={CARE_COLORS.primary} />
              <Text style={styles.mobileTherapistMeta}>Terapia online</Text>
            </View>
          </View>
        </View>

        <View style={styles.mobileSessionActions}>
          <Pressable
            accessibilityRole="button"
            onPress={handlePrimaryAction}
            style={({ pressed }) => [styles.mobilePrimaryAction, pressed && styles.pressed]}>
            <Ionicons name={nextAppointment ? 'videocam' : 'search-outline'} size={20} color={CARE_COLORS.surface} />
            <Text style={styles.mobilePrimaryActionText}>
              {nextAppointment ? 'Entrar na consulta' : 'Encontrar psicóloga'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onAppointments}
            style={({ pressed }) => [styles.mobileSecondaryAction, pressed && styles.pressed]}>
            <Ionicons name="calendar-outline" size={18} color={CARE_COLORS.primary} />
            <Text style={styles.mobileSecondaryActionText}>Remarcar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCare}
            style={({ pressed }) => [styles.mobileSecondaryAction, pressed && styles.pressed]}>
            <Ionicons name="checkbox-outline" size={18} color={CARE_COLORS.primary} />
            <Text style={styles.mobileSecondaryActionText}>Preparar</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mobileCareCard}>
        <View style={styles.mobileCardTitleRow}>
          <View style={[styles.mobileCardIcon, styles.mobileCardIconSage]}>
            <Ionicons name="checkbox-outline" size={22} color={CARE_COLORS.sage} />
          </View>
          <Text style={styles.mobileCardTitle}>Prepare-se</Text>
        </View>
        <View style={styles.mobilePrepList}>
          <MobilePrepRow checked title="Revisar anotações da última sessão" onPress={onCare} />
          <MobilePrepRow checked title="Definir intenção para hoje" onPress={onCare} />
          <MobilePrepRow title="Preencher check-in rápido" onPress={onCare} />
        </View>
      </View>

      <View style={styles.mobileCareTwoColumns}>
        <View style={[styles.mobileCareCard, styles.mobileHalfCard]}>
          <View style={[styles.mobileCardIcon, styles.mobileCardIconSage]}>
            <Ionicons name="heart-outline" size={22} color={CARE_COLORS.sage} />
          </View>
          <Text style={[styles.mobileCardTitle, styles.mobileCompactCardTitle]}>Check-in rápido</Text>
          <Text style={styles.mobileCompactText}>Como você está se sentindo hoje?</Text>
          <View style={styles.mobileMoodRow}>
            <MobileMoodDot icon="sad-outline" tone="coral" />
            <MobileMoodDot icon="sad-outline" tone="amber" />
            <MobileMoodDot icon="remove-outline" tone="neutral" />
            <MobileMoodDot icon="happy-outline" tone="sage" />
            <MobileMoodDot icon="happy" tone="sage" selected />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onCare}
            style={({ pressed }) => [styles.mobileCheckinButton, pressed && styles.pressed]}>
            <Text style={styles.mobileCheckinButtonText}>Fazer check-in</Text>
          </Pressable>
        </View>

        <View style={[styles.mobileCareCard, styles.mobileHalfCard]}>
          <View style={[styles.mobileCardIcon, styles.mobileCardIconAmber]}>
            <Ionicons name="clipboard-outline" size={22} color={CARE_COLORS.amber} />
          </View>
          <Text style={[styles.mobileCardTitle, styles.mobileCompactCardTitle]}>Tarefas abertas</Text>
          <MobileTaskSummary color={CARE_COLORS.coral} label="Exercícios" value="2" />
          <MobileTaskSummary color={CARE_COLORS.amber} label="Reflexões" value="1" />
          <MobileTaskSummary color={CARE_COLORS.primary} label="Leituras" value="1" />
          <Pressable
            accessibilityRole="button"
            onPress={onCare}
            style={({ pressed }) => [styles.mobileTaskLink, pressed && styles.pressed]}>
            <Text style={styles.mobileTaskLinkText}>Ver todas</Text>
            <Ionicons name="chevron-forward" size={18} color={CARE_COLORS.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.mobileCareCard}>
        <View style={styles.mobileCardTitleRow}>
          <View style={styles.mobileCardIcon}>
            <Ionicons name="trending-up-outline" size={22} color={CARE_COLORS.primary} />
          </View>
          <View style={styles.mobileCardTitleCopy}>
            <Text style={styles.mobileCardTitle}>Linha do cuidado</Text>
            <Text style={styles.mobileCardSubtitle}>Seu progresso geral</Text>
          </View>
          <Text style={styles.mobileProgressPercent}>62%</Text>
        </View>
        <View style={styles.mobileProgressTrack}>
          <View style={styles.mobileProgressFill} />
        </View>
        <View style={styles.mobileJourneyRow}>
          <MobileJourneyNode icon="leaf-outline" title="Começar" text="Concluído" active />
          <MobileJourneyNode icon="compass-outline" title="Entender" text="Concluído" active />
          <MobileJourneyNode icon="flower-outline" title="Praticar" text="Em andamento" current />
          <MobileJourneyNode icon="sunny-outline" title="Integrar" text="Próximo" />
        </View>
      </View>

      <View style={styles.mobileCareCard}>
        <View style={styles.mobileCardTitleRow}>
          <View style={styles.mobileCardIcon}>
            <Ionicons name="search-outline" size={22} color={CARE_COLORS.primary} />
          </View>
          <View style={styles.mobileCardTitleCopy}>
            <Text style={styles.mobileCardTitle}>Encontrar psicóloga</Text>
            <Text style={styles.mobileCardSubtitle}>Novas profissionais disponíveis perto de você</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={CARE_COLORS.primary} />
        </View>

        {catalogError ? (
          <EmptyState icon="cloud-offline-outline" title="Catálogo indisponível" text={catalogError} />
        ) : discoverySpaces.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileDiscoveryList}>
            {discoverySpaces.map((space) => (
              <MobileProfessionalCard
                key={space.id}
                favorite={favoriteSpaceIds.includes(space.id)}
                minPrice={space.minPrice ?? getMinPrice(getServicesForSpace(space.id))}
                space={space}
                onFavoritePress={() => onFavoritePress(space.id)}
                onPress={() => onOpenSpace(space.id)}
              />
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon="search-outline"
            title="Nenhum profissional encontrado"
            text="Tente buscar por outro bairro ou especialidade."
          />
        )}
      </View>
    </View>
  );
}

function MobileModeSwitch() {
  return (
    <View style={styles.mobileModeSwitch}>
      <View style={[styles.mobileModeItem, styles.mobileModeItemSelected]}>
        <Text style={[styles.mobileModeText, styles.mobileModeTextSelected]}>Hoje</Text>
      </View>
      <View style={styles.mobileModeItem}>
        <Text style={styles.mobileModeText}>Semana</Text>
      </View>
      <View style={styles.mobileModeItem}>
        <Text style={styles.mobileModeText}>Jornada</Text>
      </View>
    </View>
  );
}

function MobilePrepRow({
  checked,
  title,
  onPress,
}: {
  checked?: boolean;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.mobilePrepRow, pressed && styles.pressed]}>
      <View style={[styles.mobilePrepCheck, checked && styles.mobilePrepCheckSelected]}>
        {checked && <Ionicons name="checkmark" size={15} color={CARE_COLORS.surface} />}
      </View>
      <Text numberOfLines={1} style={styles.mobilePrepText}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={CARE_COLORS.muted} />
    </Pressable>
  );
}

function MobileMoodDot({
  icon,
  selected,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  tone: 'coral' | 'amber' | 'neutral' | 'sage';
}) {
  const color =
    tone === 'coral'
      ? CARE_COLORS.coral
      : tone === 'amber'
      ? CARE_COLORS.amber
      : tone === 'sage'
      ? CARE_COLORS.sage
      : '#B8A36A';

  return (
    <View style={[styles.mobileMoodDot, selected && styles.mobileMoodDotSelected, { backgroundColor: `${color}22` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
  );
}

function MobileTaskSummary({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.mobileTaskSummaryRow}>
      <View style={[styles.mobileTaskMarker, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={styles.mobileTaskSummaryLabel}>{label}</Text>
      <View style={[styles.mobileTaskCount, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.mobileTaskCountText, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function MobileJourneyNode({
  active,
  current,
  icon,
  title,
  text,
}: {
  active?: boolean;
  current?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.mobileJourneyNode}>
      <View
        style={[
          styles.mobileJourneyIcon,
          active && styles.mobileJourneyIconActive,
          current && styles.mobileJourneyIconCurrent,
        ]}>
        <Ionicons
          name={icon}
          size={22}
          color={active ? CARE_COLORS.surface : current ? CARE_COLORS.primary : CARE_COLORS.muted}
        />
      </View>
      <Text numberOfLines={1} style={styles.mobileJourneyTitle}>{title}</Text>
      <Text numberOfLines={1} style={[styles.mobileJourneyText, (active || current) && styles.mobileJourneyTextActive]}>
        {text}
      </Text>
    </View>
  );
}

function MobileProfessionalCard({
  favorite,
  minPrice,
  space,
  onFavoritePress,
  onPress,
}: {
  favorite: boolean;
  minPrice: number;
  space: Space;
  onFavoritePress: () => void;
  onPress: () => void;
}) {
  return (
    <View style={styles.mobileProfessionalCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.mobileProfessionalMain, pressed && styles.pressed]}>
        <View style={styles.mobileProfessionalAvatar}>
          <Text style={styles.mobileProfessionalInitials}>{getInitials(space.name)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.mobileProfessionalName}>{space.name}</Text>
        <Text numberOfLines={1} style={styles.mobileProfessionalLocation}>
          {space.city}{space.distanceKm !== undefined ? ` • ${formatDistance(space.distanceKm)}` : ''}
        </Text>
        <View style={styles.mobileProfessionalFooter}>
          <View style={styles.mobileTinyRow}>
            <Ionicons name="star" size={15} color={UI.star} />
            <Text style={styles.mobileProfessionalRating}>{formatRating(space.rating)}</Text>
          </View>
          <Text style={styles.mobileProfessionalPrice}>{formatCurrency(minPrice)}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        onPress={onFavoritePress}
        hitSlop={10}
        style={({ pressed }) => [styles.mobileFavoriteMini, pressed && styles.pressed]}>
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={CARE_COLORS.primary} />
      </Pressable>
    </View>
  );
}

function WebHomeDashboard({
  activeCategoryId,
  catalogError,
  categories,
  favoriteSpaceIds,
  filteredSpaces,
  locationMessage,
  locationStatus,
  query,
  spacesTitle,
  upcomingAppointments,
  userName,
  getServicesForSpace,
  onAccountPress,
  onAppointments,
  onCategoryPress,
  onCare,
  onFavoritePress,
  onInPerson,
  onLogin,
  onNotices,
  onOnline,
  onOpenSpace,
  onProfile,
  onQueryChange,
  onRegister,
  onRequestLocation,
  onViewAppointment,
}: {
  activeCategoryId: string;
  catalogError: string | null;
  categories: HomeCategory[];
  favoriteSpaceIds: string[];
  filteredSpaces: Space[];
  locationMessage: string | null;
  locationStatus: LocationStatus;
  query: string;
  spacesTitle: string;
  upcomingAppointments: Appointment[];
  userName?: string;
  getServicesForSpace: (spaceId: string) => { price: number }[];
  onAccountPress: () => void;
  onAppointments: () => void;
  onCategoryPress: (categoryId: string) => void;
  onCare: () => void;
  onFavoritePress: (spaceId: string) => void;
  onInPerson: () => void;
  onLogin: () => void;
  onNotices: () => void;
  onOnline: () => void;
  onOpenSpace: (spaceId: string) => void;
  onProfile: () => void;
  onQueryChange: (value: string) => void;
  onRegister: () => void;
  onRequestLocation: () => void;
  onViewAppointment: (appointmentId: string) => void;
}) {
  const firstName = userName?.split(' ')[0] ?? 'Thiago';
  const nextAppointment = upcomingAppointments[0];
  const discoverySpaces = filteredSpaces.slice(0, 3);
  const sessionTime = nextAppointment ? formatCareDateTime(nextAppointment.startDateTime) : 'Hoje, 15:00';
  const primaryLabel = nextAppointment ? 'Entrar na consulta' : 'Encontrar psicóloga';

  return (
    <View style={styles.webCareShell}>
      <View style={styles.webCareSidebar}>
        <View style={styles.webCareBrand}>
          <View style={styles.webCareLogoMark}>
            <Text style={styles.webCareLogoGlyph}>Ψ</Text>
          </View>
          <View style={styles.webCareBrandCopy}>
            <Text style={styles.webCareBrandName}>Psi Agenda</Text>
            <Text style={styles.webCareBrandSub}>ONLINE</Text>
          </View>
        </View>

        <View style={styles.webCareNav}>
          <WebCareNavItem icon="home" label="Início" selected onPress={() => onCategoryPress('all')} />
          <WebCareNavItem icon="heart-outline" label="Meu cuidado" onPress={onCare} />
          <WebCareNavItem icon="calendar-outline" label="Agenda" onPress={onAppointments} />
          <WebCareNavItem icon="people-outline" label="Profissionais" onPress={() => onCategoryPress('all')} />
          <WebCareNavItem icon="chatbox-outline" label="Mensagens" badge="2" onPress={onNotices} />
          <WebCareNavItem icon="person-circle-outline" label="Perfil" onPress={onProfile} />
        </View>

        <View style={styles.webCareSidebarFoot}>
          <View style={styles.webCareSecureIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color={CARE_COLORS.primary} />
          </View>
          <Text style={styles.webCareSecureTitle}>Seus dados estão protegidos</Text>
          <Text style={styles.webCareSecureText}>Privacidade e segurança em primeiro lugar.</Text>
          <Text style={styles.webCareSecureLink}>Saiba mais</Text>
        </View>
      </View>

      <View style={styles.webCareMain}>
        <View style={styles.webCareTopBar}>
          <View style={styles.webCareCommand}>
            <Ionicons name="search-outline" size={18} color={CARE_COLORS.muted} />
            <TextInput
              value={query}
              onChangeText={onQueryChange}
              placeholder="Buscar cuidado, tarefa ou profissional"
              placeholderTextColor={CARE_COLORS.muted}
              style={styles.webCareCommandInput}
            />
            <View style={styles.webCareShortcut}>
              <Text style={styles.webCareShortcutText}>⌘ K</Text>
            </View>
          </View>

          <View style={styles.webCareModeSwitch}>
            <WebModeToggle icon="sunny-outline" label="Hoje" selected />
            <WebModeToggle icon="calendar-outline" label="Semana" />
            <WebModeToggle icon="trending-up-outline" label="Jornada" />
          </View>

          <View style={styles.webCareTopActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Avisos"
              onPress={onNotices}
              style={({ pressed }) => [styles.webCareIconButton, pressed && styles.pressed]}>
              <Ionicons name="notifications-outline" size={18} color={CARE_COLORS.ink} />
              <View style={styles.webCareNotificationDot}>
                <Text style={styles.webCareNotificationText}>3</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onAccountPress}
              style={({ pressed }) => [styles.webCareProfileButton, pressed && styles.pressed]}>
              <View style={styles.webCareAvatar}>
                <Text style={styles.webCareAvatarText}>{getInitials(userName ?? 'Thiago')}</Text>
              </View>
              <Text numberOfLines={1} style={styles.webCareProfileName}>
                {firstName}
              </Text>
              <Ionicons name="chevron-down" size={16} color={CARE_COLORS.ink} />
            </Pressable>
          </View>
        </View>

        <View style={styles.webCareHeader}>
          <View>
            <Text style={styles.webCareTitle}>Olá, {firstName}</Text>
            <Text style={styles.webCareSubtitle}>Seu plano de cuidado para hoje</Text>
          </View>
          <View style={styles.webCareHeaderMetrics}>
            <WebStatusPill icon="calendar-clear-outline" value={String(upcomingAppointments.length)} label="sessões" />
            <WebStatusPill icon="heart-outline" value={String(favoriteSpaceIds.length)} label="favoritos" />
            <WebStatusPill icon="people-outline" value={String(filteredSpaces.length)} label="profissionais" />
          </View>
        </View>

        <View style={styles.webCareBody}>
          <View style={styles.webCarePrimaryColumn}>
            <View style={styles.webCareSessionCard}>
              <View style={styles.webCareSessionLeft}>
                <Text style={styles.webCareEyebrow}>PRÓXIMA SESSÃO</Text>
                <Text style={styles.webCareSessionTime}>{sessionTime}</Text>
                <View style={styles.webCareTherapistRow}>
                  <View style={styles.webCareTherapistAvatar}>
                    <Text style={styles.webCareTherapistInitials}>HM</Text>
                  </View>
                  <View style={styles.webCareTherapistCopy}>
                    <Text style={styles.webCareTherapistName}>Dra. Helena Martins</Text>
                    <View style={styles.webCareTinyRow}>
                      <Ionicons name="videocam-outline" size={15} color={CARE_COLORS.primary} />
                      <Text style={styles.webCareTherapistMeta}>Terapia online</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (nextAppointment) {
                      onViewAppointment(nextAppointment.id);
                      return;
                    }

                    if (discoverySpaces[0]) {
                      onOpenSpace(discoverySpaces[0].id);
                      return;
                    }

                    onRegister();
                  }}
                  style={({ pressed }) => [styles.webCarePrimaryButton, pressed && styles.pressed]}>
                  <Ionicons name={nextAppointment ? 'videocam' : 'search-outline'} size={17} color={CARE_COLORS.surface} />
                  <Text style={styles.webCarePrimaryButtonText}>{primaryLabel}</Text>
                </Pressable>

                <View style={styles.webCareSessionActions}>
                  <WebActionButton icon="calendar-outline" label="Remarcar" onPress={onAppointments} />
                  <WebActionButton icon="document-text-outline" label="Preparar sessão" onPress={onCare} />
                </View>
              </View>

              <View style={styles.webCareSessionDivider} />

              <View style={styles.webCareSessionRight}>
                <Text style={styles.webCareCardTitle}>Prepare-se para sua sessão</Text>
                <Text style={styles.webCareCardText}>Pequenas ações que fazem a diferença</Text>
                <View style={styles.webCareChecklist}>
                  <WebChecklistRow icon="reader-outline" title="Revisar anotações" text="Veja o que foi importante para você" />
                  <WebChecklistRow icon="leaf-outline" title="Respiração consciente" text="2 minutos de respiração guiada" />
                  <WebChecklistRow icon="flag-outline" title="Definir intenção" text="Qual é o foco da sua sessão hoje?" />
                </View>
                <Pressable accessibilityRole="button" onPress={onCare} style={styles.webCareInlineLink}>
                  <Text style={styles.webCareInlineLinkText}>Ver todas as sugestões</Text>
                  <Ionicons name="arrow-forward" size={16} color={CARE_COLORS.primary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.webCareTimelineCard}>
              <View style={styles.webCareCardHeader}>
                <View>
                  <Text style={styles.webCareCardTitle}>Linha do cuidado</Text>
                  <Text style={styles.webCareCardText}>Acompanhe cada etapa da sua jornada</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={onCare} style={styles.webCareTextButton}>
                  <Text style={styles.webCareTextButtonText}>Ver jornada completa</Text>
                  <Ionicons name="arrow-forward" size={16} color={CARE_COLORS.primary} />
                </Pressable>
              </View>
              <View style={styles.webCareTimeline}>
                <View pointerEvents="none" style={styles.webCareTimelineRail} />
                <WebJourneyStep icon="checkmark" title="Agendado" text="Concluído" date="10/06" tone="done" />
                <WebJourneyStep icon="clipboard-outline" title="Preparação" text="Em andamento" date="Hoje" tone="active" />
                <WebJourneyStep icon="videocam-outline" title="Sessão" text={sessionTime} date="" tone="primary" />
                <WebJourneyStep icon="document-text-outline" title="Pós-consulta" text="Em breve" date="" />
                <WebJourneyStep icon="flag-outline" title="Próxima meta" text="Em breve" date="" />
              </View>
            </View>

            <View style={styles.webCareDiscoveryCard}>
              <View style={styles.webCareCardHeader}>
                <View>
                  <Text style={styles.webCareCardTitle}>Encontrar psicóloga</Text>
                  <Text style={styles.webCareCardText}>{spacesTitle}: profissionais alinhados com suas necessidades</Text>
                </View>
                <Text style={styles.webCareResultCount}>{filteredSpaces.length} resultados</Text>
              </View>

              <View style={styles.webCareFilterRow}>
                <WebCareCategoryChip
                  label="Todos"
                  iconName="apps-outline"
                  selected={activeCategoryId === 'all'}
                  onPress={() => onCategoryPress('all')}
                />
                {categories.slice(0, 4).map((category) => (
                  <WebCareCategoryChip
                    key={category.id}
                    label={category.label}
                    iconName={category.iconName}
                    selected={activeCategoryId === category.id}
                    onPress={() => onCategoryPress(category.id)}
                  />
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={onOnline}
                  style={({ pressed }) => [styles.webCareFilterButton, pressed && styles.pressed]}>
                  <Ionicons name="videocam-outline" size={16} color={CARE_COLORS.primary} />
                  <Text style={styles.webCareFilterText}>Online</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onInPerson}
                  style={({ pressed }) => [styles.webCareFilterButton, pressed && styles.pressed]}>
                  <Ionicons name="location-outline" size={16} color={CARE_COLORS.primary} />
                  <Text style={styles.webCareFilterText}>Presencial</Text>
                </Pressable>
              </View>

              {catalogError ? (
                <EmptyState icon="cloud-offline-outline" title="Catálogo indisponível" text={catalogError} />
              ) : discoverySpaces.length > 0 ? (
                <View style={styles.webCareProfessionalGrid}>
                  {discoverySpaces.map((space) => (
                    <WebProfessionalMiniCard
                      key={space.id}
                      favorite={favoriteSpaceIds.includes(space.id)}
                      minPrice={space.minPrice ?? getMinPrice(getServicesForSpace(space.id))}
                      space={space}
                      onFavoritePress={() => onFavoritePress(space.id)}
                      onPress={() => onOpenSpace(space.id)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="search-outline"
                  title="Nenhum profissional encontrado"
                  text="Ajuste os filtros ou tente buscar por outro bairro ou especialidade."
                />
              )}
            </View>
          </View>

          <View style={styles.webCareSupportColumn}>
            <View style={styles.webCareSideCard}>
              <View style={styles.webCareCardHeader}>
                <View style={styles.webCareCardTitleRow}>
                  <Text style={styles.webCareCardTitle}>Tarefas abertas</Text>
                  <View style={styles.webCareCountBadge}>
                    <Text style={styles.webCareCountText}>2</Text>
                  </View>
                </View>
                <Pressable accessibilityRole="button" onPress={onCare}>
                  <Text style={styles.webCareSmallLink}>Ver todas</Text>
                </Pressable>
              </View>
              <View style={styles.webCareTaskList}>
                <WebCareTask title="Prática: Diário de pensamentos" text="5 min diários até 25/06" />
                <WebCareTask title="Exercício: Respiração 4-7-8" text="3x por semana" />
              </View>
            </View>

            <View style={styles.webCareSideCard}>
              <View style={styles.webCareCardHeader}>
                <View>
                  <Text style={styles.webCareCardTitle}>Check-in emocional</Text>
                  <Text style={styles.webCareCardText}>Como você está se sentindo hoje?</Text>
                </View>
                <Ionicons name="trending-up-outline" size={18} color={CARE_COLORS.sage} />
              </View>
              <View style={styles.webCareMoodRow}>
                <WebMoodOption label="1" mood="Muito mal" icon="sad-outline" tone="bad" />
                <WebMoodOption label="2" mood="Mal" icon="sad-outline" tone="alert" />
                <WebMoodOption label="3" mood="Neutro" icon="remove-circle-outline" tone="neutral" />
                <WebMoodOption label="4" mood="Bem" icon="happy-outline" tone="good" />
                <WebMoodOption label="5" mood="Muito bem" icon="happy" selected tone="great" />
              </View>
              <View style={styles.webCarePositiveNote}>
                <Ionicons name="heart-outline" size={15} color={CARE_COLORS.sage} />
                <View style={styles.webCarePositiveCopy}>
                  <Text style={styles.webCarePositiveTitle}>Muito bem! Que bom te ver assim hoje.</Text>
                  <Text style={styles.webCarePositiveText}>Manter o acompanhamento ajuda no seu progresso.</Text>
                </View>
              </View>
            </View>

            <View style={styles.webCareSideCard}>
              <View style={styles.webCareCardHeader}>
                <Text style={styles.webCareCardTitle}>Avisos</Text>
                <Pressable accessibilityRole="button" onPress={onNotices}>
                  <Text style={styles.webCareSmallLink}>Ver todos</Text>
                </Pressable>
              </View>
              <View style={styles.webCareNoticeList}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onAppointments}
                  style={({ pressed }) => [styles.webCareNoticeRow, pressed && styles.pressed]}>
                  <View style={[styles.webCareNoticeIcon, styles.webCareNoticeIconCoral]}>
                    <Ionicons name="calendar-outline" size={16} color={CARE_COLORS.coral} />
                  </View>
                  <View style={styles.webCareNoticeCopy}>
                    <Text style={styles.webCareNoticeTitle}>Reagendei sua consulta?</Text>
                    <Text style={styles.webCareNoticeText}>Você tem horários disponíveis esta semana.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={CARE_COLORS.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onNotices}
                  style={({ pressed }) => [styles.webCareNoticeRow, pressed && styles.pressed]}>
                  <View style={styles.webCareNoticeIcon}>
                    <Ionicons name="chatbox-outline" size={16} color={CARE_COLORS.primary} />
                  </View>
                  <View style={styles.webCareNoticeCopy}>
                    <Text style={styles.webCareNoticeTitle}>Nova mensagem da sua psicóloga</Text>
                    <Text style={styles.webCareNoticeText}>Recebida hoje, 09:31</Text>
                  </View>
                  <View style={styles.webCareUnreadDot} />
                  <Ionicons name="chevron-forward" size={18} color={CARE_COLORS.muted} />
                </Pressable>
              </View>
            </View>

            {userName ? (
              <LocationBanner
                status={locationStatus}
                locatingSpaces={false}
                message={locationMessage}
                variant="web"
                onRetry={onRequestLocation}
              />
            ) : (
              <WebGuestCallout
                title="Reserve com uma conta"
                text="Entre para confirmar horários, pagamentos e reagendamentos."
                onLogin={onLogin}
                onRegister={onRegister}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function WebCareNavItem({
  icon,
  label,
  badge,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.webCareNavItem,
        selected && styles.webCareNavItemSelected,
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={18} color={selected ? CARE_COLORS.primary : CARE_COLORS.muted} />
      <Text numberOfLines={1} style={[styles.webCareNavLabel, selected && styles.webCareNavLabelSelected]}>
        {label}
      </Text>
      {badge && (
        <View style={styles.webCareNavBadge}>
          <Text style={styles.webCareNavBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function WebModeToggle({
  icon,
  label,
  selected,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
}) {
  return (
    <View style={[styles.webCareModeItem, selected && styles.webCareModeItemSelected]}>
      <Ionicons name={icon} size={16} color={selected ? CARE_COLORS.primary : CARE_COLORS.muted} />
      <Text style={[styles.webCareModeText, selected && styles.webCareModeTextSelected]}>{label}</Text>
    </View>
  );
}

function WebCareCategoryChip({
  label,
  iconName,
  selected,
  onPress,
}: {
  label: string;
  iconName: string;
  selected: boolean;
  onPress: () => void;
}) {
  const isIonicon = iconName.endsWith('-outline');
  const iconColor = selected ? CARE_COLORS.surface : CARE_COLORS.primary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.webCareCategoryChip,
        selected && styles.webCareCategoryChipSelected,
        pressed && styles.pressed,
      ]}>
      {isIonicon ? (
        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={17} color={iconColor} />
      ) : (
        <MaterialCommunityIcons
          name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
          size={18}
          color={iconColor}
        />
      )}
      <Text style={[styles.webCareCategoryText, selected && styles.webCareCategoryTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function WebStatusPill({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.webCareStatusPill}>
      <Ionicons name={icon} size={17} color={CARE_COLORS.primary} />
      <Text style={styles.webCareStatusValue}>{value}</Text>
      <Text style={styles.webCareStatusLabel}>{label}</Text>
    </View>
  );
}

function WebActionButton({
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
      style={({ pressed }) => [styles.webCareActionButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={CARE_COLORS.primary} />
      <Text style={styles.webCareActionButtonText}>{label}</Text>
    </Pressable>
  );
}

function WebChecklistRow({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.webCareChecklistRow}>
      <View style={styles.webCareChecklistIcon}>
        <Ionicons name={icon} size={18} color={CARE_COLORS.primary} />
      </View>
      <View style={styles.webCareChecklistCopy}>
        <Text style={styles.webCareChecklistTitle}>{title}</Text>
        <Text style={styles.webCareChecklistText}>{text}</Text>
      </View>
      <View style={styles.webCareCheckbox} />
    </View>
  );
}

function WebMoodOption({
  icon,
  label,
  mood,
  selected,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  mood: string;
  selected?: boolean;
  tone: 'bad' | 'alert' | 'neutral' | 'good' | 'great';
}) {
  const color =
    tone === 'bad'
      ? CARE_COLORS.coral
      : tone === 'alert'
      ? '#E56F2E'
      : tone === 'neutral'
      ? CARE_COLORS.amber
      : tone === 'good'
      ? CARE_COLORS.sage
      : '#0A7E68';

  return (
    <View style={styles.webCareMoodItem}>
      <View style={[styles.webCareMoodFace, selected && styles.webCareMoodFaceSelected, { borderColor: color }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.webCareMoodNumber}>{label}</Text>
      <Text numberOfLines={1} style={[styles.webCareMoodLabel, selected && styles.webCareMoodLabelSelected]}>
        {mood}
      </Text>
    </View>
  );
}

function WebCareTask({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.webCareTaskRow}>
      <View style={styles.webCareTaskCheck} />
      <View style={styles.webCareTaskCopy}>
        <Text style={styles.webCareTaskTitle}>{title}</Text>
        <Text style={styles.webCareTaskText}>{text}</Text>
      </View>
      <View style={styles.webCarePendingPill}>
        <Text style={styles.webCarePendingText}>Pendente</Text>
      </View>
    </View>
  );
}

function WebJourneyStep({
  icon,
  title,
  text,
  date,
  tone = 'idle',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  date: string;
  tone?: 'done' | 'active' | 'primary' | 'idle';
}) {
  const isPrimary = tone === 'primary';
  const isMutedMilestone = tone === 'done' || tone === 'active';

  return (
    <View style={styles.webCareJourneyStep}>
      <View
        style={[
          styles.webCareJourneyIcon,
          isMutedMilestone && styles.webCareJourneyIconMuted,
          isPrimary && styles.webCareJourneyIconPrimary,
        ]}>
        <Ionicons name={icon} size={17} color={isPrimary ? CARE_COLORS.surface : CARE_COLORS.muted} />
      </View>
      <Text style={styles.webCareJourneyTitle}>{title}</Text>
      <Text style={styles.webCareJourneyText}>{text}</Text>
      {date.length > 0 && <Text style={styles.webCareJourneyDate}>{date}</Text>}
    </View>
  );
}

function WebProfessionalMiniCard({
  favorite,
  minPrice,
  space,
  onFavoritePress,
  onPress,
}: {
  favorite: boolean;
  minPrice: number;
  space: Space;
  onFavoritePress: () => void;
  onPress: () => void;
}) {
  return (
    <View style={styles.webCareProfessionalCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.webCareProfessionalMain, pressed && styles.pressed]}>
        <View style={styles.webCareProfessionalAvatar}>
          <Text style={styles.webCareProfessionalInitials}>{getInitials(space.name)}</Text>
        </View>
        <View style={styles.webCareProfessionalCopy}>
          <Text numberOfLines={1} style={styles.webCareProfessionalName}>
            {space.name}
          </Text>
          <Text numberOfLines={1} style={styles.webCareProfessionalMeta}>
            {space.neighborhood}, {space.city}
          </Text>
          <View style={styles.webCareProfessionalFooter}>
            <View style={styles.webCareTinyRow}>
              <Ionicons name="star" size={15} color={UI.star} />
              <Text style={styles.webCareProfessionalRating}>{formatRating(space.rating)}</Text>
            </View>
            <Text style={styles.webCareProfessionalPrice}>desde {formatCurrency(minPrice)}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        onPress={onFavoritePress}
        hitSlop={10}
        style={({ pressed }) => [styles.webCareMiniFavorite, pressed && styles.pressed]}>
        <Ionicons name={favorite ? 'bookmark' : 'bookmark-outline'} size={20} color={CARE_COLORS.primary} />
      </Pressable>
    </View>
  );
}

function WebGuestCallout({
  title,
  text,
  onLogin,
  onRegister,
}: {
  title: string;
  text: string;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <View style={styles.webGuestCallout}>
      <View style={styles.webGuestHeader}>
        <View style={styles.webGuestIcon}>
          <Ionicons name="person-circle-outline" size={26} color={UI.primary} />
        </View>
        <View style={styles.webGuestCopy}>
          <Text style={styles.webGuestTitle}>{title}</Text>
          <Text style={styles.webGuestText}>{text}</Text>
        </View>
      </View>
      <View style={styles.webGuestActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onLogin}
          style={({ pressed }) => [styles.webGuestPrimaryButton, pressed && styles.pressed]}>
          <Text style={styles.webGuestPrimaryText}>Entrar</Text>
          <Ionicons name="log-in-outline" size={18} color={UI.surface} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onRegister}
          style={({ pressed }) => [styles.webGuestSecondaryButton, pressed && styles.pressed]}>
          <Text style={styles.webGuestSecondaryText}>Criar conta</Text>
          <Ionicons name="person-add-outline" size={18} color={UI.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function NoticeCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  tone: 'info' | 'success' | 'rose';
}) {
  const color = tone === 'success' ? UI.success : tone === 'rose' ? UI.rose : UI.primary;
  const backgroundColor = tone === 'success' ? '#E9F8EF' : tone === 'rose' ? UI.roseSoft : UI.primarySoft;

  return (
    <View style={styles.noticeCard}>
      <View style={[styles.noticeIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeText}>{text}</Text>
      </View>
    </View>
  );
}

function CustomerAppointmentCard({
  appointment,
  variant = 'mobile',
  onPress,
}: {
  appointment: Appointment;
  variant?: 'mobile' | 'web';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.appointmentCard,
        variant === 'web' && styles.webAppointmentCard,
        pressed && styles.pressed,
      ]}>
      <Ionicons name="calendar-outline" size={23} color={UI.primary} />
      <View style={styles.appointmentCopy}>
        <Text style={styles.appointmentTitle}>Pedido {appointment.code}</Text>
        <Text style={styles.appointmentText}>
          {appointment.startDateTime.slice(0, 10)} • {appointment.startDateTime.slice(11, 16)} • {formatCurrency(appointment.total)}
        </Text>
        <Text style={styles.appointmentStatus}>{statusLabel(appointment.status)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={UI.textMuted} />
    </Pressable>
  );
}

function LocationBanner({
  status,
  locatingSpaces,
  message,
  variant = 'mobile',
  onRetry,
}: {
  status: LocationStatus;
  locatingSpaces: boolean;
  message: string | null;
  variant?: 'mobile' | 'web';
  onRetry: () => void;
}) {
  if (status === 'granted' && !locatingSpaces) {
    return null;
  }

  const title =
    status === 'idle'
      ? 'Ordenar por proximidade'
      : status === 'requesting'
      ? 'Buscando sua localização'
      : status === 'granted'
        ? 'Calculando consultórios próximos'
        : 'Localização desativada';
  const text =
    message ??
    (status === 'idle'
      ? 'Use sua localização apenas se quiser ver os consultórios mais próximos primeiro.'
      : status === 'granted'
      ? 'Ordenando os consultórios disponíveis pela distância estimada.'
      : 'Mostrando os consultórios publicados enquanto a localização não está disponível.');
  const icon: keyof typeof Ionicons.glyphMap =
    status === 'requesting' || status === 'granted'
      ? 'navigate-outline'
      : 'location-outline';
  const actionLabel = status === 'idle' ? 'Ordenar' : 'Ativar';

  return (
    <View style={[styles.locationBanner, variant === 'web' && styles.webLocationBanner]}>
      <View style={styles.locationIcon}>
        <Ionicons name={icon} size={21} color={UI.primary} />
      </View>
      <View style={styles.locationCopy}>
        <Text style={styles.locationTitle}>{title}</Text>
        <Text style={styles.locationText}>{text}</Text>
      </View>
      {status !== 'requesting' && status !== 'granted' && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.locationRetry, pressed && styles.pressed]}>
          <Text style={styles.locationRetryText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function GuestPromptCard({
  title,
  text,
  onLogin,
  onRegister,
}: {
  title: string;
  text: string;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <View style={styles.guestCard}>
      <View style={styles.guestIcon}>
        <Ionicons name="person-circle-outline" size={28} color={UI.primary} />
      </View>
      <View style={styles.guestCopy}>
        <Text style={styles.guestTitle}>{title}</Text>
        <Text style={styles.guestText}>{text}</Text>
      </View>
      <View style={styles.guestActions}>
        <PrimaryButton label="Entrar" icon="log-in-outline" onPress={onLogin} />
        <PrimaryButton
          label="Criar conta"
          icon="person-add-outline"
          variant="secondary"
          onPress={onRegister}
        />
      </View>
    </View>
  );
}

function ProfessionalProfileCard({
  active,
  onActivate,
  onWork,
  onCreateSpace,
}: {
  active: boolean;
  onActivate: () => void;
  onWork: () => void;
  onCreateSpace: () => void;
}) {
  return (
    <View style={[styles.professionalCard, active && styles.professionalCardActive]}>
      <View style={styles.professionalHeader}>
        <View style={[styles.professionalIcon, active && styles.professionalIconActive]}>
          <Ionicons
            name={active ? 'briefcase' : 'briefcase-outline'}
            size={24}
            color={active ? UI.surface : UI.primary}
          />
        </View>
        <View style={styles.professionalCopy}>
          <Text style={[styles.professionalTitle, active && styles.professionalTitleActive]}>
            {active ? 'Perfil de atendimento ativo' : 'Perfil de atendimento'}
          </Text>
          <Text style={styles.professionalText}>
            {active
              ? 'Perfil ativo para trabalhar em consultórios vinculados ao seu e-mail ou criar seu próprio consultório.'
              : 'Ative para acessar uma agenda de atendimento quando um consultório vincular seu e-mail.'}
          </Text>
        </View>
      </View>

      {active && (
        <View style={styles.professionalStatus}>
          <Ionicons name="checkmark-circle" size={18} color={UI.success} />
          <Text style={styles.professionalStatusText}>Modo de atendimento habilitado nesta conta</Text>
        </View>
      )}

      {active ? (
        <View style={styles.professionalActions}>
          <PrimaryButton label="Entrar em consultório para trabalhar" icon="calendar-outline" onPress={onWork} />
          <PrimaryButton label="Criar um consultório" icon="add-circle-outline" variant="secondary" onPress={onCreateSpace} />
        </View>
      ) : (
        <PrimaryButton label="Ativar perfil de atendimento" icon="briefcase-outline" onPress={onActivate} />
      )}
    </View>
  );
}

function ProfileLink({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.profileLink, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={UI.primary} />
      <View style={styles.profileCopy}>
        <Text style={styles.profileLinkLabel}>{label}</Text>
        {value && <Text style={styles.profileLinkValue}>{value}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={UI.textMuted} />
    </Pressable>
  );
}

function statusLabel(status: Appointment['status']) {
  const labels: Record<Appointment['status'], string> = {
    pending_payment: 'Pendente',
    pending_confirmation: 'Aguardando',
    confirmed: 'Confirmado',
    expired: 'Expirado',
    cancelled: 'Cancelado',
    completed: 'Concluído',
    no_show: 'Falta',
    rejected: 'Recusado',
  };

  return labels[status];
}

function BottomNavigation({
  activeTab,
  onCarePress,
  onTabPress,
  variant = 'mobile',
}: {
  activeTab: BottomTab;
  onCarePress?: () => void;
  onTabPress: (tab: BottomTab) => void;
  variant?: 'mobile' | 'web';
}) {
  const isWebVariant = variant === 'web';
  const tabs: { id: BottomTab | 'care'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Início', icon: 'home-outline' },
    { id: 'appointments', label: 'Agenda', icon: 'calendar-outline' },
    { id: 'care', label: 'Cuidado', icon: 'leaf-outline' },
    { id: 'notices', label: 'Mensagens', icon: 'chatbubble-outline' },
    { id: 'profile', label: 'Perfil', icon: 'person-outline' },
  ];

  return (
    <View style={[styles.bottomNav, isWebVariant && styles.webNav]}>
      {tabs.map((tab) => {
        const selected = tab.id !== 'care' && activeTab === tab.id;
        const color = selected ? CARE_COLORS.primary : CARE_COLORS.muted;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            onPress={() => {
              if (tab.id === 'care') {
                onCarePress?.();
                return;
              }

              onTabPress(tab.id);
            }}
            style={({ pressed }) => [
              styles.bottomItem,
              isWebVariant && styles.webNavItem,
              selected && styles.bottomItemSelected,
              isWebVariant && selected && styles.webNavItemSelected,
              pressed && styles.pressed,
            ]}>
            <Ionicons name={selected ? selectedIcon(tab.icon) : tab.icon} size={23} color={color} />
            <Text style={[styles.bottomLabel, selected && styles.bottomLabelSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabEmptyState({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return <EmptyState icon={icon} title={title} text={text} />;
}

function getMinPrice(services: { price: number }[]) {
  const prices = services.map((service) => service.price);

  return prices.length ? Math.min(...prices) : 0;
}

function selectedIcon(icon: keyof typeof Ionicons.glyphMap) {
  return icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
}

function sortSpacesByDistance(spaces: Space[]) {
  return [...spaces].sort((first, second) => {
    const firstDistance = first.distanceKm;
    const secondDistance = second.distanceKm;

    if (firstDistance !== undefined && secondDistance !== undefined) {
      return firstDistance - secondDistance;
    }

    if (firstDistance !== undefined) {
      return -1;
    }

    if (secondDistance !== undefined) {
      return 1;
    }

    return first.name.localeCompare(second.name);
  });
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.max(100, Math.round(distanceKm * 1000))} m`;
  }

  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
}

function formatCareDateTime(dateTime: string) {
  const time = dateTime.slice(11, 16);
  const today = new Date();
  const appointmentDate = new Date(dateTime);
  const isToday =
    appointmentDate.getFullYear() === today.getFullYear() &&
    appointmentDate.getMonth() === today.getMonth() &&
    appointmentDate.getDate() === today.getDate();

  if (Number.isNaN(appointmentDate.getTime())) {
    return time ? `Hoje, ${time}` : 'Hoje, 15:00';
  }

  if (isToday) {
    return `Hoje, ${time}`;
  }

  return `${String(appointmentDate.getDate()).padStart(2, '0')}/${String(appointmentDate.getMonth() + 1).padStart(2, '0')}, ${time}`;
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'PA';
}

const styles = StyleSheet.create({
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  greetingCopy: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    color: UI.text,
    fontSize: 25,
    fontWeight: '900',
  },
  subtitle: {
    color: UI.textMuted,
    fontSize: 15,
    lineHeight: 20,
  },
  notificationButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  mobileCareHome: {
    gap: 16,
  },
  mobileCareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingTop: 4,
  },
  mobileCareHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  mobileCareTitle: {
    color: CARE_COLORS.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  mobileCareSubtitle: {
    color: CARE_COLORS.muted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  mobileCareHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileCareCircleButton: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
    boxShadow: '0 8px 18px rgba(15, 35, 64, 0.07)',
  },
  mobileCareSmallDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: CARE_COLORS.coral,
  },
  mobileModeSwitch: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  mobileModeItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  mobileModeItemSelected: {
    backgroundColor: CARE_COLORS.primary,
    boxShadow: '0 10px 18px rgba(6, 74, 138, 0.20)',
  },
  mobileModeText: {
    color: CARE_COLORS.muted,
    fontSize: 14,
    fontWeight: '900',
  },
  mobileModeTextSelected: {
    color: CARE_COLORS.surface,
  },
  mobileSessionCard: {
    gap: 16,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 74, 138, 0.18)',
    backgroundColor: CARE_COLORS.surface,
    boxShadow: '0 12px 28px rgba(15, 35, 64, 0.07)',
  },
  mobileSessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  mobileEyebrow: {
    color: CARE_COLORS.primary,
    fontSize: 12,
    letterSpacing: 0.8,
    fontWeight: '900',
  },
  mobileSessionTime: {
    color: CARE_COLORS.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  mobileConfirmedPill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: CARE_COLORS.sageSoft,
  },
  mobileConfirmedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CARE_COLORS.sage,
  },
  mobileConfirmedText: {
    color: CARE_COLORS.sage,
    fontSize: 12,
    fontWeight: '900',
  },
  mobileTherapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  mobileSessionIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  mobileTherapistCopy: {
    flex: 1,
    gap: 5,
  },
  mobileTherapistName: {
    color: CARE_COLORS.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  mobileTinyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mobileTherapistMeta: {
    color: CARE_COLORS.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  mobileSessionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mobilePrimaryAction: {
    flexGrow: 1,
    minWidth: 210,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: CARE_COLORS.primary,
    boxShadow: '0 14px 26px rgba(6, 74, 138, 0.20)',
  },
  mobilePrimaryActionText: {
    color: CARE_COLORS.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  mobileSecondaryAction: {
    flex: 1,
    minWidth: 120,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  mobileSecondaryActionText: {
    color: CARE_COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  mobileCareCard: {
    gap: 14,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
    boxShadow: '0 10px 24px rgba(15, 35, 64, 0.055)',
  },
  mobileCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileCardIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  mobileCardIconSage: {
    backgroundColor: CARE_COLORS.sageSoft,
  },
  mobileCardIconAmber: {
    backgroundColor: CARE_COLORS.amberSoft,
  },
  mobileCardTitle: {
    flexShrink: 1,
    color: CARE_COLORS.ink,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
  },
  mobileCompactCardTitle: {
    fontSize: 18,
    lineHeight: 23,
  },
  mobileCardTitleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  mobileCardSubtitle: {
    color: CARE_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  mobilePrepList: {
    gap: 2,
  },
  mobilePrepRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  mobilePrepCheck: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  mobilePrepCheckSelected: {
    borderColor: CARE_COLORS.sage,
    backgroundColor: CARE_COLORS.sage,
  },
  mobilePrepText: {
    flex: 1,
    minWidth: 0,
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  mobileCareTwoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  mobileHalfCard: {
    flex: 1,
    minWidth: 0,
  },
  mobileCompactText: {
    color: CARE_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  mobileMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  mobileMoodDot: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  mobileMoodDotSelected: {
    transform: [{ scale: 1.06 }],
  },
  mobileCheckinButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(43, 154, 114, 0.72)',
  },
  mobileCheckinButtonText: {
    color: CARE_COLORS.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  mobileTaskSummaryRow: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileTaskMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mobileTaskSummaryLabel: {
    flex: 1,
    minWidth: 0,
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  mobileTaskCount: {
    minWidth: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  mobileTaskCountText: {
    fontSize: 14,
    fontWeight: '900',
  },
  mobileTaskLink: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: CARE_COLORS.border,
    paddingTop: 10,
  },
  mobileTaskLinkText: {
    color: CARE_COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  mobileProgressPercent: {
    color: CARE_COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  mobileProgressTrack: {
    height: 9,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E6E8EC',
  },
  mobileProgressFill: {
    width: '62%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: CARE_COLORS.primary,
  },
  mobileJourneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileJourneyNode: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  mobileJourneyIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#ECEEF1',
  },
  mobileJourneyIconActive: {
    backgroundColor: CARE_COLORS.primary,
  },
  mobileJourneyIconCurrent: {
    borderWidth: 3,
    borderColor: CARE_COLORS.primary,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  mobileJourneyTitle: {
    color: CARE_COLORS.ink,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  mobileJourneyText: {
    color: CARE_COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  mobileJourneyTextActive: {
    color: CARE_COLORS.primary,
  },
  mobileDiscoveryList: {
    gap: 12,
    paddingRight: 8,
  },
  mobileProfessionalCard: {
    width: 150,
    minHeight: 156,
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  mobileProfessionalMain: {
    flex: 1,
    gap: 8,
    padding: 12,
  },
  mobileProfessionalAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  mobileProfessionalInitials: {
    color: CARE_COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  mobileProfessionalName: {
    color: CARE_COLORS.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  mobileProfessionalLocation: {
    color: CARE_COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  mobileProfessionalFooter: {
    gap: 5,
  },
  mobileProfessionalRating: {
    color: CARE_COLORS.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  mobileProfessionalPrice: {
    color: CARE_COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  mobileFavoriteMini: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  webCareShell: {
    minHeight: 860,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: '#FBFAF7',
    boxShadow: '0 10px 32px rgba(15, 35, 64, 0.05)',
    fontFamily: CARE_FONT,
  },
  webCareSidebar: {
    width: 184,
    gap: 18,
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderRightWidth: 1,
    borderRightColor: CARE_COLORS.border,
    backgroundColor: '#F7F8FA',
  },
  webCareBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 8,
  },
  webCareLogoMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareLogoGlyph: {
    color: CARE_COLORS.primary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
  },
  webCareBrandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  webCareBrandName: {
    color: CARE_COLORS.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  webCareBrandSub: {
    color: CARE_COLORS.muted,
    fontSize: 11,
    letterSpacing: 0.66,
    fontWeight: '600',
  },
  webCareNav: {
    gap: 5,
  },
  webCareNavItem: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    backgroundColor: 'transparent',
  },
  webCareNavItemSelected: {
    borderLeftColor: CARE_COLORS.primary,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareNavLabel: {
    flex: 1,
    minWidth: 0,
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  webCareNavLabelSelected: {
    color: CARE_COLORS.primary,
    fontWeight: '600',
  },
  webCareNavBadge: {
    minWidth: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: CARE_COLORS.coral,
  },
  webCareNavBadgeText: {
    color: CARE_COLORS.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  webCareSidebarFoot: {
    marginTop: 'auto',
    gap: 7,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  webCareSecureIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareSecureTitle: {
    color: CARE_COLORS.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  webCareSecureText: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
  },
  webCareSecureLink: {
    color: CARE_COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  webCareMain: {
    flex: 1,
    minWidth: 0,
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  webCareTopBar: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  webCareCommand: {
    flex: 1,
    minWidth: 280,
    maxWidth: 420,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareCommandInput: {
    flex: 1,
    minWidth: 0,
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontFamily: CARE_FONT,
    fontWeight: '400',
  },
  webCareShortcut: {
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: '#FCFDFD',
  },
  webCareShortcutText: {
    color: CARE_COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  webCareModeSwitch: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareModeItem: {
    minWidth: 82,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  webCareModeItemSelected: {
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareModeText: {
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  webCareModeTextSelected: {
    color: CARE_COLORS.primary,
    fontWeight: '600',
  },
  webCareTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webCareIconButton: {
    position: 'relative',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareNotificationDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: CARE_COLORS.coral,
  },
  webCareNotificationText: {
    color: CARE_COLORS.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  webCareProfileButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 6,
  },
  webCareAvatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#7BA2D7',
  },
  webCareAvatarText: {
    color: CARE_COLORS.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  webCareProfileName: {
    maxWidth: 120,
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  webCareHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  webCareTitle: {
    color: CARE_COLORS.ink,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '600',
  },
  webCareSubtitle: {
    color: CARE_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  webCareHeaderMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  webCareStatusPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 0,
  },
  webCareStatusValue: {
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  webCareStatusLabel: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  webCareBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
  },
  webCarePrimaryColumn: {
    flex: 1,
    minWidth: 620,
    gap: 14,
  },
  webCareSupportColumn: {
    width: 306,
    minWidth: 292,
    gap: 12,
  },
  webCareSessionCard: {
    minHeight: 252,
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
    boxShadow: '0 6px 18px rgba(15, 35, 64, 0.035)',
  },
  webCareSessionLeft: {
    flex: 1,
    minWidth: 240,
    gap: 12,
    justifyContent: 'center',
  },
  webCareSessionRight: {
    flex: 1,
    minWidth: 260,
    gap: 8,
    justifyContent: 'center',
  },
  webCareSessionDivider: {
    width: 1,
    backgroundColor: CARE_COLORS.border,
  },
  webCareEyebrow: {
    color: CARE_COLORS.primary,
    fontSize: 11,
    letterSpacing: 0.66,
    fontWeight: '600',
  },
  webCareSessionTime: {
    color: CARE_COLORS.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },
  webCareTherapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webCareTherapistAvatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareTherapistInitials: {
    color: CARE_COLORS.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  webCareTherapistCopy: {
    flex: 1,
    gap: 3,
  },
  webCareTherapistName: {
    color: CARE_COLORS.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  webCareTinyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  webCareTherapistMeta: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  webCarePrimaryButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 6,
    backgroundColor: CARE_COLORS.primary,
    boxShadow: '0 8px 18px rgba(6, 74, 138, 0.18)',
  },
  webCarePrimaryButtonText: {
    color: CARE_COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  webCareSessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  webCareActionButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 74, 138, 0.18)',
    backgroundColor: CARE_COLORS.surface,
  },
  webCareActionButtonText: {
    color: CARE_COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  webCareCardTitle: {
    color: CARE_COLORS.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  webCareCardText: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
  },
  webCareChecklist: {
    borderTopWidth: 1,
    borderTopColor: CARE_COLORS.border,
  },
  webCareChecklistRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: CARE_COLORS.border,
  },
  webCareChecklistIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareChecklistCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  webCareChecklistTitle: {
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  webCareChecklistText: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  webCareCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.3,
    borderColor: CARE_COLORS.muted,
  },
  webCareInlineLink: {
    alignSelf: 'flex-end',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  webCareInlineLinkText: {
    color: CARE_COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  webCareTimelineCard: {
    gap: 14,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  webCareCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webCareTextButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webCareTextButtonText: {
    color: CARE_COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  webCareTimeline: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  webCareTimelineRail: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 17,
    height: 1,
    backgroundColor: CARE_COLORS.border,
  },
  webCareJourneyStep: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  webCareJourneyIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#EDF0F3',
  },
  webCareJourneyIconMuted: {
    backgroundColor: '#EEF2F5',
  },
  webCareJourneyIconPrimary: {
    backgroundColor: CARE_COLORS.primary,
  },
  webCareJourneyTitle: {
    color: CARE_COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  webCareJourneyText: {
    color: CARE_COLORS.muted,
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  webCareJourneyDate: {
    color: CARE_COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  webCareDiscoveryCard: {
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: '#FCFCFB',
  },
  webCareResultCount: {
    color: CARE_COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  webCareFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  webCareCategoryChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareCategoryChipSelected: {
    borderColor: CARE_COLORS.primary,
    backgroundColor: CARE_COLORS.primary,
  },
  webCareCategoryText: {
    color: CARE_COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  webCareCategoryTextSelected: {
    color: CARE_COLORS.surface,
    fontWeight: '600',
  },
  webCareFilterButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareFilterText: {
    color: CARE_COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  webCareProfessionalGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  webCareProfessionalCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareProfessionalMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webCareProfessionalAvatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareProfessionalInitials: {
    color: CARE_COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  webCareProfessionalCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  webCareProfessionalName: {
    color: CARE_COLORS.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  webCareProfessionalMeta: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  webCareProfessionalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  webCareProfessionalRating: {
    color: CARE_COLORS.ink,
    fontSize: 12,
    fontWeight: '500',
  },
  webCareProfessionalPrice: {
    color: CARE_COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  webCareMiniFavorite: {
    alignSelf: 'flex-end',
    padding: 2,
  },
  webCareSideCard: {
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareMoodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 4,
  },
  webCareMoodItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 5,
  },
  webCareMoodFace: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1.3,
    backgroundColor: CARE_COLORS.surface,
  },
  webCareMoodFaceSelected: {
    backgroundColor: CARE_COLORS.sageSoft,
  },
  webCareMoodNumber: {
    color: CARE_COLORS.ink,
    fontSize: 12,
    fontWeight: '500',
  },
  webCareMoodLabel: {
    maxWidth: '100%',
    color: CARE_COLORS.muted,
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
  },
  webCareMoodLabelSelected: {
    color: CARE_COLORS.ink,
    fontWeight: '600',
  },
  webCarePositiveNote: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: CARE_COLORS.sage,
    backgroundColor: CARE_COLORS.sageSoft,
  },
  webCarePositiveCopy: {
    flex: 1,
    gap: 3,
  },
  webCarePositiveTitle: {
    color: CARE_COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  webCarePositiveText: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  webCareCountBadge: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: CARE_COLORS.amberSoft,
  },
  webCareCountText: {
    color: CARE_COLORS.amber,
    fontSize: 12,
    fontWeight: '600',
  },
  webCareSmallLink: {
    color: CARE_COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  webCareTaskList: {
    borderTopWidth: 1,
    borderTopColor: CARE_COLORS.border,
  },
  webCareTaskRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: CARE_COLORS.border,
  },
  webCareTaskCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.3,
    borderColor: CARE_COLORS.amber,
  },
  webCareTaskCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  webCareTaskTitle: {
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  webCareTaskText: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  webCarePendingPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: CARE_COLORS.amberSoft,
  },
  webCarePendingText: {
    color: CARE_COLORS.amber,
    fontSize: 11,
    fontWeight: '500',
  },
  webCareNoticeList: {
    borderTopWidth: 1,
    borderTopColor: CARE_COLORS.border,
  },
  webCareNoticeRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: CARE_COLORS.border,
  },
  webCareNoticeIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webCareNoticeIconCoral: {
    backgroundColor: CARE_COLORS.coralSoft,
  },
  webCareNoticeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  webCareNoticeTitle: {
    color: CARE_COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  webCareNoticeText: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  webCareUnreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: CARE_COLORS.coral,
  },
  webTopBar: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 22,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: '0 12px 30px rgba(23, 33, 29, 0.06)',
  },
  webBrand: {
    width: 260,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webBrandMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: UI.primarySoft,
  },
  webBrandGlyph: {
    color: UI.primaryDark,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  webBrandName: {
    flex: 1,
    color: UI.text,
    fontSize: 19,
    fontWeight: '900',
  },
  webTopNav: {
    flex: 1,
    minWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  webTopNavItem: {
    minHeight: 46,
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  webTopNavItemSelected: {
    borderColor: 'rgba(31, 138, 112, 0.15)',
    backgroundColor: UI.primarySoft,
  },
  webTopNavLabel: {
    color: UI.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  webTopNavLabelSelected: {
    color: UI.primary,
  },
  webAccountButton: {
    width: 220,
    minHeight: 44,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.primary,
    backgroundColor: UI.surface,
  },
  webAccountText: {
    minWidth: 0,
    color: UI.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  homeTabContent: {
    gap: 16,
  },
  webHomeGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  homeLeadColumn: {
    gap: 10,
  },
  webHomeLeadColumn: {
    flex: 0.95,
    minWidth: 320,
    maxWidth: 430,
    gap: 16,
  },
  homeResultsColumn: {
    gap: 16,
  },
  webHomeResultsColumn: {
    flex: 1.55,
    minWidth: 0,
  },
  webHomeDashboard: {
    gap: 20,
  },
  webHeroBand: {
    minHeight: 260,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 28,
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(31, 138, 112, 0.14)',
    backgroundColor: '#FBFEFC',
    boxShadow: '0 16px 42px rgba(23, 33, 29, 0.07)',
  },
  webHeroInfo: {
    flex: 0.9,
    minWidth: 390,
    gap: 16,
  },
  webBadge: {
    alignSelf: 'flex-start',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: UI.primarySoft,
  },
  webBadgeText: {
    color: UI.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  webHeroTitle: {
    maxWidth: 640,
    color: UI.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  webHeroText: {
    maxWidth: 600,
    color: UI.textMuted,
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '700',
  },
  webHeroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  webHeroMetric: {
    minWidth: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webHeroMetricCopy: {
    gap: 2,
  },
  webHeroMetricValue: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '900',
  },
  webHeroMetricLabel: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  webHeroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  webPrimaryAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: UI.primary,
  },
  webPrimaryActionText: {
    color: UI.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  webSecondaryAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  webSecondaryActionText: {
    color: UI.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  webHeroSearch: {
    flex: 1.15,
    minWidth: 520,
    gap: 16,
  },
  webWorkspace: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 22,
  },
  webDirectoryPanel: {
    flex: 1,
    minWidth: 690,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: '0 14px 34px rgba(23, 33, 29, 0.06)',
  },
  webSideRail: {
    width: 420,
    minWidth: 320,
    gap: 16,
  },
  webRailPanel: {
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: '0 12px 30px rgba(23, 33, 29, 0.05)',
  },
  webPanelHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  webPanelTitle: {
    flex: 1,
    color: UI.text,
    fontSize: 18,
    fontWeight: '900',
  },
  webPanelMeta: {
    color: UI.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  webRailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webRailIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: UI.primarySoft,
  },
  webRailTitle: {
    flex: 1,
    color: UI.text,
    fontSize: 17,
    fontWeight: '900',
  },
  webDirectoryTable: {
    position: 'relative',
  },
  webDirectoryHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    backgroundColor: '#FCFDFC',
  },
  webDirectoryHeading: {
    width: 142,
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  webDirectoryHeadingMain: {
    flex: 1,
    minWidth: 300,
  },
  webDirectoryHeadingAction: {
    width: 164,
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroCard: {
    gap: 16,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(31, 138, 112, 0.14)',
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroBrandMark: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: UI.primarySoft,
  },
  heroBrandText: {
    color: UI.primaryDark,
    fontSize: 30,
    fontWeight: '900',
  },
  heroBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: UI.primarySoft,
  },
  heroBadgeText: {
    color: UI.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  heroCopy: {
    gap: 8,
  },
  heroTitle: {
    color: UI.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
  },
  heroText: {
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
  },
  heroStat: {
    flex: 1,
    minWidth: 0,
    gap: 5,
    padding: 11,
    borderRadius: 16,
    backgroundColor: UI.surfaceMuted,
  },
  heroStatValue: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroAction: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: UI.primarySoft,
  },
  heroActionText: {
    minWidth: 0,
    color: UI.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  careModeGrid: {
    gap: 10,
  },
  webCareModeGrid: {
    gap: 8,
  },
  careModeCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  webCareModeCard: {
    minHeight: 58,
    padding: 10,
    borderRadius: 14,
    borderWidth: 0,
    boxShadow: 'none',
  },
  careModeIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  webCareModeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  careModeCopy: {
    flex: 1,
    gap: 4,
  },
  careModeTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  careModeText: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  noticeCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  noticeIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  noticeText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  locationBanner: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  webLocationBanner: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    boxShadow: '0 12px 30px rgba(23, 33, 29, 0.05)',
  },
  locationIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: UI.primarySoft,
  },
  locationCopy: {
    flex: 1,
    gap: 3,
  },
  locationTitle: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  locationText: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  locationRetry: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: UI.primarySoft,
  },
  locationRetryText: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  searchControls: {
    gap: 12,
  },
  webSearchControls: {
    gap: 18,
  },
  searchBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  webSearchBar: {
    minHeight: 68,
    paddingHorizontal: 20,
    borderRadius: 18,
    boxShadow: '0 16px 38px rgba(23, 33, 29, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
  },
  webSearchInput: {
    fontSize: 16,
  },
  categoryList: {
    gap: 8,
    paddingVertical: 2,
  },
  webCategoryList: {
    gap: 10,
  },
  categoryChip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
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
  spaceList: {
    gap: 11,
  },
  spaceCard: {
    minHeight: 118,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  spacePressable: {
    flexDirection: 'row',
    minHeight: 118,
  },
  spaceImage: {
    width: 122,
    minHeight: 118,
    backgroundColor: UI.primarySoft,
  },
  spaceImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 7,
    paddingLeft: 13,
    paddingRight: 45,
    paddingVertical: 12,
  },
  spaceName: {
    color: UI.text,
    fontSize: 17,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    flex: 1,
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  priceText: {
    color: UI.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  webSpaceRow: {
    minHeight: 122,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    backgroundColor: UI.surface,
  },
  webSpaceMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 122,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  webSpaceImage: {
    width: 148,
    height: 86,
    minHeight: 86,
    borderRadius: 10,
    overflow: 'hidden',
  },
  webSpaceIdentity: {
    flex: 1,
    minWidth: 210,
    gap: 10,
  },
  webSpaceName: {
    color: UI.text,
    fontSize: 17,
    fontWeight: '900',
  },
  webLocationPill: {
    alignSelf: 'flex-start',
    minHeight: 28,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: UI.primarySoft,
  },
  webLocationPillText: {
    color: UI.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  webSpaceCell: {
    width: 142,
    gap: 5,
  },
  webRatingText: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  webMutedCellText: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  webPriceText: {
    color: UI.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  webFavoriteButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  webProfileButton: {
    minWidth: 104,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.primary,
    backgroundColor: UI.surface,
  },
  webProfileButtonText: {
    color: UI.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  webMoreButton: {
    alignSelf: 'center',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  webMoreButtonText: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  webTrustStrip: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    backgroundColor: '#FCFDFC',
  },
  webTrustItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webTrustIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: UI.primarySoft,
  },
  webTrustCopy: {
    flex: 1,
    gap: 3,
  },
  webTrustTitle: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '900',
  },
  webTrustText: {
    color: UI.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  webGuestCallout: {
    gap: 16,
  },
  webGuestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  webGuestIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: UI.primarySoft,
  },
  webGuestCopy: {
    flex: 1,
    gap: 5,
  },
  webGuestTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  webGuestText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  webGuestActions: {
    gap: 9,
  },
  webGuestPrimaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: UI.primary,
  },
  webGuestPrimaryText: {
    color: UI.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  webGuestSecondaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  webGuestSecondaryText: {
    color: UI.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  appointmentCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  webAppointmentCard: {
    minHeight: 96,
    borderRadius: 14,
    boxShadow: 'none',
  },
  appointmentList: {
    gap: 10,
  },
  guestCard: {
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  guestIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: UI.primarySoft,
  },
  guestCopy: {
    gap: 5,
  },
  guestTitle: {
    color: UI.text,
    fontSize: 17,
    fontWeight: '900',
  },
  guestText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  guestActions: {
    gap: 9,
  },
  appointmentCopy: {
    flex: 1,
    gap: 4,
  },
  appointmentTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },
  appointmentText: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  appointmentStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    color: UI.primary,
    backgroundColor: UI.primarySoft,
    fontSize: 11,
    fontWeight: '900',
  },
  profileCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  profileIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: UI.primarySoft,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
  },
  profileEmail: {
    color: UI.textMuted,
    fontSize: 13,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 10,
  },
  profileStat: {
    flex: 1,
    gap: 5,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  statLabel: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  statValue: {
    color: UI.text,
    fontSize: 17,
    fontWeight: '900',
  },
  professionalCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  professionalCardActive: {
    borderColor: 'rgba(22, 163, 74, 0.22)',
    backgroundColor: '#F7FEFA',
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  professionalIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: UI.primarySoft,
  },
  professionalIconActive: {
    backgroundColor: UI.success,
  },
  professionalCopy: {
    flex: 1,
    gap: 4,
  },
  professionalTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  professionalTitleActive: {
    color: UI.success,
  },
  professionalText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  professionalStatus: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: '#ECFDF3',
  },
  professionalStatusText: {
    flex: 1,
    color: UI.success,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  professionalActions: {
    gap: 9,
  },
  profileLinks: {
    gap: 10,
  },
  profileLink: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  profileLinkLabel: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '800',
  },
  profileLinkValue: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomNav: {
    minHeight: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  webNav: {
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    gap: 8,
    padding: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: '0 14px 34px rgba(23, 33, 29, 0.08)',
  },
  bottomItem: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
  },
  webNavItem: {
    flex: 0,
    minWidth: 126,
    minHeight: 46,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  bottomItemSelected: {
    backgroundColor: CARE_COLORS.primarySoft,
  },
  webNavItemSelected: {
    backgroundColor: UI.primarySoft,
  },
  bottomLabel: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  bottomLabelSelected: {
    color: CARE_COLORS.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
