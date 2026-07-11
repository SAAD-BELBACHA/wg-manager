# Zofri Mobile App

Mobile-first WG app built with Expo, React Native and a Flask JSON API.

## Structure

- `mobile/` - Expo app
- `app.py` - API backend for auth, WG data, tasks, shopping, expenses, OCR and modules
- `render.yaml` - Render services for API backend and mobile static web app

Old Flask website templates and static website assets were removed. The backend remains API-only for the mobile app.

## Local Run

Backend:

```bash
python3 app.py
```

Mobile app:

```bash
cd mobile
npm install
npm run web
```

## Deploy

Render creates two services:

- `wg-manager` - API backend
- `zofri-app` - mobile web app

The mobile app must be built with:

```bash
EXPO_PUBLIC_API_URL=https://wg-manager-r5ni.onrender.com/api/v1 npm run export:web
```

## iPhone

Open the deployed `zofri-app` URL in Safari, then use:

Share -> Add to Home Screen.
