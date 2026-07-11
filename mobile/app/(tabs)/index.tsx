import { FontAwesome6 } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { AvatarGroup } from '@/components/AvatarGroup';
import { Card } from '@/components/Card';
import { HeroCard } from '@/components/HeroCard';
import { QuickAction } from '@/components/QuickAction';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { DashboardResponse, Task } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatTaskDate(task: Task, locale: string, flexibleLabel: string) {
  if (!task.due_date) return flexibleLabel;
  const date = new Date(task.due_date);
  if (Number.isNaN(date.getTime())) return task.due_date;
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

export default function DashboardScreen() {
  const { token, user, household } = useAuth();
  const colors = useThemeColors();
  const { t, language } = useTranslation();
  const locale = language === 'en' ? 'en-GB' : 'de-DE';

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 11) return t('dashboard.morning');
    if (hour < 17) return t('dashboard.day');
    return t('dashboard.evening');
  }
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.lg
    },
    titleWrap: {
      flex: 1,
      gap: spacing.sm
    },
    loading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm
    },
    muted: {
      color: colors.textMuted
    },
    error: {
      color: colors.danger
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.lg
    },
    heroTitle: {
      color: colors.surface
    },
    heroMuted: {
      color: 'rgba(255,255,255,0.76)',
      fontWeight: '900'
    },
    heroCopy: {
      color: 'rgba(255,255,255,0.88)',
      fontWeight: '700'
    },
    heroIcon: {
      width: 50,
      height: 50,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center'
    },
    heroStats: {
      flexDirection: 'row',
      gap: spacing.sm
    },
    heroStat: {
      flex: 1,
      borderRadius: radii.md,
      backgroundColor: 'rgba(255,255,255,0.18)',
      padding: spacing.md
    },
    heroStatNumber: {
      color: colors.surface,
      fontWeight: '900'
    },
    heroStatLabel: {
      color: 'rgba(255,255,255,0.78)',
      fontWeight: '800'
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md
    },
    pressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.94
    },
    featuredCard: {
      gap: spacing.lg
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md
    },
    roundIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center'
    },
    taskBody: {
      gap: spacing.md
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm
    },
    checkGrid: {
      flexDirection: 'row',
      gap: spacing.md
    },
    checkTile: {
      flex: 1
    },
    checkCard: {
      minHeight: 160,
      gap: spacing.sm
    },
    feedCard: {
      gap: spacing.lg,
      marginBottom: spacing.xl
    },
    feedList: {
      gap: spacing.md
    },
    feedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5
    },
    feedText: {
      flex: 1
    }
  }), [colors]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!token) {
      setLoading(false);
      return () => { alive = false; };
    }
    setLoading(true);
    setError('');
    apiRequest<DashboardResponse>('/dashboard', { token })
      .then(data => alive && setDashboard(data))
      .catch(err => alive && setError(err instanceof Error ? err.message : t('dashboard.loadError')))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]));

  const myDebtTotal = useMemo(
    () => dashboard?.my_debts.reduce((sum, debt) => sum + debt.amount, 0) || 0,
    [dashboard]
  );
  const owedToMeTotal = useMemo(
    () => dashboard?.owed_to_me.reduce((sum, debt) => sum + debt.amount, 0) || 0,
    [dashboard]
  );
  const featuredTask = dashboard?.my_tasks[0] || null;
  const pulseTone = dashboard && dashboard.open_tasks + dashboard.shopping_count > 4 ? 'coral' : 'lime';
  const pulseLabel = dashboard && dashboard.open_tasks + dashboard.shopping_count > 4 ? t('dashboard.busy') : t('dashboard.relaxed');

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <StatusPill label={household?.name || t('dashboard.yourWg')} tone="aqua" />
          <AppText variant="h1">{greeting()}, {user?.username || 'du'}</AppText>
        </View>
        {dashboard?.members.length ? <AvatarGroup members={dashboard.members} /> : null}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="small" style={styles.muted}>{t('dashboard.loading')}</AppText>
        </View>
      ) : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      {dashboard ? (
        <>
          <HeroCard>
            <View style={styles.heroTop}>
              <View>
                <AppText variant="small" style={styles.heroMuted}>{t('dashboard.pulse')}</AppText>
                <AppText variant="title" style={styles.heroTitle}>{pulseLabel}</AppText>
              </View>
              <View style={styles.heroIcon}>
                <FontAwesome6 name="heart-pulse" size={23} color={colors.primary} />
              </View>
            </View>
            <AppText style={styles.heroCopy}>
              {t('dashboard.pulseBody', { tasks: dashboard.open_tasks, shopping: dashboard.shopping_count })}
            </AppText>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatNumber}>{dashboard.open_tasks}</AppText>
                <AppText variant="tiny" style={styles.heroStatLabel}>{t('dashboard.statTasks')}</AppText>
              </View>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatNumber}>{dashboard.shopping_count}</AppText>
                <AppText variant="tiny" style={styles.heroStatLabel}>{t('dashboard.statShopping')}</AppText>
              </View>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatNumber}>{dashboard.members.length}</AppText>
                <AppText variant="tiny" style={styles.heroStatLabel}>{t('dashboard.statPeople')}</AppText>
              </View>
            </View>
          </HeroCard>

          <View>
            <SectionHeader title={t('dashboard.quickStart')} subtitle={t('dashboard.quickStartSub')} />
            <View style={styles.quickGrid}>
              <QuickAction label={t('dashboard.quickTask')} icon="list-check" tone="primary" onPress={() => router.push('/(tabs)/tasks')} />
              <QuickAction label={t('dashboard.quickExpense')} icon="receipt" tone="lime" onPress={() => router.push('/(tabs)/expenses')} />
              <QuickAction label={t('dashboard.quickShopping')} icon="basket-shopping" tone="aqua" onPress={() => router.push('/shopping')} />
              <QuickAction label={t('dashboard.quickEvent')} icon="calendar-days" tone="coral" onPress={() => router.push('/calendar')} />
            </View>
          </View>

          <Pressable onPress={() => router.push('/(tabs)/tasks')} style={({ pressed }) => [pressed && styles.pressed]}>
            <Card style={styles.featuredCard}>
              <View style={styles.rowBetween}>
                <SectionHeader title={t('dashboard.todayTitle')} subtitle={featuredTask ? t('dashboard.todaySubWin') : t('dashboard.todaySubFree')} />
                <View style={[styles.roundIcon, { backgroundColor: colors.lime }]}>
                  <FontAwesome6 name="bolt" size={18} color={colors.text} />
                </View>
              </View>
              {featuredTask ? (
                <View style={styles.taskBody}>
                  <AppText variant="h2">{featuredTask.title}</AppText>
                  <View style={styles.metaRow}>
                    <StatusPill label={formatTaskDate(featuredTask, locale, t('dashboard.flexible'))} tone="primary" />
                    <StatusPill label={t('dashboard.points')} tone="lime" />
                  </View>
                </View>
              ) : (
                <AppText variant="muted">{t('dashboard.noTasks')}</AppText>
              )}
            </Card>
          </Pressable>

          <View style={styles.checkGrid}>
            <Pressable style={styles.checkTile} onPress={() => router.push('/(tabs)/expenses')}>
              <Card style={styles.checkCard}>
                <View style={[styles.roundIcon, { backgroundColor: colors.primarySoft }]}>
                  <FontAwesome6 name="wallet" size={18} color={colors.primary} />
                </View>
                <AppText variant="small" style={styles.muted}>{t('dashboard.finance')}</AppText>
                <AppText variant="h2">{formatCurrency(owedToMeTotal - myDebtTotal, locale)}</AppText>
                <AppText variant="tiny" style={styles.muted}>
                  {myDebtTotal > 0 ? t('dashboard.debtOpen', { amount: formatCurrency(myDebtTotal, locale) }) : t('dashboard.noDebt')}
                </AppText>
              </Card>
            </Pressable>
            <Pressable style={styles.checkTile} onPress={() => router.push('/shopping')}>
              <Card style={styles.checkCard}>
                <View style={[styles.roundIcon, { backgroundColor: pulseTone === 'lime' ? colors.limeSoft : colors.coralSoft }]}>
                  <FontAwesome6 name="basket-shopping" size={18} color={pulseTone === 'lime' ? colors.text : colors.coral} />
                </View>
                <AppText variant="small" style={styles.muted}>{t('dashboard.statShopping')}</AppText>
                <AppText variant="h2">{dashboard.shopping_count}</AppText>
                <AppText variant="tiny" style={styles.muted}>
                  {dashboard.shopping_count === 1 ? t('dashboard.shoppingOne') : t('dashboard.shoppingMany')}
                </AppText>
              </Card>
            </Pressable>
          </View>

          <Card style={styles.feedCard}>
            <SectionHeader title={t('dashboard.feedTitle')} subtitle={t('dashboard.feedSub')} />
            <View style={styles.feedList}>
              <View style={styles.feedItem}>
                <View style={[styles.dot, { backgroundColor: colors.aqua }]} />
                <AppText style={styles.feedText}>{t('dashboard.feedActive', { name: dashboard.members[0]?.username || 'Jemand' })}</AppText>
              </View>
              <View style={styles.feedItem}>
                <View style={[styles.dot, { backgroundColor: colors.lime }]} />
                <AppText style={styles.feedText}>{t('dashboard.feedTasks', { count: dashboard.open_tasks })}</AppText>
              </View>
              <View style={styles.feedItem}>
                <View style={[styles.dot, { backgroundColor: colors.coral }]} />
                <AppText style={styles.feedText}>{dashboard.shopping_count ? t('dashboard.feedShoppingCheck') : t('dashboard.feedShoppingDone')}</AppText>
              </View>
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
