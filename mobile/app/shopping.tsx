import { router, useFocusEffect } from 'expo-router';
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
import { ShoppingItem, ShoppingResponse } from '@/types/api';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function ShoppingScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
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
  const [pending, setPending] = useState<ShoppingItem[]>([]);
  const [done, setDone] = useState<ShoppingItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadShopping = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    apiRequest<ShoppingResponse>('/shopping', { token })
      .then(data => {
        setPending(data.pending);
        setDone(data.done);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Einkaufsliste konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadShopping();
  }, [loadShopping]));

  async function addItem() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = await apiRequest<{ item: ShoppingItem }>('/shopping', {
        method: 'POST',
        token,
        body: { name: name.trim(), quantity: quantity.trim() }
      });
      setPending(current => [data.item, ...current]);
      setName('');
      setQuantity('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artikel konnte nicht hinzugefügt werden.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item: ShoppingItem) {
    setError('');
    try {
      const data = await apiRequest<{ item: ShoppingItem }>(`/shopping/${item.id}/toggle`, {
        method: 'POST',
        token
      });
      if (data.item.completed) {
        setPending(current => current.filter(entry => entry.id !== item.id));
        setDone(current => [data.item, ...current]);
      } else {
        setDone(current => current.filter(entry => entry.id !== item.id));
        setPending(current => [data.item, ...current]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artikel konnte nicht geändert werden.');
    }
  }

  async function deleteItem(item: ShoppingItem) {
    setError('');
    try {
      await apiRequest<{ success: boolean }>(`/shopping/${item.id}`, {
        method: 'DELETE',
        token
      });
      setPending(current => current.filter(entry => entry.id !== item.id));
      setDone(current => current.filter(entry => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artikel konnte nicht gelöscht werden.');
    }
  }

  return (
    <Screen>
      <AppHeader title="Einkauf" subtitle="Alles, was fehlt. Schnell abhaken im Laden." eyebrow="Liste" icon="basket-shopping" back />

      <View style={styles.metrics}>
        <MetricCard label="Offen" value={String(pending.length)} helper="zu kaufen" icon="basket-shopping" tone="aqua" />
        <MetricCard label="Gekauft" value={String(done.length)} helper="abgehakt" icon="check" tone="lime" />
      </View>

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="Artikel" value={name} onChangeText={setName} placeholder="z.B. Milch" />
          <TextField label="Menge" value={quantity} onChangeText={setQuantity} placeholder="z.B. 1l" />
          <Button title="Artikel hinzufügen" icon="plus" loading={saving} onPress={addItem} />
        </View>
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      <Card>
        <AppText variant="h2">Zu kaufen</AppText>
        {pending.length ? pending.map(item => (
          <ShoppingRow key={item.id} item={item} onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item)} />
        )) : <EmptyState title="Liste leer" body="Alles da. Nichts zu schleppen." icon="basket-shopping" tone="lime" />}
      </Card>

      <Card>
        <AppText variant="h2">Gekauft</AppText>
        {done.length ? done.slice(0, 8).map(item => (
          <ShoppingRow key={item.id} item={item} done onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item)} />
        )) : <EmptyState title="Noch nichts gekauft" body="Abgehakte Artikel landen hier." icon="check" tone="aqua" />}
      </Card>
    </Screen>
  );
}

function ShoppingRow({ item, done, onToggle, onDelete }: {
  item: ShoppingItem;
  done?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <ListRow
      title={item.name}
      subtitle={`${item.quantity || 'Keine Menge'} · ${item.added_by.username}`}
      icon="basket-shopping"
      checked={done}
      muted={done}
      actionLabel="Löschen"
      onPress={onToggle}
      onAction={onDelete}
    />
  );
}
