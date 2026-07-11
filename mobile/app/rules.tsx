import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { Rule } from '@/types/api';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function RulesScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    form: { gap: spacing.md },
    error: { color: colors.danger }
  }), [colors]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ rules: Rule[] }>('/rules', { token })
      .then(data => setRules(data.rules))
      .catch(err => setError(err instanceof Error ? err.message : 'Regeln konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addRule() {
    if (!title.trim()) return;
    const data = await apiRequest<{ rule: Rule }>('/rules', {
      method: 'POST',
      token,
      body: { title: title.trim(), content: content.trim(), category: 'WG' }
    });
    setRules(current => [data.rule, ...current]);
    setTitle('');
    setContent('');
  }

  async function archiveRule(rule: Rule) {
    await apiRequest<{ success: boolean }>(`/rules/${rule.id}`, { method: 'DELETE', token });
    setRules(current => current.filter(item => item.id !== rule.id));
  }

  return (
    <Screen>
      <AppHeader title="WG-Regeln" subtitle="Gemeinsame Erwartungen ohne Zettelchaos." eyebrow="Fairness" icon="book" back />
      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="Regel" value={title} onChangeText={setTitle} placeholder="z.B. Ruhezeit" />
          <TextField label="Beschreibung" value={content} onChangeText={setContent} placeholder="Was gilt genau?" />
          <Button title="Regel vorschlagen" icon="plus" onPress={addRule} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      <Card>
        <AppText variant="h2">Aktive Regeln</AppText>
        {rules.length ? rules.map(rule => (
          <ListRow
            key={rule.id}
            title={rule.title}
            subtitle={rule.content || 'Keine Beschreibung.'}
            icon="book-open"
            actionLabel="Archiv"
            onAction={() => archiveRule(rule)}
          >
            <StatusPill label={rule.category} tone="lime" />
          </ListRow>
        )) : <EmptyState title="Keine Regeln" body="Vorschläge für euer Zusammenleben landen hier." icon="book" tone="lime" />}
      </Card>
    </Screen>
  );
}
