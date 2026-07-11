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
import { MetricCard } from '@/components/MetricCard';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/i18n/I18nContext';
import { Expense, FinanceResponse } from '@/types/api';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function ExpensesScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
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
  }), [colors]);
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
      .catch(err => setError(err instanceof Error ? err.message : t('expenses.loadError')))
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
      setError(err instanceof Error ? err.message : t('expenses.createFailed'));
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
      setError(err instanceof Error ? err.message : t('expenses.deleteFailed'));
    }
  }

  return (
    <Screen>
      <AppHeader title={t('expenses.title')} subtitle={t('expenses.subtitle')} eyebrow={t('expenses.eyebrow')} icon="wallet" />

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('expenses.expenseTitle')} value={title} onChangeText={setTitle} placeholder={t('expenses.titlePlaceholder')} />
          <TextField label={t('expenses.amount')} value={amount} onChangeText={setAmount} placeholder={t('expenses.amountPlaceholder')} keyboardType="decimal-pad" />
          <Button title={t('expenses.addExpense')} icon="plus" loading={saving} onPress={addExpense} />
        </View>
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      {finance ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label={t('expenses.total')} value={`${finance.total.toFixed(2)} EUR`} helper={t('expenses.totalHelper', { count: finance.expenses.length })} icon="receipt" tone="lime" />
            <MetricCard label={t('expenses.balancesOpen')} value={String(finance.debts.length)} helper={t('expenses.balancesHelper')} icon="scale-balanced" tone="aqua" />
          </View>

          <Card>
            <AppText variant="h2">{t('expenses.openDebts')}</AppText>
            {finance.debts.length ? finance.debts.map(debt => (
              <ListRow
                key={`${debt.from_user.id}-${debt.to_user.id}-${debt.amount}`}
                title={`${debt.amount.toFixed(2)} EUR`}
                subtitle={t('expenses.owes', { from: debt.from_user.username, to: debt.to_user.username })}
                icon="arrow-right-arrow-left"
              />
            )) : <EmptyState title={t('expenses.emptyDebtsTitle')} body={t('expenses.emptyDebtsBody')} icon="scale-balanced" tone="lime" />}
          </Card>

          <Card>
            <AppText variant="h2">{t('expenses.recent')}</AppText>
            {finance.expenses.length ? finance.expenses.map(expense => (
              <ListRow
                key={expense.id}
                title={expense.title}
                subtitle={t('expenses.paidBy', { amount: `${expense.amount.toFixed(2)} EUR`, name: expense.paid_by.username })}
                icon="receipt"
                actionLabel={t('common.delete')}
                onAction={() => deleteExpense(expense)}
              />
            )) : <EmptyState title={t('expenses.emptyExpensesTitle')} body={t('expenses.emptyExpensesBody')} icon="receipt" tone="aqua" />}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
