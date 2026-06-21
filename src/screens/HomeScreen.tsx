import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

type BottomTab = 'home' | 'appointments' | 'favorites' | 'profile';
type Coordinates = { latitude: number; longitude: number };
type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

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
  const favoriteSpaces = sortSpacesByDistance(
    publishedSpaces.filter((space) => favoriteSpaceIds.includes(space.id)),
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
      footer={<BottomNavigation activeTab={activeTab} onTabPress={setActiveTab} />}>
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

      {activeTab === 'home' && (
        <>
          <LocationBanner
            status={locationStatus}
            locatingSpaces={false}
            message={locationMessage}
            onRetry={requestLocation}
          />

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={23} color={UI.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar consultório, bairro ou consulta"
              placeholderTextColor={UI.textMuted}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable accessibilityRole="button" onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={21} color={UI.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
            <CategoryChip
              label="Todos"
              iconName="apps-outline"
              selected={activeCategoryId === 'all'}
              onPress={() => setActiveCategoryId('all')}
            />
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.label}
                iconName={category.iconName}
                selected={activeCategoryId === category.id}
                onPress={() => setActiveCategoryId(category.id)}
              />
            ))}
          </ScrollView>

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
        </>
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

      {activeTab === 'favorites' && (
        <>
          <SectionTitle title="Favoritos" />
          {favoriteSpaces.length > 0 ? (
            <View style={styles.spaceList}>
              {favoriteSpaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  minPrice={space.minPrice ?? getMinPrice(getServicesForSpace(space.id))}
                  distanceKm={space.distanceKm}
                  favorite
                  onFavoritePress={() => toggleFavorite(space.id)}
                  onPress={() => openSpace(space.id)}
                />
              ))}
            </View>
          ) : (
            <TabEmptyState
              icon="heart-outline"
              title="Nenhum favorito"
              text="Toque no coração de um consultório para encontrá-lo rapidamente depois."
            />
          )}
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

function CustomerAppointmentCard({
  appointment,
  onPress,
}: {
  appointment: Appointment;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.appointmentCard, pressed && styles.pressed]}>
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
  onRetry,
}: {
  status: LocationStatus;
  locatingSpaces: boolean;
  message: string | null;
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
    <View style={styles.locationBanner}>
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
  space,
  minPrice,
  distanceKm,
  favorite,
  onFavoritePress,
  onPress,
}: {
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
}: {
  activeTab: BottomTab;
  onTabPress: (tab: BottomTab) => void;
}) {
  const tabs: { id: BottomTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Início', icon: 'home-outline' },
    { id: 'appointments', label: 'Agenda', icon: 'calendar-outline' },
    { id: 'favorites', label: 'Favoritos', icon: 'heart-outline' },
    { id: 'profile', label: 'Perfil', icon: 'person-outline' },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            onPress={() => onTabPress(tab.id)}
            style={({ pressed }) => [styles.bottomItem, pressed && styles.pressed]}>
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
    borderRadius: 23,
    backgroundColor: UI.surface,
    ...cardShadow,
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
  searchBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  searchInput: {
    flex: 1,
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
  },
  categoryList: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 15,
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
    borderRadius: 18,
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
  appointmentCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  appointmentList: {
    gap: 10,
  },
  guestCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
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
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
