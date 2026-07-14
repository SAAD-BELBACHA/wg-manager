import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/i18n/I18nContext';
import { ChecklistItem, ChecklistKind, MoveChecklist } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function ChecklistsScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [lists, setLists] = useState<MoveChecklist[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ checklists: MoveChecklist[] }>('/checklists', { token })
      .then(data => setLists(data.checklists))
      .catch(err => setError(err instanceof Error ? err.message : t('checklists.loadError')))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function createChecklist(kind: ChecklistKind) {
    setError('');
    setCreating(true);
    try {
      const data = await apiRequest<{ checklist: MoveChecklist }>('/checklists', {
        method: 'POST', token, body: { kind }
      });
      setLists(current => [data.checklist, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checklists.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function toggleItem(item: ChecklistItem) {
    const data = await apiRequest<{ checklist: MoveChecklist }>(`/checklists/items/${item.id}/toggle`, {
      method: 'POST', token
    });
    setLists(current => current.map(c => c.id === data.checklist.id ? data.checklist : c));
  }

  async function deleteItem(item: ChecklistItem) {
    const data = await apiRequest<{ checklist: MoveChecklist }>(`/checklists/items/${item.id}`, {
      method: 'DELETE', token
    });
    setLists(current => current.map(c => c.id === data.checklist.id ? data.checklist : c));
  }

  async function addItem(checklist: MoveChecklist) {
    const text = (drafts[checklist.id] || '').trim();
    if (!text) return;
    const data = await apiRequest<{ checklist: MoveChecklist }>(`/checklists/${checklist.id}/items`, {
      method: 'POST', token, body: { text }
    });
    setDrafts(d => ({ ...d, [checklist.id]: '' }));
    setLists(current => current.map(c => c.id === data.checklist.id ? data.checklist : c));
  }

  async function deleteChecklist(checklist: MoveChecklist) {
    await apiRequest(`/checklists/${checklist.id}`, { method: 'DELETE', token });
    setLists(current => current.filter(c => c.id !== checklist.id));
  }

  function itemLabel(item: ChecklistItem) {
    return item.text_key ? t(`checklists.item_${item.text_key}`) : item.text;
  }

  return (
    <Screen>
      <AppHeader title={t('checklists.title')} subtitle={t('checklists.subtitle')} eyebrow={t('checklists.eyebrow')} icon="box-archive" back />

      <View style={styles.createRow}>
        <Button title={t('checklists.newMoveIn')} icon="right-to-bracket" loading={creating} onPress={() => createChecklist('move_in')} style={styles.flex} />
        <Button title={t('checklists.newMoveOut')} icon="right-from-bracket" variant="secondary" loading={creating} onPress={() => createChecklist('move_out')} style={styles.flex} />
      </View>

      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {lists.length === 0 && !loading ? (
        <Card><EmptyState title={t('checklists.emptyTitle')} body={t('checklists.emptyBody')} icon="box-archive" tone="aqua" /></Card>
      ) : null}

      {lists.map(checklist => {
        const pct = checklist.total_count ? checklist.done_count / checklist.total_count : 0;
        return (
          <Card key={checklist.id}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <StatusPill label={checklist.kind === 'move_in' ? t('checklists.moveIn') : t('checklists.moveOut')} tone={checklist.kind === 'move_in' ? 'lime' : 'coral'} />
                <AppText variant="h2">{checklist.title || (checklist.kind === 'move_in' ? t('checklists.newMoveIn') : t('checklists.newMoveOut'))}</AppText>
                <AppText variant="small" style={styles.muted}>{t('checklists.progress', { done: checklist.done_count, total: checklist.total_count })}</AppText>
              </View>
              <Pressable onPress={() => deleteChecklist(checklist)} style={styles.trash}>
                <FontAwesome6 name="trash" size={14} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
            </View>

            <View style={styles.items}>
              {checklist.items.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <Pressable onPress={() => toggleItem(item)} style={styles.itemToggle}>
                    <View style={[styles.checkbox, item.done && styles.checkboxOn]}>
                      {item.done ? <FontAwesome6 name="check" size={11} color="#FFFFFF" /> : null}
                    </View>
                    <AppText style={[styles.itemText, item.done && styles.itemDone]}>{itemLabel(item)}</AppText>
                  </Pressable>
                  {item.text_key === null ? (
                    <Pressable onPress={() => deleteItem(item)} style={styles.itemTrash}>
                      <FontAwesome6 name="xmark" size={13} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.addRow}>
              <View style={styles.flex}>
                <TextField
                  label=""
                  value={drafts[checklist.id] || ''}
                  onChangeText={v => setDrafts(d => ({ ...d, [checklist.id]: v }))}
                  placeholder={t('checklists.addItemPlaceholder')}
                  onSubmitEditing={() => addItem(checklist)}
                />
              </View>
              <Button title={t('checklists.addItem')} icon="plus" variant="secondary" onPress={() => addItem(checklist)} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    createRow: { flexDirection: 'row', gap: spacing.md },
    error: { color: colors.danger },
    muted: { color: colors.textMuted },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
    headerCopy: { flex: 1, gap: spacing.xs },
    trash: { padding: spacing.sm },
    progressTrack: { height: 10, borderRadius: 999, backgroundColor: colors.surfaceMuted, overflow: 'hidden', marginTop: spacing.sm },
    progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.success },
    items: { gap: spacing.xs, marginTop: spacing.sm },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
    itemToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { backgroundColor: colors.success, borderColor: colors.success },
    itemText: { flex: 1, fontWeight: '600' },
    itemDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    itemTrash: { padding: spacing.sm },
    addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
    addInputWrap: { flex: 1 }
  });
}
