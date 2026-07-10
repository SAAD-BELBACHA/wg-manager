import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { MetricCard } from '@/components/MetricCard';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Expense, FinanceResponse } from '@/types/api';
import { colors, spacing } from '@/theme/tokens';

export default function ExpensesScreen() {
  const { token } = useAuth();
  const [finance, setFinance] = useState<FinanceResponse | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadFinance = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    apiRequest<FinanceResponse>('/finance', { token })
      .then(setFinance)
      .catch(err => setError(err instanceof Error ? err.message : 'Ausgaben konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadFinance();
  }, [loadFinance]));

  async function addExpense() {
    if (!title.trim() || !amount.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = await apiRequest<{ expense: Expense }>('/finance', {
        method: 'POST',
        token,
        body: { title: title.trim(), amount: amount.trim() }
      });
      setFinance(current => current ? {
        ...current,
        expenses: [data.expense, ...current.expenses],
        total: current.total + data.expense.amount
      } : current);
      setTitle('');
      setAmount('');
      loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ausgabe konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(expense: Expense) {
    setError('');
    try {
      await apiRequest<{ success: boolean }>(`/finance/${expense.id}`, {
        method: 'DELETE',
        token
      });
      setFinance(current => current ? {
        ...current,
        expenses: current.expenses.filter(item => item.id !== expense.id),
        total: Math.max(0, current.total - expense.amount)
      } : current);
      loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ausgabe konnte nicht gelöscht werden.');
    }
  }

  return (
    <Screen>
      <AppHeader title="Ausgaben" subtitle="Kosten fair erfassen, Balances ruhig halten." eyebrow="Money" icon="wallet" />

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="Titel" value={title} onChangeText={setTitle} placeholder="z.B. Strom" />
          <TextField label="Betrag" value={amount} onChangeText={setAmount} placeholder="z.B. 24.50" keyboardType="decimal-pad" />
          <Button title="Ausgabe hinzufügen" icon="plus" loading={saving} onPress={addExpense} />
        </View>
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      {finance ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="Gesamt" value={`${finance.total.toFixed(2)} EUR`} helper={`${finance.expenses.length} Ausgaben`} icon="receipt" tone="lime" />
            <MetricCard label="Offen" value={String(finance.debts.length)} helper="Balances" icon="scale-balanced" tone="aqua" />
          </View>

          <Card>
            <AppText variant="h2">Offene Schulden</AppText>
            {finance.debts.length ? finance.debts.map(debt => (
              <ListRow
                key={`${debt.from_user.id}-${debt.to_user.id}-${debt.amount}`}
                title={`${debt.amount.toFixed(2)} EUR`}
                subtitle={`${debt.from_user.username} schuldet ${debt.to_user.username}`}
                icon="arrow-right-arrow-left"
              />
            )) : <EmptyState title="Alles ausgeglichen" body="Keine offenen Schulden gerade." icon="scale-balanced" tone="lime" />}
          </Card>

          <Card>
            <AppText variant="h2">Letzte Ausgaben</AppText>
            {finance.expenses.length ? finance.expenses.map(expense => (
              <ListRow
                key={expense.id}
                title={expense.title}
                subtitle={`${expense.amount.toFixed(2)} EUR · bezahlt von ${expense.paid_by.username}`}
                icon="receipt"
                actionLabel="Löschen"
                onAction={() => deleteExpense(expense)}
              />
            )) : <EmptyState title="Noch keine Ausgaben" body="Erste Rechnung eintragen, Balance läuft." icon="receipt" tone="aqua" />}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: spacing.md
  },
  form: {
    gap: spacing.md
  },
  error: {
    color: colors.danger
  }
});
