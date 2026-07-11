import { useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { APP_URL } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function InviteScreen() {
  const { household } = useAuth();
  const colors = useThemeColors();
  const [copied, setCopied] = useState(false);

  const code = household?.invite_code || '';
  const joinUrl = `${APP_URL}/join?code=${encodeURIComponent(code)}`;

  const styles = useMemo(() => StyleSheet.create({
    intro: { gap: spacing.xs },
    codeCard: { alignItems: 'center', gap: spacing.md },
    qrWrap: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: '#FFFFFF'
    },
    codeLabel: { color: colors.textMuted, fontWeight: '800', letterSpacing: 1 },
    codePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border
    },
    code: { fontSize: 30, fontWeight: '900', letterSpacing: 6, color: colors.text },
    copyHint: { color: colors.success, fontWeight: '700' },
    steps: { gap: spacing.md },
    step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    stepNum: {
      width: 26, height: 26, borderRadius: radii.pill,
      backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center'
    },
    stepNumText: { color: colors.primary, fontWeight: '900' },
    stepBody: { flex: 1 }
  }), [colors]);

  async function copyCode() {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    const message = `Komm in unsere WG "${household?.name}" auf Zofri! Öffne den Link und der Code ist schon drin:\n${joinUrl}\n\nOder gib den Code manuell ein: ${code}`;
    if (Platform.OS === 'web' && !(navigator as unknown as { share?: unknown }).share) {
      await Clipboard.setStringAsync(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // user dismissed the share sheet
    }
  }

  return (
    <Screen>
      <AppHeader title="Mitbewohner einladen" subtitle="Ohne dass jemand einen Code abtippen muss." eyebrow="Einladen" icon="user-plus" back />

      <Card tone="soft">
        <View style={styles.intro}>
          <AppText variant="h2">{household?.name}</AppText>
          <AppText variant="muted">
            Teile den Link oder lass die Kamera deiner Mitbewohner den QR-Code scannen.
          </AppText>
        </View>
      </Card>

      <Card style={styles.codeCard}>
        <View style={styles.qrWrap}>
          {code ? <QRCode value={joinUrl} size={196} color="#1D1B22" backgroundColor="#FFFFFF" /> : null}
        </View>
        <AppText variant="tiny" style={styles.codeLabel}>EINLADUNGSCODE</AppText>
        <Pressable onPress={copyCode} style={styles.codePill}>
          <AppText style={styles.code}>{code}</AppText>
        </Pressable>
        {copied ? <AppText variant="small" style={styles.copyHint}>In Zwischenablage kopiert ✓</AppText> : null}
      </Card>

      <Button title="Einladung teilen" icon="share-nodes" onPress={shareLink} />
      <Button title="Code kopieren" icon="copy" variant="secondary" onPress={copyCode} />

      <Card>
        <AppText variant="h2">So geht's</AppText>
        <View style={styles.steps}>
          {[
            'Schick den Link oder QR-Code an deine Mitbewohner.',
            'Sie öffnen ihn, erstellen ein Konto — der Code ist schon eingetragen.',
            'Ihr seht sofort dieselben Aufgaben, Ausgaben und Einkäufe.'
          ].map((text, index) => (
            <View key={index} style={styles.step}>
              <View style={styles.stepNum}>
                <AppText variant="tiny" style={styles.stepNumText}>{index + 1}</AppText>
              </View>
              <View style={styles.stepBody}>
                <AppText variant="small">{text}</AppText>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
