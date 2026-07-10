import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';

export default function SettingsScreen() {
  return (
    <Screen>
      <AppHeader title="Einstellungen" subtitle="Vorbereitet für Sprache, Datenschutz, Push und Hilfe." eyebrow="Setup" icon="gear" back />
      <Card>
        <StatusPill label="Vorbereitet" tone="aqua" />
        <ListRow title="Sprache" subtitle="Deutsch, Englisch, Arabisch, Französisch geplant." icon="language" />
        <ListRow title="Dark Mode" subtitle="Design-System ist vorbereitet." icon="moon" />
        <ListRow title="Push" subtitle="Backend und Expo Push kommen im nächsten Schritt." icon="bell" />
        <ListRow title="Datenschutz" subtitle="Export, Konto löschen und Hilfe werden hier ergänzt." icon="shield-halved" />
      </Card>
    </Screen>
  );
}
