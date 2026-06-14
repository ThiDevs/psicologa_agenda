import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { ScreenScaffold, UI } from '@/components/app-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import HomeScreen from '@/screens/HomeScreen';
import LandingScreen from '@/screens/LandingScreen';
import { OwnerDashboardScreen } from '@/screens/OwnerScreens';
import { ProfessionalAgendaScreen } from '@/screens/ProfessionalScreens';
import { getMySpaces } from '@/services/api-client';

export default function IndexRoute() {
  const { isHydratingSession, professionalProfileActive, user } = useAuth();
  const { selectedOwnerSpace, syncSpacesFromApi } = useOwnerConfig();
  const [ownerSpacesChecked, setOwnerSpacesChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadOwnerSpaces() {
      if (isHydratingSession || !user || !professionalProfileActive || selectedOwnerSpace) {
        setOwnerSpacesChecked(Boolean(selectedOwnerSpace) || !professionalProfileActive);
        return;
      }

      setOwnerSpacesChecked(false);

      try {
        const spaces = await getMySpaces();

        if (mounted) {
          syncSpacesFromApi(spaces);
        }
      } catch {
        // The home/profile screens still render; owner screens surface API errors when opened.
      } finally {
        if (mounted) {
          setOwnerSpacesChecked(true);
        }
      }
    }

    loadOwnerSpaces();

    return () => {
      mounted = false;
    };
  }, [
    isHydratingSession,
    professionalProfileActive,
    selectedOwnerSpace,
    syncSpacesFromApi,
    user,
  ]);

  if (isHydratingSession) {
    return <LoadingRoute text="Carregando sessão..." />;
  }

  if (user?.role === 'space_admin' || user?.role === 'space_manager') {
    return <OwnerDashboardScreen />;
  }

  if (professionalProfileActive && selectedOwnerSpace) {
    return <OwnerDashboardScreen />;
  }

  if (user?.role === 'professional') {
    return <ProfessionalAgendaScreen />;
  }

  if (user && professionalProfileActive && !ownerSpacesChecked) {
    return <LoadingRoute text="Carregando consultórios..." />;
  }

  return user || Platform.OS !== 'web' ? <HomeScreen /> : <LandingScreen />;
}

function LoadingRoute({ text }: { text: string }) {
  return (
    <ScreenScaffold scroll={false}>
      <View style={styles.loadingState}>
        <ActivityIndicator color={UI.primary} />
        <Text style={styles.loadingText}>{text}</Text>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: UI.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
