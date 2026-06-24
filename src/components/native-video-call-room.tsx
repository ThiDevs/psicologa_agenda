import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { UI, cardShadow } from '@/components/app-ui';

type VideoCallRole = 'patient' | 'professional' | 'owner' | 'guest';

type NativeVideoCallRoomProps = {
  room: string;
  fallbackUrl: string;
  displayName: string;
  role: VideoCallRole;
  openFallback: () => Promise<void>;
  leaveCall: () => Promise<void>;
};

export function NativeVideoCallRoom({
  room,
  fallbackUrl,
  displayName,
  role,
  openFallback,
  leaveCall,
}: NativeVideoCallRoomProps) {
  const webViewRef = useRef<WebView>(null);
  const { height } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const meetingUrl = useMemo(
    () => buildNativeMeetingUrl(fallbackUrl, displayName),
    [displayName, fallbackUrl],
  );
  const isCareTeam = role === 'professional' || role === 'owner';
  const compactStage = height < 740;

  function handleReload() {
    setLoadError(null);
    setIsLoading(true);
    setReloadKey((current) => current + 1);
  }

  function handleOpenFallback() {
    void openFallback();
  }

  function handleLeave() {
    void leaveCall();
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.brandMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name="videocam-outline" size={22} color={UI.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Teleconsulta</Text>
          <Text style={styles.subtitle}>
            {isCareTeam ? 'Sala clínica segura para atendimento online.' : 'Sua sessão online em ambiente protegido.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da teleconsulta"
          onPress={handleLeave}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={21} color={UI.text} />
        </Pressable>
      </View>

      <View style={[styles.safetyCard, compactStage && styles.safetyCardCompact]}>
        <View style={styles.safetyIcon}>
          <Ionicons name="shield-checkmark-outline" size={19} color={UI.success} />
        </View>
        <View style={styles.safetyCopy}>
          <Text style={styles.safetyTitle}>Consulta protegida</Text>
          <Text style={styles.safetyText}>
            Câmera e microfone ficam restritos à sala. O app não grava conteúdo clínico.
          </Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Seguro</Text>
        </View>
      </View>

      <View style={styles.callCard}>
        <View style={styles.callHeader}>
          <View>
            <Text style={styles.callEyebrow}>Sala da teleconsulta</Text>
            <Text numberOfLines={1} style={styles.callRoom}>
              {room}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recarregar sala"
            onPress={handleReload}
            style={({ pressed }) => [styles.reloadButton, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={18} color={UI.primary} />
          </Pressable>
        </View>

        <View style={styles.webViewFrame}>
          <WebView
            key={`${meetingUrl}-${reloadKey}`}
            ref={webViewRef}
            source={{ uri: meetingUrl }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            domStorageEnabled
            javaScriptCanOpenWindowsAutomatically
            javaScriptEnabled
            mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['https://*']}
            scrollEnabled={false}
            setSupportMultipleWindows={false}
            startInLoadingState
            thirdPartyCookiesEnabled
            onLoadEnd={() => setIsLoading(false)}
            onLoadStart={() => {
              setLoadError(null);
              setIsLoading(true);
            }}
            onError={(event) => {
              setIsLoading(false);
              setLoadError(event.nativeEvent.description || 'Não foi possível carregar a sala.');
            }}
            onHttpError={(event) => {
              setIsLoading(false);
              setLoadError(`A sala respondeu com status ${event.nativeEvent.statusCode}.`);
            }}
            style={styles.webView}
          />

          {isLoading ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={UI.primary} />
              <Text style={styles.overlayTitle}>Preparando teleconsulta</Text>
              <Text style={styles.overlayText}>Aguarde enquanto a sala segura é carregada.</Text>
            </View>
          ) : null}

          {loadError ? (
            <View style={styles.overlay}>
              <View style={styles.warningMark}>
                <Ionicons name="alert-circle-outline" size={26} color={UI.warning} />
              </View>
              <Text style={styles.overlayTitle}>Não foi possível abrir a sala</Text>
              <Text style={styles.overlayText}>{loadError}</Text>
              <View style={styles.inlineActions}>
                <ActionButton icon="refresh" label="Tentar novamente" primary onPress={handleReload} />
                <ActionButton icon="open-outline" label="Abrir Jitsi" onPress={handleOpenFallback} />
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.participantRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.participantCopy}>
            <Text numberOfLines={1} style={styles.participantName}>
              {displayName}
            </Text>
            <Text style={styles.participantMeta}>{isCareTeam ? 'Equipe clínica' : 'Paciente'}</Text>
          </View>
        </View>

        <View style={styles.footerActions}>
          <ActionButton icon="open-outline" label="Abrir Jitsi" onPress={handleOpenFallback} />
          <ActionButton icon="call-outline" label="Sair" danger onPress={handleLeave} />
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  primary,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.actionButtonPrimary,
        danger && styles.actionButtonDanger,
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={17} color={primary ? UI.surface : danger ? UI.danger : UI.primary} />
      <Text style={[styles.actionButtonText, primary && styles.actionButtonTextPrimary, danger && styles.actionButtonTextDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

function buildNativeMeetingUrl(fallbackUrl: string, displayName: string) {
  try {
    const url = new URL(fallbackUrl);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));

    hash.set('config.disableDeepLinking', 'true');
    hash.set('config.prejoinPageEnabled', 'false');
    hash.set('userInfo.displayName', JSON.stringify(displayName));
    url.hash = hash.toString();

    return url.toString();
  } catch {
    return fallbackUrl;
  }
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: UI.background,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    backgroundColor: UI.surface,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: UI.text,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 29,
  },
  subtitle: {
    marginTop: 2,
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 17,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    backgroundColor: UI.surface,
  },
  safetyCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  safetyCardCompact: {
    minHeight: 64,
    paddingVertical: 10,
  },
  safetyIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E9F7F1',
  },
  safetyCopy: {
    flex: 1,
    minWidth: 0,
  },
  safetyTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '600',
  },
  safetyText: {
    marginTop: 3,
    color: UI.textMuted,
    fontSize: 12.5,
    fontWeight: '400',
    lineHeight: 17,
  },
  livePill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#BFE7D7',
    borderRadius: 999,
    backgroundColor: '#F3FBF7',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: UI.success,
  },
  liveText: {
    color: UI.success,
    fontSize: 12,
    fontWeight: '600',
  },
  callCard: {
    flex: 1,
    minHeight: 340,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  callHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  callEyebrow: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  callRoom: {
    marginTop: 2,
    color: UI.text,
    fontSize: 15,
    fontWeight: '600',
  },
  reloadButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    backgroundColor: UI.surfaceMuted,
  },
  webViewFrame: {
    flex: 1,
    minHeight: 280,
    backgroundColor: '#EEF3F7',
  },
  webView: {
    flex: 1,
    backgroundColor: '#EEF3F7',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 22,
    backgroundColor: 'rgba(250, 248, 245, 0.96)',
  },
  warningMark: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFF4DF',
  },
  overlayTitle: {
    marginTop: 2,
    color: UI.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  overlayText: {
    maxWidth: 280,
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  footer: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  participantRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: UI.primarySoft,
  },
  avatarText: {
    color: UI.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  participantCopy: {
    flex: 1,
    minWidth: 0,
  },
  participantName: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '600',
  },
  participantMeta: {
    marginTop: 2,
    color: UI.textMuted,
    fontSize: 12.5,
    fontWeight: '400',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 38,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    backgroundColor: UI.surface,
  },
  actionButtonPrimary: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  actionButtonDanger: {
    borderColor: 'rgba(180, 35, 24, 0.20)',
    backgroundColor: '#FFF5F4',
  },
  actionButtonText: {
    color: UI.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: UI.surface,
  },
  actionButtonTextDanger: {
    color: UI.danger,
  },
  pressed: {
    opacity: 0.72,
  },
});

export default NativeVideoCallRoom;
