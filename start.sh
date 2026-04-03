#!/bin/bash
# ══════════════════════════════════════════
#  WG Manager – Start Script
# ══════════════════════════════════════════

echo ""
echo "  🏠  WG Manager wird gestartet..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 nicht gefunden. Bitte installiere Python 3."
    exit 1
fi

# Install dependencies if needed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 Installiere Abhängigkeiten..."
    pip3 install -r requirements.txt --quiet
fi

# Start app
echo "✅ Starte App auf http://localhost:5000"
echo "   Drücke Ctrl+C zum Beenden."
echo ""
python3 app.py
