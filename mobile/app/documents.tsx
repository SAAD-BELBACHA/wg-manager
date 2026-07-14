import { FontAwesome6 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { apiRequest, apiUpload } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/i18n/I18nContext';
import { DocumentCategory, DocumentsResponse, WgDocument } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

const CATEGORIES: { value: DocumentCategory; labelKey: string; icon: string }[] = [
  { value: 'contract', labelKey: 'documents.catContract', icon: 'file-signature' },
  { value: 'rules', labelKey: 'documents.catRules', icon: 'book' },
  { value: 'utilities', labelKey: 'documents.catUtilities', icon: 'bolt' },
  { value: 'deposit', labelKey: 'documents.catDeposit', icon: 'vault' },
  { value: 'protocol', labelKey: 'documents.catProtocol', icon: 'clipboard-check' },
  { value: 'receipt', labelKey: 'documents.catReceipt', icon: 'receipt' },
  { value: 'other', labelKey: 'documents.catOther', icon: 'file' }
];
const CATEGORY_ICON: Record<DocumentCategory, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.icon])
) as Record<DocumentCategory, string>;
const CATEGORY_LABEL: Record<DocumentCategory, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.labelKey])
) as Record<DocumentCategory, string>;

type Picked = { uri: string; name: string; mimeType: string };

export default function DocumentsScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [docs, setDocs] = useState<WgDocument[]>([]);
  const [storageReady, setStorageReady] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('contract');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<DocumentsResponse>('/documents', { token })
      .then(data => { setDocs(data.documents); setStorageReady(data.storage_ready); })
      .catch(err => setError(err instanceof Error ? err.message : t('documents.loadError')))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPicked({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' });
    if (!title.trim()) setTitle(asset.name.replace(/\.[^.]+$/, ''));
  }

  async function upload() {
    if (!title.trim() || !picked) {
      setError(t('documents.needTitleFile'));
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      if (Platform.OS === 'web') {
        const blob = await fetch(picked.uri).then(r => r.blob());
        formData.append('file', blob, picked.name);
      } else {
        formData.append('file', { uri: picked.uri, name: picked.name, type: picked.mimeType } as unknown as Blob);
      }
      const data = await apiUpload<{ document: WgDocument }>('/documents', formData, token);
      setDocs(current => [data.document, ...current]);
      setTitle('');
      setPicked(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function remove(doc: WgDocument) {
    await apiRequest(`/documents/${doc.id}`, { method: 'DELETE', token });
    setDocs(current => current.filter(d => d.id !== doc.id));
  }

  function openDoc(doc: WgDocument) {
    if (Platform.OS === 'web') window.open(doc.file_url, '_blank');
    else Linking.openURL(doc.file_url).catch(() => {});
  }

  return (
    <Screen>
      <AppHeader title={t('documents.title')} subtitle={t('documents.subtitle')} eyebrow={t('documents.eyebrow')} icon="folder-open" back />

      {!storageReady ? (
        <Card tone="coral">
          <AppText variant="small" style={styles.warn}>{t('documents.ephemeralWarn')}</AppText>
        </Card>
      ) : null}

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('documents.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('documents.titlePlaceholder')} />
          <View>
            <AppText variant="small" style={styles.label}>{t('documents.category')}</AppText>
            <View style={styles.chipRow}>
              {CATEGORIES.map(cat => (
                <Pressable key={cat.value} onPress={() => setCategory(cat.value)}
                  style={[styles.iconChip, category === cat.value && styles.chipActive]}>
                  <FontAwesome6 name={cat.icon as never} size={13} color={category === cat.value ? colors.primary : colors.textMuted} />
                  <AppText variant="small" style={[styles.chipText, category === cat.value && styles.chipTextActive]}>{t(cat.labelKey)}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
          <Button title={picked ? t('documents.fileChosen', { name: picked.name }) : t('documents.pickFile')} icon="paperclip" variant="secondary" onPress={pickFile} />
          <Button title={t('documents.add')} icon="upload" loading={uploading} onPress={upload} />
          {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
        </View>
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      <Card>
        {docs.length ? docs.map(doc => (
          <ListRow
            key={doc.id}
            title={doc.title}
            subtitle={`${t(CATEGORY_LABEL[doc.category] || 'documents.catOther')} · ${t('documents.uploadedBy', { name: doc.uploaded_by?.username || '—', date: new Date(doc.created_at).toLocaleDateString() })}`}
            icon={(CATEGORY_ICON[doc.category] || 'file') as never}
            actionLabel={t('common.delete')}
            onPress={() => openDoc(doc)}
            onAction={() => remove(doc)}
          />
        )) : (!loading ? <EmptyState title={t('documents.emptyTitle')} body={t('documents.emptyBody')} icon="folder-open" tone="aqua" /> : null)}
      </Card>
    </Screen>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    form: { gap: spacing.md },
    label: { color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm },
    error: { color: colors.danger },
    warn: { color: colors.coral, fontWeight: '700' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    iconChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border
    },
    chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    chipText: { fontWeight: '700', color: colors.text },
    chipTextActive: { color: colors.primary }
  });
}
