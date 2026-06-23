import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  EmptyState,
  Field,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  ScreenScaffold,
  SectionTitle,
  UI,
} from '@/components/app-ui';
import {
  clinicalConsentPreview,
  clinicalIntegrationModules,
  clinicalQuickTags,
  clinicalTimelinePreview,
} from '@/data/clinical-integration';
import {
  applyClinicalAppointmentTags,
  approveClinicalDraft,
  completeClinicalAppointmentSession,
  createClinicalAppointmentMaterial,
  createClinicalAppointmentCheckIn,
  createClinicalAppointmentDraft,
  createClinicalAppointmentTask,
  createClinicalRecordRectification,
  getApiErrorMessage,
  getClinicalAppointmentWorkspace,
  getClinicalPatientTimeline,
  getClinicalTimelineItemDetail,
  getProfessionalAppointmentDetails,
  shareClinicalMaterial,
  shareClinicalCheckIn,
  shareClinicalTask,
  startClinicalAppointmentSession,
  unshareClinicalMaterial,
  unshareClinicalCheckIn,
  unshareClinicalTask,
  updateClinicalAppointmentConsent,
  updateClinicalAppointmentTreatmentPlan,
  type ApiAppointmentDetails,
  type ApiClinicalSession,
  type ApiClinicalTagInput,
  type ApiClinicalWorkspace,
  type ApiPatientConsent,
  type ApiPatientConsentStatus,
  type ApiPatientCheckIn,
  type ApiPatientTask,
  type ApiPatientTimelineItem,
  type ApiPatientTimelineItemDetail,
  type ApiSharedMaterial,
  type ApiSharedMaterialType,
  type ApiTreatmentPlan,
  type ApiTreatmentPlanStatus,
} from '@/services/api-client';
import type { ClinicalConsentItem, ClinicalIntegrationStatus, ClinicalQuickTag } from '@/types/clinical';

type TimelineLayerFilter = ApiPatientTimelineItem['layer'] | 'all';

const integrationStatusLabel: Record<ClinicalIntegrationStatus, string> = {
  connected: 'Conectado',
  partial: 'Parcial',
  pending: 'Pendente',
};

const integrationStatusIcon: Record<ClinicalIntegrationStatus, keyof typeof Ionicons.glyphMap> = {
  connected: 'checkmark-circle-outline',
  partial: 'construct-outline',
  pending: 'time-outline',
};

const layerLabels = {
  rascunho: 'Rascunho',
  prontuario: 'Prontuário',
  memoria: 'Memória',
  compartilhado: 'Compartilhado',
};

const timelineLayerOptions: { value: TimelineLayerFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'rascunho', label: 'Rascunhos' },
  { value: 'prontuario', label: 'Prontuário' },
  { value: 'memoria', label: 'Memória' },
  { value: 'compartilhado', label: 'Compartilhado' },
];

const timelineSourceOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'session', label: 'Sessões' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'record', label: 'Prontuário' },
  { value: 'tag', label: 'Tags' },
  { value: 'consent', label: 'Consentimentos' },
  { value: 'plan_update', label: 'Plano' },
  { value: 'task', label: 'Tarefas' },
  { value: 'task_response', label: 'Respostas' },
  { value: 'material', label: 'Materiais' },
  { value: 'checkin', label: 'Check-ins' },
  { value: 'checkin_response', label: 'Respostas de check-in' },
];

const timelineSourceLabels: Record<string, string> = timelineSourceOptions.reduce<Record<string, string>>(
  (accumulator, option) => {
    accumulator[option.value] = option.label;
    return accumulator;
  },
  {},
);

const treatmentPlanStatusOptions: { value: ApiTreatmentPlanStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'archived', label: 'Arquivado' },
];

const sessionStatusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  in_progress: 'Em andamento',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
};

const sessionTypeLabels: Record<string, string> = {
  online: 'Online',
  in_person: 'Presencial',
  phone: 'Telefone',
  other: 'Outro',
};

export function ClinicalIntegrationScreen() {
  const router = useRouter();
  const connectedCount = clinicalIntegrationModules.filter((item) => item.status === 'connected').length;
  const partialCount = clinicalIntegrationModules.filter((item) => item.status === 'partial').length;
  const pendingCount = clinicalIntegrationModules.filter((item) => item.status === 'pending').length;

  return (
    <ScreenScaffold appearance="dark">
      <HeaderBar
        title="Integração clínica"
        subtitle="Feito agora e próximos passos"
        appearance="dark"
        onBack={() => router.back()}
      />

      <InfoStrip
        icon="information-circle-outline"
        title="Integração em andamento"
        text="A primeira camada já entra pelo fluxo real da profissional e salva rascunho, tags, timeline e prontuário aprovado manualmente. Ainda não há gravação, IA ou transcrição."
      />

      <View style={styles.metricsGrid}>
        <MetricCard icon="checkmark-circle-outline" label="Conectados" value={String(connectedCount)} />
        <MetricCard icon="construct-outline" label="Parciais" value={String(partialCount)} />
        <MetricCard icon="time-outline" label="Pendentes" value={String(pendingCount)} />
      </View>

      <SectionTitle appearance="dark" title="Feito nesta etapa" />
      <View style={styles.card}>
        <Bullet text="Criadas rotas clínicas iniciais no Expo Router." />
        <Bullet text="Agenda profissional agora abre o núcleo clínico do atendimento." />
        <Bullet text="Tela clínica usa o detalhe real do agendamento e o workspace clínico do backend." />
        <Bullet text="Tags, rascunho e timeline inicial já persistem por atendimento." />
        <Bullet text="Plano terapêutico e consentimentos já persistem; briefing segue como interface de preparação." />
        <Bullet text="Tarefas e materiais já nascem privados e podem ser compartilhados ou recolhidos com consentimento." />
        <Bullet text="Paciente já vê em Meu acompanhamento apenas tarefas e materiais compartilhados." />
        <Bullet text="Paciente pode concluir tarefas compartilhadas com resposta opcional para revisão da psicóloga." />
        <Bullet text="Paciente pode conceder ou revogar consentimentos não sensíveis no portal." />
        <Bullet text="Check-ins manuais já podem ser compartilhados e respondidos pelo paciente com consentimento ativo." />
        <Bullet text="Timeline longitudinal já busca eventos reais por paciente com filtros e busca clínica." />
        <Bullet text="Detalhe auditado da timeline já exibe origem, status e nota de acesso sem revelar conteúdo sensível fora do módulo." />
        <Bullet text="Documento de especificação acompanha o status por módulo." />
      </View>

      <SectionTitle appearance="dark" title="Módulos da especificação" actionLabel={`${clinicalIntegrationModules.length} itens`} />
      <View style={styles.list}>
        {clinicalIntegrationModules.map((module) => (
          <View key={module.id} style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
              <View style={styles.moduleIcon}>
                <Ionicons name={module.icon} size={20} color={UI.darkPrimary} />
              </View>
              <View style={styles.moduleCopy}>
                <Text style={styles.cardTitle}>{module.title}</Text>
                <View style={[styles.statusPill, statusPillStyle(module.status)]}>
                  <Ionicons name={integrationStatusIcon[module.status]} size={14} color={statusColor(module.status)} />
                  <Text style={[styles.statusText, { color: statusColor(module.status) }]}>
                    {integrationStatusLabel[module.status]}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.splitList}>
              <View style={styles.splitColumn}>
                <Text style={styles.kicker}>Feito</Text>
                {module.done.map((item) => (
                  <Bullet key={item} text={item} compact />
                ))}
              </View>
              <View style={styles.splitColumn}>
                <Text style={styles.kicker}>Falta</Text>
                {module.missing.map((item) => (
                  <Bullet key={item} text={item} compact />
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScreenScaffold>
  );
}

export function ClinicalPatientWorkspaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    patientId?: string;
    patientName?: string;
    startDateTime?: string;
  }>();
  const appointmentId = firstParam(params.appointmentId);
  const fallbackPatientName = firstParam(params.patientName);
  const fallbackPatientId = firstParam(params.patientId);
  const fallbackStartDateTime = firstParam(params.startDateTime);
  const [details, setDetails] = useState<ApiAppointmentDetails | null>(null);
  const [workspace, setWorkspace] = useState<ApiClinicalWorkspace | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [clinicalMessage, setClinicalMessage] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(['retomar']);
  const [sessionNote, setSessionNote] = useState('');
  const [draftText, setDraftText] = useState('');
  const [loading, setLoading] = useState(Boolean(appointmentId));
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingConsent, setSavingConsent] = useState<string | null>(null);
  const [savingSessionAction, setSavingSessionAction] = useState<'start' | 'complete' | null>(null);
  const [approvingDraft, setApprovingDraft] = useState(false);
  const [rectifyingRecordId, setRectifyingRecordId] = useState<string | null>(null);
  const [savingTreatmentPlan, setSavingTreatmentPlan] = useState(false);
  const [planStatus, setPlanStatus] = useState<ApiTreatmentPlanStatus>('active');
  const [planCaseFormulation, setPlanCaseFormulation] = useState('');
  const [planGoalsText, setPlanGoalsText] = useState('');
  const [planStrategiesText, setPlanStrategiesText] = useState('');
  const [planObstaclesText, setPlanObstaclesText] = useState('');
  const [planReviewCadence, setPlanReviewCadence] = useState('');
  const [savingShareableAction, setSavingShareableAction] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskAcceptsResponse, setTaskAcceptsResponse] = useState(true);
  const [materialType, setMaterialType] = useState<ApiSharedMaterialType>('text');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [checkInPrompt, setCheckInPrompt] = useState('');
  const [checkInContextNote, setCheckInContextNote] = useState('');
  const [checkInDueAt, setCheckInDueAt] = useState('');
  const [timelineLayerFilter, setTimelineLayerFilter] = useState<TimelineLayerFilter>('all');
  const [timelineSourceFilter, setTimelineSourceFilter] = useState('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineFrom, setTimelineFrom] = useState('');
  const [timelineTo, setTimelineTo] = useState('');
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [selectedTimelineDetail, setSelectedTimelineDetail] = useState<ApiPatientTimelineItemDetail | null>(null);
  const [loadingTimelineDetailId, setLoadingTimelineDetailId] = useState<string | null>(null);

  const hydrateTreatmentPlan = useCallback((plan: ApiTreatmentPlan) => {
    setPlanStatus(toTreatmentPlanStatus(plan.status));
    setPlanCaseFormulation(plan.caseFormulation ?? '');
    setPlanGoalsText(plan.goals.join('\n'));
    setPlanStrategiesText(plan.strategies.join('\n'));
    setPlanObstaclesText(plan.obstacles.join('\n'));
    setPlanReviewCadence(plan.reviewCadence ?? '');
  }, []);

  const hydrateFromWorkspace = useCallback((clinicalWorkspace: ApiClinicalWorkspace) => {
    if (clinicalWorkspace.tags.length) {
      const nextTagIds = clinicalWorkspace.tags
        .map((tag) => tagIdFromLabel(tag.label))
        .filter((tagId): tagId is string => Boolean(tagId));

      if (nextTagIds.length) {
        setSelectedTags(nextTagIds);
      }
    }

    const firstDraft = clinicalWorkspace.drafts[0];
    if (firstDraft) {
      setSessionNote(firstDraft.sessionNote ?? '');
      setDraftText(firstDraft.contentText);
    }

    hydrateTreatmentPlan(clinicalWorkspace.treatmentPlan);
  }, [hydrateTreatmentPlan]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!appointmentId) {
        setLoading(false);
        return;
      }

      try {
        const [appointmentDetails, clinicalWorkspace] = await Promise.all([
          getProfessionalAppointmentDetails(appointmentId),
          getClinicalAppointmentWorkspace(appointmentId),
        ]);
        if (mounted) {
          setDetails(appointmentDetails);
          setWorkspace(clinicalWorkspace);
          hydrateFromWorkspace(clinicalWorkspace);
          setMessage(null);
          setClinicalMessage('Workspace clínico carregado do backend.');
        }
      } catch (error) {
        if (mounted) {
          setMessage(getApiErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [appointmentId, hydrateFromWorkspace]);

  const patientName = details?.customer.name ?? fallbackPatientName ?? 'Paciente';
  const patientId = details?.customer.id ?? fallbackPatientId ?? 'sem-id';
  const appointment = details?.appointment ?? null;
  const selectedTagLabels = useMemo(
    () => clinicalQuickTags.filter((tag) => selectedTags.includes(tag.id)).map((tag) => tag.label),
    [selectedTags],
  );
  const timelineItems = workspace ? workspace.timeline : clinicalTimelinePreview;
  const timelineActionLabel = workspace ? `${workspace.timeline.length} eventos` : 'Prévia';
  const clinicalSession = workspace?.session ?? null;
  const latestDraft = workspace?.drafts[0] ?? null;
  const latestRecord = workspace?.records[0] ?? null;
  const treatmentPlan = workspace?.treatmentPlan ?? null;
  const patientTasks = workspace?.tasks ?? [];
  const sharedMaterials = workspace?.materials ?? [];
  const patientCheckIns = workspace?.checkIns ?? [];
  const sharedPortalItemsCount =
    patientTasks.filter(isPatientVisibleStatus).length +
    sharedMaterials.filter(isPatientVisibleStatus).length +
    patientCheckIns.filter(isPatientVisibleStatus).length;
  const consentRows = useMemo(() => buildConsentRows(workspace?.consents), [workspace?.consents]);
  const grantedConsentCount = consentRows.filter((consent) => consent.status === 'granted').length;

  function toggleTag(tag: ClinicalQuickTag) {
    setSelectedTags((current) => (
      current.includes(tag.id)
        ? current.filter((item) => item !== tag.id)
        : [...current, tag.id]
    ));
  }

  function generateLocalDraft() {
    setDraftText(buildLocalDraftText(patientName, selectedTagLabels, sessionNote));
  }

  async function saveTags() {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para salvar tags.');
      return;
    }

    setSavingTags(true);
    setClinicalMessage(null);

    try {
      await applyClinicalAppointmentTags(appointmentId, {
        tags: selectedTags.map((tagId) => toApiTagInput(tagId)),
      });
      const updated = await getClinicalAppointmentWorkspace(appointmentId);
      setWorkspace(updated);
      hydrateFromWorkspace(updated);
      setClinicalMessage('Tags salvas no backend clínico.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingTags(false);
    }
  }

  async function saveDraft() {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para salvar o rascunho.');
      return;
    }

    const contentText = draftText || buildLocalDraftText(patientName, selectedTagLabels, sessionNote);
    setSavingDraft(true);
    setClinicalMessage(null);

    try {
      await createClinicalAppointmentDraft(appointmentId, {
        sessionNote,
        contentText,
        tags: selectedTags.map((tagId) => toApiTagInput(tagId)),
      });
      const updated = await getClinicalAppointmentWorkspace(appointmentId);
      setWorkspace(updated);
      hydrateFromWorkspace(updated);
      setDraftText(contentText);
      setClinicalMessage('Rascunho salvo como ClinicalDraft. Ainda não é prontuário.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingDraft(false);
    }
  }

  async function approveDraft() {
    if (!latestDraft) {
      setClinicalMessage('Salve um rascunho antes de aprovar o prontuário.');
      return;
    }

    setApprovingDraft(true);
    setClinicalMessage(null);

    try {
      await approveClinicalDraft(latestDraft.id, {
        contentText: draftText || latestDraft.contentText,
      });

      if (appointmentId) {
        const updated = await getClinicalAppointmentWorkspace(appointmentId);
        setWorkspace(updated);
        hydrateFromWorkspace(updated);
      }

      setClinicalMessage(latestDraft.recordType === 'rectification'
        ? 'Retificação aprovada como nova versão do prontuário. O histórico anterior foi preservado.'
        : 'Evolução aprovada como prontuário. O rascunho foi convertido.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setApprovingDraft(false);
    }
  }

  async function createRectification(recordId: string) {
    setRectifyingRecordId(recordId);
    setClinicalMessage(null);

    try {
      const draft = await createClinicalRecordRectification(recordId);

      if (appointmentId) {
        const updated = await getClinicalAppointmentWorkspace(appointmentId);
        setWorkspace(updated);
        hydrateFromWorkspace(updated);
      }

      setSessionNote(draft.sessionNote ?? '');
      setDraftText(draft.contentText);
      setClinicalMessage('Retificação criada como rascunho. Revise e aprove manualmente para gerar nova versão do prontuário.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setRectifyingRecordId(null);
    }
  }

  async function updateConsent(consentType: string, status: ApiPatientConsentStatus) {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para registrar consentimentos.');
      return;
    }

    setSavingConsent(consentType);
    setClinicalMessage(null);

    try {
      await updateClinicalAppointmentConsent(appointmentId, consentType, {
        status,
        termsVersion: 'clinical-consent-v1',
      });
      const updated = await getClinicalAppointmentWorkspace(appointmentId);
      setWorkspace(updated);
      hydrateFromWorkspace(updated);
      setClinicalMessage('Consentimento atualizado no backend clínico.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingConsent(null);
    }
  }

  async function saveTreatmentPlan() {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para salvar o plano terapêutico.');
      return;
    }

    setSavingTreatmentPlan(true);
    setClinicalMessage(null);

    try {
      await updateClinicalAppointmentTreatmentPlan(appointmentId, {
        status: planStatus,
        caseFormulation: planCaseFormulation,
        goals: linesToList(planGoalsText),
        strategies: linesToList(planStrategiesText),
        obstacles: linesToList(planObstaclesText),
        reviewCadence: planReviewCadence,
      });
      const updated = await getClinicalAppointmentWorkspace(appointmentId);
      setWorkspace(updated);
      hydrateFromWorkspace(updated);
      setClinicalMessage('Plano terapêutico salvo como memória clínica privada.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingTreatmentPlan(false);
    }
  }

  async function refreshWorkspaceWithMessage(successMessage: string) {
    if (!appointmentId) {
      return;
    }

    const updated = await getClinicalAppointmentWorkspace(appointmentId);
    setWorkspace(updated);
    hydrateFromWorkspace(updated);
    setClinicalMessage(successMessage);
  }

  async function loadPatientTimeline() {
    const timelinePatientId = workspace?.patientId ?? patientId;
    if (!workspace || !timelinePatientId || timelinePatientId === 'sem-id') {
      setClinicalMessage('Carregue um atendimento clínico antes de consultar a timeline longitudinal.');
      return;
    }

    let from: string | null;
    let to: string | null;
    try {
      from = normalizeOptionalTimelineDateInput(timelineFrom, 'Início');
      to = normalizeOptionalTimelineDateInput(timelineTo, 'Fim');
    } catch (error) {
      setClinicalMessage(error instanceof Error ? error.message : 'Informe um período válido.');
      return;
    }

    setLoadingTimeline(true);
    setClinicalMessage(null);

    try {
      const timeline = await getClinicalPatientTimeline(timelinePatientId, {
        sourceType: timelineSourceFilter,
        layer: timelineLayerFilter,
        from,
        to,
        q: timelineSearch,
        limit: 80,
      });

      setWorkspace((current) => current ? { ...current, timeline } : current);
      setSelectedTimelineDetail(null);
      setClinicalMessage('Timeline longitudinal filtrada carregada. Conteúdo clínico segue restrito à profissional vinculada.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setLoadingTimeline(false);
    }
  }

  async function openTimelineItemDetail(itemId: string) {
    setLoadingTimelineDetailId(itemId);
    setClinicalMessage(null);

    try {
      const detail = await getClinicalTimelineItemDetail(itemId);
      setSelectedTimelineDetail(detail);
      setClinicalMessage('Detalhe da timeline carregado com auditoria clínica.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setLoadingTimelineDetailId(null);
    }
  }

  async function createPatientTask() {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para criar tarefas.');
      return;
    }

    let dueAt: string | null;
    try {
      dueAt = normalizeOptionalDateInput(taskDueAt);
    } catch (error) {
      setClinicalMessage(error instanceof Error ? error.message : 'Informe um prazo válido.');
      return;
    }

    setSavingShareableAction('create-task');
    setClinicalMessage(null);

    try {
      await createClinicalAppointmentTask(appointmentId, {
        title: taskTitle,
        description: nullableText(taskDescription),
        dueAt,
        acceptsResponse: taskAcceptsResponse,
      });
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueAt('');
      setTaskAcceptsResponse(true);
      await refreshWorkspaceWithMessage('Tarefa criada como privada. Compartilhe somente após revisar a prévia do paciente.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingShareableAction(null);
    }
  }

  async function updateTaskSharing(task: ApiPatientTask, action: 'share' | 'unshare') {
    setSavingShareableAction(`${action}-task-${task.id}`);
    setClinicalMessage(null);

    try {
      if (action === 'share') {
        await shareClinicalTask(task.id);
        await refreshWorkspaceWithMessage('Tarefa compartilhada no portal do paciente.');
      } else {
        await unshareClinicalTask(task.id);
        await refreshWorkspaceWithMessage('Tarefa recolhida do portal do paciente.');
      }
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingShareableAction(null);
    }
  }

  async function createSharedMaterial() {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para criar materiais.');
      return;
    }

    setSavingShareableAction('create-material');
    setClinicalMessage(null);

    try {
      await createClinicalAppointmentMaterial(appointmentId, {
        materialType,
        title: materialTitle,
        description: nullableText(materialDescription),
        url: nullableText(materialUrl),
      });
      setMaterialTitle('');
      setMaterialDescription('');
      setMaterialUrl('');
      await refreshWorkspaceWithMessage('Material criado como privado. Compartilhe somente após revisar a prévia do paciente.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingShareableAction(null);
    }
  }

  async function updateMaterialSharing(material: ApiSharedMaterial, action: 'share' | 'unshare') {
    setSavingShareableAction(`${action}-material-${material.id}`);
    setClinicalMessage(null);

    try {
      if (action === 'share') {
        await shareClinicalMaterial(material.id);
        await refreshWorkspaceWithMessage('Material compartilhado no portal do paciente.');
      } else {
        await unshareClinicalMaterial(material.id);
        await refreshWorkspaceWithMessage('Material recolhido do portal do paciente.');
      }
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingShareableAction(null);
    }
  }

  async function createPatientCheckIn() {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para criar check-ins.');
      return;
    }

    let dueAt: string | null;
    try {
      dueAt = normalizeOptionalDateInput(checkInDueAt);
    } catch (error) {
      setClinicalMessage(error instanceof Error ? error.message : 'Informe um prazo válido.');
      return;
    }

    setSavingShareableAction('create-checkin');
    setClinicalMessage(null);

    try {
      await createClinicalAppointmentCheckIn(appointmentId, {
        prompt: checkInPrompt,
        contextNote: nullableText(checkInContextNote),
        dueAt,
      });
      setCheckInPrompt('');
      setCheckInContextNote('');
      setCheckInDueAt('');
      await refreshWorkspaceWithMessage('Check-in criado como privado. Compartilhe somente com consentimento ativo de check-ins.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingShareableAction(null);
    }
  }

  async function updateCheckInSharing(checkIn: ApiPatientCheckIn, action: 'share' | 'unshare') {
    setSavingShareableAction(`${action}-checkin-${checkIn.id}`);
    setClinicalMessage(null);

    try {
      if (action === 'share') {
        await shareClinicalCheckIn(checkIn.id);
        await refreshWorkspaceWithMessage('Check-in compartilhado no portal do paciente.');
      } else {
        await unshareClinicalCheckIn(checkIn.id);
        await refreshWorkspaceWithMessage('Check-in recolhido do portal do paciente.');
      }
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingShareableAction(null);
    }
  }

  async function updateSessionStatus(action: 'start' | 'complete') {
    if (!appointmentId) {
      setClinicalMessage('Abra a tela a partir de um atendimento para atualizar a sessão clínica.');
      return;
    }

    setSavingSessionAction(action);
    setClinicalMessage(null);

    try {
      if (action === 'start') {
        await startClinicalAppointmentSession(appointmentId);
      } else {
        await completeClinicalAppointmentSession(appointmentId);
      }

      const updated = await getClinicalAppointmentWorkspace(appointmentId);
      setWorkspace(updated);
      hydrateFromWorkspace(updated);
      setClinicalMessage(action === 'start'
        ? 'Sessão clínica iniciada.'
        : 'Sessão clínica finalizada. O rascunho segue exigindo revisão humana.');
    } catch (error) {
      setClinicalMessage(getApiErrorMessage(error));
    } finally {
      setSavingSessionAction(null);
    }
  }

  function buildLocalDraftText(name: string, tagsList: string[], noteValue: string) {
    const tags = tagsList.length ? tagsList.join(', ') : 'nenhuma tag selecionada';
    const note = noteValue.trim() || 'Sem anotação livre adicionada nesta prévia.';

    return `Rascunho local para revisar:\n\n- Paciente: ${name}\n- Tags: ${tags}\n- Nota da sessão: ${note}\n\nEste texto ainda não é prontuário. A próxima etapa é exigir aprovação da psicóloga antes de virar ClinicalRecord.`;
  }

  return (
    <ScreenScaffold appearance="dark">
      <HeaderBar
        title="Acompanhamento clínico"
        subtitle={patientName}
        appearance="dark"
        onBack={() => router.back()}
      />

      {message ? (
        <InfoStrip
          icon="cloud-offline-outline"
          title="Dados do atendimento"
          text={`${message} A tela segue em modo de integração local.`}
          tone="warning"
        />
      ) : null}

      <InfoStrip
        icon="shield-checkmark-outline"
        title="Camada clínica inicial"
        text="Tags, rascunhos e prontuário aprovado manualmente já podem ser salvos como camada clínica inicial. Ainda não há IA, gravação ou transcrição."
      />
      {clinicalMessage ? (
        <InfoStrip
          icon="document-lock-outline"
          title="Workspace clínico"
          text={clinicalMessage}
          tone={isClinicalSuccessMessage(clinicalMessage) ? 'success' : 'info'}
        />
      ) : null}

      <SectionTitle appearance="dark" title="Contexto do atendimento" />
      <View style={styles.card}>
        {loading ? (
          <EmptyState
            appearance="dark"
            icon="hourglass-outline"
            title="Carregando"
            text="Buscando detalhes do atendimento para preencher o contexto clínico."
          />
        ) : (
          <>
            <DetailRow icon="person-outline" label="Paciente" value={patientName} />
            <DetailRow icon="finger-print-outline" label="ID clínico" value={patientId} />
            <DetailRow
              icon="calendar-outline"
              label="Consulta"
              value={appointment ? `Pedido ${appointment.code}` : formatDateTimeLabel(fallbackStartDateTime)}
            />
            <DetailRow
              icon="ellipse-outline"
              label="Status"
              value={appointment ? appointment.status : 'Pré-integração'}
            />
          </>
        )}
      </View>

      <SectionTitle appearance="dark" title="Sessão clínica" />
      <View style={styles.card}>
        {clinicalSession ? (
          <>
            <DetailRow
              icon="pulse-outline"
              label="Status clínico"
              value={sessionStatusLabel(clinicalSession.status)}
            />
            <DetailRow
              icon="videocam-outline"
              label="Tipo"
              value={sessionTypeLabel(clinicalSession.sessionType)}
            />
            <DetailRow
              icon="play-outline"
              label="Início clínico"
              value={clinicalSession.startedAt ? formatDateTimeLabel(clinicalSession.startedAt) : 'Ainda não iniciado'}
            />
            <DetailRow
              icon="stop-outline"
              label="Fim clínico"
              value={clinicalSession.endedAt ? formatDateTimeLabel(clinicalSession.endedAt) : 'Ainda não finalizado'}
            />
            <View style={styles.sessionActions}>
              <PrimaryButton
                label="Iniciar sessão"
                icon="play-outline"
                variant="secondary"
                loading={savingSessionAction === 'start'}
                disabled={!canStartSession(clinicalSession) || Boolean(savingSessionAction)}
                onPress={() => updateSessionStatus('start')}
              />
              <PrimaryButton
                label="Finalizar sessão"
                icon="checkmark-circle-outline"
                loading={savingSessionAction === 'complete'}
                disabled={!canCompleteSession(clinicalSession) || Boolean(savingSessionAction)}
                onPress={() => updateSessionStatus('complete')}
              />
            </View>
            <Text style={styles.mutedText}>
              Finalizar a sessão clínica não cria prontuário automaticamente. A evolução continua passando por rascunho e aprovação.
            </Text>
          </>
        ) : (
          <EmptyState
            appearance="dark"
            icon="document-lock-outline"
            title="Sessão ainda não criada"
            text="Ao abrir um atendimento real, o backend cria a sessão clínica vinculada ao agendamento."
          />
        )}
      </View>

      <SectionTitle appearance="dark" title="Tags rápidas" actionLabel={`${selectedTags.length} marcadas`} />
      <View style={styles.tagWrap}>
        {clinicalQuickTags.map((tag) => {
          const selected = selectedTags.includes(tag.id);

          return (
            <Pressable
              key={tag.id}
              accessibilityRole="button"
              onPress={() => toggleTag(tag)}
              style={({ pressed }) => [
                styles.tag,
                tagToneStyle(tag.tone),
                selected && styles.tagSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton
        label="Salvar tags"
        icon="pricetags-outline"
        variant="secondary"
        loading={savingTags}
        disabled={!appointmentId}
        onPress={saveTags}
      />

      <SectionTitle appearance="dark" title="Rascunho pós-consulta" />
      <View style={styles.card}>
        <Field
          appearance="dark"
          label="Anotação livre"
          value={sessionNote}
          multiline
          onChangeText={setSessionNote}
          placeholder="Ex.: retomar tarefa combinada, observar padrão recorrente, revisar objetivo..."
        />
        <PrimaryButton label="Gerar rascunho local" icon="sparkles-outline" onPress={generateLocalDraft} />
        {draftText ? (
          <View style={styles.draftBox}>
            <Text selectable style={styles.draftText}>{draftText}</Text>
          </View>
        ) : null}
        <PrimaryButton
          label="Salvar rascunho"
          icon="save-outline"
          loading={savingDraft}
          disabled={!appointmentId || (!draftText && !sessionNote.trim())}
          onPress={saveDraft}
        />
      </View>

      {latestDraft ? (
        <>
          <SectionTitle appearance="dark" title="Último rascunho salvo" />
          <View style={styles.card}>
            <DetailRow icon="document-text-outline" label="Status" value={latestDraft.status} />
            <DetailRow icon="layers-outline" label="Tipo" value={clinicalRecordTypeLabel(latestDraft.recordType)} />
            {latestDraft.previousRecordId ? (
              <DetailRow icon="git-compare-outline" label="Origem" value={`Retificação de ${shortId(latestDraft.previousRecordId)}`} />
            ) : null}
            <DetailRow icon="time-outline" label="Criado em" value={formatDateTimeLabel(latestDraft.createdAt)} />
            <View style={styles.draftBox}>
              <Text selectable style={styles.draftText}>{latestDraft.contentText}</Text>
            </View>
            <PrimaryButton
              label="Aprovar como prontuário"
              icon="checkmark-circle-outline"
              loading={approvingDraft}
              disabled={latestDraft.status !== 'draft'}
              onPress={approveDraft}
            />
          </View>
        </>
      ) : null}

      {latestRecord ? (
        <>
          <SectionTitle appearance="dark" title="Prontuário aprovado" />
          <View style={styles.card}>
            <DetailRow icon="checkmark-circle-outline" label="Status" value={latestRecord.status} />
            <DetailRow icon="layers-outline" label="Tipo" value={clinicalRecordTypeLabel(latestRecord.recordType)} />
            <DetailRow icon="albums-outline" label="Versão" value={String(latestRecord.version)} />
            {latestRecord.previousRecordId ? (
              <DetailRow icon="git-compare-outline" label="Retifica" value={shortId(latestRecord.previousRecordId)} />
            ) : null}
            <DetailRow icon="time-outline" label="Aprovado em" value={formatDateTimeLabel(latestRecord.approvedAt)} />
            <View style={styles.draftBox}>
              <Text selectable style={styles.draftText}>{latestRecord.contentText}</Text>
            </View>
            <Text style={styles.mutedText}>
              Retificar cria um novo rascunho. O conteúdo aprovado permanece no histórico até a nova versão ser aprovada manualmente.
            </Text>
            <PrimaryButton
              label="Criar retificação"
              icon="create-outline"
              variant="secondary"
              loading={rectifyingRecordId === latestRecord.id}
              disabled={latestRecord.status !== 'approved' || Boolean(rectifyingRecordId)}
              onPress={() => createRectification(latestRecord.id)}
            />
          </View>
        </>
      ) : null}

      <SectionTitle appearance="dark" title="Linha do tempo clínica" actionLabel={timelineActionLabel} />
      <View style={styles.timelineFilterPanel}>
        <View style={styles.timelineFilterIntro}>
          <Ionicons name="git-branch-outline" size={18} color={UI.darkPrimary} />
          <Text style={styles.timelineFilterText}>
            Histórico privado da relação clínica. Use filtros para preparar sessão sem misturar rascunho, prontuário, memória e conteúdo compartilhado.
          </Text>
        </View>
        <Field
          appearance="dark"
          label="Buscar na timeline"
          value={timelineSearch}
          onChangeText={setTimelineSearch}
          placeholder="Ex.: check-in, plano, consentimento"
        />
        <View style={styles.timelineDateRow}>
          <Field
            appearance="dark"
            label="Início"
            value={timelineFrom}
            style={styles.timelineDateField}
            onChangeText={setTimelineFrom}
            placeholder="2026-06-01"
          />
          <Field
            appearance="dark"
            label="Fim"
            value={timelineTo}
            style={styles.timelineDateField}
            onChangeText={setTimelineTo}
            placeholder="2026-06-30"
          />
        </View>
        <TimelineFilterGroup
          label="Camada"
          options={timelineLayerOptions}
          value={timelineLayerFilter}
          onChange={setTimelineLayerFilter}
        />
        <TimelineFilterGroup
          label="Origem"
          options={timelineSourceOptions}
          value={timelineSourceFilter}
          onChange={setTimelineSourceFilter}
        />
        <PrimaryButton
          label="Aplicar filtros"
          icon="filter-outline"
          loading={loadingTimeline}
          disabled={!workspace || loadingTimeline}
          onPress={loadPatientTimeline}
        />
      </View>
      <View style={styles.list}>
        {timelineItems.length ? (
          timelineItems.map((item) => {
            const apiItem = isApiTimelineItem(item) ? item : null;

            return (
              <TimelineCard
                key={item.id}
                item={item}
                loading={apiItem ? loadingTimelineDetailId === apiItem.id : false}
                onOpen={apiItem ? () => openTimelineItemDetail(apiItem.id) : undefined}
              />
            );
          })
        ) : (
          <EmptyState
            appearance="dark"
            icon="calendar-clear-outline"
            title="Nenhum evento encontrado"
            text="A timeline real desse paciente não possui itens para os filtros selecionados."
          />
        )}
      </View>
      {selectedTimelineDetail ? (
        <TimelineDetailPanel
          detail={selectedTimelineDetail}
          onClose={() => setSelectedTimelineDetail(null)}
        />
      ) : null}

      <SectionTitle appearance="dark" title="Plano terapêutico" />
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Plano privado da psicóloga. Não é compartilhado com o paciente e não substitui prontuário aprovado.
        </Text>
        <View style={styles.planStatusWrap}>
          {treatmentPlanStatusOptions.map((option) => {
            const selected = planStatus === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => setPlanStatus(option.value)}
                style={({ pressed }) => [
                  styles.planStatusButton,
                  selected && styles.planStatusButtonSelected,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.planStatusText, selected && styles.planStatusTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Field
          appearance="dark"
          label="Formulação do caso"
          value={planCaseFormulation}
          multiline
          style={styles.planTextArea}
          onChangeText={setPlanCaseFormulation}
          placeholder="Hipóteses clínicas, contexto e pontos de cuidado."
        />
        <Field
          appearance="dark"
          label="Objetivos (um por linha)"
          value={planGoalsText}
          multiline
          style={styles.planTextArea}
          onChangeText={setPlanGoalsText}
          placeholder="Ex.: acompanhar padrões de ansiedade."
        />
        <Field
          appearance="dark"
          label="Estratégias (uma por linha)"
          value={planStrategiesText}
          multiline
          style={styles.planTextArea}
          onChangeText={setPlanStrategiesText}
          placeholder="Ex.: revisar tarefa combinada ao início da sessão."
        />
        <Field
          appearance="dark"
          label="Pontos de atenção (um por linha)"
          value={planObstaclesText}
          multiline
          style={styles.planTextArea}
          onChangeText={setPlanObstaclesText}
          placeholder="Ex.: barreiras de adesão ou temas para manejar com cuidado."
        />
        <Field
          appearance="dark"
          label="Cadência de revisão"
          value={planReviewCadence}
          onChangeText={setPlanReviewCadence}
          placeholder="Ex.: revisar a cada 4 sessões"
        />
        {treatmentPlan?.updatedAt ? (
          <DetailRow
            icon="time-outline"
            label="Última revisão"
            value={formatDateTimeLabel(treatmentPlan.updatedAt)}
          />
        ) : null}
        <PrimaryButton
          label="Salvar plano"
          icon="map-outline"
          loading={savingTreatmentPlan}
          disabled={!appointmentId}
          onPress={saveTreatmentPlan}
        />
      </View>

      <SectionTitle
        appearance="dark"
        title="Portal do paciente"
        actionLabel={`${sharedPortalItemsCount} visíveis`}
      />
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Itens nascem privados para revisão da psicóloga. O paciente só vê tarefas, materiais ou check-ins após a ação explícita de compartilhar e com consentimento ativo.
        </Text>

        <View style={styles.shareableBlock}>
          <Text style={styles.kicker}>Nova tarefa privada</Text>
          <Field
            appearance="dark"
            label="Título"
            value={taskTitle}
            onChangeText={setTaskTitle}
            placeholder="Ex.: registrar situações de ansiedade na semana"
          />
          <Field
            appearance="dark"
            label="Descrição"
            value={taskDescription}
            multiline
            style={styles.shareableTextArea}
            onChangeText={setTaskDescription}
            placeholder="Orientação breve que será revisada antes de liberar ao paciente."
          />
          <Field
            appearance="dark"
            label="Prazo opcional"
            value={taskDueAt}
            onChangeText={setTaskDueAt}
            placeholder="Ex.: 2026-07-01T15:00:00Z"
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: taskAcceptsResponse }}
            onPress={() => setTaskAcceptsResponse((current) => !current)}
            style={({ pressed }) => [
              styles.shareableToggle,
              taskAcceptsResponse && styles.shareableToggleSelected,
              pressed && styles.pressed,
            ]}>
            <Ionicons
              name={taskAcceptsResponse ? 'chatbubble-ellipses-outline' : 'chatbubble-outline'}
              size={17}
              color={taskAcceptsResponse ? UI.darkPrimary : UI.darkTextMuted}
            />
            <Text style={styles.shareableToggleText}>
              {taskAcceptsResponse ? 'Paciente pode responder' : 'Sem resposta do paciente'}
            </Text>
          </Pressable>
          <View style={styles.shareablePreview}>
            <Text style={styles.shareablePreviewLabel}>Prévia para paciente</Text>
            <Text style={styles.shareablePreviewTitle}>{taskTitle.trim() || 'Título da tarefa'}</Text>
            <Text style={styles.cardText}>
              {taskDescription.trim() || 'Descrição ou orientação breve aparecerá aqui antes de compartilhar.'}
            </Text>
            <Text style={styles.mutedText}>
              {taskDueAt.trim() ? `Prazo: ${taskDueAt.trim()}` : 'Sem prazo definido'} · {taskAcceptsResponse ? 'Com resposta' : 'Sem resposta'}
            </Text>
          </View>
          <PrimaryButton
            label="Criar tarefa privada"
            icon="checkbox-outline"
            loading={savingShareableAction === 'create-task'}
            disabled={!appointmentId || !taskTitle.trim() || Boolean(savingShareableAction)}
            onPress={createPatientTask}
          />
        </View>

        <View style={styles.shareableDivider} />

        <View style={styles.shareableBlock}>
          <Text style={styles.kicker}>Novo material privado</Text>
          <View style={styles.shareableSegment}>
            {(['text', 'link'] as ApiSharedMaterialType[]).map((option) => {
              const selected = materialType === option;

              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => setMaterialType(option)}
                  style={({ pressed }) => [
                    styles.shareableSegmentButton,
                    selected && styles.shareableSegmentButtonSelected,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.shareableSegmentText, selected && styles.shareableSegmentTextSelected]}>
                    {option === 'text' ? 'Texto' : 'Link'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            appearance="dark"
            label="Título"
            value={materialTitle}
            onChangeText={setMaterialTitle}
            placeholder="Ex.: material de apoio para a semana"
          />
          <Field
            appearance="dark"
            label={materialType === 'link' ? 'Descrição opcional' : 'Conteúdo do material'}
            value={materialDescription}
            multiline
            style={styles.shareableTextArea}
            onChangeText={setMaterialDescription}
            placeholder={materialType === 'link' ? 'Contexto breve para o link.' : 'Texto que será visto pelo paciente após compartilhar.'}
          />
          {materialType === 'link' ? (
            <Field
              appearance="dark"
              label="URL"
              value={materialUrl}
              onChangeText={setMaterialUrl}
              placeholder="https://..."
            />
          ) : null}
          <View style={styles.shareablePreview}>
            <Text style={styles.shareablePreviewLabel}>Prévia para paciente</Text>
            <Text style={styles.shareablePreviewTitle}>{materialTitle.trim() || 'Título do material'}</Text>
            <Text style={styles.cardText}>
              {materialDescription.trim() || (materialType === 'link' ? 'Descrição opcional do link.' : 'Conteúdo do material aparecerá aqui.')}
            </Text>
            {materialType === 'link' ? (
              <Text style={styles.mutedText}>{materialUrl.trim() || 'https://...'}</Text>
            ) : null}
          </View>
          <PrimaryButton
            label="Criar material privado"
            icon="library-outline"
            loading={savingShareableAction === 'create-material'}
            disabled={!appointmentId || !materialTitle.trim() || Boolean(savingShareableAction)}
            onPress={createSharedMaterial}
          />
        </View>

        <View style={styles.shareableDivider} />

        <View style={styles.shareableBlock}>
          <Text style={styles.kicker}>Novo check-in privado</Text>
          <Field
            appearance="dark"
            label="Pergunta"
            value={checkInPrompt}
            onChangeText={setCheckInPrompt}
            placeholder="Ex.: Como ficou sua ansiedade desde a última sessão?"
          />
          <Field
            appearance="dark"
            label="Contexto opcional"
            value={checkInContextNote}
            multiline
            style={styles.shareableTextArea}
            onChangeText={setCheckInContextNote}
            placeholder="Orientação breve para o paciente responder sem pressão."
          />
          <Field
            appearance="dark"
            label="Prazo opcional"
            value={checkInDueAt}
            onChangeText={setCheckInDueAt}
            placeholder="Ex.: 2026-07-01T15:00:00Z"
          />
          <View style={styles.shareablePreview}>
            <Text style={styles.shareablePreviewLabel}>Prévia para paciente</Text>
            <Text style={styles.shareablePreviewTitle}>{checkInPrompt.trim() || 'Pergunta do check-in'}</Text>
            <Text style={styles.cardText}>
              {checkInContextNote.trim() || 'O paciente responderá com uma escala de 1 a 5 e uma observação opcional.'}
            </Text>
            <Text style={styles.mutedText}>
              {checkInDueAt.trim() ? `Prazo: ${checkInDueAt.trim()}` : 'Sem prazo definido'} · Resposta revisada pela psicóloga
            </Text>
          </View>
          <PrimaryButton
            label="Criar check-in privado"
            icon="pulse-outline"
            loading={savingShareableAction === 'create-checkin'}
            disabled={!appointmentId || !checkInPrompt.trim() || Boolean(savingShareableAction)}
            onPress={createPatientCheckIn}
          />
        </View>

        <View style={styles.shareableDivider} />

        <View style={styles.shareableBlock}>
          <Text style={styles.kicker}>Tarefas cadastradas</Text>
          {patientTasks.length ? (
            patientTasks.map((task) => (
              <View key={task.id} style={styles.shareableItem}>
                <View style={styles.shareableHeader}>
                  <View style={styles.shareableTitleRow}>
                    <Ionicons name="checkbox-outline" size={17} color={UI.darkPrimary} />
                    <Text style={styles.cardTitle}>{task.title}</Text>
                  </View>
                  <View style={[styles.shareablePill, shareableStatusPillStyle(task.status)]}>
                    <Text style={[styles.shareablePillText, { color: shareableStatusColor(task.status) }]}>
                      {shareableStatusLabel(task.status)}
                    </Text>
                  </View>
                </View>
                {task.description ? <Text style={styles.cardText}>{task.description}</Text> : null}
                {task.responseText ? (
                  <View style={styles.shareableResponseBox}>
                    <Text style={styles.shareablePreviewLabel}>Resposta do paciente</Text>
                    <Text selectable style={styles.cardText}>{task.responseText}</Text>
                    {task.responseSubmittedAt ? (
                      <Text style={styles.mutedText}>{formatDateTimeLabel(task.responseSubmittedAt)}</Text>
                    ) : null}
                  </View>
                ) : null}
                <Text style={styles.mutedText}>
                  {task.completedAt ? `Concluída em ${formatDateTimeLabel(task.completedAt)} · ` : ''}
                  {task.dueAt ? `Prazo ${formatDateTimeLabel(task.dueAt)}` : 'Sem prazo'} · {task.acceptsResponse ? 'aceita resposta' : 'não aceita resposta'}
                </Text>
                <View style={styles.shareableActions}>
                  {isSharedStatus(task) ? (
                    <ShareableActionButton
                      label="Recolher"
                      icon="lock-closed-outline"
                      loading={savingShareableAction === `unshare-task-${task.id}`}
                      disabled={Boolean(savingShareableAction)}
                      onPress={() => updateTaskSharing(task, 'unshare')}
                    />
                  ) : (
                    <ShareableActionButton
                      label="Compartilhar"
                      icon="share-social-outline"
                      primary
                      loading={savingShareableAction === `share-task-${task.id}`}
                      disabled={isClosedShareable(task.status) || Boolean(savingShareableAction)}
                      onPress={() => updateTaskSharing(task, 'share')}
                    />
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>Nenhuma tarefa privada ou compartilhada ainda.</Text>
          )}
        </View>

        <View style={styles.shareableBlock}>
          <Text style={styles.kicker}>Materiais cadastrados</Text>
          {sharedMaterials.length ? (
            sharedMaterials.map((material) => (
              <View key={material.id} style={styles.shareableItem}>
                <View style={styles.shareableHeader}>
                  <View style={styles.shareableTitleRow}>
                    <Ionicons name={material.materialType === 'link' ? 'link-outline' : 'document-text-outline'} size={17} color={UI.darkPrimary} />
                    <Text style={styles.cardTitle}>{material.title}</Text>
                  </View>
                  <View style={[styles.shareablePill, shareableStatusPillStyle(material.status)]}>
                    <Text style={[styles.shareablePillText, { color: shareableStatusColor(material.status) }]}>
                      {shareableStatusLabel(material.status)}
                    </Text>
                  </View>
                </View>
                {material.description ? <Text style={styles.cardText}>{material.description}</Text> : null}
                <Text style={styles.mutedText}>
                  {material.materialType === 'link' ? material.url ?? 'Link sem URL' : 'Texto'} · {material.sharedAt ? `compartilhado em ${formatDateTimeLabel(material.sharedAt)}` : 'privado'}
                </Text>
                <View style={styles.shareableActions}>
                  {isSharedStatus(material) ? (
                    <ShareableActionButton
                      label="Recolher"
                      icon="lock-closed-outline"
                      loading={savingShareableAction === `unshare-material-${material.id}`}
                      disabled={Boolean(savingShareableAction)}
                      onPress={() => updateMaterialSharing(material, 'unshare')}
                    />
                  ) : (
                    <ShareableActionButton
                      label="Compartilhar"
                      icon="share-social-outline"
                      primary
                      loading={savingShareableAction === `share-material-${material.id}`}
                      disabled={isClosedShareable(material.status) || Boolean(savingShareableAction)}
                      onPress={() => updateMaterialSharing(material, 'share')}
                    />
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>Nenhum material privado ou compartilhado ainda.</Text>
          )}
        </View>

        <View style={styles.shareableBlock}>
          <Text style={styles.kicker}>Check-ins cadastrados</Text>
          {patientCheckIns.length ? (
            patientCheckIns.map((checkIn) => (
              <View key={checkIn.id} style={styles.shareableItem}>
                <View style={styles.shareableHeader}>
                  <View style={styles.shareableTitleRow}>
                    <Ionicons name="pulse-outline" size={17} color={UI.darkPrimary} />
                    <Text style={styles.cardTitle}>{checkIn.prompt}</Text>
                  </View>
                  <View style={[styles.shareablePill, shareableStatusPillStyle(checkIn.status)]}>
                    <Text style={[styles.shareablePillText, { color: shareableStatusColor(checkIn.status) }]}>
                      {shareableStatusLabel(checkIn.status)}
                    </Text>
                  </View>
                </View>
                {checkIn.contextNote ? <Text style={styles.cardText}>{checkIn.contextNote}</Text> : null}
                {checkIn.status === 'answered' ? (
                  <View style={styles.shareableResponseBox}>
                    <Text style={styles.shareablePreviewLabel}>Resposta do paciente</Text>
                    <Text style={styles.cardText}>Escala emocional: {checkIn.moodScore ?? '-'} de 5</Text>
                    {checkIn.responseText ? <Text selectable style={styles.cardText}>{checkIn.responseText}</Text> : null}
                    {checkIn.respondedAt ? (
                      <Text style={styles.mutedText}>{formatDateTimeLabel(checkIn.respondedAt)}</Text>
                    ) : null}
                  </View>
                ) : null}
                <Text style={styles.mutedText}>
                  {checkIn.dueAt ? `Prazo ${formatDateTimeLabel(checkIn.dueAt)}` : 'Sem prazo'} · {checkIn.sharedAt ? `compartilhado em ${formatDateTimeLabel(checkIn.sharedAt)}` : 'privado'}
                </Text>
                <View style={styles.shareableActions}>
                  {isSharedStatus(checkIn) ? (
                    <ShareableActionButton
                      label="Recolher"
                      icon="lock-closed-outline"
                      loading={savingShareableAction === `unshare-checkin-${checkIn.id}`}
                      disabled={Boolean(savingShareableAction)}
                      onPress={() => updateCheckInSharing(checkIn, 'unshare')}
                    />
                  ) : (
                    <ShareableActionButton
                      label="Compartilhar"
                      icon="share-social-outline"
                      primary
                      loading={savingShareableAction === `share-checkin-${checkIn.id}`}
                      disabled={isClosedShareable(checkIn.status) || Boolean(savingShareableAction)}
                      onPress={() => updateCheckInSharing(checkIn, 'share')}
                    />
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>Nenhum check-in privado ou compartilhado ainda.</Text>
          )}
        </View>
      </View>

      <SectionTitle appearance="dark" title="Briefing da próxima sessão" />
      <View style={styles.card}>
        <Bullet text="Última sessão, tags marcadas e tarefas pendentes entram aqui." />
        <Bullet text="Perguntas sugeridas devem ser neutras e revisáveis." />
        <Bullet text="Este briefing é memória de trabalho, não prontuário." />
      </View>

      <SectionTitle
        appearance="dark"
        title="Consentimentos"
        actionLabel={`${grantedConsentCount}/${consentRows.length} liberados`}
      />
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Registre apenas consentimentos documentados. IA, gravação e transcrição continuam bloqueadas
          enquanto não houver status liberado.
        </Text>
        {consentRows.map((consent) => (
          <ConsentRow
            key={consent.id}
            consent={consent}
            disabled={!appointmentId || Boolean(savingConsent)}
            saving={savingConsent === consent.id}
            onGrant={() => updateConsent(consent.id, 'granted')}
            onRevoke={() => updateConsent(consent.id, 'revoked')}
          />
        ))}
      </View>
    </ScreenScaffold>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={20} color={UI.darkPrimary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={UI.darkPrimary} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text selectable style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function Bullet({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <View style={[styles.bulletRow, compact && styles.bulletCompact]}>
      <View style={styles.bulletDot} />
      <Text style={[styles.cardText, compact && styles.compactText]}>{text}</Text>
    </View>
  );
}

function TimelineCard({
  item,
  loading,
  onOpen,
}: {
  item: ApiPatientTimelineItem | (typeof clinicalTimelinePreview)[number];
  loading?: boolean;
  onOpen?: () => void;
}) {
  const dateLabel = 'dateLabel' in item ? item.dateLabel : formatDateTimeLabel(item.occurredAt);
  const sourceLabel = 'sourceType' in item ? timelineSourceLabel(item.sourceType) : 'Prévia';

  return (
    <Pressable
      accessibilityRole={onOpen ? 'button' : undefined}
      disabled={!onOpen || loading}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.timelineCard,
        onOpen && styles.timelineCardInteractive,
        pressed && onOpen && styles.pressed,
      ]}>
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTitle}>{item.title}</Text>
        <View style={styles.layerPill}>
          <Text style={styles.layerText}>{layerLabels[item.layer]}</Text>
        </View>
      </View>
      <Text style={styles.timelineSummary}>{item.summary}</Text>
      <View style={styles.timelineMetaRow}>
        <Text style={styles.timelineMetaText}>{sourceLabel}</Text>
        <View style={styles.timelineMetaDot} />
        <Text style={styles.timelineMetaText}>{dateLabel}</Text>
      </View>
      {onOpen ? (
        <View style={styles.timelineOpenRow}>
          <Text style={styles.timelineOpenText}>{loading ? 'Carregando detalhe' : 'Ver detalhes'}</Text>
          <Ionicons name={loading ? 'hourglass-outline' : 'chevron-forward'} size={15} color={UI.darkPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

function TimelineDetailPanel({
  detail,
  onClose,
}: {
  detail: ApiPatientTimelineItemDetail;
  onClose: () => void;
}) {
  return (
    <View style={styles.timelineDetailPanel}>
      <View style={styles.timelineDetailHeader}>
        <View style={styles.timelineDetailTitleWrap}>
          <Text style={styles.kicker}>Detalhe auditado</Text>
          <Text style={styles.timelineDetailTitle}>{detail.item.title}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar detalhe da timeline"
          onPress={onClose}
          style={({ pressed }) => [styles.timelineCloseButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={18} color={UI.darkText} />
        </Pressable>
      </View>
      <Text style={styles.timelineSummary}>{detail.item.summary}</Text>
      <View style={styles.timelineDetailGrid}>
        <DetailRow icon="git-branch-outline" label="Origem" value={detail.sourceLabel} />
        <DetailRow icon="layers-outline" label="Camada" value={layerLabels[detail.item.layer]} />
        <DetailRow icon="time-outline" label="Evento" value={formatDateTimeLabel(detail.item.occurredAt)} />
        {detail.appointmentCode ? (
          <DetailRow
            icon="calendar-outline"
            label="Atendimento"
            value={`${detail.appointmentCode} · ${formatDateTimeLabel(detail.appointmentStartDateTime ?? undefined)}`}
          />
        ) : null}
        {detail.sourceStatus ? (
          <DetailRow icon="ellipse-outline" label="Status da origem" value={detail.sourceStatus} />
        ) : null}
        {detail.sourceTypeDetail ? (
          <DetailRow icon="information-circle-outline" label="Tipo da origem" value={timelineSourceDetailLabel(detail.sourceTypeDetail)} />
        ) : null}
        {detail.sourceVersion ? (
          <DetailRow icon="albums-outline" label="Versão" value={String(detail.sourceVersion)} />
        ) : null}
      </View>
      <View style={styles.timelineAccessNote}>
        <Ionicons name="shield-checkmark-outline" size={17} color={UI.darkPrimary} />
        <Text style={styles.timelineAccessText}>{detail.accessNote}</Text>
      </View>
    </View>
  );
}

function TimelineFilterGroup<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: TValue; label: string }[];
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <View style={styles.timelineFilterGroup}>
      <Text style={styles.timelineFilterLabel}>{label}</Text>
      <View style={styles.timelineChipRow}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.timelineChip,
                selected && styles.timelineChipSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.timelineChipText, selected && styles.timelineChipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ConsentRowModel = ClinicalConsentItem & {
  status: ApiPatientConsentStatus;
  termsVersion: string;
  grantedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
};

function ConsentRow({
  consent,
  disabled,
  saving,
  onGrant,
  onRevoke,
}: {
  consent: ConsentRowModel;
  disabled?: boolean;
  saving?: boolean;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  const isGranted = consent.status === 'granted';
  const statusLabel = consentStatusLabel(consent.status);
  const statusDate = consent.grantedAt ?? consent.revokedAt ?? consent.expiresAt;

  return (
    <View style={styles.consentRow}>
      <View style={styles.consentHeader}>
        <View style={[styles.consentIcon, isGranted && styles.consentIconGranted]}>
          <Ionicons name={consentStatusIcon(consent.status)} size={17} color={consentStatusColor(consent.status)} />
        </View>
        <View style={styles.consentCopy}>
          <View style={styles.consentTitleRow}>
            <Text style={styles.cardTitle}>{consent.label}</Text>
            <View style={[styles.consentStatusPill, { borderColor: consentStatusColor(consent.status) }]}>
              <Text style={[styles.consentStatusText, { color: consentStatusColor(consent.status) }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.consentDescription}>{consent.description}</Text>
          <Text style={styles.consentMeta}>
            {statusDate ? `${formatDateTimeLabel(statusDate)} · ` : ''}
            Termos {consent.termsVersion}
          </Text>
        </View>
      </View>
      <View style={styles.consentActions}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || isGranted}
          onPress={onGrant}
          style={({ pressed }) => [
            styles.consentButton,
            styles.consentButtonPrimary,
            (disabled || isGranted) && styles.consentButtonDisabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.consentButtonTextPrimary}>{saving ? 'Salvando' : 'Conceder'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || consent.status === 'revoked'}
          onPress={onRevoke}
          style={({ pressed }) => [
            styles.consentButton,
            styles.consentButtonMuted,
            (disabled || consent.status === 'revoked') && styles.consentButtonDisabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.consentButtonText}>{saving ? 'Salvando' : 'Revogar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ShareableActionButton({
  label,
  icon,
  primary,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shareableActionButton,
        primary && styles.shareableActionButtonPrimary,
        (disabled || loading) && styles.consentButtonDisabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}>
      <Text style={[styles.shareableActionText, primary && styles.shareableActionTextPrimary]}>
        {loading ? 'Salvando' : label}
      </Text>
      <Ionicons
        name={icon}
        size={15}
        color={primary && !disabled ? UI.darkText : UI.darkTextMuted}
      />
    </Pressable>
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTimeLabel(value?: string) {
  if (!value) {
    return 'Sem atendimento vinculado';
  }

  return `${value.slice(0, 10)} ${value.slice(11, 16)}`;
}

function toApiTagInput(tagId: string): ApiClinicalTagInput {
  const tag = clinicalQuickTags.find((item) => item.id === tagId);

  return {
    label: tag?.label ?? tagId,
    tone: tag?.tone ?? 'neutral',
  };
}

function tagIdFromLabel(label: string) {
  return clinicalQuickTags.find((tag) => tag.label.toLowerCase() === label.toLowerCase())?.id ?? null;
}

function sessionStatusLabel(status: string) {
  return sessionStatusLabels[status] ?? status;
}

function sessionTypeLabel(type: string) {
  return sessionTypeLabels[type] ?? type;
}

function clinicalRecordTypeLabel(type?: string) {
  switch (type) {
    case 'rectification':
      return 'Retificação';
    case 'initial_assessment':
      return 'Avaliação inicial';
    case 'follow_up':
      return 'Acompanhamento';
    case 'other':
      return 'Outro registro';
    case 'session_evolution':
    default:
      return 'Evolução da sessão';
  }
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function isClinicalSuccessMessage(value: string) {
  return ['salvo', 'salvas', 'carregado', 'carregada', 'criada', 'atualizado', 'iniciada', 'finalizada', 'aprovada']
    .some((item) => value.toLowerCase().includes(item));
}

function toTreatmentPlanStatus(value: string): ApiTreatmentPlanStatus {
  return treatmentPlanStatusOptions.some((option) => option.value === value)
    ? value as ApiTreatmentPlanStatus
    : 'active';
}

function linesToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullableText(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function normalizeOptionalDateInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Informe o prazo em um formato de data válido.');
  }

  return parsed.toISOString();
}

function normalizeOptionalTimelineDateInput(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} da timeline precisa estar em um formato de data válido.`);
  }

  return parsed.toISOString();
}

function timelineSourceLabel(sourceType: string) {
  return timelineSourceLabels[sourceType] ?? sourceType;
}

function timelineSourceDetailLabel(value: string) {
  switch (value) {
    case 'session_evolution':
      return 'Evolução da sessão';
    case 'initial_assessment':
      return 'Avaliação inicial';
    case 'follow_up':
      return 'Acompanhamento';
    case 'rectification':
      return 'Retificação';
    case 'online':
      return 'Sessão online';
    case 'in_person':
      return 'Sessão presencial';
    case 'phone':
      return 'Sessão por telefone';
    case 'portal':
      return 'Portal do paciente';
    case 'materials':
      return 'Materiais compartilhados';
    case 'checkins':
      return 'Check-ins';
    case 'notifications':
      return 'Notificações';
    case 'text':
      return 'Texto';
    case 'link':
      return 'Link';
    default:
      return value;
  }
}

function isApiTimelineItem(
  item: ApiPatientTimelineItem | (typeof clinicalTimelinePreview)[number],
): item is ApiPatientTimelineItem {
  return 'sourceType' in item;
}

function isSharedStatus(item: ApiPatientTask | ApiSharedMaterial | ApiPatientCheckIn | string) {
  const status = typeof item === 'string' ? item : item.status;

  return status === 'shared';
}

function isPatientVisibleStatus(item: ApiPatientTask | ApiSharedMaterial | ApiPatientCheckIn | string) {
  const status = typeof item === 'string' ? item : item.status;

  return status === 'shared' || status === 'completed' || status === 'answered';
}

function isClosedShareable(status: string) {
  return status === 'completed' || status === 'answered' || status === 'archived';
}

function shareableStatusLabel(status: string) {
  switch (status) {
    case 'shared':
      return 'Compartilhado';
    case 'completed':
      return 'Concluído';
    case 'answered':
      return 'Respondido';
    case 'archived':
      return 'Arquivado';
    case 'private':
      return 'Privado';
    default:
      return status;
  }
}

function shareableStatusColor(status: string) {
  switch (status) {
    case 'shared':
      return UI.darkPrimary;
    case 'completed':
      return '#F3C969';
    case 'answered':
      return '#F3C969';
    case 'archived':
      return '#EAA0A0';
    case 'private':
    default:
      return UI.darkTextMuted;
  }
}

function shareableStatusPillStyle(status: string) {
  switch (status) {
    case 'shared':
      return styles.shareablePillShared;
    case 'completed':
    case 'answered':
      return styles.shareablePillCompleted;
    case 'archived':
      return styles.shareablePillArchived;
    case 'private':
    default:
      return styles.shareablePillPrivate;
  }
}

function canStartSession(session: ApiClinicalSession) {
  return session.status === 'scheduled';
}

function canCompleteSession(session: ApiClinicalSession) {
  return session.status === 'scheduled' || session.status === 'in_progress';
}

function buildConsentRows(consents?: ApiPatientConsent[]): ConsentRowModel[] {
  return clinicalConsentPreview.map((definition) => {
    const saved = consents?.find((consent) => consent.consentType === definition.id);

    return {
      ...definition,
      status: saved?.status ?? 'pending',
      termsVersion: saved?.termsVersion ?? 'clinical-consent-v1',
      grantedAt: saved?.grantedAt,
      revokedAt: saved?.revokedAt,
      expiresAt: saved?.expiresAt,
    };
  });
}

function consentStatusLabel(status: ApiPatientConsentStatus) {
  switch (status) {
    case 'granted':
      return 'Liberado';
    case 'revoked':
      return 'Revogado';
    case 'expired':
      return 'Expirado';
    case 'pending':
      return 'Pendente';
  }
}

function consentStatusIcon(status: ApiPatientConsentStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'granted':
      return 'checkmark-circle-outline';
    case 'revoked':
      return 'close-circle-outline';
    case 'expired':
      return 'alert-circle-outline';
    case 'pending':
      return 'time-outline';
  }
}

function consentStatusColor(status: ApiPatientConsentStatus) {
  switch (status) {
    case 'granted':
      return UI.darkPrimary;
    case 'revoked':
      return '#EAA0A0';
    case 'expired':
      return '#F3C969';
    case 'pending':
      return UI.darkTextMuted;
  }
}

function statusColor(status: ClinicalIntegrationStatus) {
  switch (status) {
    case 'connected':
      return UI.darkPrimary;
    case 'partial':
      return '#F3C969';
    case 'pending':
      return UI.darkTextMuted;
  }
}

function statusPillStyle(status: ClinicalIntegrationStatus) {
  switch (status) {
    case 'connected':
      return styles.statusConnected;
    case 'partial':
      return styles.statusPartial;
    case 'pending':
      return styles.statusPending;
  }
}

function tagToneStyle(tone: ClinicalQuickTag['tone']) {
  switch (tone) {
    case 'risk':
      return styles.tagRisk;
    case 'attention':
      return styles.tagAttention;
    case 'neutral':
      return styles.tagNeutral;
  }
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.10)',
    backgroundColor: UI.darkSurface,
  },
  metricValue: {
    color: UI.darkText,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.10)',
    backgroundColor: UI.darkSurface,
  },
  moduleCard: {
    gap: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.10)',
    backgroundColor: UI.darkSurface,
  },
  moduleHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  moduleIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: UI.darkSurfaceRaised,
  },
  moduleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  cardTitle: {
    color: UI.darkText,
    fontSize: 15,
    fontWeight: '900',
  },
  cardText: {
    flex: 1,
    color: UI.darkTextMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 12,
    lineHeight: 17,
  },
  mutedText: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusConnected: {
    borderColor: 'rgba(109, 214, 180, 0.36)',
    backgroundColor: 'rgba(109, 214, 180, 0.10)',
  },
  statusPartial: {
    borderColor: 'rgba(243, 201, 105, 0.36)',
    backgroundColor: 'rgba(243, 201, 105, 0.10)',
  },
  statusPending: {
    borderColor: 'rgba(169, 184, 177, 0.28)',
    backgroundColor: 'rgba(169, 184, 177, 0.08)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  splitList: {
    gap: 12,
  },
  splitColumn: {
    gap: 6,
  },
  kicker: {
    color: UI.darkPrimary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  list: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  bulletCompact: {
    gap: 7,
  },
  bulletDot: {
    width: 6,
    height: 6,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: UI.darkPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailLabel: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  detailValue: {
    color: UI.darkText,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  tag: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagNeutral: {
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurface,
  },
  tagAttention: {
    borderColor: 'rgba(243, 201, 105, 0.28)',
    backgroundColor: 'rgba(243, 201, 105, 0.08)',
  },
  tagRisk: {
    borderColor: 'rgba(200, 100, 122, 0.34)',
    backgroundColor: 'rgba(200, 100, 122, 0.10)',
  },
  tagSelected: {
    borderColor: 'rgba(109, 214, 180, 0.70)',
    backgroundColor: 'rgba(109, 214, 180, 0.18)',
  },
  tagText: {
    color: UI.darkTextMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  tagTextSelected: {
    color: UI.darkText,
  },
  draftBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: UI.darkSurfaceRaised,
  },
  draftText: {
    color: UI.darkText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  sessionActions: {
    gap: 8,
  },
  planStatusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planStatusButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurfaceRaised,
  },
  planStatusButtonSelected: {
    borderColor: 'rgba(109, 214, 180, 0.58)',
    backgroundColor: 'rgba(109, 214, 180, 0.16)',
  },
  planStatusText: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  planStatusTextSelected: {
    color: UI.darkText,
  },
  planTextArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  timelineFilterPanel: {
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.10)',
    backgroundColor: UI.darkSurface,
  },
  timelineFilterIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  timelineFilterText: {
    flex: 1,
    color: UI.darkTextMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  timelineDateRow: {
    gap: 10,
  },
  timelineDateField: {
    minHeight: 42,
  },
  timelineFilterGroup: {
    gap: 7,
  },
  timelineFilterLabel: {
    color: UI.darkText,
    fontSize: 12,
    fontWeight: '600',
  },
  timelineChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timelineChip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurfaceRaised,
  },
  timelineChipSelected: {
    borderColor: 'rgba(109, 214, 180, 0.50)',
    backgroundColor: 'rgba(109, 214, 180, 0.12)',
  },
  timelineChipText: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  timelineChipTextSelected: {
    color: UI.darkText,
    fontWeight: '600',
  },
  shareableBlock: {
    gap: 10,
  },
  shareableTextArea: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  shareableToggle: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurfaceRaised,
  },
  shareableToggleSelected: {
    borderColor: 'rgba(109, 214, 180, 0.46)',
    backgroundColor: 'rgba(109, 214, 180, 0.12)',
  },
  shareableToggleText: {
    color: UI.darkText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  shareablePreview: {
    gap: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(109, 214, 180, 0.18)',
    backgroundColor: 'rgba(109, 214, 180, 0.08)',
  },
  shareablePreviewLabel: {
    color: UI.darkPrimary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  shareablePreviewTitle: {
    color: UI.darkText,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  shareableResponseBox: {
    gap: 6,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(243, 201, 105, 0.24)',
    backgroundColor: 'rgba(243, 201, 105, 0.08)',
  },
  shareableDivider: {
    height: 1,
    backgroundColor: 'rgba(237, 247, 242, 0.08)',
  },
  shareableSegment: {
    flexDirection: 'row',
    gap: 8,
  },
  shareableSegmentButton: {
    minHeight: 34,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurfaceRaised,
  },
  shareableSegmentButtonSelected: {
    borderColor: 'rgba(109, 214, 180, 0.58)',
    backgroundColor: 'rgba(109, 214, 180, 0.16)',
  },
  shareableSegmentText: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  shareableSegmentTextSelected: {
    color: UI.darkText,
  },
  shareableItem: {
    gap: 7,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(237, 247, 242, 0.08)',
  },
  shareableHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shareableTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  shareablePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  shareablePillPrivate: {
    borderColor: 'rgba(169, 184, 177, 0.28)',
    backgroundColor: 'rgba(169, 184, 177, 0.08)',
  },
  shareablePillShared: {
    borderColor: 'rgba(109, 214, 180, 0.36)',
    backgroundColor: 'rgba(109, 214, 180, 0.10)',
  },
  shareablePillCompleted: {
    borderColor: 'rgba(243, 201, 105, 0.36)',
    backgroundColor: 'rgba(243, 201, 105, 0.10)',
  },
  shareablePillArchived: {
    borderColor: 'rgba(234, 160, 160, 0.34)',
    backgroundColor: 'rgba(234, 160, 160, 0.09)',
  },
  shareablePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  shareableActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shareableActionButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurfaceRaised,
  },
  shareableActionButtonPrimary: {
    borderColor: 'rgba(109, 214, 180, 0.50)',
    backgroundColor: 'rgba(109, 214, 180, 0.16)',
  },
  shareableActionText: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  shareableActionTextPrimary: {
    color: UI.darkText,
  },
  timelineCard: {
    gap: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.10)',
    backgroundColor: UI.darkSurface,
  },
  timelineCardInteractive: {
    borderColor: 'rgba(109, 214, 180, 0.22)',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  timelineTitle: {
    flex: 1,
    color: UI.darkText,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  timelineSummary: {
    color: UI.darkTextMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  timelineMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  timelineMetaText: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '400',
  },
  timelineMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(169, 184, 177, 0.55)',
  },
  timelineOpenRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(237, 247, 242, 0.08)',
    paddingTop: 6,
  },
  timelineOpenText: {
    color: UI.darkPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  timelineDetailPanel: {
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(109, 214, 180, 0.22)',
    backgroundColor: UI.darkSurface,
  },
  timelineDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  timelineDetailTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  timelineDetailTitle: {
    color: UI.darkText,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  timelineCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurfaceRaised,
  },
  timelineDetailGrid: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(237, 247, 242, 0.08)',
    paddingTop: 10,
  },
  timelineAccessNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(109, 214, 180, 0.16)',
    backgroundColor: 'rgba(109, 214, 180, 0.08)',
  },
  timelineAccessText: {
    flex: 1,
    color: UI.darkTextMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  layerPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(109, 214, 180, 0.22)',
    backgroundColor: 'rgba(109, 214, 180, 0.08)',
  },
  layerText: {
    color: UI.darkPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  consentRow: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(237, 247, 242, 0.08)',
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  consentIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: UI.darkSurfaceRaised,
  },
  consentIconGranted: {
    backgroundColor: 'rgba(109, 214, 180, 0.12)',
  },
  consentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  consentTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  consentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(237, 247, 242, 0.04)',
  },
  consentStatusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  consentDescription: {
    color: UI.darkTextMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  consentMeta: {
    color: UI.darkTextMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  consentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  consentButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  consentButtonPrimary: {
    borderColor: 'rgba(109, 214, 180, 0.58)',
    backgroundColor: 'rgba(109, 214, 180, 0.16)',
  },
  consentButtonMuted: {
    borderColor: 'rgba(237, 247, 242, 0.12)',
    backgroundColor: UI.darkSurfaceRaised,
  },
  consentButtonDisabled: {
    opacity: 0.48,
  },
  consentButtonText: {
    color: UI.darkTextMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  consentButtonTextPrimary: {
    color: UI.darkText,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
