import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { apiRequest, apiUpload } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { ReceiptOcrResult } from '@/types/api';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type PickedImage = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export default function ReceiptScanScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    actions: {
      gap: spacing.md,
      marginTop: spacing.md
    },
    preview: {
      width: '100%',
      height: 280,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      marginVertical: spacing.md
    },
    form: {
      gap: spacing.md,
      marginTop: spacing.md
    },
    rawTextCard: {
      backgroundColor: colors.surfaceMuted,
      shadowOpacity: 0,
      marginVertical: spacing.md
    },
    error: {
      color: colors.danger
    },
    success: {
      color: colors.success,
      fontWeight: '800'
    }
  }), [colors]);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [ocr, setOcr] = useState<ReceiptOcrResult | null>(null);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [total, setTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function pickFromLibrary() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('receipt.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.75
    });
    handlePickerResult(result);
  }

  async function takePhoto() {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(t('receipt.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.75
    });
    handlePickerResult(result);
  }

  function handlePickerResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      fileName: asset.fileName || `receipt-${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg'
    });
    setOcr(null);
    setMerchant('');
    setDate('');
    setTotal('');
    setSuccess('');
  }

  async function runOcr() {
    if (!image) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(image.uri).then(response => response.blob());
        formData.append('file', blob, image.fileName);
      } else {
        formData.append('file', {
          uri: image.uri,
          name: image.fileName,
          type: image.mimeType
        } as unknown as Blob);
      }
      const data = await apiUpload<ReceiptOcrResult>('/receipts/ocr', formData, token);
      setOcr(data);
      setMerchant(data.receipt.merchant);
      setDate(data.receipt.date);
      setTotal(data.receipt.total == null ? '' : String(data.receipt.total));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('receipt.ocrFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function createExpense() {
    setError('');
    setSuccess('');
    const amount = total.replace(',', '.').trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError(t('receipt.totalRequired'));
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/finance', {
        method: 'POST',
        token,
        body: {
          title: merchant.trim() ? t('receipt.receiptTitle', { merchant: merchant.trim() }) : t('receipt.receiptTitlePlain'),
          amount
        }
      });
      setSuccess(t('receipt.created'));
      setImage(null);
      setOcr(null);
      setMerchant('');
      setDate('');
      setTotal('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('receipt.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppHeader title={t('receipt.title')} subtitle={t('receipt.subtitle')} eyebrow={t('receipt.eyebrow')} icon="camera" back />

      <Card tone="aqua">
        <StatusPill label={t('receipt.step1')} tone="primary" />
        <AppText variant="muted">
          {t('receipt.step1Body')}
        </AppText>
        <View style={styles.actions}>
          <Button title={t('receipt.openCamera')} icon="camera" onPress={takePhoto} />
          <Button title={t('receipt.pickImage')} icon="image" variant="secondary" onPress={pickFromLibrary} />
        </View>
      </Card>

      {image ? (
        <Card>
          <StatusPill label={t('receipt.step2')} tone="aqua" />
          <Image source={{ uri: image.uri }} style={styles.preview} />
          <Button title={t('receipt.runOcr')} icon="wand-magic-sparkles" loading={loading} onPress={runOcr} />
        </Card>
      ) : null}

      {ocr ? (
        <Card>
          <StatusPill label={t('receipt.step3')} tone="lime" />
          <AppText variant="muted">{ocr.message}</AppText>
          <View style={styles.form}>
            <TextField label={t('receipt.merchant')} value={merchant} onChangeText={setMerchant} placeholder={t('receipt.merchantPlaceholder')} />
            <TextField label={t('receipt.date')} value={date} onChangeText={setDate} placeholder={t('receipt.datePlaceholder')} />
            <TextField label={t('receipt.total')} value={total} onChangeText={setTotal} placeholder={t('receipt.totalPlaceholder')} keyboardType="decimal-pad" />
          </View>
          <Card style={styles.rawTextCard}>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {t('receipt.ocrStatus', { status: ocr.status })}
            </AppText>
            <AppText variant="small">
              {ocr.receipt.raw_text || t('receipt.noText')}
            </AppText>
          </Card>
          <Button title={t('receipt.createExpense')} icon="receipt" loading={saving} onPress={createExpense} />
        </Card>
      ) : null}

      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      {success ? <AppText variant="small" style={styles.success}>{success}</AppText> : null}
    </Screen>
  );
}
