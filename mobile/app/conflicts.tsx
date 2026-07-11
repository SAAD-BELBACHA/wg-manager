import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { ConflictReport } from '@/types/api';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function ConflictsScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ conflicts: ConflictReport[] }>('/conflicts', { token })
      .then(data => setConflicts(data.conflicts))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addConflict() {
    if (!description.trim()) return;
    const data = await apiRequest<{ conflict: ConflictReport }>('/conflicts', {
      method: 'POST',
      token,
      body: {
        category: 'communication',
        urgency: 'normal',
        description: description.trim(),
        desired_solution: solution.trim(),
        anonymous: false
      }
    });
    setConflicts(current => [data.conflict, ...current]);
    setDescription('');
    setSolution('');
  }

  return (
    <Screen>
      <AppHeader title={t('conflicts.title')} subtitle={t('conflicts.subtitle')} eyebrow={t('conflicts.eyebrow')} icon="comments" back />
      <Card tone="aqua">
        <AppText variant="muted">
          {t('conflicts.disclaimer')}
        </AppText>
      </Card>
      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('conflicts.problem')} value={description} onChangeText={setDescription} placeholder={t('conflicts.problemPlaceholder')} />
          <TextField label={t('conflicts.solution')} value={solution} onChangeText={setSolution} placeholder={t('conflicts.solutionPlaceholder')} />
          <Button title={t('conflicts.submit')} icon="plus" onPress={addConflict} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Card>
        <AppText variant="h2">{t('conflicts.cases')}</AppText>
        {conflicts.length ? conflicts.map(conflict => (
          <ListRow
            key={conflict.id}
            title={conflict.description}
            subtitle={conflict.desired_solution || t('conflicts.noSolution')}
            icon="comments"
          >
            <StatusPill label={conflict.status} tone="coral" />
          </ListRow>
        )) : <EmptyState title={t('conflicts.emptyTitle')} body={t('conflicts.emptyBody')} icon="heart" tone="lime" />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md }
});
