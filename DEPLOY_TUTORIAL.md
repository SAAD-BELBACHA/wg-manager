# 🌍 Deployment-Tutorial: Deine Website im Internet

In diesem Tutorial lernst du, wie du den WG Manager mit **Docker** und **Render** veröffentlichst. So können deine Mitbewohner die Seite von überall auf der Welt nutzen!

## Voraussetzungen
1.  Ein kostenloses Konto bei **[GitHub](https://github.com/)** (hier speichern wir deinen Code).
2.  Ein kostenloses Konto bei **[Render](https://render.com/)** (hier wird dein Code "gehostet").
3.  **Git** sollte auf deinem Mac installiert sein.

---

## 💾 Schritt 1: Code auf GitHub hochladen

1.  Öffne dein Terminal im Ordner `wg_app`.
2.  Initialisiere Git (falls noch nicht geschehen):
    ```bash
    git init
    git add .
    git commit -m "Initialer Upload"
    ```
3.  Erstelle ein neues Repository auf GitHub.com (nenne es z.B. `wg-manager`).
4.  Folge den Anweisungen auf GitHub, um deinen Code hochzuladen (meistens diese Befehle):
    ```bash
    git remote add origin https://github.com/DEIN_NAME/wg-manager.git
    git branch -M main
    git push -u origin main
    ```

---

## 🚀 Schritt 2: Deployment auf Render.com

1.  Logge dich bei **Render** ein.
2.  Klicke auf den Button **"New +"** und wähle **"Web Service"**.
3.  Verbinde dein GitHub-Konto und wähle das Repository `wg-manager` aus.
4.  **Einstellungen**:
    *   **Name**: `wg-manager` (oder was du magst)
    *   **Region**: `Frankfurt (EU)` (am schnellsten für Deutschland)
    *   **Runtime**: **Docker** (Ganz wichtig! Render erkennt automatisch dein `Dockerfile`)
5.  **Environment Variables**:
    Klicke auf "Advanced" und füge eine Variable hinzu:
    *   Key: `SECRET_KEY`
    *   Value: `ein-sehr-langes-geheimes-passwort-123`
6.  Klicke auf **"Create Web Service"**.

---

## ✅ Schritt 3: Fertig!

Render baut nun deinen Docker-Container. Das dauert ca. 2–5 Minuten. Sobald es fertig ist, siehst du oben links eine URL, die so aussieht:
`https://wg-manager-abcd.onrender.com`

**Herzlichen Glückwunsch!** Deine Website ist nun live im Internet erreichbar. 🥳

---

## 💡 Profi-Tipp: Persistenz (Wichtig!)
Bei der kostenlosen Version von Render werden Dateien (wie deine Datenbank `wg_app.db` oder Fotos) beim Neustart gelöscht. Wenn du die Seite professionell nutzen willst, solltest du in den Render-Einstellungen einen **"Disk"** (Speicherplatz) erstellen oder eine externe Datenbank (wie Render PostgreSQL) nutzen.
