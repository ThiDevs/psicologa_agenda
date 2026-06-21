import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  Field,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  RadioMark,
  ScreenScaffold,
  UI,
} from '@/components/app-ui';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/domain';

type RoleOption = {
  id: UserRole;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const roleOptions: RoleOption[] = [
  {
    id: 'customer',
    title: 'Quero marcar consulta',
    text: 'Encontrar horários, escolher uma sessão online e acompanhar agendamentos.',
    icon: 'calendar-outline',
  },
  {
    id: 'space_admin',
    title: 'Sou psicóloga',
    text: 'Configurar consultas, agenda, pagamentos combinados e publicar horários.',
    icon: 'briefcase-outline',
  },
  {
    id: 'professional',
    title: 'Sou psicóloga',
    text: 'Acessar minha agenda quando meu e-mail estiver vinculado ao consultório.',
    icon: 'person-circle-outline',
  },
];

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold>
      <View style={styles.hero}>
        <View style={styles.brandMark}>
          <Ionicons name="leaf-outline" size={38} color={UI.surface} />
        </View>
        <Text style={styles.heroTitle}>Psi Agenda Online</Text>
        <Text style={styles.heroText}>
          Marcação de consultas online com agenda, psicóloga, horários e pagamento combinado em um fluxo só.
        </Text>
      </View>

      <View style={styles.actionStack}>
        <PrimaryButton label="Entrar" icon="log-in-outline" onPress={() => router.push('/login')} />
        <PrimaryButton
          label="Criar conta"
          icon="person-add-outline"
          variant="secondary"
          onPress={() => router.push('/register-role-selection')}
        />
      </View>

      <InfoStrip
        icon="shield-checkmark-outline"
        title="Consulta com privacidade"
        text="Cadastros, marcações e histórico ficam organizados na sua conta."
        tone="info"
      />
    </ScreenScaffold>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const { apiStatus, lastAuthError, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      router.replace('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Entrar"
        subtitle="Acesse sua conta para continuar."
        onBack={() => router.back()}
      />

      <View style={styles.formCard}>
        <Field label="E-mail ou telefone" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      {(errorMessage || lastAuthError) && (
        <InfoStrip
          icon="alert-circle-outline"
          title={apiStatus === 'offline' ? 'Consulta indisponível' : 'Verifique os dados'}
          text={errorMessage ?? lastAuthError ?? ''}
          tone="warning"
        />
      )}

      <View style={styles.actionStack}>
        <PrimaryButton
          label="Entrar"
          icon="arrow-forward"
          loading={submitting}
          onPress={handleSubmit}
        />
        <PrimaryButton
          label="Criar uma conta"
          icon="person-add-outline"
          variant="secondary"
          onPress={() => router.push('/register-role-selection')}
        />
      </View>
    </ScreenScaffold>
  );
}

export function RegisterRoleSelectionScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Criar conta"
        subtitle="Escolha como você quer usar o app."
        onBack={() => router.back()}
      />

      <View style={styles.roleList}>
        {roleOptions.map((option) => (
          <RoleCard
            key={option.id}
            option={option}
            selected={false}
            onPress={() => {
              if (option.id === 'space_admin') {
                router.push('/space-owner-register');
                return;
              }

              router.push(option.id === 'professional' ? '/professional-register' : '/customer-register');
            }}
          />
        ))}
      </View>
    </ScreenScaffold>
  );
}

export function CustomerRegisterScreen() {
  return <RegisterForm role="customer" title="Conta da cliente" nextPath="/" />;
}

export function SpaceOwnerRegisterScreen() {
  return <RegisterForm role="space_admin" title="Conta da psicóloga" nextPath="/create-space" />;
}

export function ProfessionalRegisterScreen() {
  return <RegisterForm role="professional" title="Conta da psicóloga" nextPath="/" />;
}

function RegisterForm({
  role,
  title,
  nextPath,
}: {
  role: UserRole;
  title: string;
  nextPath: '/' | '/create-space';
}) {
  const router = useRouter();
  const { apiStatus, lastAuthError, registerUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordsMatch = password === confirmPassword;

  const canSubmit = useMemo(
    () =>
      name.trim().length > 2 &&
      email.trim().length > 4 &&
      password.length >= 6 &&
      passwordsMatch &&
      accepted,
    [accepted, email, name, password, passwordsMatch],
  );

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await registerUser({
        name,
        email,
        phone,
        password,
        role,
      });

      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenScaffold>
      <HeaderBar
        title={title}
        subtitle="Informe seus dados para criar a conta."
        onBack={() => router.back()}
      />

      <View style={styles.formCard}>
        <Field label="Nome completo" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Telefone/WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <Field
          label="Confirmar senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => setAccepted((current) => !current)}
        style={({ pressed }) => [styles.acceptTerms, pressed && styles.pressed]}>
        <View style={[styles.termsBox, accepted && styles.termsBoxSelected]}>
          {accepted && <Ionicons name="checkmark" size={18} color={UI.surface} />}
        </View>
        <Text style={styles.termsText}>
          Aceito os{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
            termos de uso
          </Text>{' '}
          e a{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>
            política de privacidade
          </Text>
          .
        </Text>
      </Pressable>

      {(errorMessage || lastAuthError) && (
        <InfoStrip
          icon="alert-circle-outline"
          title={apiStatus === 'offline' ? 'Consulta indisponível' : 'Verifique o cadastro'}
          text={errorMessage ?? lastAuthError ?? ''}
          tone="warning"
        />
      )}

      {!passwordsMatch && (
        <InfoStrip
          icon="alert-circle-outline"
          title="Senhas diferentes"
          text="A confirmação precisa ser igual à senha informada."
          tone="warning"
        />
      )}

      <PrimaryButton
        label={role === 'space_admin' ? 'Continuar para o consultório' : 'Criar conta'}
        disabled={!canSubmit}
        loading={submitting}
        onPress={handleSubmit}
      />
    </ScreenScaffold>
  );
}

function RoleCard({
  option,
  selected,
  onPress,
}: {
  option: RoleOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        selected && styles.roleCardSelected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.roleIcon}>
        <Ionicons name={option.icon} size={24} color={UI.primary} />
      </View>
      <View style={styles.roleCopy}>
        <Text style={styles.roleTitle}>{option.title}</Text>
        <Text style={styles.roleText}>{option.text}</Text>
      </View>
      <RadioMark selected={selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 260,
    justifyContent: 'center',
    gap: 12,
    padding: 22,
    borderRadius: 22,
    backgroundColor: UI.primary,
  },
  brandMark: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroTitle: {
    color: UI.surface,
    fontSize: 32,
    fontWeight: '900',
  },
  heroText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  actionStack: {
    gap: 10,
  },
  formCard: {
    gap: 13,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  sectionTitle: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '800',
  },
  roleList: {
    gap: 10,
  },
  roleCard: {
    minHeight: 86,
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
  roleCardSelected: {
    borderColor: 'rgba(15, 118, 110, 0.35)',
    backgroundColor: '#F8FFFD',
  },
  roleIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: UI.primarySoft,
  },
  roleCopy: {
    flex: 1,
    gap: 4,
  },
  roleTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },
  roleText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  acceptTerms: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  termsBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: UI.textMuted,
  },
  termsBoxSelected: {
    borderColor: UI.primary,
    backgroundColor: UI.primary,
  },
  termsText: {
    flex: 1,
    color: UI.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  termsLink: {
    color: UI.primary,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.72,
  },
});
