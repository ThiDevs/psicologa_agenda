import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useOwnerConfig } from '@/contexts/OwnerConfigContext';
import {
  completeStarterSetup as completeRemoteStarterSetup,
  getOnboardingChecklist,
} from '@/services/api-client';

export function useOwnerSetupFinish() {
  const router = useRouter();
  const { sessionSource, activateProfessionalProfile } = useAuth();
  const {
    completeStarterSetup: completeLocalStarterSetup,
    getOnboardingItems,
    setSelectedOwnerSpaceId,
    syncProfessionalsFromApi,
    syncServicesFromApi,
    syncSpacesFromApi,
  } = useOwnerConfig();

  const finishOwnerSetup = useCallback(
    async (spaceId: string) => {
      if (sessionSource === 'api') {
        const result = await completeRemoteStarterSetup(spaceId);

        syncSpacesFromApi([result.space]);
        syncServicesFromApi(result.space.id, result.services);
        syncProfessionalsFromApi(result.space.id, result.professionals);
        setSelectedOwnerSpaceId(result.space.id);
      } else {
        completeLocalStarterSetup(spaceId);
        setSelectedOwnerSpaceId(spaceId);
      }

      activateProfessionalProfile();
      router.replace('/');
    },
    [
      activateProfessionalProfile,
      completeLocalStarterSetup,
      router,
      sessionSource,
      setSelectedOwnerSpaceId,
      syncProfessionalsFromApi,
      syncServicesFromApi,
      syncSpacesFromApi,
    ],
  );

  const finishOwnerSetupIfReady = useCallback(
    async (spaceId: string) => {
      const checklist =
        sessionSource === 'api'
          ? await getOnboardingChecklist(spaceId)
          : getOnboardingItems(spaceId);

      if (!checklist.every((item) => item.complete)) {
        return false;
      }

      await finishOwnerSetup(spaceId);
      return true;
    },
    [finishOwnerSetup, getOnboardingItems, sessionSource],
  );

  return {
    finishOwnerSetup,
    finishOwnerSetupIfReady,
  };
}
