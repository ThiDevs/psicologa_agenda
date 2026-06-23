import type {
  ClinicalConsentItem,
  ClinicalIntegrationModule,
  ClinicalQuickTag,
  ClinicalTimelineItem,
  ClinicalTreatmentGoal,
} from '@/types/clinical';

export const clinicalIntegrationModules: ClinicalIntegrationModule[] = [
  {
    id: 'post_session_record',
    title: 'Registro pós-consulta com IA',
    icon: 'document-text-outline',
    status: 'partial',
    done: [
      'Entrada criada no fluxo real da profissional.',
      'ClinicalSession persistida e vinculada ao atendimento.',
      'ClinicalDraft persistido por atendimento.',
      'ClinicalRecord aprovado manualmente a partir do rascunho.',
      'Retificação de prontuário aprovado nasce como novo ClinicalDraft.',
      'Aprovação de retificação cria nova versão sem sobrescrever histórico.',
      'Rascunho manual salvo com auditoria sem conteúdo clínico no log.',
    ],
    missing: [
      'Geração de rascunho por IA com consentimento.',
      'Edição assistida e exportação de prontuário aprovado.',
    ],
  },
  {
    id: 'quick_tags',
    title: 'Botões rápidos e tags clínicas',
    icon: 'pricetags-outline',
    status: 'partial',
    done: [
      'Tags rápidas aparecem no espaço clínico do atendimento.',
      'Tags selecionadas são salvas em AppliedClinicalTag.',
      'Atualização de tags cria item de memória na timeline.',
    ],
    missing: [
      'Tags personalizadas por psicóloga.',
      'CRUD de biblioteca de tags.',
      'Filtros por tags no histórico longitudinal.',
    ],
  },
  {
    id: 'patient_timeline',
    title: 'Linha do tempo do paciente',
    icon: 'git-branch-outline',
    status: 'partial',
    done: [
      'Timeline clínica inicial aparece na tela do atendimento.',
      'PatientTimelineItem foi criado no backend.',
      'Início e finalização da sessão clínica entram como memória na timeline.',
      'Itens exibem camada: rascunho, memória, prontuário ou compartilhado.',
      'Tarefas e materiais compartilhados entram na camada compartilhado.',
    ],
    missing: [
      'Endpoint longitudinal por paciente fora do atendimento.',
      'Filtros por data, tag, origem e severidade.',
      'Busca longitudinal no histórico.',
    ],
  },
  {
    id: 'treatment_plan',
    title: 'Plano terapêutico vivo',
    icon: 'map-outline',
    status: 'partial',
    done: [
      'Bloco visual de objetivos terapêuticos foi conectado à tela clínica.',
      'Estados iniciais de objetivo aparecem no app.',
      'TreatmentPlan persistido por paciente/profissional no backend.',
      'Atualização do plano cria memória na timeline sem expor conteúdo sensível.',
    ],
    missing: [
      'Histórico versionado de alterações do plano.',
      'Sugestões de atualização por IA.',
      'Revisão periódica e histórico de alterações.',
    ],
  },
  {
    id: 'next_session_briefing',
    title: 'Preparação da próxima sessão',
    icon: 'reader-outline',
    status: 'partial',
    done: [
      'Card de briefing pré-sessão foi desenhado na tela clínica.',
      'Fontes esperadas aparecem separadas de prontuário.',
    ],
    missing: [
      'Job automático antes da consulta.',
      'Resumo por IA usando fontes autorizadas.',
      'Arquivamento automático após sessão.',
    ],
  },
  {
    id: 'clinical_layers',
    title: 'Rascunho, prontuário e memória',
    icon: 'layers-outline',
    status: 'partial',
    done: [
      'Camadas aparecem no app com linguagem própria.',
      'Rascunho salvo pode virar prontuário aprovado por ação humana.',
      'Retificação cria nova versão de prontuário preservando a versão anterior.',
      'Timeline diferencia memória, rascunho e prontuário.',
    ],
    missing: [
      'Exportação seletiva por camada.',
    ],
  },
  {
    id: 'patient_portal',
    title: 'Portal do paciente com cuidado',
    icon: 'person-circle-outline',
    status: 'partial',
    done: [
      'Regras e conexão com tarefas/materiais foram especificadas.',
      'PatientTask e SharedMaterial nascem como conteúdo privado no workspace clínico.',
      'Compartilhar ou recolher exige ação explícita da psicóloga.',
      'Tela clínica mostra prévia do que o paciente verá antes de compartilhar.',
      'Compartilhamento consulta consentimento ativo antes de liberar conteúdo.',
      'Área Meu acompanhamento lista apenas tarefas e materiais já compartilhados.',
      'Paciente pode concluir tarefa compartilhada e enviar resposta opcional.',
    ],
    missing: [
      'Consentimento direto pelo portal do paciente.',
      'Edição/reabertura de tarefa após revisão da psicóloga.',
    ],
  },
  {
    id: 'between_session_checkins',
    title: 'Check-ins entre sessões',
    icon: 'pulse-outline',
    status: 'pending',
    done: [
      'Templates e fluxo foram especificados.',
    ],
    missing: [
      'Agenda de check-ins por paciente.',
      'Respostas pelo portal.',
      'Gráficos longitudinais e resumo de tendência.',
    ],
  },
  {
    id: 'responsible_alerts',
    title: 'Alertas responsáveis',
    icon: 'alert-circle-outline',
    status: 'pending',
    done: [
      'Linguagem, níveis e revisão humana foram especificados.',
    ],
    missing: [
      'Motor de alertas por tag/check-in.',
      'Painel de revisão de alertas.',
      'Auditoria de confirmação, descarte e resolução.',
    ],
  },
  {
    id: 'privacy_security',
    title: 'Privacidade e segurança',
    icon: 'shield-checkmark-outline',
    status: 'partial',
    done: [
      'Tela clínica sinaliza consentimentos necessários.',
      'Rotas usam fluxo autenticado já existente.',
      'Endpoints clínicos validam vínculo profissional-atendimento.',
      'PatientConsent persistido por paciente/profissional e exibido no workspace clínico.',
      'Ações clínicas geram AuditLog sem gravar conteúdo clínico no metadata.',
      'Compartilhar tarefas e materiais exige consentimento granular ativo.',
      'API base mantém /api em produção.',
    ],
    missing: [
      'Portal do paciente para consentimento direto.',
      'Auditoria clínica completa.',
      'Criptografia/campos sensíveis e política de retenção.',
    ],
  },
];

export const clinicalQuickTags: ClinicalQuickTag[] = [
  { id: 'retomar', label: 'Retomar depois', tone: 'neutral' },
  { id: 'tarefa', label: 'Tarefa combinada', tone: 'neutral' },
  { id: 'insight', label: 'Insight', tone: 'neutral' },
  { id: 'ansiedade', label: 'Ansiedade', tone: 'attention' },
  { id: 'sono', label: 'Sono', tone: 'attention' },
  { id: 'familia', label: 'Família', tone: 'attention' },
  { id: 'crise', label: 'Crise', tone: 'risk' },
  { id: 'risco', label: 'Risco', tone: 'risk' },
];

export const clinicalTimelinePreview: ClinicalTimelineItem[] = [
  {
    id: 'briefing-preview',
    title: 'Briefing pré-sessão',
    summary: 'Últimos pontos, tarefas pendentes e tags importantes aparecem aqui antes da consulta.',
    dateLabel: 'Próxima sessão',
    layer: 'memoria',
  },
  {
    id: 'draft-preview',
    title: 'Rascunho de evolução',
    summary: 'Texto salvo como rascunho, ainda sem valor de prontuário até a psicóloga aprovar.',
    dateLabel: 'Após consulta',
    layer: 'rascunho',
  },
  {
    id: 'shared-preview',
    title: 'Tarefa compartilhável',
    summary: 'Futuras tarefas liberadas pela psicóloga entram no portal do paciente.',
    dateLabel: 'Entre sessões',
    layer: 'compartilhado',
  },
];

export const clinicalTreatmentGoalsPreview: ClinicalTreatmentGoal[] = [
  { id: 'goal-1', title: 'Mapear demanda principal e objetivos iniciais.', status: 'ativo' },
  { id: 'goal-2', title: 'Acompanhar padrões recorrentes entre sessões.', status: 'revisar' },
  { id: 'goal-3', title: 'Definir tarefas clínicas somente quando apropriado.', status: 'pausado' },
];

export const clinicalConsentPreview: ClinicalConsentItem[] = [
  {
    id: 'portal',
    label: 'Portal do paciente',
    description: 'Libera a experiência de acompanhamento do paciente quando o portal estiver ativo.',
  },
  {
    id: 'checkins',
    label: 'Check-ins entre sessões',
    description: 'Autoriza coleta de respostas estruturadas fora da consulta.',
  },
  {
    id: 'materials',
    label: 'Materiais e tarefas',
    description: 'Permite compartilhar conteúdos revisados pela psicóloga no portal.',
  },
  {
    id: 'notifications',
    label: 'Notificações de cuidado',
    description: 'Autoriza lembretes e avisos relacionados ao acompanhamento.',
  },
  {
    id: 'ai_analysis',
    label: 'Análise por IA',
    description: 'Exigido antes de qualquer rascunho, resumo ou briefing apoiado por IA.',
  },
  {
    id: 'recording',
    label: 'Gravação',
    description: 'Exigido antes de qualquer gravação de chamada ou sessão.',
  },
  {
    id: 'transcription',
    label: 'Transcrição',
    description: 'Exigido antes de transcrever áudio ou usar transcrição em rascunhos.',
  },
];
