import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  EmptyState,
  Field,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  ScreenScaffold,
  SectionTitle,
} from '@/components/app-ui';
import {
  completePatientCareTask,
  getApiErrorMessage,
  getPatientCarePortal,
  respondPatientCheckIn,
  updatePatientPortalConsent,
  updatePatientSensitiveConsent,
  type ApiPatientConsentEvent,
  type ApiPatientConsentStatus,
  type ApiPatientCarePortal,
  type ApiPatientCheckIn,
  type ApiPatientPortalConsent,
  type ApiPatientTask,
  type ApiSharedMaterial,
} from '@/services/api-client';

const CARE_COLORS = {
  canvas: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceBlue: '#F5F9FC',
  surfaceSage: '#F5FAF7',
  ink: '#0F2340',
  muted: '#607085',
  border: 'rgba(15, 35, 64, 0.10)',
  primary: '#064A8A',
  primarySoft: '#E7F0FA',
  sage: '#2B9A72',
  sageSoft: '#EAF6F0',
  amber: '#C77A1B',
  amberSoft: '#FFF5E6',
  danger: '#B42318',
  dangerSoft: '#FDECEC',
} as const;

export function PatientCarePortalScreen() {
  const router = useRouter();
  const [portal, setPortal] = useState<ApiPatientCarePortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [portalMessage, setPortalMessage] = useState<string | null>(null);
  const [portalMessageTone, setPortalMessageTone] = useState<'success' | 'warning'>('success');
  const [taskResponses, setTaskResponses] = useState<Record<string, string>>({});
  const [checkInResponses, setCheckInResponses] = useState<Record<string, string>>({});
  const [checkInMoodScores, setCheckInMoodScores] = useState<Record<string, number>>({});
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [respondingCheckInId, setRespondingCheckInId] = useState<string | null>(null);
  const [savingConsentKey, setSavingConsentKey] = useState<string | null>(null);

  const loadPortal = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await getPatientCarePortal();
      setPortal(data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  async function completeTask(task: ApiPatientTask) {
    const responseText = taskResponses[task.id]?.trim() || null;

    setCompletingTaskId(task.id);
    setPortalMessage(null);
    setErrorMessage(null);

    try {
      await completePatientCareTask(task.id, { responseText });
      setTaskResponses((current) => {
        const next = { ...current };
        delete next[task.id];

        return next;
      });
      await loadPortal(false);
      setPortalMessageTone('success');
      setPortalMessage(responseText
        ? 'Resposta enviada para revisão da sua psicóloga.'
        : 'Tarefa marcada como concluída.');
    } catch (error) {
      setPortalMessageTone('warning');
      setPortalMessage(getApiErrorMessage(error));
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function updateConsent(
    consent: ApiPatientPortalConsent,
    status: ApiPatientConsentStatus,
    sensitive = false,
  ) {
    const key = consentKey(consent);

    setSavingConsentKey(key);
    setPortalMessage(null);
    setErrorMessage(null);

    try {
      const update = sensitive ? updatePatientSensitiveConsent : updatePatientPortalConsent;

      await update(consent.professionalId, consent.consentType, {
        status,
        termsVersion: consent.termsVersion || 'clinical-consent-v1',
      });
      await loadPortal(false);
      setPortalMessageTone('success');
      let successMessage = 'Consentimento revogado para próximos usos.';
      if (status === 'granted') {
        successMessage = 'Consentimento concedido para próximos usos.';
      } else if (sensitive) {
        successMessage = 'Consentimento sensível recusado para próximos usos.';
      }
      setPortalMessage(successMessage);
    } catch (error) {
      setPortalMessageTone('warning');
      setPortalMessage(getApiErrorMessage(error));
    } finally {
      setSavingConsentKey(null);
    }
  }

  async function respondCheckIn(checkIn: ApiPatientCheckIn) {
    const moodScore = checkInMoodScores[checkIn.id] ?? 3;
    const responseText = checkInResponses[checkIn.id]?.trim() || null;

    setRespondingCheckInId(checkIn.id);
    setPortalMessage(null);
    setErrorMessage(null);

    try {
      await respondPatientCheckIn(checkIn.id, { moodScore, responseText });
      setCheckInResponses((current) => {
        const next = { ...current };
        delete next[checkIn.id];

        return next;
      });
      setCheckInMoodScores((current) => {
        const next = { ...current };
        delete next[checkIn.id];

        return next;
      });
      await loadPortal(false);
      setPortalMessageTone('success');
      setPortalMessage('Check-in enviado para revisão da sua psicóloga.');
    } catch (error) {
      setPortalMessageTone('warning');
      setPortalMessage(getApiErrorMessage(error));
    } finally {
      setRespondingCheckInId(null);
    }
  }

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const tasks = portal?.tasks ?? [];
  const materials = portal?.materials ?? [];
  const checkIns = portal?.checkIns ?? [];
  const consents = portal?.consents ?? [];
  const sensitiveConsents = portal?.sensitiveConsents ?? [];
  const consentHistory = (portal?.consentHistory ?? []).slice(0, 8);
  const openTasks = tasks.filter((task) => task.status !== 'completed');
  const openCheckIns = checkIns.filter((checkIn) => checkIn.status !== 'answered');
  const grantedConsentCount = consents.filter((consent) => consent.status === 'granted').length;
  const pendingSensitiveConsentCount = sensitiveConsents.filter((consent) => consent.status === 'pending').length;

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Meu acompanhamento"
        subtitle="Tarefas, check-ins e materiais liberados pela sua psicóloga"
        onBack={() => router.back()}
      />

      {errorMessage ? (
        <InfoStrip
          icon="cloud-offline-outline"
          title="Acompanhamento indisponível"
          text={errorMessage}
          tone="warning"
        />
      ) : (
        <InfoStrip
          icon="shield-checkmark-outline"
          title="Conteúdo compartilhado"
          text="Aqui aparecem somente itens liberados pela sua psicóloga para o seu acompanhamento."
        />
      )}
      {portalMessage ? (
        <InfoStrip
          icon="checkmark-circle-outline"
          title="Acompanhamento"
          text={portalMessage}
          tone={portalMessageTone}
        />
      ) : null}

      {loading ? (
        <View style={styles.card}>
          <EmptyState
            icon="hourglass-outline"
            title="Carregando"
            text="Buscando seu acompanhamento."
          />
        </View>
      ) : errorMessage ? (
        <View style={styles.card}>
          <PrimaryButton
            label="Tentar novamente"
            icon="refresh-outline"
            onPress={loadPortal}
          />
        </View>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <SummaryTile icon="checkbox-outline" label="Tarefas abertas" value={String(openTasks.length)} />
            <SummaryTile icon="pulse-outline" label="Check-ins" value={String(openCheckIns.length)} />
            <SummaryTile icon="library-outline" label="Materiais" value={String(materials.length)} />
          </View>

          <SectionTitle title="Tarefas combinadas" actionLabel={`${tasks.length} itens`} />
          <View style={styles.card}>
            {tasks.length ? (
              tasks.map((task, index) => (
                <PatientTaskRow
                  key={task.id}
                  task={task}
                  isFirst={index === 0}
                  responseText={taskResponses[task.id] ?? ''}
                  saving={completingTaskId === task.id}
                  onChangeResponse={(value) => {
                    setTaskResponses((current) => ({
                      ...current,
                      [task.id]: value,
                    }));
                  }}
                  onComplete={() => completeTask(task)}
                />
              ))
            ) : (
              <EmptyState
                icon="checkbox-outline"
                title="Sem tarefas abertas"
                text="Quando uma tarefa for liberada, ela aparecerá aqui."
              />
            )}
          </View>

          <SectionTitle title="Check-ins" actionLabel={`${checkIns.length} itens`} />
          <View style={styles.card}>
            {checkIns.length ? (
              checkIns.map((checkIn, index) => (
                <PatientCheckInRow
                  key={checkIn.id}
                  checkIn={checkIn}
                  isFirst={index === 0}
                  moodScore={checkInMoodScores[checkIn.id] ?? 3}
                  responseText={checkInResponses[checkIn.id] ?? ''}
                  saving={respondingCheckInId === checkIn.id}
                  onChangeMoodScore={(value) => {
                    setCheckInMoodScores((current) => ({
                      ...current,
                      [checkIn.id]: value,
                    }));
                  }}
                  onChangeResponse={(value) => {
                    setCheckInResponses((current) => ({
                      ...current,
                      [checkIn.id]: value,
                    }));
                  }}
                  onRespond={() => respondCheckIn(checkIn)}
                />
              ))
            ) : (
              <EmptyState
                icon="pulse-outline"
                title="Sem check-ins abertos"
                text="Quando sua psicóloga liberar um check-in, ele aparecerá aqui."
              />
            )}
          </View>

          <SectionTitle title="Materiais liberados" actionLabel={`${materials.length} itens`} />
          <View style={styles.card}>
            {materials.length ? (
              materials.map((material, index) => (
                <SharedMaterialRow
                  key={material.id}
                  material={material}
                  isFirst={index === 0}
                />
              ))
            ) : (
              <EmptyState
                icon="library-outline"
                title="Sem materiais liberados"
                text="Materiais enviados pela psicóloga aparecerão nesta área."
              />
            )}
          </View>

          <SectionTitle
            title="Consentimentos"
            actionLabel={consents.length ? `${grantedConsentCount}/${consents.length} ativos` : 'sem vínculo'}
          />
          <View style={styles.card}>
            {consents.length ? (
              consents.map((consent, index) => (
                <PatientConsentRow
                  key={consentKey(consent)}
                  consent={consent}
                  isFirst={index === 0}
                  saving={savingConsentKey === consentKey(consent)}
                  disabled={savingConsentKey !== null}
                  onGrant={() => updateConsent(consent, 'granted')}
                  onRevoke={() => updateConsent(consent, 'revoked')}
                />
              ))
            ) : (
              <EmptyState
                icon="shield-checkmark-outline"
                title="Sem consentimentos"
                text="Quando houver um vínculo de atendimento, seus consentimentos aparecerão aqui."
              />
            )}
          </View>

          <SectionTitle
            title="Consentimentos sensíveis"
            actionLabel={sensitiveConsents.length ? `${pendingSensitiveConsentCount} pendentes` : 'nenhum pedido'}
          />
          <View style={styles.card}>
            {sensitiveConsents.length ? (
              sensitiveConsents.map((consent, index) => (
                <PatientConsentRow
                  key={consentKey(consent)}
                  consent={consent}
                  isFirst={index === 0}
                  saving={savingConsentKey === consentKey(consent)}
                  disabled={savingConsentKey !== null}
                  sensitive
                  onGrant={() => updateConsent(consent, 'granted', true)}
                  onRevoke={() => updateConsent(consent, 'revoked', true)}
                />
              ))
            ) : (
              <EmptyState
                icon="lock-closed-outline"
                title="Sem pedidos sensíveis"
                text="Pedidos de IA, gravação ou transcrição aparecerão aqui para sua decisão explícita."
              />
            )}
          </View>

          <SectionTitle
            title="Histórico de consentimentos"
            actionLabel={consentHistory.length ? `${consentHistory.length} recentes` : 'sem eventos'}
          />
          <View style={styles.card}>
            {consentHistory.length ? (
              <>
                <Text style={styles.rowText}>
                  Registro técnico de solicitações, concessões e revogações, sem conteúdo clínico.
                </Text>
                {consentHistory.map((event, index) => (
                  <PatientConsentHistoryRow
                    key={event.id}
                    event={event}
                    isFirst={index === 0}
                  />
                ))}
              </>
            ) : (
              <EmptyState
                icon="document-text-outline"
                title="Sem histórico ainda"
                text="Quando você decidir ou revogar um consentimento, a versão dos termos aparecerá aqui."
              />
            )}
          </View>

          <SectionTitle title="Linha do cuidado" />
          <View style={styles.careTimeline}>
            <CareStep icon="calendar-outline" title="Sessão" text="Acompanhe seus horários" done />
            <CareStep icon="checkbox-outline" title="Tarefas" text={openTasks.length ? 'Em andamento' : 'Sem pendências'} current={openTasks.length > 0} />
            <CareStep icon="pulse-outline" title="Check-ins" text={openCheckIns.length ? 'A responder' : 'Em dia'} current={openTasks.length === 0 && openCheckIns.length > 0} />
            <CareStep icon="library-outline" title="Materiais" text={materials.length ? 'Disponíveis' : 'Aguardando'} current={openTasks.length === 0 && openCheckIns.length === 0 && materials.length > 0} />
          </View>
        </>
      )}
    </ScreenScaffold>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={19} color={CARE_COLORS.primary} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function PatientTaskRow({
  task,
  isFirst,
  responseText,
  saving,
  onChangeResponse,
  onComplete,
}: {
  task: ApiPatientTask;
  isFirst: boolean;
  responseText: string;
  saving: boolean;
  onChangeResponse: (value: string) => void;
  onComplete: () => void;
}) {
  const completed = task.status === 'completed';

  return (
    <View style={[styles.listRow, isFirst && styles.listRowFirst]}>
      <View style={styles.rowIcon}>
        <Ionicons name={completed ? 'checkmark' : 'checkbox-outline'} size={18} color={CARE_COLORS.primary} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{task.title}</Text>
          <View style={[styles.statusPill, completed && styles.completedPill]}>
            <Text style={[styles.statusText, completed && styles.completedStatusText]}>
              {completed ? 'Concluída' : 'Aberta'}
            </Text>
          </View>
        </View>
        {task.description ? (
          <Text style={styles.rowText}>{task.description}</Text>
        ) : null}
        <Text style={styles.rowMeta}>
          {task.completedAt
            ? `Concluída em ${formatDateLabel(task.completedAt)}`
            : task.dueAt
            ? `Prazo ${formatDateLabel(task.dueAt)}`
            : 'Sem prazo definido'} · {task.acceptsResponse ? 'aceita resposta' : 'sem resposta'}
        </Text>
        {completed && task.responseText ? (
          <View style={styles.responseBox}>
            <Text style={styles.responseLabel}>Sua resposta</Text>
            <Text style={styles.responseText}>{task.responseText}</Text>
          </View>
        ) : null}
        {!completed && task.acceptsResponse ? (
          <Field
            label="Resposta opcional"
            value={responseText}
            multiline
            maxLength={2000}
            autoCapitalize="sentences"
            editable={!saving}
            style={styles.responseInput}
            onChangeText={onChangeResponse}
            placeholder="Escreva uma observação breve, se quiser."
          />
        ) : null}
        {!completed ? (
          <PrimaryButton
            label={task.acceptsResponse ? 'Enviar e concluir' : 'Marcar como feita'}
            icon="checkmark-circle-outline"
            loading={saving}
            onPress={onComplete}
          />
        ) : null}
      </View>
    </View>
  );
}

function PatientCheckInRow({
  checkIn,
  isFirst,
  moodScore,
  responseText,
  saving,
  onChangeMoodScore,
  onChangeResponse,
  onRespond,
}: {
  checkIn: ApiPatientCheckIn;
  isFirst: boolean;
  moodScore: number;
  responseText: string;
  saving: boolean;
  onChangeMoodScore: (value: number) => void;
  onChangeResponse: (value: string) => void;
  onRespond: () => void;
}) {
  const answered = checkIn.status === 'answered';
  const selectedMood = checkIn.moodScore ?? moodScore;

  return (
    <View style={[styles.listRow, isFirst && styles.listRowFirst]}>
      <View style={styles.rowIcon}>
        <Ionicons name={answered ? 'checkmark' : 'pulse-outline'} size={18} color={CARE_COLORS.primary} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{checkIn.prompt}</Text>
          <View style={[styles.statusPill, answered && styles.completedPill]}>
            <Text style={[styles.statusText, answered && styles.completedStatusText]}>
              {answered ? 'Respondido' : 'Aberto'}
            </Text>
          </View>
        </View>
        {checkIn.contextNote ? (
          <Text style={styles.rowText}>{checkIn.contextNote}</Text>
        ) : null}
        <Text style={styles.rowMeta}>
          {answered && checkIn.respondedAt
            ? `Respondido em ${formatDateLabel(checkIn.respondedAt)}`
            : checkIn.dueAt
            ? `Prazo ${formatDateLabel(checkIn.dueAt)}`
            : 'Sem prazo definido'} · escala de 1 a 5
        </Text>
        <View style={styles.moodScale}>
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = selectedMood === value;

            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={answered || saving}
                onPress={() => onChangeMoodScore(value)}
                style={({ pressed }) => [
                  styles.moodButton,
                  selected && styles.moodButtonSelected,
                  (answered || saving) && styles.moodButtonDisabled,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.moodButtonText, selected && styles.moodButtonTextSelected]}>{value}</Text>
              </Pressable>
            );
          })}
        </View>
        {answered ? (
          <View style={styles.responseBox}>
            <Text style={styles.responseLabel}>Sua resposta</Text>
            <Text style={styles.responseText}>Escala emocional: {checkIn.moodScore ?? '-'} de 5</Text>
            {checkIn.responseText ? <Text style={styles.responseText}>{checkIn.responseText}</Text> : null}
          </View>
        ) : (
          <>
            <Field
              label="Observação opcional"
              value={responseText}
              multiline
              maxLength={2000}
              autoCapitalize="sentences"
              editable={!saving}
              style={styles.responseInput}
              onChangeText={onChangeResponse}
              placeholder="Escreva algo breve, se quiser."
            />
            <PrimaryButton
              label="Enviar check-in"
              icon="send-outline"
              loading={saving}
              onPress={onRespond}
            />
          </>
        )}
      </View>
    </View>
  );
}

function SharedMaterialRow({
  material,
  isFirst,
}: {
  material: ApiSharedMaterial;
  isFirst: boolean;
}) {
  const isLink = material.materialType === 'link' && Boolean(material.url);

  async function openMaterial() {
    if (!material.url) {
      return;
    }

    await Linking.openURL(material.url);
  }

  return (
    <View style={[styles.listRow, isFirst && styles.listRowFirst]}>
      <View style={styles.rowIcon}>
        <Ionicons name={isLink ? 'link-outline' : 'document-text-outline'} size={18} color={CARE_COLORS.primary} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{material.title}</Text>
          <View style={[styles.statusPill, styles.materialPill]}>
            <Text style={[styles.statusText, styles.materialStatusText]}>
              {material.materialType === 'link' ? 'Link' : 'Texto'}
            </Text>
          </View>
        </View>
        {material.description ? (
          <Text style={styles.rowText}>{material.description}</Text>
        ) : null}
        <Text style={styles.rowMeta}>
          {material.sharedAt ? `Liberado em ${formatDateLabel(material.sharedAt)}` : 'Liberado pela psicóloga'}
        </Text>
        {isLink ? (
          <Pressable
            accessibilityRole="link"
            onPress={openMaterial}
            style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={styles.linkButtonText}>{material.url}</Text>
            <Ionicons name="open-outline" size={15} color={CARE_COLORS.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PatientConsentRow({
  consent,
  isFirst,
  saving,
  disabled,
  sensitive,
  onGrant,
  onRevoke,
}: {
  consent: ApiPatientPortalConsent;
  isFirst: boolean;
  saving: boolean;
  disabled: boolean;
  sensitive?: boolean;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  const granted = consent.status === 'granted';
  const revoked = consent.status === 'revoked';
  const statusColor = consentStatusColor(consent.status);
  const statusDate = consent.grantedAt ?? consent.revokedAt ?? consent.updatedAt;
  const revokeLabel = sensitive && !granted ? 'Recusar' : 'Revogar';

  return (
    <View style={[styles.listRow, isFirst && styles.listRowFirst]}>
      <View style={[styles.rowIcon, granted && styles.consentIconGranted, revoked && styles.consentIconRevoked]}>
        <Ionicons name={consentStatusIcon(consent.status)} size={18} color={statusColor} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{consentTypeLabel(consent.consentType)}</Text>
          <View style={[styles.statusPill, styles.consentStatusPill]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {consentStatusLabel(consent.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.rowText}>{consentTypeDescription(consent.consentType)}</Text>
        <Text style={styles.rowMeta}>
          {consent.professionalName} · {consent.spaceName}
          {statusDate ? ` · ${formatDateLabel(statusDate)}` : ''}
        </Text>
        <Text style={styles.consentTerms}>Termos {consent.termsVersion}</Text>
        <View style={styles.consentActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Conceder ${consentTypeLabel(consent.consentType)}`}
            disabled={disabled || granted}
            onPress={onGrant}
            style={({ pressed }) => [
              styles.consentButton,
              styles.consentButtonPrimary,
              (disabled || granted) && styles.consentButtonDisabled,
              pressed && styles.pressed,
            ]}>
            <Ionicons name="checkmark-outline" size={14} color={CARE_COLORS.surface} />
            <Text style={styles.consentButtonTextPrimary}>{saving ? 'Salvando' : 'Conceder'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${revokeLabel} ${consentTypeLabel(consent.consentType)}`}
            disabled={disabled || revoked}
            onPress={onRevoke}
            style={({ pressed }) => [
              styles.consentButton,
              styles.consentButtonMuted,
              (disabled || revoked) && styles.consentButtonDisabled,
              pressed && styles.pressed,
            ]}>
            <Ionicons name="close-outline" size={14} color={CARE_COLORS.primary} />
            <Text style={styles.consentButtonText}>{revokeLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PatientConsentHistoryRow({
  event,
  isFirst,
}: {
  event: ApiPatientConsentEvent;
  isFirst: boolean;
}) {
  const statusColor = consentStatusColor(event.status);
  const icon: keyof typeof Ionicons.glyphMap =
    event.action === 'requested' ? 'send-outline' : consentStatusIcon(event.status);

  return (
    <View style={[styles.listRow, isFirst && styles.listRowFirst]}>
      <View style={[styles.rowIcon, event.status === 'granted' && styles.consentIconGranted, event.status === 'revoked' && styles.consentIconRevoked]}>
        <Ionicons name={icon} size={18} color={statusColor} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{consentTypeLabel(event.consentType)}</Text>
          <View style={[styles.statusPill, styles.consentStatusPill]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {consentActionLabel(event.action)}
            </Text>
          </View>
        </View>
        <Text style={styles.rowText}>Estado final: {consentStatusLabel(event.status)}</Text>
        <Text style={styles.rowMeta}>
          {formatDateLabel(event.createdAt)} · Termos {event.termsVersion}
        </Text>
      </View>
    </View>
  );
}

function CareStep({
  done,
  current,
  icon,
  title,
  text,
}: {
  done?: boolean;
  current?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.careStep}>
      <View style={[styles.careStepIcon, done && styles.careStepDone, current && styles.careStepCurrent]}>
        <Ionicons
          name={icon}
          size={18}
          color={done || current ? CARE_COLORS.surface : CARE_COLORS.muted}
        />
      </View>
      <Text numberOfLines={1} style={styles.careStepTitle}>{title}</Text>
      <Text numberOfLines={1} style={styles.careStepText}>{text}</Text>
    </View>
  );
}

function consentKey(consent: ApiPatientPortalConsent) {
  return `${consent.professionalId}:${consent.consentType}`;
}

function consentTypeLabel(consentType: string) {
  const labels: Record<string, string> = {
    portal: 'Portal do paciente',
    materials: 'Materiais compartilhados',
    checkins: 'Check-ins',
    notifications: 'Notificações',
    ai_analysis: 'Análise por IA',
    recording: 'Gravação',
    transcription: 'Transcrição',
  };

  return labels[consentType] ?? consentType;
}

function consentTypeDescription(consentType: string) {
  const descriptions: Record<string, string> = {
    portal: 'Permite usar esta área para acompanhar itens liberados.',
    materials: 'Permite receber materiais escolhidos pela psicóloga.',
    checkins: 'Permite responder check-ins de acompanhamento quando forem ativados.',
    notifications: 'Permite receber avisos relacionados ao seu cuidado.',
    ai_analysis: 'Permite usar IA apenas como apoio a rascunhos e sugestões revisadas pela psicóloga.',
    recording: 'Permite gravar sessão ou chamada quando esse recurso estiver disponível.',
    transcription: 'Permite transcrever áudio para apoio clínico revisado pela psicóloga.',
  };

  return descriptions[consentType] ?? 'Consentimento granular do seu acompanhamento.';
}

function consentStatusLabel(status: ApiPatientConsentStatus) {
  return {
    granted: 'Concedido',
    revoked: 'Revogado',
    expired: 'Expirado',
    pending: 'Pendente',
  }[status];
}

function consentActionLabel(action: string) {
  switch (action) {
    case 'requested':
      return 'Solicitado';
    case 'granted':
      return 'Concedido';
    case 'revoked':
      return 'Revogado';
    case 'expired':
      return 'Expirado';
    case 'pending':
      return 'Atualizado';
    default:
      return action;
  }
}

function consentStatusIcon(status: ApiPatientConsentStatus): keyof typeof Ionicons.glyphMap {
  if (status === 'granted') {
    return 'shield-checkmark-outline';
  }

  if (status === 'revoked') {
    return 'close-circle-outline';
  }

  if (status === 'expired') {
    return 'time-outline';
  }

  return 'shield-outline';
}

function consentStatusColor(status: ApiPatientConsentStatus) {
  if (status === 'granted') {
    return CARE_COLORS.sage;
  }

  if (status === 'revoked') {
    return CARE_COLORS.danger;
  }

  if (status === 'expired') {
    return CARE_COLORS.amber;
  }

  return CARE_COLORS.primary;
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryTile: {
    flex: 1,
    minHeight: 96,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 5,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surfaceBlue,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  summaryValue: {
    color: CARE_COLORS.ink,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '600',
  },
  summaryLabel: {
    color: CARE_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  listRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 13,
    marginTop: 13,
    borderTopWidth: 1,
    borderTopColor: CARE_COLORS.border,
  },
  listRowFirst: {
    paddingTop: 0,
    marginTop: 0,
    borderTopWidth: 0,
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rowHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    minWidth: 160,
    color: CARE_COLORS.ink,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  rowText: {
    color: CARE_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  rowMeta: {
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: CARE_COLORS.sageSoft,
  },
  statusText: {
    color: CARE_COLORS.sage,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  completedPill: {
    backgroundColor: CARE_COLORS.primarySoft,
  },
  completedStatusText: {
    color: CARE_COLORS.primary,
  },
  responseInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  responseBox: {
    gap: 4,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surfaceSage,
  },
  responseLabel: {
    color: CARE_COLORS.sage,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  responseText: {
    color: CARE_COLORS.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  moodScale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingVertical: 3,
  },
  moodButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  moodButtonSelected: {
    borderColor: CARE_COLORS.primary,
    backgroundColor: CARE_COLORS.primarySoft,
  },
  moodButtonDisabled: {
    opacity: 0.72,
  },
  moodButtonText: {
    color: CARE_COLORS.muted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  moodButtonTextSelected: {
    color: CARE_COLORS.primary,
  },
  materialPill: {
    backgroundColor: CARE_COLORS.amberSoft,
  },
  materialStatusText: {
    color: CARE_COLORS.amber,
  },
  consentIconGranted: {
    backgroundColor: CARE_COLORS.sageSoft,
  },
  consentIconRevoked: {
    backgroundColor: CARE_COLORS.dangerSoft,
  },
  consentStatusPill: {
    backgroundColor: CARE_COLORS.surface,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
  },
  consentTerms: {
    color: CARE_COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  consentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  consentButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  consentButtonPrimary: {
    borderColor: CARE_COLORS.primary,
    backgroundColor: CARE_COLORS.primary,
  },
  consentButtonMuted: {
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surfaceBlue,
  },
  consentButtonDisabled: {
    opacity: 0.46,
  },
  consentButtonText: {
    color: CARE_COLORS.primary,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  consentButtonTextPrimary: {
    color: CARE_COLORS.surface,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  linkButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surfaceBlue,
  },
  linkButtonText: {
    maxWidth: 240,
    color: CARE_COLORS.primary,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  careTimeline: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARE_COLORS.border,
    backgroundColor: CARE_COLORS.surface,
  },
  careStep: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 5,
  },
  careStepIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#D8E1EA',
  },
  careStepDone: {
    backgroundColor: CARE_COLORS.sage,
  },
  careStepCurrent: {
    backgroundColor: CARE_COLORS.primary,
  },
  careStepTitle: {
    maxWidth: '100%',
    color: CARE_COLORS.ink,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  careStepText: {
    maxWidth: '100%',
    color: CARE_COLORS.muted,
    fontSize: 12.5,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  pressed: {
    opacity: 0.72,
  },
});
