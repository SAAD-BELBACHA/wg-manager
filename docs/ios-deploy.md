# iOS Deploy

## Backend zuerst

Die iOS-App braucht eine HTTPS API.

1. Render Blueprint deployen.
2. Render URL kopieren, z.B. `https://wg-manager-abcd.onrender.com`.
3. Mobile Build mit API URL starten:

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://wg-manager-abcd.onrender.com/api/v1 npx eas build --platform ios --profile preview
```

## TestFlight / App Store

Voraussetzungen:

- Expo Account
- Apple Developer Account
- App Store Connect App mit Bundle ID `com.zofri.app`

Build:

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://wg-manager-abcd.onrender.com/api/v1 npx eas build --platform ios --profile production
```

Submit:

```bash
cd mobile
npx eas submit --platform ios --profile production
```

## Kein App Store

Wenn nur Safari/PWA gewünscht ist:

1. Flask Backend per Render deployen.
2. HTTPS URL auf iPhone Safari öffnen.
3. Teilen -> Zum Home-Bildschirm.

## Wichtig

Nicht mit `http://127.0.0.1:5001/api/v1` bauen. Das funktioniert nur lokal auf deinem Mac.
