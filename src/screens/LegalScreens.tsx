import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cardShadow, HeaderBar, ScreenScaffold, UI } from '@/components/app-ui';

export function TermsScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold>
      <HeaderBar title="Termos de uso" subtitle="Regras para marcação de consultas e atendimento." onBack={() => router.back()} />
      <LegalCard icon="calendar-outline" title="Marcação" text="A cliente escolhe consulta, psicóloga, data e horário disponíveis. A psicóloga pode confirmar, concluir, cancelar ou registrar falta conforme a política publicada." />
      <LegalCard icon="wallet-outline" title="Pagamento" text="O pagamento é combinado conforme as formas aceitas pela psicóloga e informado durante a reserva." />
      <LegalCard icon="star-outline" title="Avaliações" text="Avaliações ficam disponíveis apenas depois da consulta concluída e são vinculadas ao agendamento real." />
    </ScreenScaffold>
  );
}

export function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold>
      <HeaderBar title="Privacidade" subtitle="Como seus dados são usados no atendimento." onBack={() => router.back()} />
      <LegalCard icon="person-outline" title="Dados usados" text="O app usa nome, e-mail, telefone, consultório, consulta e agenda para autenticação, reserva e gestão do atendimento." />
      <LegalCard icon="shield-checkmark-outline" title="Controle" text="Seus dados de acesso ficam protegidos no dispositivo. Ações sensíveis de agenda e configuração são registradas para segurança." />
      <LegalCard icon="notifications-outline" title="Notificações" text="Os avisos do app podem ser configurados pela psicóloga responsável." />
    </ScreenScaffold>
  );
}

function LegalCard({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={22} color={UI.primary} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  title: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  text: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
