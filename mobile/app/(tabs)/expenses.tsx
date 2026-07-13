import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { HeroCard } from '@/components/HeroCard';
import { ListRow } from '@/components/ListRow';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MetricCard } from '@/components/MetricCard';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/i18n/I18nContext';
import { Expense, ExpenseCategory, FinanceResponse, SplitMethod, User } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

const CATEGORIES: { value: ExpenseCategory; labelKey: string; icon: string }[] = [
  { value: 'groceries', labelKey: 'expenses.catGroceries', icon: 'basket-shopping' },
  { value: 'rent', labelKey: 'expenses.catRent', icon: 'house' },
  { value: 'electricity', labelKey: 'expenses.catElectricity', icon: 'bolt' },
  { value: 'internet', labelKey: 'expenses.catInternet', icon: 'wifi' },
  { value: 'household', labelKey: 'expenses.catHousehold', icon: 'broom' },
  { value: 'repair', labelKey: 'expenses.catRepair', icon: 'wrench' },
  { value: 'leisure', labelKey: 'expenses.catLeisure', icon: 'face-laugh' },
  { value: 'deposit', labelKey: 'expenses.catDeposit', icon: 'vault' },
  { value: 'other', labelKey: 'expenses.catOther', icon: 'receipt' }
];
const CATEGORY_ICON: Record<ExpenseCategory, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.icon])
) as Record<ExpenseCategory, string>;
const CATEGORY_LABEL: Record<ExpenseCategory, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.labelKey])
) as Record<ExpenseCategory, string>;

const SPLIT_METHODS: { value: SplitMethod; labelKey: string }[] = [
  { value: 'equal', labelKey: 'expenses.splitEqual' },
  { value: 'exact', labelKey: 'expenses.splitExact' },
  { value: 'percent', labelKey: 'expenses.splitPercent' },
  { value: 'shares', labelKey: 'expenses.splitShares' }
];

export default function ExpensesScreen() {
  const { token, user } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [finance, setFinance] = useState<FinanceResponse | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('groceries');
  const [method, setMethod] = useState<SplitMethod>('equal');
  const [payer, setPayer] = useState<number | null>(null);
  const [participants, setParticipants] = useState<Record<number, boolean>>({});
  const [values, setValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const members = finance?.members ?? [];
  const meId = user?.id ?? null;
  const effectivePayer = payer ?? meId;

  const loadFinance = useCallback(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError('');
    apiRequest<FinanceResponse>('/finance', { token })
      .then(data => {
        setFinance(data);
        // Default: everyone shares, current user paid.
        setParticipants(prev => Object.keys(prev).length ? prev
          : Object.fromEntries(data.members.map(m => [m.id, true])));
      })
      .catch(err => setError(err instanceof Error ? err.message : t('expenses.loadError')))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { loadFinance(); }, [loadFinance]));

  const selectedIds = members.filter(m => participants[m.id]).map(m => m.id);
  const amountNum = parseFloat(amount.replace(',', '.')) || 0;

  const valueSum = selectedIds.reduce((sum, id) => sum + (parseFloat((values[id] || '').replace(',', '.')) || 0), 0);
  const validSplit = useMemo(() => {
    if (selectedIds.length === 0) return false;
    if (method === 'exact') return Math.abs(valueSum - amountNum) < 0.01 && amountNum > 0;
    if (method === 'percent') return Math.abs(valueSum - 100) < 0.01;
    if (method === 'shares') return valueSum > 0;
    return true;
  }, [method, valueSum, amountNum, selectedIds.length]);

  function toggleParticipant(id: number) {
    setParticipants(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function addExpense() {
    if (!title.trim() || amountNum <= 0) return;
    if (!validSplit) {
      setError(method === 'percent' ? t('expenses.percentMustBe100')
        : method === 'exact' ? t('expenses.sumMustMatch')
        : t('expenses.needParticipant'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        amount: amount.replace(',', '.'),
        category,
        split_method: method,
        paid_by: effectivePayer,
        participants: selectedIds.map(id => ({
          user_id: id,
          value: method === 'equal' ? 0 : (parseFloat((values[id] || '').replace(',', '.')) || 0)
        }))
      };
      await apiRequest<{ expense: Expense }>('/finance', { method: 'POST', token, body: payload });
      setTitle('');
      setAmount('');
      setValues({});
      setMethod('equal');
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
      await apiRequest<{ success: boolean }>(`/finance/${expense.id}`, { method: 'DELETE', token });
      loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('expenses.deleteFailed'));
    }
  }

  const myBalance = finance?.my_balance ?? 0;
  const balanceState = myBalance > 0.005 ? 'positive' : myBalance < -0.005 ? 'negative' : 'settled';

  return (
    <Screen>
      <AppHeader title={t('expenses.title')} subtitle={t('expenses.subtitle')} eyebrow={t('expenses.eyebrow')} icon="wallet" />

      {finance ? (
        <HeroCard accent={balanceState === 'negative' ? 'coral' : balanceState === 'positive' ? 'lime' : 'aqua'}>
          <AppText variant="small" style={styles.heroLabel}>
            {balanceState === 'positive' ? t('expenses.youGetBack') : balanceState === 'negative' ? t('expenses.youOwe') : t('expenses.settled')}
          </AppText>
          {balanceState === 'settled' ? (
            <>
              <AppText variant="title" style={styles.heroValue}>0,00 €</AppText>
              <AppText style={styles.heroBody}>{t('expenses.settledBody')}</AppText>
            </>
          ) : (
            <AppText variant="title" style={styles.heroValue}>{Math.abs(myBalance).toFixed(2)} €</AppText>
          )}
        </HeroCard>
      ) : null}

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('expenses.expenseTitle')} value={title} onChangeText={setTitle} placeholder={t('expenses.titlePlaceholder')} />
          <TextField label={t('expenses.amount')} value={amount} onChangeText={setAmount} placeholder={t('expenses.amountPlaceholder')} keyboardType="decimal-pad" />

          <Field label={t('expenses.category')}>
            <View style={styles.chipRow}>
              {CATEGORIES.map(cat => (
                <Pressable key={cat.value} onPress={() => setCategory(cat.value)}
                  style={[styles.iconChip, category === cat.value && styles.chipActive]}>
                  <FontAwesome6 name={cat.icon as never} size={13} color={category === cat.value ? colors.primary : colors.textMuted} />
                  <AppText variant="small" style={[styles.chipText, category === cat.value && styles.chipTextActive]}>{t(cat.labelKey)}</AppText>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t('expenses.whoPaid')}>
            <View style={styles.chipRow}>
              {members.map(m => (
                <Pressable key={m.id} onPress={() => setPayer(m.id)}
                  style={[styles.avatarChip, effectivePayer === m.id && styles.chipActive]}>
                  <MemberAvatar user={m} size={20} />
                  <AppText variant="small" style={[styles.chipText, effectivePayer === m.id && styles.chipTextActive]}>{m.username}</AppText>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t('expenses.splitMethod')}>
            <View style={styles.chipRow}>
              {SPLIT_METHODS.map(sm => (
                <Pressable key={sm.value} onPress={() => setMethod(sm.value)}
                  style={[styles.chip, method === sm.value && styles.chipActive]}>
                  <AppText variant="small" style={[styles.chipText, method === sm.value && styles.chipTextActive]}>{t(sm.labelKey)}</AppText>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t('expenses.sharedBy')}>
            <View style={styles.participants}>
              {members.map(m => {
                const on = !!participants[m.id];
                return (
                  <View key={m.id} style={styles.participantRow}>
                    <Pressable onPress={() => toggleParticipant(m.id)} style={styles.participantToggle}>
                      <View style={[styles.checkbox, on && styles.checkboxOn]}>
                        {on ? <FontAwesome6 name="check" size={11} color="#FFFFFF" /> : null}
                      </View>
                      <MemberAvatar user={m} size={26} />
                      <AppText style={styles.participantName}>{m.username}</AppText>
                    </Pressable>
                    {on && method !== 'equal' ? (
                      <View style={styles.valueBox}>
                        <TextInput
                          value={values[m.id] || ''}
                          onChangeText={v => setValues(prev => ({ ...prev, [m.id]: v }))}
                          keyboardType="decimal-pad"
                          placeholder={method === 'percent' ? '%' : method === 'shares' ? 'x' : '0'}
                          placeholderTextColor={colors.textMuted}
                          style={styles.valueInput}
                        />
                        <AppText variant="small" style={styles.valueSuffix}>
                          {method === 'percent' ? '%' : method === 'exact' ? '€' : 'x'}
                        </AppText>
                      </View>
                    ) : on && method === 'equal' && amountNum > 0 && selectedIds.length ? (
                      <AppText variant="small" style={styles.perPerson}>
                        {t('expenses.perPerson', { amount: `${(amountNum / selectedIds.length).toFixed(2)} €` })}
                      </AppText>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {method === 'exact' && amountNum > 0 ? (
              <AppText variant="small" style={[styles.sumHint, validSplit ? styles.sumOk : styles.sumBad]}>
                {t('expenses.sumSoFar', { sum: `${valueSum.toFixed(2)} €`, total: `${amountNum.toFixed(2)} €` })}
              </AppText>
            ) : null}
            {method === 'percent' ? (
              <AppText variant="small" style={[styles.sumHint, validSplit ? styles.sumOk : styles.sumBad]}>
                {t('expenses.sumSoFar', { sum: `${valueSum.toFixed(0)} %`, total: '100 %' })}
              </AppText>
            ) : null}
          </Field>

          <Button title={t('expenses.addExpense')} icon="plus" loading={saving} onPress={addExpense} />
        </View>
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      {finance ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label={t('expenses.total')} value={`${finance.total.toFixed(2)} €`} helper={t('expenses.totalHelper', { count: finance.expenses.length })} icon="receipt" tone="lime" />
            <MetricCard label={t('expenses.balancesOpen')} value={String(finance.debts.length)} helper={t('expenses.balancesHelper')} icon="scale-balanced" tone="aqua" />
          </View>

          <Card>
            <View style={styles.settleHeader}>
              <AppText variant="h2">{t('expenses.settleUp')}</AppText>
              {finance.settlements.length ? <AppText variant="small" style={styles.settleHint}>{t('expenses.settleHint')}</AppText> : null}
            </View>
            {finance.settlements.length ? finance.settlements.map(s => (
              <ListRow
                key={`${s.from_user.id}-${s.to_user.id}-${s.amount}`}
                title={t('expenses.pays', { from: s.from_user.username, to: s.to_user.username })}
                subtitle={`${s.amount.toFixed(2)} €`}
                icon="arrow-right-long"
              />
            )) : <EmptyState title={t('expenses.allSettledTitle')} body={t('expenses.allSettledBody')} icon="scale-balanced" tone="lime" />}
          </Card>

          <Card>
            <AppText variant="h2">{t('expenses.recent')}</AppText>
            {finance.expenses.length ? finance.expenses.map(expense => (
              <ListRow
                key={expense.id}
                title={expense.title}
                subtitle={t('expenses.paidBy', { amount: `${expense.amount.toFixed(2)} €`, name: expense.paid_by.username })}
                icon={(CATEGORY_ICON[expense.category] || 'receipt') as never}
                actionLabel={t('common.delete')}
                onAction={() => deleteExpense(expense)}
              >
                <AppText variant="tiny" style={styles.sharedWith}>
                  {t(CATEGORY_LABEL[expense.category] || 'expenses.catOther')} · {t('expenses.sharedWith', { names: expense.participants.map(p => p.user.username).join(', ') })}
                </AppText>
              </ListRow>
            )) : <EmptyState title={t('expenses.emptyExpensesTitle')} body={t('expenses.emptyExpensesBody')} icon="receipt" tone="aqua" />}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="small" style={{ color: colors.textMuted, fontWeight: '700' }}>{label}</AppText>
      {children}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    form: { gap: spacing.lg },
    metrics: { flexDirection: 'row', gap: spacing.md },
    error: { color: colors.danger },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border
    },
    iconChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border
    },
    avatarChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: radii.pill,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border
    },
    chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    chipText: { fontWeight: '700', color: colors.text },
    chipTextActive: { color: colors.primary },
    participants: { gap: spacing.xs },
    participantRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 6
    },
    participantToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    checkbox: {
      width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center'
    },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    participantName: { fontWeight: '600' },
    perPerson: { color: colors.textMuted, fontWeight: '700' },
    valueBox: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.md, minWidth: 84
    },
    valueInput: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 15, paddingVertical: 8, textAlign: 'right' },
    valueSuffix: { color: colors.textMuted, fontWeight: '800' },
    sumHint: { fontWeight: '800', marginTop: 4 },
    sumOk: { color: colors.success },
    sumBad: { color: colors.warning },
    sharedWith: { color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontWeight: '900' },
    heroValue: { color: '#FFFFFF' },
    heroBody: { color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    settleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    settleHint: { color: colors.textMuted, fontWeight: '600', flexShrink: 1, textAlign: 'right' }
  });
}
