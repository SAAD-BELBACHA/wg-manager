from flask import Flask, redirect, url_for, request, flash, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from urllib.parse import urlparse
from datetime import datetime, timedelta, date
import calendar as _calendar
import hashlib
import logging
import random
import re
import secrets
import smtplib
import string
import os
import uuid
from email.message import EmailMessage

# ──────────────────────────────────────────────
#  APP SETUP
# ──────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'wg-super-secret-2024')


def _normalize_db_url(url):
    # Managed Postgres providers (Render, Heroku) hand out a "postgres://" URL,
    # but SQLAlchemy only accepts the "postgresql://" scheme. Also prefer the
    # psycopg2 driver explicitly so the intent is clear.
    if url.startswith('postgres://'):
        url = 'postgresql://' + url[len('postgres://'):]
    if url.startswith('postgresql://'):
        url = 'postgresql+psycopg2://' + url[len('postgresql://'):]
    return url


app.config['SQLALCHEMY_DATABASE_URI'] = _normalize_db_url(os.environ.get('DATABASE_URL', 'sqlite:///wg_app.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Managed Postgres connections drop idle sockets; pre-ping avoids stale-connection errors.
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True}
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', os.path.join(os.path.dirname(__file__), 'static', 'uploads'))
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'wg-jwt-secret-mobile-dev-key-2024-change-me')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=14)
app.config['MOBILE_APP_URL'] = os.environ.get('MOBILE_APP_URL', 'https://zofri-app.onrender.com').rstrip('/')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Password-reset email delivery. Unset SMTP_HOST leaves the app fully functional
# for everything else, but reset codes will only appear in the server log —
# set SMTP_HOST/PORT/USER/PASSWORD/FROM to actually email them to users.
SMTP_HOST = os.environ.get('SMTP_HOST')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER or 'no-reply@zofri.app')

# Object storage for uploaded documents/receipts. Set CLOUDINARY_URL
# (cloudinary://<api_key>:<api_secret>@<cloud_name>) to store files durably in
# the cloud; without it, files fall back to the local disk (fine locally, but
# ephemeral on Render — wiped on each deploy). No fake persistence.
CLOUDINARY_URL = os.environ.get('CLOUDINARY_URL')
STORAGE_READY = bool(CLOUDINARY_URL)
if STORAGE_READY:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(secure=True)  # reads CLOUDINARY_URL from the environment

# CORS is only enforced by browsers (Expo web build), not native iOS/Android —
# restrict it to the deployed web app plus local dev servers instead of "*".
_default_origins = ','.join([
    app.config['MOBILE_APP_URL'],
    'http://localhost:8081', 'http://127.0.0.1:8081',
    'http://localhost:19006', 'http://127.0.0.1:19006',
])
CORS_ORIGINS = [o.strip() for o in os.environ.get('CORS_ORIGINS', _default_origins).split(',') if o.strip()]

ALLOWED_IMAGE = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_AUDIO = {'mp3', 'ogg', 'wav', 'webm', 'm4a', 'aac'}
ALLOWED_DOC   = {'pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx'}

def allowed_file(filename, allowed_set):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_set


def store_file(file, folder):
    """Persist an uploaded file and return (url, kind). Uses Cloudinary when
    configured, else the local disk. `kind` is 'image' or 'file'."""
    fname = secure_filename(file.filename or 'upload')
    ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
    kind = 'image' if ext in ALLOWED_IMAGE else 'file'
    if STORAGE_READY:
        result = cloudinary.uploader.upload(
            file, folder=f'zofri/{folder}', resource_type='auto',
            use_filename=True, unique_filename=True,
        )
        return result['secure_url'], kind
    unique_name = f'{uuid.uuid4().hex}.{ext}' if ext else uuid.uuid4().hex
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_name))
    # Absolute URL against the backend's own host, so the mobile app (served
    # from a different origin) can open the file directly.
    base = os.environ.get('BACKEND_URL', '').rstrip('/') or request.host_url.rstrip('/')
    return f'{base}/uploads/{unique_name}', kind

def send_email(to_address, subject, body):
    if not SMTP_HOST:
        logging.getLogger('zofri.mail').warning(
            '[email delivery not configured] to=%s subject=%s\n%s', to_address, subject, body
        )
        return False
    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = SMTP_FROM
    message['To'] = to_address
    message.set_content(body)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
        smtp.starttls()
        if SMTP_USER and SMTP_PASSWORD:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(message)
    return True

db = SQLAlchemy(app)
jwt_manager = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}})
limiter = Limiter(get_remote_address, app=app, storage_uri='memory://',
                   default_limits=['200 per hour'])


# ──────────────────────────────────────────────
#  MODELS
# ──────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_color  = db.Column(db.String(7),   default='#6366f1')
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw, method='pbkdf2:sha256')

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def get_wg(self):
        m = WGMembership.query.filter_by(user_id=self.id).first()
        return db.session.get(WG, m.wg_id) if m else None


class WG(db.Model):
    __tablename__ = 'wgs'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    invite_code = db.Column(db.String(8),   unique=True, nullable=False)
    created_by  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    monthly_budget = db.Column(db.Float, nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    memberships    = db.relationship('WGMembership', backref='wg', lazy=True)
    tasks          = db.relationship('CleaningTask',  backref='wg', lazy=True)
    shopping_items = db.relationship('ShoppingItem',  backref='wg', lazy=True)
    expenses       = db.relationship('Expense',       backref='wg', lazy=True)
    feed_posts     = db.relationship('FeedPost',      backref='wg', lazy=True)

    def get_members(self):
        return [db.session.get(User, m.user_id) for m in self.memberships
                if db.session.get(User, m.user_id) is not None]


class WGMembership(db.Model):
    __tablename__ = 'wg_memberships'
    id        = db.Column(db.Integer, primary_key=True)
    user_id   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    wg_id     = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)


class CleaningTask(db.Model):
    __tablename__ = 'cleaning_tasks'
    id           = db.Column(db.Integer, primary_key=True)
    wg_id        = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    title        = db.Column(db.String(100), nullable=False)
    description  = db.Column(db.Text, default='')
    assigned_to  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    due_date     = db.Column(db.Date,    nullable=True)
    recurrence   = db.Column(db.String(10), default='none')  # none|daily|weekly|biweekly|monthly
    completed    = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_user = db.relationship('User', foreign_keys=[assigned_to])


class ShoppingItem(db.Model):
    __tablename__ = 'shopping_items'
    id         = db.Column(db.Integer, primary_key=True)
    wg_id      = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    name       = db.Column(db.String(100), nullable=False)
    quantity   = db.Column(db.String(50),  default='')
    added_by   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    completed  = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    added_by_user = db.relationship('User', foreign_keys=[added_by])


class Expense(db.Model):
    __tablename__ = 'expenses'
    id           = db.Column(db.Integer, primary_key=True)
    wg_id        = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    title        = db.Column(db.String(100), nullable=False)
    amount       = db.Column(db.Float,       nullable=False)
    paid_by      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category     = db.Column(db.String(30), default='other')
    split_method = db.Column(db.String(12), default='equal')  # equal|exact|percent|shares
    recurring_id = db.Column(db.Integer, nullable=True)  # RecurringExpense that spawned this
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    paid_by_user = db.relationship('User', foreign_keys=[paid_by])
    splits = db.relationship('ExpenseSplit', backref='expense', lazy=True,
                             cascade='all, delete-orphan')


class RecurringExpense(db.Model):
    __tablename__ = 'recurring_expenses'
    id         = db.Column(db.Integer, primary_key=True)
    wg_id      = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    title      = db.Column(db.String(100), nullable=False)
    amount     = db.Column(db.Float, nullable=False)
    category   = db.Column(db.String(30), default='other')
    paid_by    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    interval   = db.Column(db.String(10), default='monthly')  # weekly|monthly|quarterly|yearly
    next_due   = db.Column(db.Date, nullable=False)
    active     = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_by_user = db.relationship('User', foreign_keys=[paid_by])


class FeedPost(db.Model):
    __tablename__ = 'feed_posts'
    id         = db.Column(db.Integer, primary_key=True)
    wg_id      = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content    = db.Column(db.Text, default='')
    file_name  = db.Column(db.String(255), nullable=True)
    file_type  = db.Column(db.String(10),  nullable=True)   # 'image' | 'audio'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    author     = db.relationship('User', foreign_keys=[user_id])


class ExpenseSplit(db.Model):
    __tablename__ = 'expense_splits'
    id         = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'),    nullable=False)
    amount     = db.Column(db.Float, nullable=False)
    user = db.relationship('User', foreign_keys=[user_id])


class SettlementPayment(db.Model):
    __tablename__ = 'settlement_payments'
    id           = db.Column(db.Integer, primary_key=True)
    wg_id        = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    from_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # who paid (debtor)
    to_user_id   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # who received (creditor)
    amount       = db.Column(db.Float, nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    from_user = db.relationship('User', foreign_keys=[from_user_id])
    to_user   = db.relationship('User', foreign_keys=[to_user_id])


class RevokedToken(db.Model):
    __tablename__ = 'revoked_tokens'
    id         = db.Column(db.Integer, primary_key=True)
    jti        = db.Column(db.String(36), unique=True, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime, default=datetime.utcnow)


class PasswordResetCode(db.Model):
    __tablename__ = 'password_reset_codes'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    code_hash  = db.Column(db.String(256), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts   = db.Column(db.Integer, default=0)
    used       = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', foreign_keys=[user_id])


@jwt_manager.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    return db.session.query(RevokedToken.id).filter_by(jti=jti).first() is not None


class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'
    id          = db.Column(db.Integer, primary_key=True)
    wg_id       = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    title       = db.Column(db.String(140), nullable=False)
    event_type  = db.Column(db.String(40), default='other')
    starts_at   = db.Column(db.DateTime, nullable=False)
    notes       = db.Column(db.Text, default='')
    created_by  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    creator     = db.relationship('User', foreign_keys=[created_by])


class HouseholdRule(db.Model):
    __tablename__ = 'household_rules'
    id          = db.Column(db.Integer, primary_key=True)
    wg_id       = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    title       = db.Column(db.String(140), nullable=False)
    content     = db.Column(db.Text, default='')
    category    = db.Column(db.String(60), default='general')
    active      = db.Column(db.Boolean, default=True)
    created_by  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    creator     = db.relationship('User', foreign_keys=[created_by])


class Poll(db.Model):
    __tablename__ = 'polls'
    id          = db.Column(db.Integer, primary_key=True)
    wg_id       = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    title       = db.Column(db.String(140), nullable=False)
    description = db.Column(db.Text, default='')
    created_by  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    options     = db.relationship('PollOption', backref='poll', lazy=True,
                                  cascade='all, delete-orphan')
    creator     = db.relationship('User', foreign_keys=[created_by])


class PollOption(db.Model):
    __tablename__ = 'poll_options'
    id      = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('polls.id'), nullable=False)
    text    = db.Column(db.String(140), nullable=False)
    votes   = db.relationship('PollVote', backref='option', lazy=True,
                              cascade='all, delete-orphan')


class PollVote(db.Model):
    __tablename__ = 'poll_votes'
    id        = db.Column(db.Integer, primary_key=True)
    poll_id   = db.Column(db.Integer, db.ForeignKey('polls.id'), nullable=False)
    option_id = db.Column(db.Integer, db.ForeignKey('poll_options.id'), nullable=False)
    user_id   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class MoodCheckResponse(db.Model):
    __tablename__ = 'mood_check_responses'
    id             = db.Column(db.Integer, primary_key=True)
    wg_id          = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    wellbeing      = db.Column(db.Integer, nullable=False)
    fairness       = db.Column(db.Integer, nullable=False)
    cleanliness    = db.Column(db.Integer, nullable=False)
    communication  = db.Column(db.Integer, nullable=False)
    comment        = db.Column(db.Text, default='')
    anonymous      = db.Column(db.Boolean, default=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)


class ConflictReport(db.Model):
    __tablename__ = 'conflict_reports'
    id               = db.Column(db.Integer, primary_key=True)
    wg_id            = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    user_id          = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category         = db.Column(db.String(80), nullable=False)
    urgency          = db.Column(db.String(40), default='normal')
    description      = db.Column(db.Text, nullable=False)
    desired_solution = db.Column(db.Text, default='')
    anonymous        = db.Column(db.Boolean, default=False)
    status           = db.Column(db.String(40), default='open')
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    reporter         = db.relationship('User', foreign_keys=[user_id])


class AppNotification(db.Model):
    __tablename__ = 'notifications'
    id         = db.Column(db.Integer, primary_key=True)
    wg_id      = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    title      = db.Column(db.String(140), nullable=False)
    body       = db.Column(db.Text, default='')
    target     = db.Column(db.String(120), default='')
    read       = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class TrustEvent(db.Model):
    __tablename__ = 'trust_events'
    id          = db.Column(db.Integer, primary_key=True)
    wg_id       = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    event_type  = db.Column(db.String(60), nullable=False)
    points      = db.Column(db.Integer, default=0)
    explanation = db.Column(db.Text, default='')
    disputed    = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)


class Document(db.Model):
    __tablename__ = 'documents'
    id          = db.Column(db.Integer, primary_key=True)
    wg_id       = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    title       = db.Column(db.String(140), nullable=False)
    category    = db.Column(db.String(30), default='other')
    file_url    = db.Column(db.String(500), nullable=False)
    file_type   = db.Column(db.String(10), default='file')  # image | file
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    uploader    = db.relationship('User', foreign_keys=[uploaded_by])


DOCUMENT_CATEGORIES = [
    'contract', 'rules', 'utilities', 'deposit', 'protocol', 'receipt', 'other'
]


class MoveChecklist(db.Model):
    __tablename__ = 'move_checklists'
    id         = db.Column(db.Integer, primary_key=True)
    wg_id      = db.Column(db.Integer, db.ForeignKey('wgs.id'), nullable=False)
    kind       = db.Column(db.String(10), nullable=False)  # move_in | move_out
    title      = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    items = db.relationship('ChecklistItem', backref='checklist', lazy=True,
                            cascade='all, delete-orphan')


class ChecklistItem(db.Model):
    __tablename__ = 'checklist_items'
    id           = db.Column(db.Integer, primary_key=True)
    checklist_id = db.Column(db.Integer, db.ForeignKey('move_checklists.id'), nullable=False)
    text_key     = db.Column(db.String(40), nullable=True)   # set for template items (translatable)
    text         = db.Column(db.String(200), default='')      # raw text for custom items / fallback
    done         = db.Column(db.Boolean, default=False)
    position     = db.Column(db.Integer, default=0)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)


# Templates seeded on checklist creation. text_key is translated client-side;
# the German string is a fallback if a key is ever missing.
CHECKLIST_TEMPLATES = {
    'move_in': [
        ('room_condition', 'Zimmerzustand dokumentiert (Fotos)'),
        ('keys_received', 'Schlüssel erhalten'),
        ('meters_readings', 'Zählerstände notiert'),
        ('wifi_setup', 'WLAN eingerichtet'),
        ('house_rules_read', 'Hausregeln gelesen'),
        ('deposit_paid', 'Kaution überwiesen'),
        ('address_registration', 'Adresse angemeldet'),
    ],
    'move_out': [
        ('room_cleaned', 'Zimmer besenrein übergeben'),
        ('room_condition', 'Zimmerzustand dokumentiert (Fotos)'),
        ('keys_returned', 'Schlüssel zurückgegeben'),
        ('meters_readings', 'Zählerstände notiert'),
        ('subscriptions_cancelled', 'Abos/Verträge gekündigt'),
        ('unpaid_balances', 'Offene WG-Beträge beglichen'),
        ('deposit_back', 'Kaution zurück angefordert'),
        ('address_deregistration', 'Adresse abgemeldet'),
        ('handover_done', 'Übergabe abgeschlossen'),
    ],
}


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────
AVATAR_COLORS = [
    '#6366f1','#8b5cf6','#ec4899','#f43f5e',
    '#f97316','#22c55e','#14b8a6','#0ea5e9',
]


def gen_invite_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not WG.query.filter_by(invite_code=code).first():
            return code


EXPENSE_CATEGORIES = [
    'rent', 'electricity', 'internet', 'groceries', 'household',
    'repair', 'leisure', 'deposit', 'other'
]
SPLIT_METHODS = {'equal', 'exact', 'percent', 'shares'}


def compute_splits(total_cents, method, participants):
    """Split total_cents exactly among participants using integer-cents math
    so the parts always sum to the total (no floating-point drift).

    participants: list of {'user_id': int, 'value': float}
      - equal:   value ignored, split evenly
      - exact:   value = that person's amount (in currency units)
      - percent: value = that person's percentage (must sum to 100)
      - shares:  value = that person's weight (e.g. 2 : 1 : 1)

    Returns {user_id: cents} or raises ValueError on invalid input.
    """
    if not participants:
        raise ValueError('Mindestens eine Person muss beteiligt sein.')
    ids = [p['user_id'] for p in participants]
    if len(set(ids)) != len(ids):
        raise ValueError('Doppelte Teilnehmer.')

    if method == 'exact':
        cents = {}
        for p in participants:
            c = int(round(float(p['value']) * 100))
            if c < 0:
                raise ValueError('Beträge dürfen nicht negativ sein.')
            cents[p['user_id']] = c
        if sum(cents.values()) != total_cents:
            raise ValueError('Die Summe der Beträge muss dem Gesamtbetrag entsprechen.')
        return cents

    if method == 'percent':
        weights = [max(0.0, float(p['value'])) for p in participants]
        if abs(sum(weights) - 100.0) > 0.01:
            raise ValueError('Die Prozentangaben müssen zusammen 100 % ergeben.')
    elif method == 'shares':
        weights = [max(0.0, float(p['value'])) for p in participants]
        if sum(weights) <= 0:
            raise ValueError('Mindestens ein Anteil muss größer als 0 sein.')
    else:  # equal
        weights = [1.0] * len(participants)

    total_weight = sum(weights)
    # Largest-remainder method: floor each share, then hand out leftover cents
    # to the participants with the biggest fractional parts (stable, exact).
    raw = [total_cents * w / total_weight for w in weights]
    floors = [int(x) for x in raw]
    remainder = total_cents - sum(floors)
    order = sorted(range(len(participants)), key=lambda i: raw[i] - floors[i], reverse=True)
    for k in range(remainder):
        floors[order[k]] += 1
    return {participants[i]['user_id']: floors[i] for i in range(len(participants))}


def calculate_debts(wg):
    """Return list of {from_user, to_user, amount} dicts."""
    members = wg.get_members()
    member_map = {m.id: m for m in members}
    debts = {}  # (from_id, to_id) -> amount

    def add_debt(ower_id, owed_id, amount):
        key     = (ower_id, owed_id)
        rev_key = (owed_id, ower_id)
        if key in debts:
            debts[key] += amount
        elif rev_key in debts:
            debts[rev_key] -= amount
            if debts[rev_key] < 0:
                debts[key] = -debts[rev_key]
                del debts[rev_key]
        else:
            debts[key] = amount

    for expense in wg.expenses:
        paid_id = expense.paid_by
        for split in expense.splits:
            if split.user_id == paid_id:
                continue
            add_debt(split.user_id, paid_id, split.amount)

    # A direct repayment from A to B works like B now "owing" A that amount,
    # which nets against A's existing debt to B.
    for payment in SettlementPayment.query.filter_by(wg_id=wg.id).all():
        add_debt(payment.to_user_id, payment.from_user_id, payment.amount)

    result = []
    for (fid, tid), amt in debts.items():
        if abs(amt) > 0.01:
            from_user = member_map.get(fid)
            to_user   = member_map.get(tid)
            if from_user is None or to_user is None:
                continue
            result.append({
                'from_user': from_user,
                'to_user':   to_user,
                'amount':    round(amt, 2),
            })
    return result


RECURRING_INTERVALS = {'weekly', 'monthly', 'quarterly', 'yearly'}


def advance_recurring_date(d, interval):
    if interval == 'weekly':
        return d + timedelta(days=7)
    months = {'quarterly': 3, 'yearly': 12}.get(interval, 1)
    m = d.month - 1 + months
    year = d.year + m // 12
    month = m % 12 + 1
    day = min(d.day, _calendar.monthrange(year, month)[1])
    return date(year, month, day)


def materialize_recurring(wg):
    """Create real expenses for every recurring definition that is due.
    Runs lazily whenever finances are fetched — no scheduler needed. Each
    instance is dated on its due date and split equally among the members
    at that moment; next_due then advances by the interval (capped catch-up
    so an long-idle WG can't spawn unbounded rows)."""
    today = datetime.utcnow().date()
    members = wg.get_members()
    if not members:
        return
    defs = RecurringExpense.query.filter_by(wg_id=wg.id, active=True).all()
    changed = False
    for r in defs:
        guard = 0
        while r.next_due and r.next_due <= today and guard < 24:
            total_cents = int(round(r.amount * 100))
            cents = compute_splits(total_cents, 'equal',
                                   [{'user_id': m.id, 'value': 0} for m in members])
            expense = Expense(
                wg_id=wg.id, title=r.title, amount=r.amount, paid_by=r.paid_by,
                category=r.category, split_method='equal', recurring_id=r.id,
                created_at=datetime.combine(r.next_due, datetime.min.time())
            )
            db.session.add(expense)
            db.session.flush()
            for user_id, c in cents.items():
                db.session.add(ExpenseSplit(expense_id=expense.id, user_id=user_id, amount=c / 100.0))
            r.next_due = advance_recurring_date(r.next_due, r.interval)
            guard += 1
            changed = True
    if changed:
        db.session.commit()


def calculate_net_balances(wg):
    """Net position per member in integer cents: paid minus owed.
    Positive = the WG owes them money; negative = they owe the WG."""
    balances = {m.id: 0 for m in wg.get_members()}
    for expense in wg.expenses:
        total_cents = int(round(expense.amount * 100))
        if expense.paid_by in balances:
            balances[expense.paid_by] += total_cents
        for split in expense.splits:
            if split.user_id in balances:
                balances[split.user_id] -= int(round(split.amount * 100))
    # Repayments shift the balance: the payer clears debt, the recipient
    # has been made whole by that amount.
    for payment in SettlementPayment.query.filter_by(wg_id=wg.id).all():
        cents = int(round(payment.amount * 100))
        if payment.from_user_id in balances:
            balances[payment.from_user_id] += cents
        if payment.to_user_id in balances:
            balances[payment.to_user_id] -= cents
    return balances


def simplify_settlements(balances):
    """Greedy debt simplification: match the biggest creditor with the biggest
    debtor repeatedly. Produces at most n-1 transfers — far fewer than the raw
    pairwise debts — while settling everyone exactly.

    Returns list of {from_id, to_id, cents}.
    """
    creditors = sorted(([uid, c] for uid, c in balances.items() if c > 0),
                       key=lambda x: x[1], reverse=True)
    debtors = sorted(([uid, -c] for uid, c in balances.items() if c < 0),
                     key=lambda x: x[1], reverse=True)
    settlements = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        d, c = debtors[i], creditors[j]
        pay = min(d[1], c[1])
        if pay > 0:
            settlements.append({'from_id': d[0], 'to_id': c[0], 'cents': pay})
        d[1] -= pay
        c[1] -= pay
        if d[1] == 0:
            i += 1
        if c[1] == 0:
            j += 1
    return settlements


def _safe_next(next_url):
    """Return next_url only if it's a safe local path."""
    if not next_url:
        return None
    parsed = urlparse(next_url)
    if parsed.netloc or not next_url.startswith('/'):
        return None
    return next_url


def mobile_app_url(path='/'):
    if not path.startswith('/'):
        path = f'/{path}'
    return f"{app.config['MOBILE_APP_URL']}{path}"


@app.route('/')
def index():
    return redirect(mobile_app_url('/'))


# ──────────────────────────────────────────────
#  STATIC FILE SERVING (feed attachments)
# ──────────────────────────────────────────────
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], secure_filename(filename))


# ──────────────────────────────────────────────
#  API BLUEPRINT (JWT handles auth)
# ──────────────────────────────────────────────
from flask import Blueprint
api = Blueprint('api', __name__)

# ──────────────────────────────────────────────
#  API HELPERS
# ──────────────────────────────────────────────
def user_to_dict(u):
    return {'id': u.id, 'username': u.username, 'email': u.email, 'avatar_color': u.avatar_color}

def wg_to_dict(wg):
    return {'id': wg.id, 'name': wg.name, 'invite_code': wg.invite_code}

RECURRENCE_DAYS = {'daily': 1, 'weekly': 7, 'biweekly': 14, 'monthly': 30}
VALID_RECURRENCE = {'none', 'daily', 'weekly', 'biweekly', 'monthly'}


def advance_due_date(due_date, recurrence):
    step = RECURRENCE_DAYS.get(recurrence)
    if not step:
        return None
    base = due_date or datetime.utcnow().date()
    return base + timedelta(days=step)


def next_assignee(wg, current_assignee_id):
    # Round-robin to the next member after the current assignee, so a recurring
    # chore rotates fairly and predictably instead of landing on the same person.
    members = wg.get_members()
    if not members:
        return None
    ids = [m.id for m in members]
    if current_assignee_id in ids:
        return ids[(ids.index(current_assignee_id) + 1) % len(ids)]
    return ids[0]


def task_to_dict(t):
    return {
        'id': t.id, 'title': t.title, 'description': t.description,
        'completed': t.completed,
        'recurrence': t.recurrence or 'none',
        'due_date': t.due_date.isoformat() if t.due_date else None,
        'assigned_to': user_to_dict(t.assigned_user) if t.assigned_user else None,
        'created_at': t.created_at.isoformat(),
    }

def shopping_to_dict(i):
    return {
        'id': i.id, 'name': i.name, 'quantity': i.quantity,
        'completed': i.completed, 'created_at': i.created_at.isoformat(),
        'added_by': user_to_dict(i.added_by_user),
    }

def expense_to_dict(e):
    return {
        'id': e.id, 'title': e.title, 'amount': e.amount,
        'paid_by': user_to_dict(e.paid_by_user),
        'category': e.category or 'other',
        'split_method': e.split_method or 'equal',
        'participants': [
            {'user': user_to_dict(s.user), 'amount': s.amount}
            for s in e.splits if s.user is not None
        ],
        'is_recurring': e.recurring_id is not None,
        'created_at': e.created_at.isoformat(),
    }

def recurring_to_dict(r):
    return {
        'id': r.id, 'title': r.title, 'amount': r.amount,
        'category': r.category or 'other',
        'interval': r.interval,
        'next_due': r.next_due.isoformat() if r.next_due else None,
        'active': bool(r.active),
        'paid_by': user_to_dict(r.paid_by_user),
    }

def post_to_dict(p):
    return {
        'id': p.id, 'content': p.content, 'file_name': p.file_name,
        'file_type': p.file_type, 'created_at': p.created_at.isoformat(),
        'author': user_to_dict(p.author),
    }

def debt_to_dict(d):
    return {
        'from_user': user_to_dict(d['from_user']),
        'to_user':   user_to_dict(d['to_user']),
        'amount':    d['amount'],
    }

def settlement_payment_to_dict(p):
    return {
        'id': p.id,
        'from_user': user_to_dict(p.from_user),
        'to_user':   user_to_dict(p.to_user),
        'amount':    p.amount,
        'created_at': p.created_at.isoformat(),
    }


def current_api_user_and_wg():
    uid = int(get_jwt_identity())
    user = db.session.get(User, uid)
    wg = user.get_wg() if user else None
    return uid, user, wg


def calendar_event_to_dict(e):
    return {
        'id': e.id,
        'title': e.title,
        'event_type': e.event_type,
        'starts_at': e.starts_at.isoformat(),
        'notes': e.notes,
        'created_by': user_to_dict(e.creator),
        'created_at': e.created_at.isoformat(),
    }


def rule_to_dict(r):
    return {
        'id': r.id,
        'title': r.title,
        'content': r.content,
        'category': r.category,
        'active': r.active,
        'created_by': user_to_dict(r.creator),
        'created_at': r.created_at.isoformat(),
    }


def poll_to_dict(p):
    return {
        'id': p.id,
        'title': p.title,
        'description': p.description,
        'created_by': user_to_dict(p.creator),
        'created_at': p.created_at.isoformat(),
        'options': [
            {
                'id': option.id,
                'text': option.text,
                'votes': len(option.votes),
            }
            for option in p.options
        ],
    }


def conflict_to_dict(c):
    reporter = user_to_dict(c.reporter) if not c.anonymous else None
    return {
        'id': c.id,
        'category': c.category,
        'urgency': c.urgency,
        'description': c.description,
        'desired_solution': c.desired_solution,
        'anonymous': c.anonymous,
        'status': c.status,
        'reporter': reporter,
        'created_at': c.created_at.isoformat(),
    }


def notification_to_dict(n):
    return {
        'id': n.id,
        'title': n.title,
        'body': n.body,
        'target': n.target,
        'read': n.read,
        'created_at': n.created_at.isoformat(),
    }


def trust_event_to_dict(e):
    return {
        'id': e.id,
        'event_type': e.event_type,
        'points': e.points,
        'explanation': e.explanation,
        'disputed': e.disputed,
        'created_at': e.created_at.isoformat(),
    }


def parse_receipt_text(text):
    price_matches = re.findall(r'(?<!\d)(\d{1,4}[,.]\d{2})(?!\d)', text)
    amounts = []
    for value in price_matches:
        try:
            amounts.append(float(value.replace(',', '.')))
        except ValueError:
            pass
    total = max(amounts) if amounts else None
    date_match = re.search(r'(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})', text)
    merchant = ''
    for line in text.splitlines():
        cleaned = line.strip()
        if len(cleaned) >= 3 and not re.search(r'\d{2,}', cleaned):
            merchant = cleaned[:80]
            break
    return {
        'merchant': merchant,
        'date': date_match.group(1) if date_match else '',
        'total': round(total, 2) if total is not None else None,
        'raw_text': text[:4000],
        'items': [],
    }


# ──────────────────────────────────────────────
#  API — AUTH
# ──────────────────────────────────────────────
@api.route('/auth/register', methods=['POST'])
@limiter.limit('10 per minute')
def api_register():
    data     = request.get_json() or {}
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    if not all([username, email, password]):
        return jsonify({'error': 'Alle Felder sind erforderlich.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Passwort muss mindestens 6 Zeichen lang sein.'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Benutzername bereits vergeben.'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'E-Mail bereits registriert.'}), 409
    color = AVATAR_COLORS[User.query.count() % len(AVATAR_COLORS)]
    user  = User(username=username, email=email, avatar_color=color)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user_to_dict(user)}), 201


@api.route('/auth/login', methods=['POST'])
@limiter.limit('10 per minute')
def api_login():
    data     = request.get_json() or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    user     = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Ungültige E-Mail oder Passwort.'}), 401
    wg    = user.get_wg()
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user_to_dict(user), 'wg': wg_to_dict(wg) if wg else None})


@api.route('/auth/me', methods=['GET'])
@jwt_required()
def api_me():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user:
        return jsonify({'error': 'Not found.'}), 404
    wg = user.get_wg()
    return jsonify({'user': user_to_dict(user), 'wg': wg_to_dict(wg) if wg else None})


@api.route('/auth/logout', methods=['POST'])
@jwt_required()
def api_logout():
    jti = get_jwt()['jti']
    db.session.add(RevokedToken(jti=jti))
    db.session.commit()
    return jsonify({'success': True})


@api.route('/account/export', methods=['GET'])
@jwt_required()
def api_account_export():
    uid, user, wg = current_api_user_and_wg()
    if not user:
        return jsonify({'error': 'Not found.'}), 404

    data = {
        'exported_at': datetime.utcnow().isoformat() + 'Z',
        'profile': user_to_dict(user),
        'household': wg_to_dict(wg) if wg else None,
        'tasks_assigned_to_me': [task_to_dict(t) for t in CleaningTask.query.filter_by(assigned_to=uid).all()],
        'shopping_items_added_by_me': [shopping_to_dict(i) for i in ShoppingItem.query.filter_by(added_by=uid).all()],
        'expenses_i_paid': [expense_to_dict(e) for e in Expense.query.filter_by(paid_by=uid).all()],
        'expense_shares_i_owe': [
            {'expense_id': s.expense_id, 'amount': s.amount}
            for s in ExpenseSplit.query.filter_by(user_id=uid).all()
        ],
        'feed_posts': [post_to_dict(p) for p in FeedPost.query.filter_by(user_id=uid).all()],
        'calendar_events_created_by_me': [calendar_event_to_dict(e) for e in CalendarEvent.query.filter_by(created_by=uid).all()],
        'rules_created_by_me': [rule_to_dict(r) for r in HouseholdRule.query.filter_by(created_by=uid).all()],
        'polls_created_by_me': [poll_to_dict(p) for p in Poll.query.filter_by(created_by=uid).all()],
        'conflicts_reported_by_me': [conflict_to_dict(c) for c in ConflictReport.query.filter_by(user_id=uid).all()],
        'trust_events': [trust_event_to_dict(e) for e in TrustEvent.query.filter_by(user_id=uid).all()],
    }
    return jsonify(data)


@api.route('/account', methods=['DELETE'])
@jwt_required()
def api_delete_account():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    if not user:
        return jsonify({'error': 'Not found.'}), 404

    WGMembership.query.filter_by(user_id=uid).delete()
    PasswordResetCode.query.filter_by(user_id=uid).delete()

    # Anonymize rather than hard-delete: other members' shared tasks/expenses/history
    # reference this user's id (NOT NULL foreign keys) and must keep resolving.
    anon_suffix = secrets.token_hex(4)
    user.username = f'geloescht-{anon_suffix}'
    user.email = f'geloescht-{anon_suffix}@zofri.local'
    user.set_password(secrets.token_urlsafe(32))
    user.avatar_color = '#9CA3AF'
    db.session.commit()

    jti = get_jwt()['jti']
    db.session.add(RevokedToken(jti=jti))
    db.session.commit()

    return jsonify({'success': True})


@api.route('/auth/forgot-password', methods=['POST'])
@limiter.limit('5 per minute')
def api_forgot_password():
    data  = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'E-Mail erforderlich.'}), 400
    generic = jsonify({'success': True, 'message': 'Falls diese E-Mail registriert ist, wurde ein Code gesendet.'})
    user = User.query.filter_by(email=email).first()
    if not user:
        return generic
    code = f'{secrets.randbelow(1000000):06d}'
    db.session.add(PasswordResetCode(
        user_id=user.id,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(minutes=15)
    ))
    db.session.commit()
    send_email(
        user.email,
        'Zofri – Passwort zurücksetzen',
        f'Dein Reset-Code lautet: {code}\nEr ist 15 Minuten gültig. '
        f'Falls du das nicht angefordert hast, ignoriere diese E-Mail.'
    )
    return generic


@api.route('/auth/reset-password', methods=['POST'])
@limiter.limit('10 per minute')
def api_reset_password():
    data     = request.get_json() or {}
    email    = data.get('email', '').strip().lower()
    code     = data.get('code', '').strip()
    password = data.get('password', '')
    if not all([email, code, password]):
        return jsonify({'error': 'Alle Felder sind erforderlich.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Passwort muss mindestens 6 Zeichen lang sein.'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Ungültiger Code.'}), 400
    reset = (PasswordResetCode.query
             .filter_by(user_id=user.id, used=False)
             .order_by(PasswordResetCode.created_at.desc())
             .first())
    if not reset or reset.expires_at < datetime.utcnow() or reset.attempts >= 5:
        return jsonify({'error': 'Ungültiger oder abgelaufener Code.'}), 400
    if reset.code_hash != hashlib.sha256(code.encode()).hexdigest():
        reset.attempts += 1
        db.session.commit()
        return jsonify({'error': 'Ungültiger Code.'}), 400
    reset.used = True
    user.set_password(password)
    db.session.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
#  API — WG
# ──────────────────────────────────────────────
@api.route('/wg/create', methods=['POST'])
@jwt_required()
def api_wg_create():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    if user.get_wg():
        return jsonify({'error': 'Bereits in einer WG.'}), 409
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'WG-Name ist erforderlich.'}), 400
    wg = WG(name=name, invite_code=gen_invite_code(), created_by=uid)
    db.session.add(wg)
    db.session.flush()
    db.session.add(WGMembership(user_id=uid, wg_id=wg.id))
    db.session.commit()
    return jsonify({'wg': wg_to_dict(wg)}), 201


@api.route('/wg/join', methods=['POST'])
@jwt_required()
def api_wg_join():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    if user.get_wg():
        return jsonify({'error': 'Bereits in einer WG.'}), 409
    data = request.get_json() or {}
    code = data.get('invite_code', '').strip().upper()
    wg   = WG.query.filter_by(invite_code=code).first()
    if not wg:
        return jsonify({'error': 'Ungültiger Einladungscode.'}), 404
    if not WGMembership.query.filter_by(user_id=uid, wg_id=wg.id).first():
        db.session.add(WGMembership(user_id=uid, wg_id=wg.id))
        db.session.commit()
    return jsonify({'wg': wg_to_dict(wg)})


@api.route('/wg/info', methods=['GET'])
@jwt_required()
def api_wg_info():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    return jsonify({'wg': wg_to_dict(wg), 'members': [user_to_dict(m) for m in wg.get_members()]})


# ──────────────────────────────────────────────
#  API — DASHBOARD
# ──────────────────────────────────────────────
@api.route('/dashboard', methods=['GET'])
@jwt_required()
def api_dashboard():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    open_tasks     = CleaningTask.query.filter_by(wg_id=wg.id, completed=False).count()
    shopping_count = ShoppingItem.query.filter_by(wg_id=wg.id, completed=False).count()
    my_tasks       = CleaningTask.query.filter_by(wg_id=wg.id, assigned_to=uid, completed=False).all()
    debts          = calculate_debts(wg)
    return jsonify({
        'wg':            wg_to_dict(wg),
        'members':       [user_to_dict(m) for m in wg.get_members()],
        'open_tasks':    open_tasks,
        'shopping_count': shopping_count,
        'my_tasks':      [task_to_dict(t) for t in my_tasks],
        'my_debts':      [debt_to_dict(d) for d in debts if d['from_user'].id == uid],
        'owed_to_me':    [debt_to_dict(d) for d in debts if d['to_user'].id == uid],
    })


# ──────────────────────────────────────────────
#  API — TASKS
# ──────────────────────────────────────────────
@api.route('/tasks', methods=['GET'])
@jwt_required()
def api_tasks():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    open_t = CleaningTask.query.filter_by(wg_id=wg.id, completed=False).order_by(CleaningTask.due_date).all()
    done_t = CleaningTask.query.filter_by(wg_id=wg.id, completed=True).order_by(CleaningTask.completed_at.desc()).limit(15).all()
    return jsonify({
        'open_tasks': [task_to_dict(t) for t in open_t],
        'done_tasks':  [task_to_dict(t) for t in done_t],
        'members':     [user_to_dict(m) for m in wg.get_members()],
    })


@api.route('/tasks', methods=['POST'])
@jwt_required()
def api_add_task():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data        = request.get_json() or {}
    title       = data.get('title', '').strip()
    description = data.get('description', '').strip()
    assigned_to = data.get('assigned_to')
    recurrence  = data.get('recurrence', 'none')
    due_str     = data.get('due_date', '')
    if not title:
        return jsonify({'error': 'Titel erforderlich.'}), 400
    if recurrence not in VALID_RECURRENCE:
        recurrence = 'none'
    due_date = None
    if due_str:
        try: due_date = datetime.strptime(due_str, '%Y-%m-%d').date()
        except: pass
    # A recurring chore needs a due date to anchor its schedule; default to today.
    if recurrence != 'none' and not due_date:
        due_date = datetime.utcnow().date()
    task = CleaningTask(wg_id=wg.id, title=title, description=description,
                        assigned_to=assigned_to or None, due_date=due_date,
                        recurrence=recurrence)
    db.session.add(task)
    db.session.commit()
    return jsonify({'task': task_to_dict(task)}), 201


@api.route('/tasks/<int:tid>/toggle', methods=['POST'])
@jwt_required()
def api_toggle_task(tid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    task = db.session.get(CleaningTask, tid)
    if not wg or not task or task.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    task.completed    = not task.completed
    task.completed_at = datetime.utcnow() if task.completed else None

    spawned = None
    # Completing a recurring chore spawns the next occurrence: due date advanced
    # by the interval, assigned to the next roommate in rotation.
    if task.completed and task.recurrence and task.recurrence != 'none':
        already_spawned = CleaningTask.query.filter_by(
            wg_id=wg.id, title=task.title, recurrence=task.recurrence, completed=False
        ).first()
        if not already_spawned:
            spawned = CleaningTask(
                wg_id=wg.id, title=task.title, description=task.description,
                recurrence=task.recurrence,
                due_date=advance_due_date(task.due_date, task.recurrence),
                assigned_to=next_assignee(wg, task.assigned_to)
            )
            db.session.add(spawned)

    db.session.commit()
    result = {'task': task_to_dict(task)}
    if spawned is not None:
        result['spawned_task'] = task_to_dict(spawned)
    return jsonify(result)


@api.route('/tasks/<int:tid>', methods=['DELETE'])
@jwt_required()
def api_delete_task(tid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    task = db.session.get(CleaningTask, tid)
    if not wg or not task or task.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})


@api.route('/tasks/rotate', methods=['POST'])
@jwt_required()
def api_rotate_tasks():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    members = wg.get_members()
    if len(members) < 2:
        return jsonify({'error': 'Mindestens 2 Mitglieder benötigt.'}), 400
    open_t = CleaningTask.query.filter_by(wg_id=wg.id, completed=False).all()
    random.shuffle(members)
    for i, t in enumerate(open_t):
        t.assigned_to = members[i % len(members)].id
    db.session.commit()
    updated = CleaningTask.query.filter_by(wg_id=wg.id, completed=False).all()
    return jsonify({'open_tasks': [task_to_dict(t) for t in updated]})


# ──────────────────────────────────────────────
#  API — SHOPPING
# ──────────────────────────────────────────────
@api.route('/shopping', methods=['GET'])
@jwt_required()
def api_shopping():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    pending = ShoppingItem.query.filter_by(wg_id=wg.id, completed=False).order_by(ShoppingItem.created_at).all()
    done    = ShoppingItem.query.filter_by(wg_id=wg.id, completed=True).order_by(ShoppingItem.created_at.desc()).limit(30).all()
    return jsonify({'pending': [shopping_to_dict(i) for i in pending], 'done': [shopping_to_dict(i) for i in done]})


@api.route('/shopping', methods=['POST'])
@jwt_required()
def api_add_shopping():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data     = request.get_json() or {}
    name     = data.get('name', '').strip()
    quantity = data.get('quantity', '').strip()
    if not name:
        return jsonify({'error': 'Artikelname erforderlich.'}), 400
    item = ShoppingItem(wg_id=wg.id, name=name, quantity=quantity, added_by=uid)
    db.session.add(item)
    db.session.commit()
    return jsonify({'item': shopping_to_dict(item)}), 201


@api.route('/shopping/<int:iid>/toggle', methods=['POST'])
@jwt_required()
def api_toggle_shopping(iid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    item = db.session.get(ShoppingItem, iid)
    if not wg or not item or item.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    item.completed = not item.completed
    db.session.commit()
    return jsonify({'item': shopping_to_dict(item)})


@api.route('/shopping/<int:iid>', methods=['DELETE'])
@jwt_required()
def api_delete_shopping(iid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    item = db.session.get(ShoppingItem, iid)
    if not wg or not item or item.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'success': True})


@api.route('/shopping/clear-done', methods=['DELETE'])
@jwt_required()
def api_clear_done_shopping():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    ShoppingItem.query.filter_by(wg_id=wg.id, completed=True).delete()
    db.session.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
#  API — FINANCE
# ──────────────────────────────────────────────
@api.route('/finance', methods=['GET'])
@jwt_required()
def api_finance():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    materialize_recurring(wg)
    expenses = Expense.query.filter_by(wg_id=wg.id).order_by(Expense.created_at.desc()).all()
    debts    = calculate_debts(wg)
    balances = calculate_net_balances(wg)
    member_map = {m.id: m for m in wg.get_members()}
    settlements = [
        {
            'from_user': user_to_dict(member_map[s['from_id']]),
            'to_user':   user_to_dict(member_map[s['to_id']]),
            'amount':    round(s['cents'] / 100.0, 2),
        }
        for s in simplify_settlements(balances)
        if s['from_id'] in member_map and s['to_id'] in member_map
    ]
    return jsonify({
        'expenses': [expense_to_dict(e) for e in expenses],
        'debts':    [debt_to_dict(d) for d in debts],
        'settlements': settlements,
        'balances': [
            {'user': user_to_dict(member_map[mid]), 'amount': round(cents / 100.0, 2)}
            for mid, cents in balances.items() if mid in member_map
        ],
        'my_balance': round(balances.get(int(uid), 0) / 100.0, 2),
        'settlement_history': [
            settlement_payment_to_dict(p) for p in
            SettlementPayment.query.filter_by(wg_id=wg.id)
                .order_by(SettlementPayment.created_at.desc()).limit(20).all()
        ],
        'recurring': [
            recurring_to_dict(r) for r in
            RecurringExpense.query.filter_by(wg_id=wg.id)
                .order_by(RecurringExpense.next_due).all()
        ],
        'month': _month_stats(wg, expenses),
        'total':    sum(e.amount for e in expenses),
        'members':  [user_to_dict(m) for m in wg.get_members()],
    })


def _month_stats(wg, expenses):
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    prev_year, prev_month = (now.year - 1, 12) if now.month == 1 else (now.year, now.month - 1)
    prev_start = datetime(prev_year, prev_month, 1)

    month_total = 0.0
    prev_total = 0.0
    by_category = {}
    for e in expenses:
        if e.created_at >= month_start:
            month_total += e.amount
            cat = e.category or 'other'
            by_category[cat] = by_category.get(cat, 0.0) + e.amount
        elif prev_start <= e.created_at < month_start:
            prev_total += e.amount

    return {
        'total': round(month_total, 2),
        'prev_total': round(prev_total, 2),
        'by_category': sorted(
            [{'category': c, 'amount': round(a, 2)} for c, a in by_category.items()],
            key=lambda x: x['amount'], reverse=True
        ),
        'budget': wg.monthly_budget,
    }


@api.route('/finance/budget', methods=['POST'])
@jwt_required()
def api_set_budget():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg() if user else None
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    raw = data.get('amount')
    if raw in (None, '', 0, '0'):
        wg.monthly_budget = None
    else:
        try:
            amount = float(str(raw).replace(',', '.'))
            if amount <= 0: raise ValueError
        except ValueError:
            return jsonify({'error': 'Ungültiger Betrag.'}), 400
        wg.monthly_budget = round(amount, 2)
    db.session.commit()
    return jsonify({'budget': wg.monthly_budget})


@api.route('/finance/export.csv', methods=['GET'])
@jwt_required()
def api_finance_export():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg() if user else None
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    import csv as _csv
    import io as _io
    buf = _io.StringIO()
    writer = _csv.writer(buf)
    writer.writerow(['date', 'title', 'category', 'amount', 'paid_by', 'split_method', 'participants'])
    expenses = Expense.query.filter_by(wg_id=wg.id).order_by(Expense.created_at.desc()).all()
    for e in expenses:
        participants = '; '.join(
            f"{s.user.username}={s.amount:.2f}" for s in e.splits if s.user is not None
        )
        writer.writerow([
            e.created_at.date().isoformat(), e.title, e.category or 'other',
            f'{e.amount:.2f}', e.paid_by_user.username if e.paid_by_user else '',
            e.split_method or 'equal', participants,
        ])
    response = app.response_class(buf.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=zofri-ausgaben.csv'
    return response


@api.route('/finance/remind', methods=['POST'])
@jwt_required()
def api_finance_remind():
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    wg   = user.get_wg() if user else None
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    to_id = data.get('to_user')
    amount_str = str(data.get('amount', '')).replace(',', '.')
    try:
        amount = float(amount_str)
        if amount <= 0: raise ValueError
    except ValueError:
        return jsonify({'error': 'Ungültiger Betrag.'}), 400
    member_ids = {m.id for m in wg.get_members()}
    if to_id not in member_ids or to_id == uid:
        return jsonify({'error': 'Ungültiger Empfänger.'}), 400
    # Friendly, not naggy: at most one reminder per debtor per day.
    since = datetime.utcnow() - timedelta(days=1)
    recent = AppNotification.query.filter(
        AppNotification.wg_id == wg.id,
        AppNotification.user_id == to_id,
        AppNotification.target == 'finance-reminder',
        AppNotification.created_at > since,
    ).first()
    if recent:
        return jsonify({'error': 'Heute wurde schon erinnert.'}), 429
    notification = AppNotification(
        wg_id=wg.id, user_id=to_id, target='finance-reminder',
        title='Zahlungserinnerung',
        body=f'{user.username} bittet dich, {amount:.2f} € auszugleichen.'
    )
    db.session.add(notification)
    db.session.commit()
    return jsonify({'success': True}), 201


@api.route('/finance/recurring', methods=['POST'])
@jwt_required()
def api_add_recurring():
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    wg   = user.get_wg() if user else None
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data       = request.get_json() or {}
    title      = data.get('title', '').strip()
    amount_str = str(data.get('amount', '')).replace(',', '.')
    category   = data.get('category', 'other')
    interval   = data.get('interval', 'monthly')
    due_str    = data.get('next_due', '')
    if not title or not amount_str:
        return jsonify({'error': 'Alle Felder erforderlich.'}), 400
    try:
        amount = float(amount_str)
        if amount <= 0: raise ValueError
    except ValueError:
        return jsonify({'error': 'Ungültiger Betrag.'}), 400
    if category not in EXPENSE_CATEGORIES:
        category = 'other'
    if interval not in RECURRING_INTERVALS:
        interval = 'monthly'
    next_due = datetime.utcnow().date()
    if due_str:
        try: next_due = datetime.strptime(due_str, '%Y-%m-%d').date()
        except ValueError: pass
    recurring = RecurringExpense(wg_id=wg.id, title=title, amount=round(amount, 2),
                                 category=category, paid_by=uid,
                                 interval=interval, next_due=next_due)
    db.session.add(recurring)
    db.session.commit()
    return jsonify({'recurring': recurring_to_dict(recurring)}), 201


@api.route('/finance/recurring/<int:rid>/toggle', methods=['POST'])
@jwt_required()
def api_toggle_recurring(rid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg() if user else None
    recurring = db.session.get(RecurringExpense, rid)
    if not wg or not recurring or recurring.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    recurring.active = not recurring.active
    db.session.commit()
    return jsonify({'recurring': recurring_to_dict(recurring)})


@api.route('/finance/recurring/<int:rid>', methods=['DELETE'])
@jwt_required()
def api_delete_recurring(rid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg() if user else None
    recurring = db.session.get(RecurringExpense, rid)
    if not wg or not recurring or recurring.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(recurring)
    db.session.commit()
    return jsonify({'success': True})


@api.route('/finance/settle', methods=['POST'])
@jwt_required()
def api_settle():
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    wg   = user.get_wg() if user else None
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    from_id = data.get('from_user', uid)
    to_id   = data.get('to_user')
    amount_str = str(data.get('amount', '')).replace(',', '.')
    try:
        amount = float(amount_str)
        if amount <= 0: raise ValueError
    except ValueError:
        return jsonify({'error': 'Ungültiger Betrag.'}), 400
    member_ids = {m.id for m in wg.get_members()}
    if from_id not in member_ids or to_id not in member_ids or from_id == to_id:
        return jsonify({'error': 'Ungültige Teilnehmer.'}), 400
    payment = SettlementPayment(wg_id=wg.id, from_user_id=from_id,
                                to_user_id=to_id, amount=round(amount, 2))
    db.session.add(payment)
    db.session.commit()
    return jsonify({'payment': settlement_payment_to_dict(payment)}), 201


@api.route('/finance', methods=['POST'])
@jwt_required()
def api_add_expense():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data       = request.get_json() or {}
    title      = data.get('title', '').strip()
    amount_str = str(data.get('amount', '')).replace(',', '.')
    paid_by_id = data.get('paid_by', uid)
    category   = data.get('category', 'other')
    method     = data.get('split_method', 'equal')
    if not title or not amount_str:
        return jsonify({'error': 'Alle Felder erforderlich.'}), 400
    try:
        amount = float(amount_str)
        if amount <= 0: raise ValueError
    except ValueError:
        return jsonify({'error': 'Ungültiger Betrag.'}), 400
    if category not in EXPENSE_CATEGORIES:
        category = 'other'
    if method not in SPLIT_METHODS:
        method = 'equal'

    member_ids = {m.id for m in wg.get_members()}
    if paid_by_id not in member_ids:
        paid_by_id = int(uid)

    # Participants: explicit list, or everyone for a plain equal split.
    participants = data.get('participants')
    if not participants:
        participants = [{'user_id': mid, 'value': 0} for mid in member_ids]
    # Guard: every participant must be a member of this WG.
    for p in participants:
        if p.get('user_id') not in member_ids:
            return jsonify({'error': 'Unbekannter Teilnehmer.'}), 400

    total_cents = int(round(amount * 100))
    try:
        cents = compute_splits(total_cents, method, participants)
    except (ValueError, KeyError, TypeError) as exc:
        return jsonify({'error': str(exc) or 'Ungültige Aufteilung.'}), 400

    expense = Expense(wg_id=wg.id, title=title, amount=amount, paid_by=paid_by_id,
                      category=category, split_method=method)
    db.session.add(expense)
    db.session.flush()
    for user_id, c in cents.items():
        db.session.add(ExpenseSplit(expense_id=expense.id, user_id=user_id, amount=c / 100.0))
    db.session.commit()
    return jsonify({'expense': expense_to_dict(expense)}), 201


@api.route('/finance/<int:eid>', methods=['DELETE'])
@jwt_required()
def api_delete_expense(eid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    expense = db.session.get(Expense, eid)
    if not wg or not expense or expense.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(expense)
    db.session.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
#  API — FEED
# ──────────────────────────────────────────────
@api.route('/feed', methods=['GET'])
@jwt_required()
def api_feed():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    posts = FeedPost.query.filter_by(wg_id=wg.id).order_by(FeedPost.created_at.desc()).limit(50).all()
    return jsonify({'posts': [post_to_dict(p) for p in posts]})


@api.route('/feed', methods=['POST'])
@jwt_required()
def api_feed_post():
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    content   = request.form.get('content', '').strip()
    file      = request.files.get('file')
    file_name = None
    file_type = None
    if file and file.filename:
        fname = secure_filename(file.filename)
        ext   = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
        if allowed_file(fname, ALLOWED_IMAGE):
            file_type = 'image'
        elif allowed_file(fname, ALLOWED_AUDIO):
            file_type = 'audio'
        else:
            return jsonify({'error': 'Ungültiger Dateityp.'}), 400
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_name))
        file_name = unique_name
    if not content and not file_name:
        return jsonify({'error': 'Text oder Datei erforderlich.'}), 400
    post = FeedPost(wg_id=wg.id, user_id=uid, content=content,
                    file_name=file_name, file_type=file_type)
    db.session.add(post)
    db.session.commit()
    return jsonify({'post': post_to_dict(post)}), 201


@api.route('/feed/<int:pid>', methods=['DELETE'])
@jwt_required()
def api_delete_feed_post(pid):
    uid  = get_jwt_identity()
    user = db.session.get(User, uid)
    wg   = user.get_wg()
    post = db.session.get(FeedPost, pid)
    if not wg or not post or post.wg_id != wg.id or post.user_id != uid:
        return jsonify({'error': 'Nicht gefunden oder nicht autorisiert.'}), 404
    if post.file_name:
        try: os.remove(os.path.join(app.config['UPLOAD_FOLDER'], post.file_name))
        except OSError: pass
    db.session.delete(post)
    db.session.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
#  API — RECEIPT OCR
# ──────────────────────────────────────────────
@api.route('/receipts/ocr', methods=['POST'])
@jwt_required()
def api_receipt_ocr():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({'error': 'Bild erforderlich.'}), 400
    fname = secure_filename(file.filename)
    if not allowed_file(fname, ALLOWED_IMAGE):
        return jsonify({'error': 'Nur Bilddateien sind erlaubt.'}), 400

    raw_text = ''
    ocr_status = 'manual_review_required'
    try:
        from PIL import Image
        import pytesseract
        image = Image.open(file.stream)
        raw_text = pytesseract.image_to_string(image, lang='deu+eng')
        ocr_status = 'ocr_completed' if raw_text.strip() else 'no_text_detected'
    except Exception:
        raw_text = ''
        ocr_status = 'ocr_unavailable'

    receipt = parse_receipt_text(raw_text)
    return jsonify({
        'status': ocr_status,
        'needs_review': True,
        'message': 'Bitte OCR-Ergebnis prüfen und korrigieren, bevor eine Ausgabe erstellt wird.',
        'receipt': receipt,
    })


# ──────────────────────────────────────────────
#  API — CALENDAR
# ──────────────────────────────────────────────
@api.route('/calendar-events', methods=['GET'])
@jwt_required()
def api_calendar_events():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    events = CalendarEvent.query.filter_by(wg_id=wg.id).order_by(CalendarEvent.starts_at).limit(100).all()
    return jsonify({'events': [calendar_event_to_dict(e) for e in events]})


@api.route('/calendar-events', methods=['POST'])
@jwt_required()
def api_add_calendar_event():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    starts_at_raw = data.get('starts_at', '').strip()
    if not title:
        return jsonify({'error': 'Titel erforderlich.'}), 400
    try:
        starts_at = datetime.fromisoformat(starts_at_raw) if starts_at_raw else datetime.utcnow()
    except ValueError:
        return jsonify({'error': 'Ungültiges Datum.'}), 400
    event = CalendarEvent(
        wg_id=wg.id,
        title=title,
        event_type=data.get('event_type', 'other').strip() or 'other',
        starts_at=starts_at,
        notes=data.get('notes', '').strip(),
        created_by=uid,
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({'event': calendar_event_to_dict(event)}), 201


@api.route('/calendar-events/<int:eid>', methods=['DELETE'])
@jwt_required()
def api_delete_calendar_event(eid):
    uid, user, wg = current_api_user_and_wg()
    event = db.session.get(CalendarEvent, eid)
    if not wg or not event or event.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(event)
    db.session.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
#  API — RULES
# ──────────────────────────────────────────────
@api.route('/rules', methods=['GET'])
@jwt_required()
def api_rules():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    rules = HouseholdRule.query.filter_by(wg_id=wg.id, active=True).order_by(HouseholdRule.created_at.desc()).all()
    return jsonify({'rules': [rule_to_dict(r) for r in rules]})


@api.route('/rules', methods=['POST'])
@jwt_required()
def api_add_rule():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Titel erforderlich.'}), 400
    rule = HouseholdRule(
        wg_id=wg.id,
        title=title,
        content=data.get('content', '').strip(),
        category=data.get('category', 'general').strip() or 'general',
        created_by=uid,
    )
    db.session.add(rule)
    db.session.commit()
    return jsonify({'rule': rule_to_dict(rule)}), 201


@api.route('/rules/<int:rid>', methods=['DELETE'])
@jwt_required()
def api_archive_rule(rid):
    uid, user, wg = current_api_user_and_wg()
    rule = db.session.get(HouseholdRule, rid)
    if not wg or not rule or rule.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    rule.active = False
    db.session.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
#  API — POLLS
# ──────────────────────────────────────────────
@api.route('/polls', methods=['GET'])
@jwt_required()
def api_polls():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    polls = Poll.query.filter_by(wg_id=wg.id).order_by(Poll.created_at.desc()).all()
    return jsonify({'polls': [poll_to_dict(p) for p in polls]})


@api.route('/polls', methods=['POST'])
@jwt_required()
def api_add_poll():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    options = [o.strip() for o in data.get('options', []) if str(o).strip()]
    if not title or len(options) < 2:
        return jsonify({'error': 'Titel und mindestens zwei Optionen erforderlich.'}), 400
    poll = Poll(wg_id=wg.id, title=title, description=data.get('description', '').strip(), created_by=uid)
    db.session.add(poll)
    db.session.flush()
    for option in options[:8]:
        db.session.add(PollOption(poll_id=poll.id, text=option))
    db.session.commit()
    return jsonify({'poll': poll_to_dict(poll)}), 201


@api.route('/polls/<int:poll_id>/vote', methods=['POST'])
@jwt_required()
def api_vote_poll(poll_id):
    uid, user, wg = current_api_user_and_wg()
    poll = db.session.get(Poll, poll_id)
    if not wg or not poll or poll.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    data = request.get_json() or {}
    option_id = data.get('option_id')
    option = db.session.get(PollOption, option_id)
    if not option or option.poll_id != poll.id:
        return jsonify({'error': 'Ungültige Option.'}), 400
    PollVote.query.filter_by(poll_id=poll.id, user_id=uid).delete()
    db.session.add(PollVote(poll_id=poll.id, option_id=option.id, user_id=uid))
    db.session.commit()
    return jsonify({'poll': poll_to_dict(poll)})


# ──────────────────────────────────────────────
#  API — MOOD CHECKS
# ──────────────────────────────────────────────
@api.route('/mood-checks', methods=['GET'])
@jwt_required()
def api_mood_checks():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    responses = MoodCheckResponse.query.filter_by(wg_id=wg.id).order_by(MoodCheckResponse.created_at.desc()).limit(30).all()
    count = len(responses)
    def avg(attr):
        return round(sum(getattr(r, attr) for r in responses) / count, 1) if count else None
    summary = {
        'count': count,
        'wellbeing': avg('wellbeing'),
        'fairness': avg('fairness'),
        'cleanliness': avg('cleanliness'),
        'communication': avg('communication'),
        'visible': count >= 2,
    }
    return jsonify({'summary': summary})


@api.route('/mood-checks', methods=['POST'])
@jwt_required()
def api_add_mood_check():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    def score(name):
        value = int(data.get(name, 3))
        return max(1, min(5, value))
    response = MoodCheckResponse(
        wg_id=wg.id,
        user_id=uid,
        wellbeing=score('wellbeing'),
        fairness=score('fairness'),
        cleanliness=score('cleanliness'),
        communication=score('communication'),
        comment=data.get('comment', '').strip(),
        anonymous=bool(data.get('anonymous', True)),
    )
    db.session.add(response)
    db.session.commit()
    return jsonify({'success': True}), 201


# ──────────────────────────────────────────────
#  API — CONFLICTS
# ──────────────────────────────────────────────
@api.route('/conflicts', methods=['GET'])
@jwt_required()
def api_conflicts():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    conflicts = ConflictReport.query.filter_by(wg_id=wg.id).order_by(ConflictReport.created_at.desc()).limit(50).all()
    return jsonify({'conflicts': [conflict_to_dict(c) for c in conflicts]})


@api.route('/conflicts', methods=['POST'])
@jwt_required()
def api_add_conflict():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data = request.get_json() or {}
    description = data.get('description', '').strip()
    if not description:
        return jsonify({'error': 'Beschreibung erforderlich.'}), 400
    conflict = ConflictReport(
        wg_id=wg.id,
        user_id=uid,
        category=data.get('category', 'communication').strip() or 'communication',
        urgency=data.get('urgency', 'normal').strip() or 'normal',
        description=description,
        desired_solution=data.get('desired_solution', '').strip(),
        anonymous=bool(data.get('anonymous', False)),
    )
    db.session.add(conflict)
    db.session.commit()
    return jsonify({'conflict': conflict_to_dict(conflict)}), 201


# ──────────────────────────────────────────────
#  API — NOTIFICATIONS
# ──────────────────────────────────────────────
@api.route('/notifications', methods=['GET'])
@jwt_required()
def api_notifications():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    notifications = AppNotification.query.filter(
        AppNotification.wg_id == wg.id,
        db.or_(AppNotification.user_id == None, AppNotification.user_id == uid)
    ).order_by(AppNotification.created_at.desc()).limit(50).all()
    return jsonify({'notifications': [notification_to_dict(n) for n in notifications]})


@api.route('/notifications/<int:nid>/read', methods=['POST'])
@jwt_required()
def api_read_notification(nid):
    uid, user, wg = current_api_user_and_wg()
    notification = db.session.get(AppNotification, nid)
    if not wg or not notification or notification.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    notification.read = True
    db.session.commit()
    return jsonify({'notification': notification_to_dict(notification)})


# ──────────────────────────────────────────────
#  API — TRUST PROFILE
# ──────────────────────────────────────────────
@api.route('/trust-profile', methods=['GET'])
@jwt_required()
def api_trust_profile():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    completed = CleaningTask.query.filter_by(wg_id=wg.id, assigned_to=uid, completed=True).count()
    open_tasks = CleaningTask.query.filter_by(wg_id=wg.id, assigned_to=uid, completed=False).count()
    paid = Expense.query.filter_by(wg_id=wg.id, paid_by=uid).count()
    events = TrustEvent.query.filter_by(wg_id=wg.id, user_id=uid).order_by(TrustEvent.created_at.desc()).limit(20).all()
    verified_count = completed + paid + len(events)
    enough_data = verified_count >= 10
    task_score = min(400, completed * 40)
    payment_score = min(350, paid * 35)
    event_score = sum(e.points for e in events)
    score = min(1000, task_score + payment_score + max(0, event_score))
    level = 'noch nicht genügend Daten'
    if enough_data and score >= 800:
        level = 'sehr zuverlässig'
    elif enough_data and score >= 600:
        level = 'zuverlässig'
    elif enough_data:
        level = 'Grundlagen vorhanden'
    return jsonify({
        'score': score if enough_data else None,
        'max_score': 1000,
        'level': level,
        'enough_data': enough_data,
        'verified_events': verified_count,
        'task_reliability': completed,
        'open_tasks': open_tasks,
        'payment_reliability': paid,
        'events': [trust_event_to_dict(e) for e in events],
    })


# ──────────────────────────────────────────────
#  API — MOVE-IN / MOVE-OUT CHECKLISTS
# ──────────────────────────────────────────────
def checklist_to_dict(c):
    items = sorted(c.items, key=lambda i: (i.position, i.id))
    done = sum(1 for i in items if i.done)
    return {
        'id': c.id, 'kind': c.kind, 'title': c.title,
        'created_at': c.created_at.isoformat(),
        'done_count': done, 'total_count': len(items),
        'items': [
            {'id': i.id, 'text_key': i.text_key, 'text': i.text, 'done': i.done}
            for i in items
        ],
    }


@api.route('/checklists', methods=['GET'])
@jwt_required()
def api_checklists():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    lists = MoveChecklist.query.filter_by(wg_id=wg.id).order_by(MoveChecklist.created_at.desc()).all()
    return jsonify({'checklists': [checklist_to_dict(c) for c in lists]})


@api.route('/checklists', methods=['POST'])
@jwt_required()
def api_add_checklist():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    data  = request.get_json() or {}
    kind  = data.get('kind', 'move_in')
    if kind not in CHECKLIST_TEMPLATES:
        return jsonify({'error': 'Ungültiger Typ.'}), 400
    # Empty title = "use the localized default"; the client fills it from `kind`.
    title = (data.get('title') or '').strip()
    checklist = MoveChecklist(wg_id=wg.id, kind=kind, title=title, created_by=uid)
    db.session.add(checklist)
    db.session.flush()
    for pos, (key, fallback) in enumerate(CHECKLIST_TEMPLATES[kind]):
        db.session.add(ChecklistItem(checklist_id=checklist.id, text_key=key,
                                     text=fallback, position=pos))
    db.session.commit()
    return jsonify({'checklist': checklist_to_dict(checklist)}), 201


@api.route('/checklists/<int:cid>/items', methods=['POST'])
@jwt_required()
def api_add_checklist_item(cid):
    uid, user, wg = current_api_user_and_wg()
    checklist = db.session.get(MoveChecklist, cid)
    if not wg or not checklist or checklist.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    text = (request.get_json() or {}).get('text', '').strip()
    if not text:
        return jsonify({'error': 'Text erforderlich.'}), 400
    pos = 1 + max([i.position for i in checklist.items], default=-1)
    item = ChecklistItem(checklist_id=cid, text=text, text_key=None, position=pos)
    db.session.add(item)
    db.session.commit()
    return jsonify({'checklist': checklist_to_dict(checklist)}), 201


@api.route('/checklists/items/<int:iid>/toggle', methods=['POST'])
@jwt_required()
def api_toggle_checklist_item(iid):
    uid, user, wg = current_api_user_and_wg()
    item = db.session.get(ChecklistItem, iid)
    checklist = db.session.get(MoveChecklist, item.checklist_id) if item else None
    if not wg or not item or not checklist or checklist.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    item.done = not item.done
    db.session.commit()
    return jsonify({'checklist': checklist_to_dict(checklist)})


@api.route('/checklists/items/<int:iid>', methods=['DELETE'])
@jwt_required()
def api_delete_checklist_item(iid):
    uid, user, wg = current_api_user_and_wg()
    item = db.session.get(ChecklistItem, iid)
    checklist = db.session.get(MoveChecklist, item.checklist_id) if item else None
    if not wg or not item or not checklist or checklist.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'checklist': checklist_to_dict(checklist)})


@api.route('/checklists/<int:cid>', methods=['DELETE'])
@jwt_required()
def api_delete_checklist(cid):
    uid, user, wg = current_api_user_and_wg()
    checklist = db.session.get(MoveChecklist, cid)
    if not wg or not checklist or checklist.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(checklist)
    db.session.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
#  API — DOCUMENTS
# ──────────────────────────────────────────────
def document_to_dict(d):
    return {
        'id': d.id, 'title': d.title, 'category': d.category or 'other',
        'file_url': d.file_url, 'file_type': d.file_type or 'file',
        'uploaded_by': user_to_dict(d.uploader) if d.uploader else None,
        'created_at': d.created_at.isoformat(),
    }


@api.route('/documents', methods=['GET'])
@jwt_required()
def api_documents():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    docs = Document.query.filter_by(wg_id=wg.id).order_by(Document.created_at.desc()).all()
    return jsonify({
        'documents': [document_to_dict(d) for d in docs],
        'storage_ready': STORAGE_READY,
    })


@api.route('/documents', methods=['POST'])
@jwt_required()
def api_add_document():
    uid, user, wg = current_api_user_and_wg()
    if not wg:
        return jsonify({'error': 'Keine WG.'}), 404
    title    = (request.form.get('title') or '').strip()
    category = request.form.get('category', 'other')
    file     = request.files.get('file')
    if not title:
        return jsonify({'error': 'Titel erforderlich.'}), 400
    if not file or not file.filename:
        return jsonify({'error': 'Datei erforderlich.'}), 400
    if not allowed_file(file.filename, ALLOWED_DOC):
        return jsonify({'error': 'Dateityp nicht erlaubt (PDF, Bild oder Word).'}), 400
    if category not in DOCUMENT_CATEGORIES:
        category = 'other'
    try:
        url, kind = store_file(file, f'wg-{wg.id}/documents')
    except Exception:
        return jsonify({'error': 'Upload fehlgeschlagen.'}), 502
    doc = Document(wg_id=wg.id, title=title, category=category,
                   file_url=url, file_type=kind, uploaded_by=uid)
    db.session.add(doc)
    db.session.commit()
    return jsonify({'document': document_to_dict(doc)}), 201


@api.route('/documents/<int:did>', methods=['DELETE'])
@jwt_required()
def api_delete_document(did):
    uid, user, wg = current_api_user_and_wg()
    doc = db.session.get(Document, did)
    if not wg or not doc or doc.wg_id != wg.id:
        return jsonify({'error': 'Nicht gefunden.'}), 404
    db.session.delete(doc)
    db.session.commit()
    return jsonify({'success': True})


app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(api, url_prefix='/api/v1', name='api_v1')


def ensure_schema():
    # Lightweight, idempotent column adds for existing databases (no Alembic).
    # db.create_all() only creates missing tables, never new columns.
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    if 'cleaning_tasks' not in inspector.get_table_names():
        return
    columns = {c['name'] for c in inspector.get_columns('cleaning_tasks')}
    if 'recurrence' not in columns:
        with db.engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE cleaning_tasks ADD COLUMN recurrence VARCHAR(10) DEFAULT 'none'"
            ))

    if 'expenses' in inspector.get_table_names():
        ecols = {c['name'] for c in inspector.get_columns('expenses')}
        with db.engine.begin() as conn:
            if 'category' not in ecols:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN category VARCHAR(30) DEFAULT 'other'"))
            if 'split_method' not in ecols:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN split_method VARCHAR(12) DEFAULT 'equal'"))
            if 'recurring_id' not in ecols:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN recurring_id INTEGER"))

    if 'wgs' in inspector.get_table_names():
        wcols = {c['name'] for c in inspector.get_columns('wgs')}
        if 'monthly_budget' not in wcols:
            with db.engine.begin() as conn:
                conn.execute(text("ALTER TABLE wgs ADD COLUMN monthly_budget FLOAT"))


def initialize_database():
    with app.app_context():
        db.create_all()
        ensure_schema()


initialize_database()

# ──────────────────────────────────────────────
#  ENTRY POINT
# ──────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5001'))
    try:
        app.run(debug=True, port=port)
    except OSError as e:
        print(f'Port {port} unavailable ({e}), trying 5002')
        app.run(debug=True, port=5002)
