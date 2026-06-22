import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
      footer={isWeb ? undefined : <BottomNavigation activeTab={activeTab} onTabPress={setActiveTab} />}>
      {isWeb ? (
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
      ) : (
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
            onAppointments={() => setActiveTab('appointments')}
            onCategoryPress={setActiveCategoryId}
            onFavoritePress={toggleFavorite}
            onInPerson={() => setQuery('presencial')}
            onLogin={() => router.push('/login')}
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
          <View style={styles.homeTabContent}>
            <View style={styles.homeLeadColumn}>
              <CustomerHeroCard
                userName={user?.name}
                resultsCount={filteredSpaces.length}
                upcomingCount={upcomingAppointments.length}
                onAppointments={() => setActiveTab('appointments')}
                onProfile={() => setActiveTab('profile')}
              />

              <CareModeGrid
                onOnline={() => setQuery('online')}
                onInPerson={() => setQuery('presencial')}
              />

              <LocationBanner
                status={locationStatus}
                locatingSpaces={false}
                message={locationMessage}
                onRetry={requestLocation}
              />
            </View>

            <View style={styles.homeResultsColumn}>
              <SearchCatalogControls
                activeCategoryId={activeCategoryId}
                categories={categories}
                query={query}
                onCategoryPress={setActiveCategoryId}
                onQueryChange={setQuery}
              />

              <SectionTitle title={spacesTitle} actionLabel={`${filteredSpaces.length} resultados`} />
              {catalogError && (
                <EmptyState
                  icon="cloud-offline-outline"
                  title="Catálogo indisponível"
                  text={catalogError}
                />
              )}
              {filteredSpaces.length > 0 ? (
                <View style={styles.spaceList}>
                  {filteredSpaces.map((space) => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      minPrice={space.minPrice ?? getMinPrice(getServicesForSpace(space.id))}
                      distanceKm={space.distanceKm}
                      favorite={favoriteSpaceIds.includes(space.id)}
                      onFavoritePress={() => toggleFavorite(space.id)}
                      onPress={() => openSpace(space.id)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="search-outline"
                  title="Nenhum consultório encontrado"
                  text="Ajuste a busca ou escolha outra categoria para continuar."
                />
              )}

              {user ? (
                <>
                  <SectionTitle title="Próximos agendamentos" />
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((appointment) => (
                      <CustomerAppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onPress={() => router.push({ pathname: '/appointment-details', params: { appointmentId: appointment.id } })}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon="calendar-outline"
                      title="Sem agendamentos ainda"
                      text="Escolha um consultório publicado para reservar seu próximo horário."
                      action={<PrimaryButton label="Ver consultórios" variant="ghost" onPress={() => setActiveTab('home')} />}
                    />
                  )}
                </>
              ) : (
                <GuestPromptCard
                  title="Reserve com uma conta"
                  text="Você pode explorar os consultórios agora. Para confirmar um horário, entre ou crie uma conta de cliente."
                  onLogin={() => router.push('/login')}
                  onRegister={() => router.push('/customer-register')}
                />
              )}
            </View>
          </View>
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

function SearchCatalogControls({
  activeCategoryId,
  categories,
  query,
  variant = 'mobile',
  onCategoryPress,
  onQueryChange,
}: {
  activeCategoryId: string;
  categories: HomeCategory[];
  query: string;
  variant?: 'mobile' | 'web';
  onCategoryPress: (categoryId: string) => void;
  onQueryChange: (value: string) => void;
}) {
  const isWebVariant = variant === 'web';

  return (
    <View style={[styles.searchControls, isWebVariant && styles.webSearchControls]}>
      <View style={[styles.searchBar, isWebVariant && styles.webSearchBar]}>
        <Ionicons name="search-outline" size={isWebVariant ? 26 : 23} color={UI.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar psicóloga, bairro ou consulta"
          placeholderTextColor={UI.textMuted}
          style={[styles.searchInput, isWebVariant && styles.webSearchInput]}
        />
        {query.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => onQueryChange('')} hitSlop={10}>
            <Ionicons name="close-circle" size={21} color={UI.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryList, isWebVariant && styles.webCategoryList]}>
        <CategoryChip
          label="Todos"
          iconName="apps-outline"
          selected={activeCategoryId === 'all'}
          onPress={() => onCategoryPress('all')}
        />
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.label}
            iconName={category.iconName}
            selected={activeCategoryId === category.id}
            onPress={() => onCategoryPress(category.id)}
          />
        ))}
      </ScrollView>
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
  onAppointments,
  onCategoryPress,
  onFavoritePress,
  onInPerson,
  onLogin,
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
  onAppointments: () => void;
  onCategoryPress: (categoryId: string) => void;
  onFavoritePress: (spaceId: string) => void;
  onInPerson: () => void;
  onLogin: () => void;
  onOnline: () => void;
  onOpenSpace: (spaceId: string) => void;
  onProfile: () => void;
  onQueryChange: (value: string) => void;
  onRegister: () => void;
  onRequestLocation: () => void;
  onViewAppointment: (appointmentId: string) => void;
}) {
  const firstName = userName?.split(' ')[0];

  return (
    <View style={styles.webHomeDashboard}>
      <View style={styles.webHeroBand}>
        <View style={styles.webHeroInfo}>
          <View style={styles.webBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color={UI.primaryDark} />
            <Text style={styles.webBadgeText}>Cuidado verificado</Text>
          </View>
          <Text style={styles.webHeroTitle}>
            {firstName ? `${firstName}, encontre o cuidado certo para hoje` : 'Encontre o cuidado certo para hoje'}
          </Text>
          <Text style={styles.webHeroText}>
            Psicólogas verificadas, atendimento online ou presencial e uma agenda que se adapta à sua rotina.
          </Text>

          <View style={styles.webHeroMetrics}>
            <WebHeroMetric icon="business-outline" value={String(filteredSpaces.length)} label="consultórios" />
            <WebHeroMetric icon="calendar-clear-outline" value={String(upcomingAppointments.length)} label="próximos" />
            <WebHeroMetric icon="heart-outline" value={String(favoriteSpaceIds.length)} label="favoritos" />
          </View>

          <View style={styles.webHeroActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onAppointments}
              style={({ pressed }) => [styles.webPrimaryAction, pressed && styles.pressed]}>
              <Text style={styles.webPrimaryActionText}>Ver agenda</Text>
              <Ionicons name="calendar-outline" size={18} color={UI.surface} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onProfile}
              style={({ pressed }) => [styles.webSecondaryAction, pressed && styles.pressed]}>
              <Text style={styles.webSecondaryActionText}>Perfil e preferências</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.webHeroSearch}>
          <SearchCatalogControls
            activeCategoryId={activeCategoryId}
            categories={categories}
            query={query}
            variant="web"
            onCategoryPress={onCategoryPress}
            onQueryChange={onQueryChange}
          />
        </View>
      </View>

      <View style={styles.webWorkspace}>
        <View style={styles.webDirectoryPanel}>
          <View style={styles.webPanelHeader}>
            <Text style={styles.webPanelTitle}>{spacesTitle}</Text>
            <Text style={styles.webPanelMeta}>{filteredSpaces.length} resultados</Text>
          </View>

          {catalogError && (
            <EmptyState
              icon="cloud-offline-outline"
              title="Catálogo indisponível"
              text={catalogError}
            />
          )}

          {filteredSpaces.length > 0 ? (
            <View style={styles.webDirectoryTable}>
              <View style={styles.webDirectoryHeader}>
                <Text style={[styles.webDirectoryHeading, styles.webDirectoryHeadingMain]}>Consultório</Text>
                <Text style={styles.webDirectoryHeading}>Avaliação</Text>
                <Text style={styles.webDirectoryHeading}>Preço inicial</Text>
                <Text style={styles.webDirectoryHeadingAction}>Ação</Text>
              </View>
              {filteredSpaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  layout="web"
                  space={space}
                  minPrice={space.minPrice ?? getMinPrice(getServicesForSpace(space.id))}
                  distanceKm={space.distanceKm}
                  favorite={favoriteSpaceIds.includes(space.id)}
                  onFavoritePress={() => onFavoritePress(space.id)}
                  onPress={() => onOpenSpace(space.id)}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => onCategoryPress('all')}
                style={({ pressed }) => [styles.webMoreButton, pressed && styles.pressed]}>
                <Text style={styles.webMoreButtonText}>Ver mais consultórios</Text>
                <Ionicons name="chevron-down-outline" size={17} color={UI.primary} />
              </Pressable>
            </View>
          ) : (
            <EmptyState
              icon="search-outline"
              title="Nenhum consultório encontrado"
              text="Ajuste a busca ou escolha outra categoria para continuar."
            />
          )}

          <View style={styles.webTrustStrip}>
            <WebTrustItem
              icon="shield-checkmark-outline"
              title="Informações seguras"
              text="Seus dados são usados apenas para melhorar sua experiência."
            />
            <WebTrustItem
              icon="people-outline"
              title="Psicólogas verificadas"
              text="Perfis passam por um processo de validação."
            />
            <WebTrustItem
              icon="lock-closed-outline"
              title="Privacidade primeiro"
              text="Você decide o que compartilhar em cada atendimento."
            />
          </View>
        </View>

        <View style={styles.webSideRail}>
          <View style={styles.webRailPanel}>
            <View style={styles.webRailHeader}>
              <View style={styles.webRailIcon}>
                <Ionicons name="calendar-outline" size={20} color={UI.primary} />
              </View>
              <Text style={styles.webRailTitle}>Próximos agendamentos</Text>
            </View>
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <CustomerAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  variant="web"
                  onPress={() => onViewAppointment(appointment.id)}
                />
              ))
            ) : userName ? (
              <EmptyState
                icon="calendar-outline"
                title="Sem agendamentos ainda"
                text="Escolha um consultório publicado para reservar seu próximo horário."
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

          <View style={styles.webRailPanel}>
            <Text style={styles.webRailTitle}>Atendimentos e modalidades</Text>
            <CareModeGrid variant="web" onOnline={onOnline} onInPerson={onInPerson} />
          </View>

          <LocationBanner
            status={locationStatus}
            locatingSpaces={false}
            message={locationMessage}
            variant="web"
            onRetry={onRequestLocation}
          />
        </View>
      </View>
    </View>
  );
}

function WebHeroMetric({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.webHeroMetric}>
      <Ionicons name={icon} size={26} color={UI.primary} />
      <View style={styles.webHeroMetricCopy}>
        <Text style={styles.webHeroMetricValue}>{value}</Text>
        <Text style={styles.webHeroMetricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function WebTrustItem({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.webTrustItem}>
      <View style={styles.webTrustIcon}>
        <Ionicons name={icon} size={22} color={UI.primary} />
      </View>
      <View style={styles.webTrustCopy}>
        <Text style={styles.webTrustTitle}>{title}</Text>
        <Text style={styles.webTrustText}>{text}</Text>
      </View>
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

function CustomerHeroCard({
  userName,
  resultsCount,
  upcomingCount,
  onAppointments,
  onProfile,
}: {
  userName?: string;
  resultsCount: number;
  upcomingCount: number;
  onAppointments: () => void;
  onProfile: () => void;
}) {
  const firstName = userName?.split(' ')[0];

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <View style={styles.heroBrandMark}>
          <Text style={styles.heroBrandText}>Ψ</Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={UI.primaryDark} />
          <Text style={styles.heroBadgeText}>Cuidado verificado</Text>
        </View>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>
          {firstName ? `${firstName}, como você quer se cuidar hoje?` : 'Como você quer se cuidar hoje?'}
        </Text>
        <Text style={styles.heroText}>
          Encontre psicólogas, escolha o formato da consulta e acompanhe sua agenda sem perder o contexto.
        </Text>
      </View>

      <View style={styles.heroStats}>
        <HeroStat icon="business-outline" value={String(resultsCount)} label="consultórios" />
        <HeroStat icon="calendar-clear-outline" value={String(upcomingCount)} label="próximos" />
      </View>

      <View style={styles.heroActions}>
        <HeroAction icon="calendar-outline" label="Agenda" onPress={onAppointments} />
        <HeroAction icon="person-outline" label="Perfil" onPress={onProfile} />
      </View>
    </View>
  );
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.heroStat}>
      <Ionicons name={icon} size={17} color={UI.primary} />
      <Text numberOfLines={1} style={styles.heroStatValue}>
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.heroStatLabel}>
        {label}
      </Text>
    </View>
  );
}

function HeroAction({
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
      style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={UI.primaryDark} />
      <Text numberOfLines={1} style={styles.heroActionText}>
        {label}
      </Text>
    </Pressable>
  );
}

function CareModeGrid({
  onOnline,
  onInPerson,
  variant = 'mobile',
}: {
  onOnline: () => void;
  onInPerson: () => void;
  variant?: 'mobile' | 'web';
}) {
  return (
    <View style={[styles.careModeGrid, variant === 'web' && styles.webCareModeGrid]}>
      <CareModeCard
        icon="videocam-outline"
        title="Terapia online"
        text="Atendimento por vídeo onde você estiver"
        accent="lavender"
        variant={variant}
        onPress={onOnline}
      />
      <CareModeCard
        icon="location-outline"
        title="Presencial"
        text="Consultórios acolhedores perto de você"
        accent="teal"
        variant={variant}
        onPress={onInPerson}
      />
    </View>
  );
}

function CareModeCard({
  icon,
  title,
  text,
  accent,
  variant = 'mobile',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  accent: 'teal' | 'lavender';
  variant?: 'mobile' | 'web';
  onPress: () => void;
}) {
  const color = accent === 'lavender' ? UI.lavender : UI.primary;
  const backgroundColor = accent === 'lavender' ? UI.lavenderSoft : UI.primarySoft;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.careModeCard,
        variant === 'web' && styles.webCareModeCard,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.careModeIcon, variant === 'web' && styles.webCareModeIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={variant === 'web' ? 21 : 24} color={color} />
      </View>
      <View style={styles.careModeCopy}>
        <Text style={styles.careModeTitle}>{title}</Text>
        <Text style={styles.careModeText}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={UI.textMuted} />
    </Pressable>
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

function CategoryChip({
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

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        selected && styles.categoryChipSelected,
        pressed && styles.pressed,
      ]}>
      {isIonicon ? (
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={21}
          color={selected ? UI.surface : UI.primary}
        />
      ) : (
        <MaterialCommunityIcons
          name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
          size={23}
          color={selected ? UI.surface : UI.primary}
        />
      )}
      <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SpaceCard({
  layout = 'mobile',
  space,
  minPrice,
  distanceKm,
  favorite,
  onFavoritePress,
  onPress,
}: {
  layout?: 'mobile' | 'web';
  space: Space;
  minPrice: number;
  distanceKm?: number;
  favorite: boolean;
  onFavoritePress: () => void;
  onPress: () => void;
}) {
  const locationText =
    distanceKm === undefined
      ? `${space.neighborhood}, ${space.city}`
      : `${formatDistance(distanceKm)} de você`;

  if (layout === 'web') {
    return (
      <View style={styles.webSpaceRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.webSpaceMain, pressed && styles.pressed]}>
          {space.imageUrl ? (
            <Image
              source={{ uri: space.imageUrl }}
              style={[styles.spaceImage, styles.webSpaceImage]}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View style={[styles.spaceImage, styles.spaceImagePlaceholder, styles.webSpaceImage]}>
              <Ionicons name="storefront-outline" size={34} color={UI.primary} />
            </View>
          )}
          <View style={styles.webSpaceIdentity}>
            <Text numberOfLines={1} style={styles.webSpaceName}>
              {space.name}
            </Text>
            <View style={styles.webLocationPill}>
              <Ionicons
                name={distanceKm === undefined ? 'location-outline' : 'navigate-outline'}
                size={15}
                color={UI.primary}
              />
              <Text numberOfLines={1} style={styles.webLocationPillText}>
                {locationText}
              </Text>
            </View>
          </View>
          <View style={styles.webSpaceCell}>
            <View style={styles.row}>
              <Ionicons name="star" size={18} color={UI.star} />
              <Text style={styles.webRatingText}>{formatRating(space.rating)}</Text>
            </View>
            <Text style={styles.webMutedCellText}>({space.reviewsCount} avaliações)</Text>
          </View>
          <View style={styles.webSpaceCell}>
            <Text style={styles.webMutedCellText}>A partir de</Text>
            <Text style={styles.webPriceText}>{formatCurrency(minPrice)}</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onPress={onFavoritePress}
          hitSlop={10}
          style={({ pressed }) => [styles.webFavoriteButton, pressed && styles.pressed]}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={UI.primary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.webProfileButton, pressed && styles.pressed]}>
          <Text style={styles.webProfileButtonText}>Ver perfil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.spaceCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.spacePressable, pressed && styles.pressed]}>
        {space.imageUrl ? (
          <Image source={{ uri: space.imageUrl }} style={styles.spaceImage} contentFit="cover" transition={180} />
        ) : (
          <View style={[styles.spaceImage, styles.spaceImagePlaceholder]}>
            <Ionicons name="storefront-outline" size={32} color={UI.primary} />
          </View>
        )}
        <View style={styles.spaceContent}>
          <Text numberOfLines={1} style={styles.spaceName}>
            {space.name}
          </Text>
          <View style={styles.row}>
            <Ionicons name="star" size={17} color={UI.star} />
            <Text style={styles.metaText}>
              {formatRating(space.rating)} ({space.reviewsCount})
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name={distanceKm === undefined ? 'location-outline' : 'navigate-outline'} size={17} color={UI.textMuted} />
            <Text numberOfLines={1} style={styles.metaText}>
              {locationText}
            </Text>
          </View>
          <Text style={styles.priceText}>A partir de {formatCurrency(minPrice)}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        onPress={onFavoritePress}
        hitSlop={10}
        style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}>
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={27} color={UI.primary} />
      </Pressable>
    </View>
  );
}

function BottomNavigation({
  activeTab,
  onTabPress,
  variant = 'mobile',
}: {
  activeTab: BottomTab;
  onTabPress: (tab: BottomTab) => void;
  variant?: 'mobile' | 'web';
}) {
  const isWebVariant = variant === 'web';
  const tabs: { id: BottomTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Início', icon: 'home-outline' },
    { id: 'appointments', label: 'Agenda', icon: 'calendar-outline' },
    { id: 'notices', label: 'Avisos', icon: 'notifications-outline' },
    { id: 'profile', label: 'Perfil', icon: 'person-outline' },
  ];

  return (
    <View style={[styles.bottomNav, isWebVariant && styles.webNav]}>
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            onPress={() => onTabPress(tab.id)}
            style={({ pressed }) => [
              styles.bottomItem,
              isWebVariant && styles.webNavItem,
              selected && styles.bottomItemSelected,
              isWebVariant && selected && styles.webNavItemSelected,
              pressed && styles.pressed,
            ]}>
            <Ionicons name={selected ? selectedIcon(tab.icon) : tab.icon} size={23} color={selected ? UI.primary : UI.textMuted} />
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
    backgroundColor: UI.primarySoft,
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
    color: UI.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
