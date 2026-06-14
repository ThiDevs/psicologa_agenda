import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  RadioMark,
  ScreenScaffold,
  SectionTitle,
  UI,
} from '@/components/app-ui';
import { useBooking } from '@/contexts/BookingContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import type { Professional, Service } from '@/types/domain';
import { buildDateOptions, formatCurrency, formatDuration, formatRating } from '@/utils/format';

export default function ProfessionalSelectionScreen() {
  const router = useRouter();
  const { state, selectAnyProfessional, selectProfessional } = useBooking();
  const {
    publishedSpaces,
    getSpace,
    getServicesForSpace,
    getCompatibleProfessionals,
    searchAvailability,
  } = useOwnerConfig();
  const space = getSpace(state.selectedSpaceId) ?? publishedSpaces[0] ?? null;
  const services = getServicesForSpace(space?.id ?? null).filter((service) =>
    state.selectedServiceIds.includes(service.id),
  );
  const compatibleProfessionals = getCompatibleProfessionals(space?.id ?? null, state.selectedServiceIds);
  const totalMinutes = services.reduce((total, service) => total + service.durationMinutes, 0);
  const totalPrice = services.reduce((total, service) => total + service.price, 0);
  const canContinue = state.anyProfessional || state.selectedProfessionalId !== null;
  const today = buildDateOptions(1)[0]?.id;
  const anyNextSlot = today
    ? searchAvailability({
        spaceId: space?.id ?? null,
        serviceIds: state.selectedServiceIds,
        professionalId: null,
        anyProfessional: true,
        date: today,
      })[0]
    : null;

  return (
    <ScreenScaffold
      bottomOffset={178}
      footer={
        <ProfessionalFooter
          count={services.length}
          totalMinutes={totalMinutes}
          totalPrice={totalPrice}
          canContinue={canContinue}
          onPress={() => router.push('/calendar-selection')}
        />
      }>
      <HeaderBar
        title="Escolher psicóloga"
        subtitle="A lista já considera todas as consultas selecionadas."
        onBack={() => router.back()}
      />

      <SelectedServicesCard services={services} totalMinutes={totalMinutes} totalPrice={totalPrice} />

      <SectionTitle title="Quem vai atender?" actionLabel={`${compatibleProfessionals.length} compatíveis`} />
      {space?.settings.allowAnyProfessional && (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: state.anyProfessional }}
          onPress={selectAnyProfessional}
          style={({ pressed }) => [
            styles.anyCard,
            state.anyProfessional && styles.cardSelected,
            pressed && styles.pressed,
          ]}>
          <View style={styles.anyIcon}>
            <Ionicons name="people-outline" size={25} color={UI.primary} />
          </View>
          <View style={styles.anyCopy}>
            <Text style={styles.anyTitle}>Qualquer psicóloga disponível</Text>
            <Text style={styles.anyText}>
              O app escolhe o primeiro horário contínuo livre.
              {anyNextSlot ? ` Próximo: ${anyNextSlot.startTime}.` : ''}
            </Text>
          </View>
          <RadioMark selected={state.anyProfessional} />
        </Pressable>
      )}

      <View style={styles.list}>
        {compatibleProfessionals.map((professional) => (
          <ProfessionalCard
            key={professional.id}
            professional={professional}
            services={services}
            selected={state.selectedProfessionalId === professional.id}
            nextSlot={
              today
                ? searchAvailability({
                    spaceId: space?.id ?? null,
                    serviceIds: state.selectedServiceIds,
                    professionalId: professional.id,
                    anyProfessional: false,
                    date: today,
                  })[0]
                : null
            }
            onPress={() => selectProfessional(professional.id)}
          />
        ))}
      </View>

      {compatibleProfessionals.length === 0 && (
        <InfoStrip
          icon="alert-circle-outline"
          title="Sem psicóloga compatível"
          text="Remova uma consulta ou ajuste os vínculos no painel da psicóloga."
          tone="warning"
        />
      )}
    </ScreenScaffold>
  );
}

function SelectedServicesCard({
  services,
  totalMinutes,
  totalPrice,
}: {
  services: Service[];
  totalMinutes: number;
  totalPrice: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Ionicons name="sparkles-outline" size={21} color={UI.primary} />
        <Text style={styles.summaryTitle}>Consultas escolhidas</Text>
      </View>
      <View style={styles.chipRow}>
        {services.map((service) => (
          <View key={service.id} style={styles.serviceChip}>
            <Text style={styles.serviceChipText}>{service.name}</Text>
          </View>
        ))}
      </View>
      <View style={styles.summaryMetrics}>
        <Text style={styles.summaryMetric}>{formatDuration(totalMinutes)}</Text>
        <Text style={styles.summaryMetric}>{formatCurrency(totalPrice)}</Text>
      </View>
    </View>
  );
}

function ProfessionalCard({
  professional,
  services,
  selected,
  nextSlot,
  onPress,
}: {
  professional: Professional;
  services: Service[];
  selected: boolean;
  nextSlot?: { startTime: string } | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.professionalCard,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.professionalMain}>
        {professional.photoUrl ? (
          <Image source={{ uri: professional.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="person-outline" size={25} color={UI.primary} />
          </View>
        )}
        <View style={styles.professionalCopy}>
          <Text numberOfLines={1} style={styles.professionalName}>{professional.name}</Text>
          <Text style={styles.rating}>★ {formatRating(professional.rating)} ({professional.reviewsCount})</Text>
          <Text numberOfLines={1} style={styles.specialty}>{professional.specialty}</Text>
          <Text style={styles.experience}>{professional.experienceYears} anos de experiência</Text>
        </View>
        <RadioMark selected={selected} />
      </View>
      <View style={styles.chipRow}>
        {services.map((service) => (
          <View key={service.id} style={styles.professionalChip}>
            <Ionicons name="checkmark-circle" size={15} color={UI.primary} />
            <Text style={styles.professionalChipText}>{service.name}</Text>
          </View>
        ))}
      </View>
      <View style={styles.nextSlot}>
        <Ionicons name="time-outline" size={18} color={UI.primary} />
        <Text style={styles.nextSlotText}>
          {nextSlot ? `Próximo horário hoje: ${nextSlot.startTime}` : 'Sem horário hoje'}
        </Text>
      </View>
    </Pressable>
  );
}

function ProfessionalFooter({
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
      <View style={styles.footerRow}>
        <View style={styles.footerMetric}>
          <Text style={styles.footerLabel}>{count} consultas</Text>
          <Text style={styles.footerValue}>{formatDuration(totalMinutes)}</Text>
        </View>
        <View style={styles.footerMetric}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerValue}>{formatCurrency(totalPrice)}</Text>
        </View>
      </View>
      <PrimaryButton label="Continuar" disabled={!canContinue} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: 11,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.12)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  serviceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: UI.surface,
  },
  serviceChipText: {
    color: UI.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 118, 110, 0.15)',
  },
  summaryMetric: {
    color: UI.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  anyCard: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.surface,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  cardSelected: {
    borderColor: 'rgba(15, 118, 110, 0.38)',
    backgroundColor: '#F8FFFD',
  },
  anyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: UI.primarySoft,
  },
  anyCopy: {
    flex: 1,
    gap: 4,
  },
  anyTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  anyText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  professionalCard: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.surface,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  professionalMain: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  photo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: UI.primarySoft,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalCopy: {
    flex: 1,
    gap: 4,
  },
  professionalName: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  rating: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '800',
  },
  specialty: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '800',
  },
  experience: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  professionalChip: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: UI.primarySoft,
  },
  professionalChipText: {
    color: UI.text,
    fontSize: 12,
    fontWeight: '800',
  },
  nextSlot: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    backgroundColor: UI.primarySoft,
  },
  nextSlotText: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  footerContent: {
    gap: 10,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerMetric: {
    flex: 1,
    gap: 3,
  },
  footerLabel: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  footerValue: {
    color: UI.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
