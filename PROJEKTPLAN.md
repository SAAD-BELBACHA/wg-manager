# Projektplan: WG-Manager Neubau

## Projektbeschreibung

Dieses Projekt entwickelt eine **WG-Manager Web-App** von Grund auf neu — eine Plattform für Wohngemeinschaften zur gemeinsamen Organisation von Aufgaben, Einkäufen, Finanzen und Kommunikation.

**Technologie-Stack:** Python, Flask, SQLite, HTML/CSS/Jinja2, Docker
**Methodik:** Scrum (2-Wochen-Sprints)
**Dauer:** ~14 Wochen (1 Semester)
**Team:** 3 Personen

---

## Rollen & Aufgabenverteilung

| Rolle | Verantwortung |
|---|---|
| **Product Owner (PO)** | Backlog pflegen & priorisieren, Anforderungen definieren, Abnahme |
| **Scrum Master (SM)** | Sprint-Planung, Stand-ups moderieren, Blocker beseitigen |
| **Developer** | Entwicklung (alle entwickeln alles) |

> **Wichtig:** Alle 3 Personen entwickeln aktiv Frontend, Backend und Tests.
> Die Scrum-Rollen sind rein organisatorisch (~5 min/Woche Overhead).
> Wer welche Aufgabe übernimmt, wird gemeinsam im Sprint Planning entschieden.

| Person | Scrum-Rolle |
|---|---|
| Person 1 | Product Owner |
| Person 2 | Scrum Master |
| Person 3 | Developer |

*(Namen werden vom Team eingetragen)*

---

## Scrum-Zeitplan (14 Wochen, 2-Wochen-Sprints)

| Sprint | Wochen | Ziel |
|---|---|---|
| **Sprint 0** | 1–2 | Setup: Repo, GitHub Projects, Rollen, Anforderungen finalisieren |
| **Sprint 1** | 3–4 | Auth (Register/Login), WG-Erstellung & Beitritt per Einladungscode |
| **Sprint 2** | 5–6 | Aufgaben-Modul (Tasks: erstellen, zuweisen, abhaken) |
| **Sprint 3** | 7–8 | Einkaufsliste (hinzufügen, abhaken, löschen) |
| **Sprint 4** | 9–10 | Finanzen (Ausgaben erfassen, Schuldenberechnung) |
| **Sprint 5** | 11–12 | Feed / Pinnwand (Texte und Bilder posten) |
| **Sprint 6** | 13–14 | Testing, Bugfixes, Deployment, Präsentation |

---

## Funktionale Anforderungen (initial)

1. Benutzer können sich registrieren und einloggen
2. Benutzer können eine WG erstellen oder einer per Einladungscode beitreten
3. Aufgaben können erstellt, zugewiesen und als erledigt markiert werden
4. Aufgaben können automatisch rotiert werden (gleichmäßige Verteilung auf Mitglieder)
5. Eine gemeinsame Einkaufsliste kann geführt werden (hinzufügen, abhaken, löschen)
6. Ausgaben können erfasst werden; die App berechnet automatisch wer wem wie viel schuldet
7. Es gibt eine Pinnwand (Feed), auf der Mitglieder Texte und Bilder posten können
8. Alle Daten sind WG-spezifisch (keine Vermischung zwischen verschiedenen WGs)

---

## Nicht-funktionale Anforderungen (initial)

1. Die App läuft in einem Docker-Container (einfaches Deployment via docker-compose up)
2. Passwörter werden gehasht gespeichert (pbkdf2:sha256)
3. CSRF-Schutz für alle Formulare
4. Ladezeiten unter 2 Sekunden für alle Seiten
5. Responsive Design (mobilfähig)
6. Code ist auf GitHub versioniert, jeder Commit hat eine beschreibende Nachricht
7. Die Benutzeroberfläche ist auf Deutsch

---

## Infrastruktur & Zugänge

| Tool | Zweck | Zugang für Lehrende |
|---|---|---|
| **GitHub** (saad-belbacha/wg-manager) | Code, Issues, Pull Requests | Repo-Einladung als Collaborator |
| **GitHub Projects** | Scrum-Board (Backlog / In Progress / Review / Done) | Sichtbar über das Repository |
| **Docker** | Lokales & produktives Deployment | docker-compose up — kein Account nötig |

### App starten (für Lehrende)

git clone https://github.com/saad-belbacha/wg-manager.git
cd wg-manager
docker-compose up
# App erreichbar unter: http://localhost:5000

---

## Links

- **GitHub Repository:** https://github.com/saad-belbacha/wg-manager

