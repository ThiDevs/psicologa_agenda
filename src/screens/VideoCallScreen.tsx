import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeVideoCallRoom } from '@/components/native-video-call-room';
import VideoCallRoom from '@/components/video-call-room';
import { EmptyState, HeaderBar, ScreenScaffold, UI } from '@/components/app-ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildJitsiFallbackUrl,
  buildSignalingUrl,
  parseVideoCallSession,
} from '@/utils/video-call';

export function VideoCallScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ room?: string; fallback?: string; localName?: string; role?: string }>();
  const roomParam = Array.isArray(params.room) ? params.room[0] : params.room;
  const fallbackParam = Array.isArray(params.fallback) ? params.fallback[0] : params.fallback;
  const localNameParam = Array.isArray(params.localName) ? params.localName[0] : params.localName;
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const session = useMemo(
    () => parseVideoCallSession(roomParam ?? null),
    [roomParam],
  );
  const room = session?.room ?? null;
  const fallbackUrl = fallbackParam ?? (room ? buildJitsiFallbackUrl(room) : null);
  const displayName = normalizeDisplayName(localNameParam ?? user?.name) ?? 'Participante';
  const role = normalizeRole(roleParam);
  const signalingUrl = useMemo(
    () => (room ? buildSignalingUrl(room) : null),
    [room],
  );

  async function openFallback() {
    if (fallbackUrl) {
      await WebBrowser.openBrowserAsync(fallbackUrl);
    }
  }

  async function leaveCall() {
    router.back();
  }

  if (!room || !fallbackUrl || !signalingUrl) {
    return (
      <ScreenScaffold>
        <HeaderBar title="Chamada de vídeo" onBack={() => router.back()} />
        <EmptyState
          icon="videocam-outline"
          title="Sala não encontrada"
          text="Abra a chamada a partir de um agendamento confirmado."
        />
      </ScreenScaffold>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {Platform.OS === 'web' ? (
          <VideoCallRoom
            room={room}
            signalingUrl={signalingUrl}
            fallbackUrl={fallbackUrl}
            displayName={displayName}
            role={role}
            openFallback={openFallback}
            leaveCall={leaveCall}
            dom={{
              scrollEnabled: false,
              contentInsetAdjustmentBehavior: 'never',
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
              mediaCapturePermissionGrantType: 'grantIfSameHostElsePrompt',
              style: styles.domContainer,
            }}
          />
        ) : (
          <NativeVideoCallRoom
            room={room}
            fallbackUrl={fallbackUrl}
            displayName={displayName}
            role={role}
            openFallback={openFallback}
            leaveCall={leaveCall}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: UI.background,
  },
  domContainer: {
    flex: 1,
    minHeight: 700,
  },
});

function normalizeDisplayName(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, ' ');

  return normalized ? normalized.slice(0, 80) : null;
}

function normalizeRole(value?: string | null) {
  return value === 'professional' || value === 'owner' || value === 'patient'
    ? value
    : 'guest';
}
