# 🚀 Startanleitung für den WG Manager

Hier erfährst du, was du heruntenladen (downloaden) musst und wie du die Webseite auf deinem eigenen Computer startest.

## 📥 1. Downloads (Was du brauchst)

Bevor du startest, stelle sicher, dass du folgende Dinge installiert hast:

1.  **Python 3**: Das Gehirn der Webseite.
    *   Lade es hier herunter: [python.org/downloads](https://www.python.org/downloads/)
    *   *Hinweis: Wähle bei der Installation "Add Python to PATH" aus.*
2.  **Code Editor (Optional)**: Zum Bearbeiten der Dateien.
    *   Empfehlung: [Visual Studio Code (VS Code)](https://code.visualstudio.com/)

---

## 🛠️ 2. Lokale Installation

Öffne dein Terminal (oder die Eingabeaufforderung) im Ordner `wg_app` und führe folgende Befehle aus:

1.  **Abhängigkeiten installieren**:
    Dies lädt alle benötigten Programmteile (Flask, SQLAlchemy, etc.) herunter.
    ```bash
    pip install -r requirements.txt
    ```

2.  **Webseite starten**:
    Starte den Server mit folgendem Befehl:
    ```bash
    python app.py
    ```

---

## 🌐 3. Webseite aufrufen

Wenn der Server läuft, öffne deinen Webbrowser und gib folgendes ein:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 💡 4. Fehlerbehebung (MacOS Tipp)

Wenn du eine Fehlermeldung wie `Address already in use` oder `Port 5000 is in use` siehst, liegt das oft an der "AirPlay Receiver" Funktion von Apple.

**Lösung 1: Port ändern**
Du kannst die Webseite auf einem anderen Port starten (z.B. 5001):
```bash
python app.py --port 5001
```
Dann ist die Adresse: **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

**Lösung 2: AirPlay deaktivieren**
Gehe zu `Systemeinstellungen` > `Allgemein` > `AirDrop & Handoff` und deaktiviere den `AirPlay-Empfänger`.
