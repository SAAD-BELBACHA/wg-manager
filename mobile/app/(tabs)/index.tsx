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
import { DashboardResponse, Task } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 17) return 'Hey';
  return 'Guten Abend';
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatTaskDate(task: Task) {
  if (!task.due_date) return 'Flexibel';
  const date = new Date(task.due_date);
  if (Number.isNaN(date.getTime())) return task.due_date;
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

export default function DashboardScreen() {
  const { token, user, household } = useAuth();
  const colors = useThemeColors();
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
      .catch(err => alive && setError(err instanceof Error ? err.message : 'Dashboard konnte nicht geladen werden.'))
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
  const pulseLabel = dashboard && dashboard.open_tasks + dashboard.shopping_count > 4 ? 'Viel los' : 'Entspannt';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <StatusPill label={household?.name || 'Deine WG'} tone="aqua" />
          <AppText variant="h1">{greeting()}, {user?.username || 'du'}</AppText>
        </View>
        {dashboard?.members.length ? <AvatarGroup members={dashboard.members} /> : null}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="small" style={styles.muted}>WG wird geladen...</AppText>
        </View>
      ) : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      {dashboard ? (
        <>
          <HeroCard>
            <View style={styles.heroTop}>
              <View>
                <AppText variant="small" style={styles.heroMuted}>WG Pulse</AppText>
                <AppText variant="title" style={styles.heroTitle}>{pulseLabel}</AppText>
              </View>
              <View style={styles.heroIcon}>
                <FontAwesome6 name="heart-pulse" size={23} color={colors.primary} />
              </View>
            </View>
            <AppText style={styles.heroCopy}>
              {dashboard.open_tasks} Aufgaben offen, {dashboard.shopping_count} Einkäufe warten. Alles auf einen Blick.
            </AppText>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatNumber}>{dashboard.open_tasks}</AppText>
                <AppText variant="tiny" style={styles.heroStatLabel}>Aufgaben</AppText>
              </View>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatNumber}>{dashboard.shopping_count}</AppText>
                <AppText variant="tiny" style={styles.heroStatLabel}>Einkauf</AppText>
              </View>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatNumber}>{dashboard.members.length}</AppText>
                <AppText variant="tiny" style={styles.heroStatLabel}>Leute</AppText>
              </View>
            </View>
          </HeroCard>

          <View>
            <SectionHeader title="Schnell starten" subtitle="Die häufigsten WG-Aktionen ohne Umweg." />
            <View style={styles.quickGrid}>
              <QuickAction label="Aufgabe" icon="list-check" tone="primary" onPress={() => router.push('/(tabs)/tasks')} />
              <QuickAction label="Ausgabe" icon="receipt" tone="lime" onPress={() => router.push('/(tabs)/expenses')} />
              <QuickAction label="Einkauf" icon="basket-shopping" tone="aqua" onPress={() => router.push('/shopping')} />
              <QuickAction label="Termin" icon="calendar-days" tone="coral" onPress={() => router.push('/calendar')} />
            </View>
          </View>

          <Pressable onPress={() => router.push('/(tabs)/tasks')} style={({ pressed }) => [pressed && styles.pressed]}>
            <Card style={styles.featuredCard}>
              <View style={styles.rowBetween}>
                <SectionHeader title="Heute wichtig" subtitle={featuredTask ? 'Dein nächster kleiner Win.' : 'Alles frei für dich.'} />
                <View style={[styles.roundIcon, { backgroundColor: colors.lime }]}>
                  <FontAwesome6 name="bolt" size={18} color={colors.text} />
                </View>
              </View>
              {featuredTask ? (
                <View style={styles.taskBody}>
                  <AppText variant="h2">{featuredTask.title}</AppText>
                  <View style={styles.metaRow}>
                    <StatusPill label={formatTaskDate(featuredTask)} tone="primary" />
                    <StatusPill label="+30 Punkte" tone="lime" />
                  </View>
                </View>
              ) : (
                <AppText variant="muted">Keine offenen Aufgaben für dich. Sehr angenehm.</AppText>
              )}
            </Card>
          </Pressable>

          <View style={styles.checkGrid}>
            <Pressable style={styles.checkTile} onPress={() => router.push('/(tabs)/expenses')}>
              <Card style={styles.checkCard}>
                <View style={[styles.roundIcon, { backgroundColor: colors.primarySoft }]}>
                  <FontAwesome6 name="wallet" size={18} color={colors.primary} />
                </View>
                <AppText variant="small" style={styles.muted}>Finanzen</AppText>
                <AppText variant="h2">{formatCurrency(owedToMeTotal - myDebtTotal)}</AppText>
                <AppText variant="tiny" style={styles.muted}>
                  {myDebtTotal > 0 ? `${formatCurrency(myDebtTotal)} offen` : 'Keine Schulden offen'}
                </AppText>
              </Card>
            </Pressable>
            <Pressable style={styles.checkTile} onPress={() => router.push('/shopping')}>
              <Card style={styles.checkCard}>
                <View style={[styles.roundIcon, { backgroundColor: pulseTone === 'lime' ? colors.limeSoft : colors.coralSoft }]}>
                  <FontAwesome6 name="basket-shopping" size={18} color={pulseTone === 'lime' ? colors.text : colors.coral} />
                </View>
                <AppText variant="small" style={styles.muted}>Einkauf</AppText>
                <AppText variant="h2">{dashboard.shopping_count}</AppText>
                <AppText variant="tiny" style={styles.muted}>
                  {dashboard.shopping_count === 1 ? 'Artikel fehlt' : 'Artikel fehlen'}
                </AppText>
              </Card>
            </Pressable>
          </View>

          <Card style={styles.feedCard}>
            <SectionHeader title="WG gerade" subtitle="Leicht, sozial, ohne Drama." />
            <View style={styles.feedList}>
              <View style={styles.feedItem}>
                <View style={[styles.dot, { backgroundColor: colors.aqua }]} />
                <AppText style={styles.feedText}>{dashboard.members[0]?.username || 'Jemand'} ist in der WG aktiv.</AppText>
              </View>
              <View style={styles.feedItem}>
                <View style={[styles.dot, { backgroundColor: colors.lime }]} />
                <AppText style={styles.feedText}>{dashboard.open_tasks} Aufgaben können heute weg.</AppText>
              </View>
              <View style={styles.feedItem}>
                <View style={[styles.dot, { backgroundColor: colors.coral }]} />
                <AppText style={styles.feedText}>Nächster Einkauf: {dashboard.shopping_count ? 'Liste checken' : 'alles erledigt'}.</AppText>
              </View>
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
