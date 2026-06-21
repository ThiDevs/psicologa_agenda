import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, InfoStrip, PrimaryButton, UI } from '@/components/app-ui';

export function AccountDeletionCard({
  armed,
  loading,
  errorMessage,
  onCancel,
  onDelete,
}: {
  armed: boolean;
  loading: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="trash-outline" size={22} color={UI.danger} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Excluir conta</Text>
          <Text style={styles.text}>
            Remove seus dados de acesso e desativa consultórios administrados por esta conta. Registros de agenda podem ser mantidos quando necessários para segurança, histórico operacional e obrigações legais.
          </Text>
        </View>
      </View>

      {errorMessage && (
        <InfoStrip
          icon="alert-circle-outline"
          title="Exclusão indisponível"
          text={errorMessage}
          tone="warning"
        />
      )}

      {armed && (
        <InfoStrip
          icon="warning-outline"
          title="Confirmar exclusão"
          text="Toque em Excluir definitivamente para encerrar a conta. Esta ação revoga sua sessão atual."
          tone="warning"
        />
      )}

      <View style={styles.actions}>
        {armed && (
          <PrimaryButton
            label="Manter conta"
            icon="close-outline"
            variant="secondary"
            disabled={loading}
            onPress={onCancel}
          />
        )}
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            loading && styles.deleteButtonDisabled,
            pressed && !loading && styles.pressed,
          ]}>
          {loading && <ActivityIndicator color={UI.textMuted} />}
          <Text numberOfLines={1} style={[styles.deleteButtonText, loading && styles.deleteButtonTextDisabled]}>
            {loading ? 'Excluindo...' : armed ? 'Excluir definitivamente' : 'Excluir minha conta'}
          </Text>
          {!loading && <Ionicons name={armed ? 'warning-outline' : 'trash-outline'} size={20} color={UI.surface} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.18)',
    backgroundColor: UI.surface,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#FEF2F2',
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  title: {
    color: UI.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  text: {
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  actions: {
    gap: 9,
  },
  deleteButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: UI.danger,
  },
  deleteButtonDisabled: {
    backgroundColor: UI.surfaceMuted,
  },
  deleteButtonText: {
    color: UI.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  deleteButtonTextDisabled: {
    color: UI.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
