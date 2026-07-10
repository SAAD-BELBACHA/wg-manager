import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { apiRequest, apiUpload } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { ReceiptOcrResult } from '@/types/api';
import { colors, spacing } from '@/theme/tokens';

type PickedImage = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export default function ReceiptScanScreen() {
  const { token } = useAuth();
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
      setError('Bitte Zugriff auf Fotos erlauben.');
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
      setError('Bitte Kamerazugriff erlauben.');
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
      setError(err instanceof Error ? err.message : 'OCR konnte nicht ausgeführt werden.');
    } finally {
      setLoading(false);
    }
  }

  async function createExpense() {
    setError('');
    setSuccess('');
    const amount = total.replace(',', '.').trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Bitte geprüften Gesamtbetrag eingeben.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/finance', {
        method: 'POST',
        token,
        body: {
          title: merchant.trim() ? `Kassenbon: ${merchant.trim()}` : 'Kassenbon',
          amount
        }
      });
      setSuccess('Ausgabe wurde nach deiner Prüfung erstellt.');
      setImage(null);
      setOcr(null);
      setMerchant('');
      setDate('');
      setTotal('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ausgabe konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Kassenzettel" subtitle="Kamera, Bildauswahl, Zuschnitt, OCR-Prüfung, Ausgabe." eyebrow="OCR Workflow" icon="camera" back />

      <Card tone="aqua">
        <StatusPill label="1. Bild erfassen" tone="primary" />
        <AppText variant="muted">
          Foto aufnehmen oder Bild auswählen. Zuschneiden startet direkt im System-Dialog.
        </AppText>
        <View style={styles.actions}>
          <Button title="Kamera öffnen" icon="camera" onPress={takePhoto} />
          <Button title="Bild auswählen" icon="image" variant="secondary" onPress={pickFromLibrary} />
        </View>
      </Card>

      {image ? (
        <Card>
          <StatusPill label="2. Zuschneiden & OCR" tone="aqua" />
          <Image source={{ uri: image.uri }} style={styles.preview} />
          <Button title="OCR starten" icon="wand-magic-sparkles" loading={loading} onPress={runOcr} />
        </Card>
      ) : null}

      {ocr ? (
        <Card>
          <StatusPill label="3. Prüfen vor Speichern" tone="lime" />
          <AppText variant="muted">{ocr.message}</AppText>
          <View style={styles.form}>
            <TextField label="Händler" value={merchant} onChangeText={setMerchant} placeholder="z.B. Supermarkt" />
            <TextField label="Datum" value={date} onChangeText={setDate} placeholder="z.B. 10.07.2026" />
            <TextField label="Gesamtbetrag" value={total} onChangeText={setTotal} placeholder="z.B. 24.50" keyboardType="decimal-pad" />
          </View>
          <Card style={styles.rawTextCard}>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              OCR Status: {ocr.status}
            </AppText>
            <AppText variant="small">
              {ocr.receipt.raw_text || 'Kein OCR-Text erkannt. Manueller Fallback bleibt verfügbar.'}
            </AppText>
          </Card>
          <Button title="Als Ausgabe erstellen" icon="receipt" loading={saving} onPress={createExpense} />
        </Card>
      ) : null}

      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      {success ? <AppText variant="small" style={styles.success}>{success}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
