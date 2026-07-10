import { router } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function ForgotPasswordScreen() {
  return (
    <Screen>
      <AppHeader title="Passwort" subtitle="Reset-Flow vorbereitet, Backend folgt." eyebrow="Hilfe" icon="key" back />
      <Card tone="soft">
        <AppText variant="muted">
          Passwort-Reset ist im Backend noch offen. Dieser Screen ist vorbereitet,
          damit der mobile Auth-Flow vollständig navigierbar bleibt.
        </AppText>
      </Card>
      <Button title="Zurück zum Login" icon="chevron-left" onPress={() => router.back()} />
    </Screen>
  );
}
