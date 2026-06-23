import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  EmptyState,
  HeaderBar,
  InfoStrip,
  PrimaryButton,
  ScreenScaffold,
  SectionTitle,
} from '@/components/app-ui';
import {
  getApiErrorMessage,
  getPatientCarePortal,
  type ApiPatientCarePortal,
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
} as const;

export function PatientCarePortalScreen() {
  const router = useRouter();
  const [portal, setPortal] = useState<ApiPatientCarePortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const tasks = portal?.tasks ?? [];
  const materials = portal?.materials ?? [];

  return (
    <ScreenScaffold>
      <HeaderBar
        title="Meu acompanhamento"
        subtitle="Tarefas e materiais liberados pela sua psicóloga"
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
            <SummaryTile icon="checkbox-outline" label="Tarefas abertas" value={String(tasks.length)} />
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

          <SectionTitle title="Linha do cuidado" />
          <View style={styles.careTimeline}>
            <CareStep icon="calendar-outline" title="Sessão" text="Acompanhe seus horários" done />
            <CareStep icon="checkbox-outline" title="Tarefas" text={tasks.length ? 'Em andamento' : 'Sem pendências'} current={tasks.length > 0} />
            <CareStep icon="library-outline" title="Materiais" text={materials.length ? 'Disponíveis' : 'Aguardando'} current={tasks.length === 0 && materials.length > 0} />
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
}: {
  task: ApiPatientTask;
  isFirst: boolean;
}) {
  return (
    <View style={[styles.listRow, isFirst && styles.listRowFirst]}>
      <View style={styles.rowIcon}>
        <Ionicons name="checkbox-outline" size={18} color={CARE_COLORS.primary} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{task.title}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>Aberta</Text>
          </View>
        </View>
        {task.description ? (
          <Text style={styles.rowText}>{task.description}</Text>
        ) : null}
        <Text style={styles.rowMeta}>
          {task.dueAt ? `Prazo ${formatDateLabel(task.dueAt)}` : 'Sem prazo definido'} · {task.acceptsResponse ? 'aceita resposta' : 'sem resposta'}
        </Text>
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
  materialPill: {
    backgroundColor: CARE_COLORS.amberSoft,
  },
  materialStatusText: {
    color: CARE_COLORS.amber,
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
