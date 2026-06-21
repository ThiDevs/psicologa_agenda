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
      <LegalCard icon="calendar-outline" title="Marcação" text="A cliente escolhe consulta, psicóloga, data e horário disponíveis. A psicóloga responsável pode confirmar, reagendar, concluir, cancelar ou registrar falta conforme a política publicada no consultório." />
      <LegalCard icon="videocam-outline" title="Atendimento" text="O app organiza a agenda e pode abrir uma sala online externa quando o atendimento for confirmado. O serviço clínico é prestado pela profissional responsável, fora do controle editorial do app." />
      <LegalCard icon="wallet-outline" title="Pagamento" text="Os pagamentos de consultas em tempo real são combinados entre cliente e profissional, usando as formas aceitas pelo consultório. O app não processa cartão, Pix ou cobranças automáticas nesta versão." />
      <LegalCard icon="alert-circle-outline" title="Emergência" text="O app não substitui atendimento de urgência. Em risco imediato, procure serviço de emergência local, SAMU 192, CVV 188 ou uma unidade de saúde." />
      <LegalCard icon="star-outline" title="Avaliações" text="Avaliações ficam disponíveis apenas depois da consulta concluída e são vinculadas ao agendamento real. Comentários ofensivos ou dados sensíveis podem ser removidos." />
    </ScreenScaffold>
  );
}

export function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold>
      <HeaderBar title="Privacidade" subtitle="Como seus dados são usados no atendimento." onBack={() => router.back()} />
      <LegalCard icon="person-outline" title="Dados usados" text="Usamos nome, e-mail, telefone, perfil de uso, consultórios, serviços, agenda, reservas, avaliações e histórico operacional para autenticar a conta e executar os agendamentos." />
      <LegalCard icon="location-outline" title="Localização" text="A localização é opcional e usada apenas para ordenar consultórios próximos quando você solicita esse recurso. Se negar a permissão, a busca continua funcionando por texto e catálogo publicado." />
      <LegalCard icon="images-outline" title="Fotos" text="Psicólogas administradoras podem enviar fotos da galeria do consultório. Essas imagens ficam públicas no catálogo enquanto o consultório estiver publicado." />
      <LegalCard icon="shield-checkmark-outline" title="Segurança" text="Tokens de acesso ficam protegidos no dispositivo. O backend registra ações sensíveis de agenda e configuração para segurança, auditoria e prevenção de abuso." />
      <LegalCard icon="trash-outline" title="Exclusão" text="Você pode iniciar a exclusão da conta pelo perfil. A conta é desativada, dados pessoais de acesso são removidos e registros mínimos de agenda podem ser mantidos quando necessários para segurança, histórico operacional ou obrigação legal." />
      <LegalCard icon="notifications-outline" title="Contato" text="Dúvidas de privacidade e suporte podem ser enviadas para suporte@felicio.app. A política pública da loja deve apontar para a versão web desta tela." />
    </ScreenScaffold>
  );
}

export function SupportScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold>
      <HeaderBar title="Suporte" subtitle="Ajuda para conta, agenda e privacidade." onBack={() => router.back()} />
      <LegalCard icon="mail-outline" title="E-mail" text="Fale com suporte@felicio.app informando o e-mail da conta, o código do agendamento e uma descrição objetiva do problema." />
      <LegalCard icon="lock-closed-outline" title="Conta e dados" text="Pedidos sobre acesso, correção de dados, privacidade ou exclusão de conta são tratados pelo mesmo canal de suporte." />
      <LegalCard icon="time-outline" title="Atendimento" text="Retornamos solicitações de suporte em dias úteis. Para urgências clínicas, use canais de emergência, não o aplicativo." />
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
