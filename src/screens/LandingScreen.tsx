import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardShadow, UI } from '@/components/app-ui';

const heroImage = require('../../assets/images/landing-hero-therapy.png');

type IconName = keyof typeof Ionicons.glyphMap;

const audienceCards: {
  icon: IconName;
  title: string;
  text: string;
  tone: 'teal' | 'indigo' | 'amber';
}[] = [
  {
    icon: 'videocam-outline',
    title: 'Consultas online',
    text: 'A cliente encontra horários, escolhe o tipo de sessão e recebe a confirmação em poucos passos.',
    tone: 'teal',
  },
  {
    icon: 'calendar-outline',
    title: 'Agenda clínica',
    text: 'A psicóloga controla disponibilidade, bloqueios, reagendamentos e histórico de marcações.',
    tone: 'indigo',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Fluxo reservado',
    text: 'Perfis separados, políticas claras e dados de atendimento organizados para a rotina psicóloga.',
    tone: 'amber',
  },
];

const featureCards: {
  icon: IconName;
  title: string;
  text: string;
}[] = [
  {
    icon: 'time-outline',
    title: 'Horários calculados',
    text: 'A disponibilidade considera expediente, agenda da psicóloga, duração da consulta e bloqueios.',
  },
  {
    icon: 'person-outline',
    title: 'Jornada da cliente',
    text: 'Cadastro, escolha de sessão, confirmação, cancelamento, reagendamento e avaliação pós-consulta.',
  },
  {
    icon: 'clipboard-outline',
    title: 'Gestão de consultas',
    text: 'Tipos de atendimento, valores, políticas, pagamentos combinados e painel operacional.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Acesso separado',
    text: 'Cliente, psicóloga e psicóloga usam permissões diferentes para reduzir erro operacional.',
  },
];

const workflowSteps = [
  {
    title: 'Configure o consultório',
    text: 'Cadastre dados públicos, contato, regras, horários e formas de pagamento.',
  },
  {
    title: 'Publique consultas',
    text: 'Crie sessões online, terapia inicial, retorno, supervisão ou orientação parental.',
  },
  {
    title: 'Abra a agenda',
    text: 'Defina expediente, intervalos, bloqueios e antecedência mínima para marcação.',
  },
  {
    title: 'Atenda com controle',
    text: 'Confirme, conclua, registre falta e acompanhe o histórico da cliente.',
  },
];

const faqItems = [
  {
    title: 'Funciona sem API ligada?',
    text: 'Sim. A cópia tem dados locais de demonstração e fallback para marcar consulta no protótipo.',
  },
  {
    title: 'A consulta é online?',
    text: 'A vitrine, os textos e os tipos de atendimento foram adaptados para teleatendimento psicológico.',
  },
  {
    title: 'O pagamento é processado no app?',
    text: 'Neste MVP, a forma de pagamento fica combinada. Integração financeira real exige provedor e webhook.',
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 900;
  const isMobile = width < 760;
  const isCompact = width < 520;
  const heroHeight = Math.max(520, Math.min(660, height * 0.82));

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { minHeight: heroHeight }]}>
          <Image source={heroImage} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroOverlay} />
          <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
            <View style={[styles.heroInner, isWide && styles.wideContent, isMobile && styles.heroInnerMobile]}>
              <View style={styles.navbar}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/')}
                  style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
                  <View style={styles.brandIcon}>
                    <Ionicons name="leaf-outline" size={25} color={UI.surface} />
                  </View>
                  <Text style={styles.brandText}>Psi Agenda Online</Text>
                </Pressable>

                <View style={styles.navActions}>
                  {!isCompact && <NavLink label="Ver consultas" onPress={() => router.push('/explore')} />}
                  <SmallAction label="Entrar" icon="log-in-outline" onPress={() => router.push('/login')} />
                </View>
              </View>

              <View style={[styles.heroContent, isWide && styles.heroContentWide, isMobile && styles.heroContentMobile]}>
                <Text style={styles.eyebrow}>Agenda online para psicologia clínica</Text>
                <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile, isCompact && styles.heroTitleCompact]}>
                  Marcação de consultas online com uma jornada clara e reservada.
                </Text>
                <Text style={[styles.heroText, isMobile && styles.heroTextMobile]}>
                  Uma experiência para psicólogas organizarem agenda, tipos de sessão, clientes, pagamentos
                  combinados e acompanhamento das consultas sem depender de conversas soltas.
                </Text>

                <View style={[styles.heroActions, isWide && styles.heroActionsWide]}>
                  <LandingButton
                    label="Cadastrar consultório"
                    icon="briefcase-outline"
                    onPress={() => router.push('/space-owner-register')}
                  />
                  <LandingButton
                    label="Marcar consulta"
                    icon="calendar-outline"
                    variant="light"
                    onPress={() => router.push('/explore')}
                  />
                </View>

                <View style={styles.heroProofs}>
                  <ProofPill icon="videocam" label="Atendimento online" />
                  <ProofPill icon="shield-checkmark" label="Perfis separados" />
                  <ProofPill icon="repeat" label="Reagendamento" />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <Section tone="white">
          <View style={[styles.sectionInner, isWide && styles.wideContent]}>
            <View style={styles.metricGrid}>
              <Metric value="4" label="tipos de consulta" text="triagem, terapia, retorno e orientação" />
              <Metric value="100%" label="agenda validada" text="sem conflito de horário no fluxo local" />
              <Metric value="1" label="jornada completa" text="da busca ao pós-consulta" />
              <Metric value="0" label="planilhas soltas" text="rotina concentrada no app" />
            </View>
          </View>
        </Section>

        <Section>
          <View style={[styles.sectionInner, isWide && styles.wideContent]}>
            <SectionHeading
              label="Produto"
              title="Consulta online precisa de agenda, contexto e confirmação no mesmo lugar."
              text="A cópia mantém a base de agendamento já existente e troca a vitrine original por uma rotina de telepsicologia, com linguagem adequada para clientes e psicóloga."
            />

            <View style={[styles.audienceGrid, isWide && styles.threeColumns]}>
              {audienceCards.map((card) => (
                <AudienceCard key={card.title} {...card} />
              ))}
            </View>
          </View>
        </Section>

        <Section tone="mint">
          <View style={[styles.sectionInner, isWide && styles.wideContent]}>
            <View style={[styles.splitSection, isWide && styles.splitSectionWide]}>
              <View style={styles.splitCopy}>
                <SectionHeading
                  label="Fluxo"
                  title="Da configuração do consultório à consulta concluída."
                  text="A psicóloga prepara a vitrine, a cliente escolhe um horário e a agenda acompanha cada status de marcação."
                />
                <View style={styles.stepList}>
                  {workflowSteps.map((step, index) => (
                    <StepItem key={step.title} index={index + 1} title={step.title} text={step.text} />
                  ))}
                </View>
              </View>

              <DashboardMockup />
            </View>
          </View>
        </Section>

        <Section>
          <View style={[styles.sectionInner, isWide && styles.wideContent]}>
            <SectionHeading
              label="Recursos"
              title="O essencial para operar consultas online com previsibilidade."
              text="A interface reaproveita agenda, consultas, psicóloga, disponibilidade e confirmação, agora com nomes e dados próprios para psicologia."
            />

            <View style={[styles.featureGrid, isWide && styles.twoColumns]}>
              {featureCards.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </View>
          </View>
        </Section>

        <Section tone="sage">
          <View style={[styles.sectionInner, isWide && styles.wideContent]}>
            <View style={[styles.splitSection, isWide && styles.splitSectionWide]}>
              <MobileMockup />

              <View style={styles.splitCopy}>
                <SectionHeading
                  label="Cliente"
                  title="Menos troca de mensagens para fechar um horário."
                  text="A cliente visualiza tipos de consulta, duração, valor, disponibilidade e política antes de confirmar a marcação."
                />

                <View style={styles.bulletList}>
                  <Bullet icon="search-outline" text="Busca por tipo de consulta e nome do consultório." />
                  <Bullet icon="videocam-outline" text="Sessões online com forma de pagamento combinada." />
                  <Bullet icon="repeat-outline" text="Reagendamento e cancelamento respeitando a política publicada." />
                  <Bullet icon="notifications-outline" text="Avisos internos para manter cliente e psicóloga alinhados." />
                </View>
              </View>
            </View>
          </View>
        </Section>

        <Section tone="white">
          <View style={[styles.sectionInner, isWide && styles.wideContent]}>
            <SectionHeading
              label="Dúvidas"
              title="Pontos rápidos antes de testar."
              text="A proposta desta cópia é deixar o app pronto para validar a marcação de consultas online."
            />

            <View style={styles.faqGrid}>
              {faqItems.map((item) => (
                <FaqCard key={item.title} title={item.title} text={item.text} />
              ))}
            </View>
          </View>
        </Section>

        <View style={styles.footer}>
          <View style={[styles.footerInner, isWide && styles.wideContent]}>
            <View style={styles.footerBrand}>
              <View style={styles.footerIcon}>
                <Ionicons name="leaf-outline" size={23} color={UI.primary} />
              </View>
              <Text style={styles.footerTitle}>Psi Agenda Online</Text>
            </View>
            <Text style={styles.footerText}>
              Agenda, marcação e gestão de consultas para psicólogas que atendem online.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'white' | 'mint' | 'sage';
}) {
  return (
    <View
      style={[
        styles.section,
        tone === 'white' && styles.sectionWhite,
        tone === 'mint' && styles.sectionMint,
        tone === 'sage' && styles.sectionSage,
      ]}>
      {children}
    </View>
  );
}

function SectionHeading({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

function LandingButton({
  label,
  icon,
  variant = 'primary',
  onPress,
}: {
  label: string;
  icon: IconName;
  variant?: 'primary' | 'light' | 'outline';
  onPress: () => void;
}) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.landingButton,
        variant === 'light' && styles.landingButtonLight,
        variant === 'outline' && styles.landingButtonOutline,
        pressed && styles.pressed,
      ]}>
      <Text
        numberOfLines={1}
        style={[
          styles.landingButtonText,
          !isPrimary && styles.landingButtonTextDark,
        ]}>
        {label}
      </Text>
      <Ionicons name={icon} size={20} color={isPrimary ? UI.surface : UI.primary} />
    </Pressable>
  );
}

function SmallAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
      <Text style={styles.smallActionText}>{label}</Text>
      <Ionicons name={icon} size={18} color={UI.surface} />
    </Pressable>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.navLink, pressed && styles.pressed]}>
      <Text style={styles.navLinkText}>{label}</Text>
    </Pressable>
  );
}

function ProofPill({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.proofPill}>
      <Ionicons name={icon} size={17} color="#A7F3D0" />
      <Text style={styles.proofText}>{label}</Text>
    </View>
  );
}

function Metric({
  value,
  label,
  text,
}: {
  value: string;
  label: string;
  text: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricText}>{text}</Text>
    </View>
  );
}

function AudienceCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: IconName;
  title: string;
  text: string;
  tone: 'teal' | 'indigo' | 'amber';
}) {
  return (
    <View style={styles.audienceCard}>
      <View
        style={[
          styles.audienceIcon,
          tone === 'indigo' && styles.audienceIconIndigo,
          tone === 'amber' && styles.audienceIconAmber,
        ]}>
        <Ionicons
          name={icon}
          size={24}
          color={tone === 'indigo' ? '#4338CA' : tone === 'amber' ? '#B45309' : UI.primary}
        />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

function FeatureCard({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={23} color={UI.primary} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

function StepItem({
  index,
  title,
  text,
}: {
  index: number;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index}</Text>
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

function DashboardMockup() {
  return (
    <View style={styles.dashboardMockup}>
      <View style={styles.mockupHeader}>
        <View>
          <Text style={styles.mockupEyebrow}>Hoje</Text>
          <Text style={styles.mockupTitle}>Agenda da psicóloga</Text>
        </View>
        <View style={styles.mockupBadge}>
          <Text style={styles.mockupBadgeText}>Online</Text>
        </View>
      </View>

      <View style={styles.mockupStats}>
        <MiniStat label="Consultas" value="6" />
        <MiniStat label="Ocupação" value="72%" />
        <MiniStat label="Receita" value="R$ 1.140" />
      </View>

      <View style={styles.timelineList}>
        <TimelineRow time="09:00" service="Terapia individual" customer="Marina" status="Confirmada" />
        <TimelineRow time="11:00" service="Triagem online" customer="Rafael" status="Aguardando" />
        <TimelineRow time="15:30" service="Retorno terapêutico" customer="Bianca" status="Pix combinado" />
      </View>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text numberOfLines={1} style={styles.miniStatValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function TimelineRow({
  time,
  service,
  customer,
  status,
}: {
  time: string;
  service: string;
  customer: string;
  status: string;
}) {
  return (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineTime}>{time}</Text>
      <View style={styles.timelineCopy}>
        <Text numberOfLines={1} style={styles.timelineService}>{service}</Text>
        <Text numberOfLines={1} style={styles.timelineCustomer}>{customer}</Text>
      </View>
      <Text numberOfLines={1} style={styles.timelineStatus}>{status}</Text>
    </View>
  );
}

function MobileMockup() {
  return (
    <View style={styles.mobileShell}>
      <View style={styles.mobileTopBar} />
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileTitle}>Escolha seu horário</Text>
        <Text style={styles.mobileSubtitle}>Clínica Online Dra. Helena</Text>
      </View>
      <View style={styles.servicePreview}>
        <View style={styles.serviceIcon}>
          <Ionicons name="videocam-outline" size={22} color={UI.primary} />
        </View>
        <View style={styles.serviceCopy}>
          <Text style={styles.serviceName}>Consulta inicial online</Text>
          <Text style={styles.serviceMeta}>60 min • R$ 220</Text>
        </View>
      </View>
      <View style={styles.slotGrid}>
        {['09:00', '10:30', '13:00', '15:30', '17:00', '18:30'].map((slot, index) => (
          <View key={slot} style={[styles.slotPill, index === 3 && styles.slotPillActive]}>
            <Text style={[styles.slotText, index === 3 && styles.slotTextActive]}>{slot}</Text>
          </View>
        ))}
      </View>
      <View style={styles.mobileButton}>
        <Text style={styles.mobileButtonText}>Confirmar consulta</Text>
        <Ionicons name="arrow-forward" size={18} color={UI.surface} />
      </View>
    </View>
  );
}

function Bullet({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.bulletItem}>
      <View style={styles.bulletIcon}>
        <Ionicons name={icon} size={19} color={UI.primary} />
      </View>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function FaqCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.faqCard}>
      <View style={styles.faqIcon}>
        <Ionicons name="help-circle-outline" size={21} color={UI.primary} />
      </View>
      <View style={styles.faqCopy}>
        <Text style={styles.faqTitle}>{title}</Text>
        <Text style={styles.faqText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F7FAF8',
  },
  scrollContent: {
    backgroundColor: '#F7FAF8',
  },
  hero: {
    overflow: 'hidden',
    backgroundColor: '#153F41',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 22, 25, 0.48)',
  },
  heroSafeArea: {
    flex: 1,
  },
  heroInner: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
    gap: 26,
    paddingHorizontal: 18,
    paddingBottom: 34,
  },
  heroInnerMobile: {
    gap: 18,
    paddingBottom: 24,
  },
  wideContent: {
    maxWidth: 1180,
  },
  navbar: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  brandIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.17)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  brandText: {
    color: UI.surface,
    fontSize: 18,
    fontWeight: '900',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexShrink: 1,
  },
  navLink: {
    minHeight: 40,
    justifyContent: 'center',
  },
  navLinkText: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 14,
    fontWeight: '800',
  },
  smallAction: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  smallActionText: {
    color: UI.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  heroContent: {
    maxWidth: 680,
    gap: 18,
  },
  heroContentMobile: {
    gap: 14,
  },
  heroContentWide: {
    paddingVertical: 34,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    color: '#D1FAE5',
    fontSize: 13,
    fontWeight: '900',
  },
  heroTitle: {
    color: UI.surface,
    fontSize: 48,
    lineHeight: 55,
    fontWeight: '900',
  },
  heroTitleMobile: {
    fontSize: 38,
    lineHeight: 44,
  },
  heroTitleCompact: {
    fontSize: 33,
    lineHeight: 39,
  },
  heroText: {
    maxWidth: 620,
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
  },
  heroTextMobile: {
    fontSize: 15,
    lineHeight: 22,
  },
  heroActions: {
    gap: 10,
  },
  heroActionsWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landingButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: UI.primary,
    boxShadow: '0 18px 34px rgba(15, 118, 110, 0.26)',
  },
  landingButtonLight: {
    backgroundColor: UI.surface,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
  },
  landingButtonOutline: {
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.28)',
    backgroundColor: UI.surface,
    boxShadow: 'none',
  },
  landingButtonText: {
    color: UI.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  landingButtonTextDark: {
    color: UI.primary,
  },
  heroProofs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: 620,
  },
  proofPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  proofText: {
    color: UI.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#F7FAF8',
  },
  sectionWhite: {
    backgroundColor: UI.surface,
  },
  sectionMint: {
    backgroundColor: '#EFFAF5',
  },
  sectionSage: {
    backgroundColor: '#F6F8EF',
  },
  sectionInner: {
    width: '100%',
    alignSelf: 'center',
    gap: 28,
    paddingHorizontal: 18,
    paddingVertical: 58,
  },
  sectionHeading: {
    maxWidth: 720,
    gap: 10,
  },
  sectionLabel: {
    color: UI.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: UI.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  sectionText: {
    color: UI.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 180,
    gap: 5,
    minHeight: 128,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  metricValue: {
    color: UI.primary,
    fontSize: 34,
    fontWeight: '900',
  },
  metricLabel: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  metricText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  audienceGrid: {
    gap: 12,
  },
  threeColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  twoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  audienceCard: {
    flexGrow: 1,
    flexBasis: 260,
    gap: 12,
    minHeight: 210,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  audienceIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  audienceIconIndigo: {
    backgroundColor: '#E0E7FF',
  },
  audienceIconAmber: {
    backgroundColor: '#FEF3C7',
  },
  cardTitle: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cardText: {
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  splitSection: {
    gap: 28,
  },
  splitSectionWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitCopy: {
    flex: 1,
    gap: 22,
    minWidth: 0,
  },
  stepList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(4, 120, 87, 0.14)',
    backgroundColor: UI.surface,
  },
  stepNumber: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  stepNumberText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '900',
  },
  stepCopy: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  stepText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  dashboardMockup: {
    flex: 1,
    minWidth: 280,
    maxWidth: 520,
    gap: 16,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(4, 120, 87, 0.13)',
    backgroundColor: UI.surface,
    boxShadow: '0 24px 52px rgba(15, 23, 42, 0.13)',
  },
  mockupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mockupEyebrow: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  mockupTitle: {
    color: UI.text,
    fontSize: 20,
    fontWeight: '900',
  },
  mockupBadge: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
  },
  mockupBadgeText: {
    color: UI.success,
    fontSize: 12,
    fontWeight: '900',
  },
  mockupStats: {
    flexDirection: 'row',
    gap: 9,
  },
  miniStat: {
    flex: 1,
    gap: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  miniStatValue: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '900',
  },
  miniStatLabel: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  timelineList: {
    gap: 9,
  },
  timelineRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  timelineTime: {
    width: 48,
    color: UI.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  timelineService: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },
  timelineCustomer: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineStatus: {
    maxWidth: 116,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    color: UI.primary,
    backgroundColor: UI.primarySoft,
    fontSize: 11,
    fontWeight: '900',
  },
  featureGrid: {
    gap: 12,
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: 300,
    gap: 12,
    minHeight: 190,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  featureIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  mobileShell: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 28,
    borderWidth: 8,
    borderColor: '#111827',
    backgroundColor: '#F8FAFC',
    boxShadow: '0 26px 54px rgba(15, 23, 42, 0.18)',
  },
  mobileTopBar: {
    alignSelf: 'center',
    width: 76,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  mobileHeader: {
    gap: 4,
  },
  mobileTitle: {
    color: UI.text,
    fontSize: 20,
    fontWeight: '900',
  },
  mobileSubtitle: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  servicePreview: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 8,
    backgroundColor: UI.surface,
  },
  serviceIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  serviceCopy: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  serviceMeta: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  slotPill: {
    flexGrow: 1,
    minWidth: 92,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.surface,
  },
  slotPillActive: {
    backgroundColor: UI.primary,
  },
  slotText: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '900',
  },
  slotTextActive: {
    color: UI.surface,
  },
  mobileButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: UI.primary,
  },
  mobileButtonText: {
    color: UI.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  bulletList: {
    gap: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  bulletIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  bulletText: {
    flex: 1,
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  faqGrid: {
    gap: 12,
  },
  faqCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  faqIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  faqCopy: {
    flex: 1,
    gap: 4,
  },
  faqTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },
  faqText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: UI.surface,
  },
  footerInner: {
    width: '100%',
    alignSelf: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: UI.primarySoft,
  },
  footerTitle: {
    color: UI.text,
    fontSize: 17,
    fontWeight: '900',
  },
  footerText: {
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.74,
  },
});
