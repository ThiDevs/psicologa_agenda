import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import type { User, UserRole } from '@/types/domain';
import {
  getApiErrorMessage,
  isApiOffline,
  login as loginApi,
  logout as logoutApi,
  registerCustomer,
  registerProfessional,
  registerSpaceAdmin,
  restoreAuthSession,
  subscribeAuthSessionExpired,
} from '@/services/api-client';

type RegisterUserInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
};

type SessionSource = 'api';
type ApiStatus = 'unknown' | 'connected' | 'offline';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  sessionSource: SessionSource | null;
  apiStatus: ApiStatus;
  isHydratingSession: boolean;
  lastAuthError: string | null;
  professionalProfileActive: boolean;
  activateProfessionalProfile: () => void;
  login: (email: string, password: string) => Promise<User>;
  continueAsCustomer: () => Promise<User>;
  registerUser: (input: RegisterUserInput) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PROFESSIONAL_PROFILE_USERS_KEY = 'psi_agenda_online.professional_profile_users';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionSource, setSessionSource] = useState<SessionSource | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('unknown');
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);
  const [professionalProfileActive, setProfessionalProfileActive] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const restoredUser = await restoreAuthSession();

        if (!mounted) {
          return;
        }

        if (restoredUser) {
          const storedProfessionalProfile = await hasStoredProfessionalProfile(restoredUser);

          setUser(restoredUser);
          setSessionSource('api');
          setApiStatus('connected');
          setProfessionalProfileActive(restoredUser.role === 'professional' || storedProfessionalProfile);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setApiStatus(isApiOffline(error) ? 'offline' : 'unknown');
        setLastAuthError(getApiErrorMessage(error));
      } finally {
        if (mounted) {
          setIsHydratingSession(false);
        }
      }
    }

    hydrateSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeAuthSessionExpired(() => {
      setUser(null);
      setSessionSource(null);
      setProfessionalProfileActive(false);
      setLastAuthError('Sua sessão expirou. Entre novamente para continuar.');
    });
  }, []);

  const registerUser = useCallback(
    async (input: RegisterUserInput) => {
      setLastAuthError(null);

      try {
        const nextUser =
          input.role === 'space_admin'
            ? await registerSpaceAdmin(input)
            : input.role === 'customer'
              ? await registerCustomer(input)
              : input.role === 'professional'
                ? await registerProfessional(input)
                : null;

        if (!nextUser) {
          throw new Error('Perfil não disponível para cadastro no app.');
        }

        setUser(nextUser);
        setSessionSource('api');
        setApiStatus('connected');
        setProfessionalProfileActive(nextUser.role === 'professional');
        if (nextUser.role === 'professional') {
          void storeProfessionalProfile(nextUser).catch(() => undefined);
        }

        return nextUser;
      } catch (error) {
        setApiStatus(isApiOffline(error) ? 'offline' : 'connected');
        setLastAuthError(getApiErrorMessage(error));
        throw error;
      }
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setLastAuthError(null);

      try {
        const nextUser = await loginApi({ email, password });
        const storedProfessionalProfile = await hasStoredProfessionalProfile(nextUser);

        setUser(nextUser);
        setSessionSource('api');
        setApiStatus('connected');
        setProfessionalProfileActive(nextUser.role === 'professional' || storedProfessionalProfile);

        return nextUser;
      } catch (error) {
        setApiStatus(isApiOffline(error) ? 'offline' : 'connected');
        setLastAuthError(getApiErrorMessage(error));
        throw error;
      }
    },
    [],
  );

  const continueAsCustomer = useCallback(async () => {
    throw new Error('Crie uma conta de cliente para agendar.');
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    setSessionSource(null);
    setProfessionalProfileActive(false);
  }, []);

  const activateProfessionalProfile = useCallback(() => {
    setProfessionalProfileActive(true);
    if (user) {
      void storeProfessionalProfile(user).catch(() => undefined);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      sessionSource,
      apiStatus,
      isHydratingSession,
      lastAuthError,
      professionalProfileActive,
      activateProfessionalProfile,
      login,
      continueAsCustomer,
      registerUser,
      logout,
    }),
    [
      apiStatus,
      activateProfessionalProfile,
      continueAsCustomer,
      isHydratingSession,
      lastAuthError,
      login,
      logout,
      professionalProfileActive,
      registerUser,
      sessionSource,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.use(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

async function hasStoredProfessionalProfile(user: User) {
  try {
    const storedProfiles = await readProfessionalProfileUsers();

    return Boolean(storedProfiles[getProfessionalProfileStorageId(user)]);
  } catch {
    return false;
  }
}

async function storeProfessionalProfile(user: User) {
  const storedProfiles = await readProfessionalProfileUsers();

  storedProfiles[getProfessionalProfileStorageId(user)] = true;
  await writeProfessionalProfileUsers(storedProfiles);
}

function getProfessionalProfileStorageId(user: User) {
  return user.id || user.email.toLowerCase();
}

async function readProfessionalProfileUsers() {
  const value =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(PROFESSIONAL_PROFILE_USERS_KEY) ?? null
      : await SecureStore.getItemAsync(PROFESSIONAL_PROFILE_USERS_KEY);

  if (!value) {
    return {} as Record<string, true>;
  }

  try {
    return JSON.parse(value) as Record<string, true>;
  } catch {
    return {} as Record<string, true>;
  }
}

async function writeProfessionalProfileUsers(value: Record<string, true>) {
  const serializedValue = JSON.stringify(value);

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(PROFESSIONAL_PROFILE_USERS_KEY, serializedValue);
    return;
  }

  await SecureStore.setItemAsync(PROFESSIONAL_PROFILE_USERS_KEY, serializedValue);
}
