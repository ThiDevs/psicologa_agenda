import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  HeaderBar,
  IconButton,
  InfoStrip,
  MetricPill,
  PrimaryButton,
  ScreenScaffold,
  SectionTitle,
  UI,
} from '@/components/app-ui';
import { useBooking } from '@/contexts/BookingContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import { getApiErrorMessage, getPublishedSpaceDetails } from '@/services/api-client';
import { formatCurrency, formatDuration, formatRating } from '@/utils/format';

type DetailsTab = 'about' | 'photos' | 'services' | 'professionals' | 'reviews';

export default function SpaceDetailsScreen() {
  const router = useRouter();
  const { state, selectSpace, clearServices } = useBooking();
  const {
    publishedSpaces,
    favoriteSpaceIds,
    toggleFavorite,
    getSpace,
    getServicesForSpace,
    getProfessionalsForSpace,
    syncPublicSpaceDetailsFromApi,
  } = useOwnerConfig();
  const fallbackSpace = publishedSpaces[0] ?? null;
  const space = getSpace(state.selectedSpaceId) ?? fallbackSpace;
  const [tab, setTab] = useState<DetailsTab>('services');
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const services = getServicesForSpace(space?.id ?? null);
  const professionals = getProfessionalsForSpace(space?.id ?? null);
  const showDetailsError = detailsError && services.length === 0 && professionals.length === 0;
  const minPrice = services.length ? Math.min(...services.map((service) => service.price)) : 0;
  const galleryPhotos = useMemo(
    () =>
      [...(space?.photos ?? [])]
        .filter((photo) => photo.active)
        .sort((first, second) => first.sortOrder - second.sortOrder),
    [space?.photos],
  );
  const totalServicesDuration = useMemo(
    () => services.reduce((total, service) => total + service.durationMinutes, 0),
    [services],
  );

  useEffect(() => {
    let mounted = true;

    async function loadDetails() {
      if (!space?.id) {
        return;
      }

      try {
        const details = await getPublishedSpaceDetails(space.id);

        if (mounted) {
          syncPublicSpaceDetailsFromApi(details);
          setDetailsError(null);
        }
      } catch (error) {
        if (mounted) {
          setDetailsError(getApiErrorMessage(error));
        }
      }
    }

    loadDetails();

    return () => {
      mounted = false;
    };
  }, [space?.id, syncPublicSpaceDetailsFromApi]);

  if (!space) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Consultório" onBack={() => router.replace('/')} />
        <InfoStrip
          icon="alert-circle-outline"
          title="Nenhum consultório disponível"
          text="Complete a configuração de um consultório da psicóloga para publicar horários."
          tone="warning"
        />
      </ScreenScaffold>
    );
  }

  const isFavorite = favoriteSpaceIds.includes(space.id);

  function handleSchedulePress() {
    selectSpace(space.id);
    clearServices();
    router.push('/service-selection');
  }

  return (
    <ScreenScaffold
      bottomOffset={112}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton label="Contato" icon="chatbubble-outline" variant="secondary" onPress={() => undefined} />
          <View style={styles.footerPrimary}>
            <PrimaryButton label="Agendar agora" icon="calendar-outline" onPress={handleSchedulePress} />
          </View>
        </View>
      }>
      <View style={styles.cover}>
        {space.imageUrl ? (
          <Image source={{ uri: space.imageUrl }} style={styles.coverImage} contentFit="cover" transition={180} />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Ionicons name="storefront-outline" size={52} color={UI.primary} />
          </View>
        )}
        <View style={styles.coverOverlay} />
        <View style={styles.coverActions}>
          <IconButton icon="chevron-back" label="Voltar" onPress={() => router.back()} />
          <View style={styles.coverRight}>
            <IconButton icon="share-outline" label="Compartilhar" />
            <IconButton
              icon={isFavorite ? 'heart' : 'heart-outline'}
              label="Favoritar"
              selected={isFavorite}
              onPress={() => toggleFavorite(space.id)}
            />
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.spaceName}>
            {space.name}
          </Text>
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>Publicado</Text>
          </View>
        </View>
        <Text style={styles.description}>{space.description}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={18} color={UI.star} />
          <Text style={styles.ratingText}>
            {formatRating(space.rating)} <Text style={styles.ratingMuted}>({space.reviewsCount} avaliações)</Text>
          </Text>
        </View>
        <View style={styles.metricsRow}>
          <MetricPill icon="location-outline" label="Endereço" value={`${space.neighborhood}, ${space.city}`} />
          <MetricPill icon="wallet-outline" label="A partir de" value={formatCurrency(minPrice)} />
        </View>
      </View>

      {showDetailsError && (
        <InfoStrip icon="cloud-offline-outline" title="Detalhes indisponíveis" text={detailsError} tone="warning" />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {[
          { id: 'about', label: 'Sobre' },
          { id: 'photos', label: 'Fotos' },
          { id: 'services', label: 'Consultas' },
          { id: 'professionals', label: 'Psicólogas' },
          { id: 'reviews', label: 'Avaliações' },
        ].map((item) => {
          const selected = tab === item.id;

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setTab(item.id as DetailsTab)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'about' && (
        <>
          <SectionTitle title="Como funciona" />
          <InfoStrip
            icon="information-circle-outline"
            title="Agenda configurada"
            text={`${services.length} consultas ativas, ${professionals.length} psicólogas e ${formatDuration(totalServicesDuration)} em consultas disponíveis.`}
          />
          <View style={styles.detailCard}>
            <DetailRow icon="location-outline" label="Endereço" value={`${space.address}, ${space.neighborhood}`} />
            <DetailRow icon="call-outline" label="Telefone" value={space.phone} />
            <DetailRow icon="logo-whatsapp" label="WhatsApp" value={space.whatsapp} />
          </View>
        </>
      )}

      {tab === 'photos' && (
        <>
          <SectionTitle title="Galeria pública" actionLabel={`${galleryPhotos.length} fotos`} />
          {galleryPhotos.length ? (
            <View style={styles.galleryGrid}>
              {galleryPhotos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[styles.galleryTile, index === 0 && styles.galleryTileLarge]}>
                  <Image source={{ uri: photo.url }} style={styles.galleryImage} contentFit="cover" />
                  {photo.caption && (
                    <View style={styles.galleryCaption}>
                      <Text numberOfLines={1} style={styles.galleryCaptionText}>{photo.caption}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <InfoStrip
              icon="image-outline"
              title="Sem fotos ainda"
              text="Este consultório ainda não adicionou imagens à galeria pública."
            />
          )}
        </>
      )}

      {tab === 'services' && (
        <>
          <SectionTitle title="Consultas disponíveis" actionLabel={`${services.length} ativas`} />
          <View style={styles.list}>
            {services.map((service) => (
              <Pressable
                key={service.id}
                accessibilityRole="button"
                onPress={() => {
                  selectSpace(space.id);
                  router.push('/service-selection');
                }}
                style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={service.iconName as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={UI.primary}
                  />
                </View>
                <View style={styles.serviceCopy}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text numberOfLines={1} style={styles.serviceDescription}>{service.description}</Text>
                  <Text style={styles.serviceMeta}>{formatDuration(service.durationMinutes)}</Text>
                </View>
                <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {tab === 'professionals' && (
        <>
          <SectionTitle title="Psicólogas" actionLabel={`${professionals.length} ativas`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.professionalRow}>
            {professionals.map((professional) => (
              <View key={professional.id} style={styles.professionalCard}>
                {professional.photoUrl ? (
                  <Image source={{ uri: professional.photoUrl }} style={styles.professionalPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.professionalPhoto, styles.professionalPhotoPlaceholder]}>
                    <Ionicons name="person-outline" size={26} color={UI.primary} />
                  </View>
                )}
                <Text numberOfLines={1} style={styles.professionalName}>{professional.name}</Text>
                <Text numberOfLines={2} style={styles.professionalSpecialty}>{professional.specialty}</Text>
                <Text style={styles.professionalRating}>★ {formatRating(professional.rating)}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {tab === 'reviews' && (
        <InfoStrip
          icon="star-outline"
          title="Avaliações"
          text={`${space.reviewsCount} avaliações registradas. Clientes podem avaliar depois que o atendimento é concluído.`}
        />
      )}
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
      <Ionicons name={icon} size={19} color={UI.primary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 210,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: UI.primarySoft,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.14)',
  },
  coverActions: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverRight: {
    flexDirection: 'row',
    gap: 9,
  },
  infoCard: {
    gap: 10,
    padding: 15,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spaceName: {
    flex: 1,
    color: UI.text,
    fontSize: 23,
    fontWeight: '900',
  },
  openBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  openBadgeText: {
    color: UI.success,
    fontSize: 12,
    fontWeight: '900',
  },
  description: {
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  ratingMuted: {
    color: UI.textMuted,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  tabs: {
    gap: 8,
  },
  tab: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: UI.surface,
  },
  tabSelected: {
    backgroundColor: UI.primary,
  },
  tabText: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  tabTextSelected: {
    color: UI.surface,
  },
  list: {
    gap: 10,
  },
  serviceCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  iconCircle: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: UI.primarySoft,
  },
  serviceCopy: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  serviceDescription: {
    color: UI.textMuted,
    fontSize: 13,
  },
  serviceMeta: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  servicePrice: {
    color: UI.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryTile: {
    width: '48.5%',
    height: 132,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: UI.primarySoft,
    ...cardShadow,
  },
  galleryTileLarge: {
    width: '100%',
    height: 220,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryCaption: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.70)',
  },
  galleryCaptionText: {
    color: UI.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  professionalRow: {
    gap: 10,
    paddingBottom: 4,
  },
  professionalCard: {
    width: 122,
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  professionalPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI.primarySoft,
  },
  professionalPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalName: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  professionalSpecialty: {
    minHeight: 34,
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  professionalRating: {
    color: UI.primary,
    fontSize: 13,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
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
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerPrimary: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
