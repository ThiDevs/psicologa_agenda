import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
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
  background: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F9FC',
  surfaceRaised: '#F7F8FA',
  primary: '#064A8A',
  primaryDark: '#03366C',
  primarySoft: '#E7F0FA',
  lavender: '#7166D9',
  lavenderSoft: '#ECEAFE',
  rose: '#C8647A',
  roseSoft: '#FBE8ED',
  text: '#0F2340',
  textMuted: '#607085',
  border: 'rgba(15, 35, 64, 0.10)',
  success: '#2B9A72',
  warning: '#C77A1B',
  danger: '#B42318',
  star: '#F59E0B',
  darkBackground: '#FAF8F5',
  darkSurface: '#FFFFFF',
  darkSurfaceRaised: '#F5F9FC',
  darkText: '#0F2340',
  darkTextMuted: '#607085',
  darkPrimary: '#064A8A',
};

export const cardShadow = {
  boxShadow: '0 4px 14px rgba(15, 35, 64, 0.035)',
} as ViewStyle;

type AppAppearance = 'light' | 'dark';

export function ScreenScaffold({
  children,
  footer,
  scroll = true,
  bottomOffset = 124,
  appearance = 'light',
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  bottomOffset?: number;
  appearance?: AppAppearance;
}) {
  const insets = useSafeAreaInsets();
  const isDark = appearance === 'dark';
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.outer, isWeb && styles.outerWeb, isDark && styles.outerDark]}>
      <StatusBar style="dark" />
      <View style={[styles.phoneFrame, isWeb && styles.webFrame, isDark && styles.phoneFrameDark]}>
        <SafeAreaView
          edges={['top']}
          style={styles.safeArea}>
          {scroll ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[
                styles.scrollContent,
                isWeb && styles.scrollContentWeb,
                { paddingBottom: footer && !isWeb ? Math.max(16, Math.min(24, bottomOffset - 92)) : insets.bottom + 24 },
              ]}>
              {children}
              {footer && isWeb && (
                <View style={[styles.footerWeb, isDark && styles.footerDark]}>
                  {footer}
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={[styles.fixedContent, isWeb && styles.fixedContentWeb]}>
              {children}
              {footer && isWeb && (
                <View style={[styles.footerWeb, isDark && styles.footerDark]}>
                  {footer}
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
        {footer && !isWeb && (
          <View style={[styles.footer, isDark && styles.footerDark, { paddingBottom: Math.max(insets.bottom, 14) }]}>
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
  appearance = 'light',
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  appearance?: AppAppearance;
}) {
  const isDark = appearance === 'dark';

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack ? (
          <IconButton icon="chevron-back" label="Voltar" appearance={appearance} onPress={onBack} />
        ) : (
          <View style={styles.headerButtonSpacer} />
        )}
        <Text numberOfLines={1} style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          {title}
        </Text>
        {right ?? <View style={styles.headerButtonSpacer} />}
      </View>
      {subtitle && <Text style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]}>{subtitle}</Text>}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  selected,
  onPress,
  appearance = 'light',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
  onPress?: () => void;
  appearance?: AppAppearance;
}) {
  const isDark = appearance === 'dark';
  const activeColor = isDark ? UI.darkPrimary : UI.primary;
  const idleColor = isDark ? UI.darkText : UI.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        isDark && styles.iconButtonDark,
        selected && styles.iconButtonSelected,
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={23} color={selected ? activeColor : idleColor} />
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
  appearance = 'light',
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  appearance?: AppAppearance;
}) {
  const isDark = appearance === 'dark';

  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{title}</Text>
      {actionLabel && (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <Text style={[styles.sectionAction, isDark && styles.sectionActionDark]}>{actionLabel}</Text>
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
  appearance = 'light',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  action?: React.ReactNode;
  appearance?: AppAppearance;
}) {
  const isDark = appearance === 'dark';

  return (
    <View style={[styles.emptyState, isDark && styles.emptyStateDark]}>
      <View style={[styles.emptyIcon, isDark && styles.emptyIconDark]}>
        <Ionicons name={icon} size={24} color={isDark ? UI.darkPrimary : UI.primary} />
      </View>
      <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>{title}</Text>
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>{text}</Text>
      {action}
    </View>
  );
}

export function Field({
  label,
  editable,
  style,
  appearance = 'light',
  ...props
}: TextInputProps & {
  label: string;
  appearance?: AppAppearance;
}) {
  const isDark = appearance === 'dark';

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>{label}</Text>
      <TextInput
        placeholderTextColor={isDark ? UI.darkTextMuted : UI.textMuted}
        autoCapitalize="none"
        editable={editable}
        style={[
          styles.input,
          isDark && styles.inputDark,
          editable === false && styles.inputDisabled,
          style,
        ]}
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
  outerWeb: {
    minHeight: '100%',
    alignItems: 'stretch',
  },
  outerDark: {
    backgroundColor: UI.darkBackground,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: UI.background,
  },
  webFrame: {
    maxWidth: '100%',
  },
  phoneFrameDark: {
    backgroundColor: UI.darkBackground,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContentWeb: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    gap: 20,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  fixedContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  fixedContentWeb: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  footer: {
    zIndex: 20,
    elevation: 20,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(15, 35, 64, 0.10)',
    backgroundColor: UI.surface,
    boxShadow: '0 -4px 16px rgba(15, 35, 64, 0.04)',
  },
  footerDark: {
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: '0 6px 18px rgba(15, 35, 64, 0.055)',
  },
  footerWeb: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: '0 4px 14px rgba(15, 35, 64, 0.035)',
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
    fontWeight: '600',
    textAlign: 'center',
  },
  headerTitleDark: {
    color: UI.darkText,
  },
  headerSubtitle: {
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  headerSubtitleDark: {
    color: UI.darkTextMuted,
  },
  headerButtonSpacer: {
    width: 44,
    height: 44,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  iconButtonDark: {
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.darkSurface,
    boxShadow: 'none',
  },
  iconButtonSelected: {
    backgroundColor: UI.primarySoft,
  },
  primaryButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: UI.primary,
    boxShadow: '0 6px 16px rgba(6, 74, 138, 0.12)',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    boxShadow: 'none',
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
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 17,
    fontWeight: '600',
  },
  sectionTitleDark: {
    color: UI.darkText,
  },
  sectionAction: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  sectionActionDark: {
    color: UI.darkPrimary,
  },
  metricPill: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
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
    fontWeight: '500',
  },
  metricValue: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: 9,
    padding: 14,
  },
  emptyStateDark: {
    backgroundColor: 'transparent',
  },
  emptyIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  emptyIconDark: {
    backgroundColor: UI.primarySoft,
  },
  emptyTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyTitleDark: {
    color: UI.darkText,
  },
  emptyText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyTextDark: {
    color: UI.darkTextMuted,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '500',
  },
  fieldLabelDark: {
    color: UI.darkText,
  },
  input: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    color: UI.text,
    fontSize: 14,
    fontWeight: '400',
  },
  inputDark: {
    borderColor: UI.border,
    backgroundColor: UI.darkSurfaceRaised,
    color: UI.darkText,
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
    borderRadius: 9,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 74, 138, 0.12)',
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
    fontWeight: '600',
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
