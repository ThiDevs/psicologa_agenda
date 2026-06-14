import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export const UI = {
  background: '#F7FAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#EFF6F3',
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#E6F4F1',
  text: '#111827',
  textMuted: '#6B7280',
  border: 'rgba(17, 24, 39, 0.09)',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  star: '#F59E0B',
};

export const cardShadow = {
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
} as ViewStyle;

export function ScreenScaffold({
  children,
  footer,
  scroll = true,
  bottomOffset = 124,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  bottomOffset?: number;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.outer}>
      <StatusBar style="dark" />
      <View style={styles.phoneFrame}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          {scroll ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: footer ? insets.bottom + bottomOffset : insets.bottom + 24 },
              ]}>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.fixedContent}>{children}</View>
          )}
        </SafeAreaView>
        {footer && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            {footer}
          </View>
        )}
      </View>
    </View>
  );
}

export function HeaderBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack ? (
          <IconButton icon="chevron-back" label="Voltar" onPress={onBack} />
        ) : (
          <View style={styles.headerButtonSpacer} />
        )}
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {right ?? <View style={styles.headerButtonSpacer} />}
      </View>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        selected && styles.iconButtonSelected,
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={23} color={selected ? UI.primary : UI.text} />
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  icon = 'arrow-forward',
  disabled,
  loading,
  variant = 'primary',
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'ghost' && styles.ghostButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? UI.surface : UI.primary} />
      ) : (
        <>
          <Text
            numberOfLines={1}
            style={[
              styles.primaryButtonText,
              variant !== 'primary' && styles.secondaryButtonText,
              disabled && styles.buttonDisabledText,
            ]}>
            {label}
          </Text>
          <Ionicons
            name={icon}
            size={20}
            color={variant === 'primary' && !disabled ? UI.surface : UI.primary}
          />
        </>
      )}
    </Pressable>
  );
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function MetricPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={18} color={UI.primary} />
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.metricValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={UI.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  );
}

export function Field({
  label,
  editable,
  style,
  ...props
}: TextInputProps & {
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={UI.textMuted}
        autoCapitalize="none"
        editable={editable}
        style={[styles.input, editable === false && styles.inputDisabled, style]}
        {...props}
      />
    </View>
  );
}

export function RadioMark({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radioOuter, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );
}

export function CheckMark({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.checkOuter, selected && styles.checkSelected]}>
      {selected && <Ionicons name="checkmark" size={19} color={UI.surface} />}
    </View>
  );
}

export function InfoStrip({
  icon,
  title,
  text,
  tone = 'info',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  tone?: 'info' | 'success' | 'warning';
}) {
  const color = tone === 'success' ? UI.success : tone === 'warning' ? UI.warning : UI.primary;

  return (
    <View style={[styles.infoStrip, tone === 'success' && styles.infoStripSuccess]}>
      <Ionicons name={icon} size={21} color={color} />
      <View style={styles.infoCopy}>
        <Text style={[styles.infoTitle, { color }]}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: UI.background,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: UI.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  fixedContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.15)',
    backgroundColor: UI.surface,
    boxShadow: '0 -10px 28px rgba(15, 23, 42, 0.10)',
  },
  header: {
    gap: 10,
  },
  headerTop: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: UI.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  headerButtonSpacer: {
    width: 44,
    height: 44,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  iconButtonSelected: {
    backgroundColor: UI.primarySoft,
  },
  primaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: UI.primary,
    boxShadow: '0 12px 24px rgba(15, 118, 110, 0.24)',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
  },
  ghostButton: {
    backgroundColor: UI.primarySoft,
    boxShadow: 'none',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
    boxShadow: 'none',
  },
  primaryButtonText: {
    color: UI.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: UI.primary,
  },
  buttonDisabledText: {
    color: UI.textMuted,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    color: UI.text,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionAction: {
    color: UI.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  metricPill: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: UI.surface,
  },
  metricCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  metricLabel: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    gap: 9,
    padding: 18,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: UI.primarySoft,
  },
  emptyTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: UI.textMuted,
  },
  radioOuter: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: UI.textMuted,
    backgroundColor: UI.surface,
  },
  radioSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.surface,
  },
  checkOuter: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: UI.textMuted,
    backgroundColor: UI.surface,
  },
  checkSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  infoStrip: {
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    backgroundColor: UI.primarySoft,
  },
  infoStripSuccess: {
    backgroundColor: '#ECFDF3',
  },
  infoCopy: {
    flex: 1,
    gap: 3,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
