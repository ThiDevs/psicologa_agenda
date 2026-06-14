import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  CheckMark,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  ScreenScaffold,
  SectionTitle,
  UI,
} from '@/components/app-ui';
import { useBooking } from '@/contexts/BookingContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import { getApiErrorMessage, getPublishedSpaceDetails } from '@/services/api-client';
import type { Service, Space } from '@/types/domain';
import { formatCurrency, formatDuration, formatRating } from '@/utils/format';

export default function ServiceSelectionScreen() {
  const router = useRouter();
  const { state, toggleService } = useBooking();
  const { publishedSpaces, getSpace, getServicesForSpace, syncPublicSpaceDetailsFromApi } = useOwnerConfig();
  const space = getSpace(state.selectedSpaceId) ?? publishedSpaces[0] ?? null;
  const [loadError, setLoadError] = useState<string | null>(null);
  const services = getServicesForSpace(space?.id ?? null);
  const selectedServices = useMemo(
    () => services.filter((service) => state.selectedServiceIds.includes(service.id)),
    [services, state.selectedServiceIds],
  );
  const totalMinutes = selectedServices.reduce((total, service) => total + service.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0);
  const canContinue = selectedServices.length > 0;

  useEffect(() => {
    let mounted = true;

    async function loadServices() {
      if (!space?.id) {
        return;
      }

      try {
        const details = await getPublishedSpaceDetails(space.id);

        if (mounted) {
          syncPublicSpaceDetailsFromApi(details);
          setLoadError(null);
        }
      } catch (error) {
        if (mounted) {
          setLoadError(getApiErrorMessage(error));
        }
      }
    }

    loadServices();

    return () => {
      mounted = false;
    };
  }, [space?.id, syncPublicSpaceDetailsFromApi]);

  return (
    <ScreenScaffold
      bottomOffset={178}
      footer={
        <SelectionFooter
          count={selectedServices.length}
          totalMinutes={totalMinutes}
          totalPrice={totalPrice}
          canContinue={canContinue}
          onPress={() => router.push('/professional-selection')}
        />
      }>
      <HeaderBar
        title="Selecionar consultas"
        subtitle="Escolha uma ou mais consultas. O tempo e o total atualizam automaticamente."
        onBack={() => router.back()}
      />

      {space && <SpaceMiniCard space={space} />}

      <SectionTitle title="Consultas ativas" actionLabel={`${services.length} disponíveis`} />
      {loadError && <InfoStrip icon="cloud-offline-outline" title="Consultas indisponíveis" text={loadError} tone="warning" />}
      <View style={styles.list}>
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={state.selectedServiceIds.includes(service.id)}
            onPress={() => toggleService(service.id)}
          />
        ))}
      </View>

      <InfoStrip
        icon="people-outline"
        title="Próximo passo"
        text="Na próxima tela aparecem somente psicólogas que atendem todas as consultas escolhidas."
      />
    </ScreenScaffold>
  );
}

function SpaceMiniCard({ space }: { space: Space }) {
  return (
    <View style={styles.spaceCard}>
      {space.imageUrl ? (
        <Image source={{ uri: space.imageUrl }} style={styles.spaceImage} contentFit="cover" />
      ) : (
        <View style={[styles.spaceImage, styles.spaceImagePlaceholder]}>
          <Ionicons name="storefront-outline" size={24} color={UI.primary} />
        </View>
      )}
      <View style={styles.spaceCopy}>
        <Text numberOfLines={1} style={styles.spaceName}>{space.name}</Text>
        <Text numberOfLines={1} style={styles.spaceMeta}>{space.address} • {space.neighborhood}</Text>
        <Text style={styles.spaceRating}>★ {formatRating(space.rating)} ({space.reviewsCount} avaliações)</Text>
      </View>
    </View>
  );
}

function ServiceCard({
  service,
  selected,
  onPress,
}: {
  service: Service;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.serviceCard,
        selected && styles.serviceCardSelected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.serviceIcon}>
        <Ionicons
          name={service.iconName as keyof typeof Ionicons.glyphMap}
          size={24}
          color={UI.primary}
        />
      </View>
      <View style={styles.serviceCopy}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text numberOfLines={1} style={styles.serviceDescription}>{service.description}</Text>
        <View style={styles.serviceMetaRow}>
          <Ionicons name="time-outline" size={16} color={UI.textMuted} />
          <Text style={styles.serviceMeta}>{formatDuration(service.durationMinutes)}</Text>
        </View>
        <Text style={styles.price}>{formatCurrency(service.price)}</Text>
      </View>
      <CheckMark selected={selected} />
    </Pressable>
  );
}

function SelectionFooter({
  count,
  totalMinutes,
  totalPrice,
  canContinue,
  onPress,
}: {
  count: number;
  totalMinutes: number;
  totalPrice: number;
  canContinue: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.footerContent}>
      <View style={styles.footerTop}>
        <View>
          <Text style={styles.footerLabel}>Consultas selecionadas</Text>
          <Text style={styles.footerTitle}>{count}</Text>
        </View>
        <View style={styles.footerTotals}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerPrice}>{formatCurrency(totalPrice)}</Text>
        </View>
      </View>
      <View style={styles.footerRow}>
        <View style={styles.footerMetric}>
          <Text style={styles.footerLabel}>Tempo total</Text>
          <Text style={styles.footerValue}>{formatDuration(totalMinutes)}</Text>
        </View>
        <PrimaryButton label="Continuar" disabled={!canContinue} onPress={onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spaceCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  spaceImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: UI.primarySoft,
  },
  spaceImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceCopy: {
    flex: 1,
    gap: 4,
  },
  spaceName: {
    color: UI.text,
    fontSize: 17,
    fontWeight: '900',
  },
  spaceMeta: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  spaceRating: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '800',
  },
  list: {
    gap: 10,
  },
  serviceCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.surface,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  serviceCardSelected: {
    borderColor: 'rgba(15, 118, 110, 0.38)',
    backgroundColor: '#F8FFFD',
  },
  serviceIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: UI.primarySoft,
  },
  serviceCopy: {
    flex: 1,
    minWidth: 0,
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
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  serviceMeta: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  price: {
    color: UI.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  footerContent: {
    gap: 10,
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerTotals: {
    alignItems: 'flex-end',
  },
  footerLabel: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  footerTitle: {
    color: UI.primary,
    fontSize: 23,
    fontWeight: '900',
  },
  footerPrice: {
    color: UI.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerMetric: {
    flex: 1,
    gap: 3,
  },
  footerValue: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
