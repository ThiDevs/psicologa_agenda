import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, PrimaryButton, UI } from '@/components/app-ui';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import type { OnboardingItem } from '@/types/domain';

type OwnerSetupProgressCardProps = {
  spaceId?: string | null;
  items?: OnboardingItem[];
  showContinueButton?: boolean;
};

type OwnerSetupQuickNavProps = {
  spaceId?: string | null;
  hideChecklist?: boolean;
  hideSpaces?: boolean;
};

export function OwnerSetupProgressCard({
  spaceId,
  items,
  showContinueButton = true,
}: OwnerSetupProgressCardProps) {
  const router = useRouter();
  const { spaces, selectedOwnerSpace, getOnboardingItems } = useOwnerConfig();
  const ownerSpace = spaceId
    ? spaces.find((space) => space.id === spaceId) ?? selectedOwnerSpace
    : selectedOwnerSpace;
  const checklistItems = items ?? getOnboardingItems(ownerSpace?.id ?? null);
  const completedCount = checklistItems.filter((item) => item.complete).length;
  const totalCount = checklistItems.length;
  const remainingCount = Math.max(totalCount - completedCount, 0);
  const nextItem = checklistItems.find((item) => !item.complete) ?? null;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const done = totalCount > 0 && remainingCount === 0;

  const title = done ? 'Checklist completo' : 'Checklist avançando';
  const detail = done
    ? 'Tudo pronto para revisar o painel e publicar o consultório.'
    : `${completedCount} de ${totalCount} concluídos. ${formatRemaining(remainingCount)} para terminar.`;

  function continueEditing() {
    router.push(getOnboardingRoute(nextItem?.id));
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${detail}`}
      style={[styles.progressCard, done && styles.progressCardDone]}>
      <View style={styles.progressHeader}>
        <View style={[styles.progressIcon, done && styles.progressIconDone]}>
          <Ionicons
            name={done ? 'checkmark-circle' : 'notifications-outline'}
            size={23}
            color={done ? UI.success : UI.primary}
          />
        </View>
        <View style={styles.progressCopy}>
          <View style={styles.progressTitleRow}>
            <Text style={styles.progressTitle}>{title}</Text>
            <Text style={[styles.progressBadge, done && styles.progressBadgeDone]}>
              {progressPercent}%
            </Text>
          </View>
          <Text style={styles.progressText}>{detail}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            done && styles.progressFillDone,
            { width: `${progressPercent}%` },
          ]}
        />
      </View>

      {nextItem && (
        <View style={styles.attentionRow}>
          <Ionicons name="alert-circle-outline" size={18} color={UI.warning} />
          <Text style={styles.attentionText} numberOfLines={2}>
            Ponto de atenção: {nextItem.label}
          </Text>
        </View>
      )}

      {showContinueButton && nextItem && (
        <ProgressActionButton
          icon="construct-outline"
          label="Continuar edição"
          onPress={continueEditing}
        />
      )}
    </View>
  );
}

export function OwnerSetupQuickNav({
  spaceId,
  hideChecklist = false,
  hideSpaces = false,
}: OwnerSetupQuickNavProps) {
  const router = useRouter();
  const { selectedOwnerSpace } = useOwnerConfig();
  const targetSpaceId = spaceId ?? selectedOwnerSpace?.id ?? null;

  function openChecklist() {
    router.push({
      pathname: '/owner-onboarding-checklist',
      params: targetSpaceId ? { spaceId: targetSpaceId } : undefined,
    });
  }

  return (
    <View style={styles.quickNavRow}>
      {!hideChecklist && (
        <View style={styles.quickNavItem}>
          <PrimaryButton
            label="Checklist"
            icon="list-outline"
            variant="secondary"
            onPress={openChecklist}
          />
        </View>
      )}
      {!hideSpaces && (
        <View style={styles.quickNavItem}>
          <PrimaryButton
            label="Consultórios"
            icon="storefront-outline"
            variant="secondary"
            onPress={() => router.replace('/owner-dashboard')}
          />
        </View>
      )}
    </View>
  );
}

export function getOnboardingRoute(itemId?: string | null) {
  switch (itemId) {
    case 'services':
      return '/manage-services';
    case 'professionals':
    case 'professional-services':
      return '/manage-professionals';
    case 'opening-hours':
      return '/space-opening-hours';
    case 'professional-schedule':
      return '/professional-schedule';
    case 'payment':
      return '/payment-settings';
    case 'cancellation':
      return '/cancellation-policy';
    case 'space-data':
      return '/create-space';
    default:
      return '/owner-dashboard';
  }
}

function formatRemaining(remainingCount: number) {
  if (remainingCount === 1) {
    return 'Falta 1 item';
  }

  return `Faltam ${remainingCount} itens`;
}

function ProgressActionButton({
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
      style={({ pressed }) => [styles.progressAction, pressed && styles.pressed]}>
      <Text style={styles.progressActionText}>{label}</Text>
      <Ionicons name={icon} size={19} color={UI.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  progressCardDone: {
    backgroundColor: '#F7FEFA',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: UI.primarySoft,
  },
  progressIconDone: {
    backgroundColor: '#ECFDF3',
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTitle: {
    flex: 1,
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },
  progressBadge: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  progressBadgeDone: {
    color: UI.success,
  },
  progressText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: UI.surfaceMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: UI.primary,
  },
  progressFillDone: {
    backgroundColor: UI.success,
  },
  attentionRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: '#FFFBEB',
  },
  attentionText: {
    flex: 1,
    color: UI.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  progressAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: UI.primary,
  },
  progressActionText: {
    color: UI.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickNavItem: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
