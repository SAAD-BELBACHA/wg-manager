from flask import Flask, render_template, redirect, url_for, request, flash, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from urllib.parse import urlparse
from datetime import datetime
import random
import string
import os
import uuid

# ──────────────────────────────────────────────
#  APP SETUP
# ──────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'wg-super-secret-2024')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///wg_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB

ALLOWED_IMAGE = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_AUDIO = {'mp3', 'ogg', 'wav', 'webm', 'm4a', 'aac'}

def allowed_file(filename, allowed_set):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_set

db = SQLAlchemy(app)
csrf = CSRFProtect(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Bitte melde dich an.'
login_manager.login_message_category = 'warning'


# ──────────────────────────────────────────────
#  MODELS
# ──────────────────────────────────────────────
class User(UserMixin, db.Model):
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
    id         = db.Column(db.Integer, primary_key=True)
    wg_id      = db.Column(db.Integer, db.ForeignKey('wgs.id'),   nullable=False)
    title      = db.Column(db.String(100), nullable=False)
    amount     = db.Column(db.Float,       nullable=False)
    paid_by    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_by_user = db.relationship('User', foreign_keys=[paid_by])
    splits = db.relationship('ExpenseSplit', backref='expense', lazy=True,
                             cascade='all, delete-orphan')


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


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────
AVATAR_COLORS = [
    '#6366f1','#8b5cf6','#ec4899','#f43f5e',
    '#f97316','#22c55e','#14b8a6','#0ea5e9',
]

@login_manager.user_loader
def load_user(uid):
    return db.session.get(User, int(uid))


def gen_invite_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not WG.query.filter_by(invite_code=code).first():
            return code


def calculate_debts(wg):
    """Return list of {from_user, to_user, amount} dicts."""
    members = wg.get_members()
    member_map = {m.id: m for m in members}
    debts = {}  # (from_id, to_id) -> amount

    for expense in wg.expenses:
        paid_id = expense.paid_by
        for split in expense.splits:
            if split.user_id == paid_id:
                continue
            key     = (split.user_id, paid_id)
            rev_key = (paid_id, split.user_id)
            if key in debts:
                debts[key] += split.amount
            elif rev_key in debts:
                debts[rev_key] -= split.amount
                if debts[rev_key] < 0:
                    debts[key] = -debts[rev_key]
                    del debts[rev_key]
            else:
                debts[key] = split.amount

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


def _safe_next(next_url):
    """Return next_url only if it's a safe local path."""
    if not next_url:
        return None
    parsed = urlparse(next_url)
    if parsed.netloc or not next_url.startswith('/'):
        return None
    return next_url


# ──────────────────────────────────────────────
#  AUTH ROUTES
# ──────────────────────────────────────────────
@app.route('/')
def index():
    return redirect(url_for('dashboard') if current_user.is_authenticated else url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm_password', '')

        if not all([username, email, password]):
            flash('Alle Felder sind erforderlich.', 'danger'); return render_template('register.html')
        if password != confirm:
            flash('Passwörter stimmen nicht überein.', 'danger'); return render_template('register.html')
        if len(password) < 6:
            flash('Passwort muss mindestens 6 Zeichen lang sein.', 'danger'); return render_template('register.html')
        if User.query.filter_by(username=username).first():
            flash('Benutzername bereits vergeben.', 'danger'); return render_template('register.html')
        if User.query.filter_by(email=email).first():
            flash('E-Mail bereits registriert.', 'danger'); return render_template('register.html')

        color = AVATAR_COLORS[User.query.count() % len(AVATAR_COLORS)]
        user  = User(username=username, email=email, avatar_color=color)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        flash(f'Willkommen, {username}! Erstelle oder tritt einer WG bei.', 'success')
        return redirect(url_for('wg_setup'))
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        remember = bool(request.form.get('remember'))
        user     = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user, remember=remember)
            flash(f'Willkommen zurück, {user.username}!', 'success')
            return redirect(_safe_next(request.args.get('next')) or url_for('dashboard'))
        flash('Ungültige E-Mail oder Passwort.', 'danger')
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Du wurdest abgemeldet.', 'info')
    return redirect(url_for('login'))


# ──────────────────────────────────────────────
#  WG SETUP
# ──────────────────────────────────────────────
@app.route('/wg/setup', methods=['GET', 'POST'])
@login_required
def wg_setup():
    if current_user.get_wg():
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'create':
            name = request.form.get('wg_name', '').strip()
            if not name:
                flash('WG-Name ist erforderlich.', 'danger')
                return render_template('wg_setup.html')
            wg = WG(name=name, invite_code=gen_invite_code(), created_by=current_user.id)
            db.session.add(wg)
            db.session.flush()
            db.session.add(WGMembership(user_id=current_user.id, wg_id=wg.id))
            db.session.commit()
            flash(f'WG "{name}" erstellt! Einladungscode: {wg.invite_code}', 'success')
            return redirect(url_for('dashboard'))
        elif action == 'join':
            code = request.form.get('invite_code', '').strip().upper()
            wg   = WG.query.filter_by(invite_code=code).first()
            if not wg:
                flash('Ungültiger Einladungscode.', 'danger')
                return render_template('wg_setup.html')
            if not WGMembership.query.filter_by(user_id=current_user.id, wg_id=wg.id).first():
                db.session.add(WGMembership(user_id=current_user.id, wg_id=wg.id))
                db.session.commit()
            flash(f'Du bist der WG "{wg.name}" beigetreten!', 'success')
            return redirect(url_for('dashboard'))
    return render_template('wg_setup.html')


# ──────────────────────────────────────────────
#  DASHBOARD
# ──────────────────────────────────────────────
@app.route('/dashboard')
@login_required
def dashboard():
    wg = current_user.get_wg()
    if not wg:
        return redirect(url_for('wg_setup'))
    members         = wg.get_members()
    open_tasks      = CleaningTask.query.filter_by(wg_id=wg.id, completed=False).count()
    shopping_count  = ShoppingItem.query.filter_by(wg_id=wg.id, completed=False).count()
    my_tasks        = CleaningTask.query.filter_by(wg_id=wg.id, assigned_to=current_user.id, completed=False).all()
    recent_expenses = Expense.query.filter_by(wg_id=wg.id).order_by(Expense.created_at.desc()).limit(5).all()
    debts           = calculate_debts(wg)
    my_debts        = [d for d in debts if d['from_user'].id == current_user.id]
    owed_to_me      = [d for d in debts if d['to_user'].id == current_user.id]
    return render_template('dashboard.html', wg=wg, members=members, open_tasks=open_tasks,
                           shopping_count=shopping_count, my_tasks=my_tasks,
                           recent_expenses=recent_expenses, my_debts=my_debts,
                           owed_to_me=owed_to_me)


# ──────────────────────────────────────────────
#  TASKS
# ──────────────────────────────────────────────
@app.route('/tasks')
@login_required
def tasks():
    wg = current_user.get_wg()
    if not wg: return redirect(url_for('wg_setup'))
    members    = wg.get_members()
    open_tasks = CleaningTask.query.filter_by(wg_id=wg.id, completed=False).order_by(CleaningTask.due_date).all()
    done_tasks = CleaningTask.query.filter_by(wg_id=wg.id, completed=True).order_by(CleaningTask.completed_at.desc()).limit(15).all()
    return render_template('tasks.html', wg=wg, members=members, open_tasks=open_tasks, done_tasks=done_tasks)


@app.route('/tasks/add', methods=['POST'])
@login_required
def add_task():
    wg = current_user.get_wg()
    if not wg: return redirect(url_for('wg_setup'))
    title       = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    assigned_to = request.form.get('assigned_to', type=int)
    due_str     = request.form.get('due_date', '')
    if not title:
        flash('Aufgabenname ist erforderlich.', 'danger')
        return redirect(url_for('tasks'))
    due_date = None
    if due_str:
        try: due_date = datetime.strptime(due_str, '%Y-%m-%d').date()
        except: pass
    db.session.add(CleaningTask(
        wg_id=wg.id, title=title, description=description,
        assigned_to=assigned_to or None, due_date=due_date
    ))
    db.session.commit()
    flash('Aufgabe hinzugefügt!', 'success')
    return redirect(url_for('tasks'))


@app.route('/tasks/<int:tid>/toggle', methods=['POST'])
@login_required
@csrf.exempt
def toggle_task(tid):
    wg   = current_user.get_wg()
    task = db.get_or_404(CleaningTask, tid)
    if task.wg_id != wg.id: return jsonify({'error': 'Unauthorized'}), 403
    task.completed    = not task.completed
    task.completed_at = datetime.utcnow() if task.completed else None
    db.session.commit()
    return jsonify({'completed': task.completed})


@app.route('/tasks/<int:tid>/delete', methods=['POST'])
@login_required
def delete_task(tid):
    wg   = current_user.get_wg()
    task = db.get_or_404(CleaningTask, tid)
    if task.wg_id != wg.id:
        flash('Nicht autorisiert.', 'danger')
        return redirect(url_for('tasks'))
    db.session.delete(task)
    db.session.commit()
    flash('Aufgabe gelöscht.', 'info')
    return redirect(url_for('tasks'))


@app.route('/tasks/rotate', methods=['POST'])
@login_required
def rotate_tasks():
    wg      = current_user.get_wg()
    members = wg.get_members()
    if len(members) < 2:
        flash('Mindestens 2 Mitglieder für Rotation benötigt.', 'warning')
        return redirect(url_for('tasks'))
    open_t = CleaningTask.query.filter_by(wg_id=wg.id, completed=False).all()
    random.shuffle(members)
    for i, t in enumerate(open_t):
        t.assigned_to = members[i % len(members)].id
    db.session.commit()
    flash('Aufgaben wurden rotiert!', 'success')
    return redirect(url_for('tasks'))


# ──────────────────────────────────────────────
#  SHOPPING
# ──────────────────────────────────────────────
@app.route('/shopping')
@login_required
def shopping():
    wg = current_user.get_wg()
    if not wg: return redirect(url_for('wg_setup'))
    pending = ShoppingItem.query.filter_by(wg_id=wg.id, completed=False).order_by(ShoppingItem.created_at).all()
    done    = ShoppingItem.query.filter_by(wg_id=wg.id, completed=True).order_by(ShoppingItem.created_at.desc()).limit(30).all()
    return render_template('shopping.html', wg=wg, pending=pending, done=done)


@app.route('/shopping/add', methods=['POST'])
@login_required
def add_shopping():
    wg       = current_user.get_wg()
    name     = request.form.get('name', '').strip()
    quantity = request.form.get('quantity', '').strip()
    if not name:
        flash('Artikelname erforderlich.', 'danger')
        return redirect(url_for('shopping'))
    item = ShoppingItem(wg_id=wg.id, name=name, quantity=quantity, added_by=current_user.id)
    db.session.add(item)
    db.session.commit()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'success': True, 'id': item.id, 'name': item.name,
                        'quantity': item.quantity, 'username': current_user.username,
                        'avatar_color': current_user.avatar_color})
    return redirect(url_for('shopping'))


@app.route('/shopping/<int:iid>/toggle', methods=['POST'])
@login_required
@csrf.exempt
def toggle_shopping(iid):
    wg   = current_user.get_wg()
    item = db.get_or_404(ShoppingItem, iid)
    if item.wg_id != wg.id: return jsonify({'error': 'Unauthorized'}), 403
    item.completed = not item.completed
    db.session.commit()
    return jsonify({'completed': item.completed})


@app.route('/shopping/<int:iid>/delete', methods=['POST'])
@login_required
@csrf.exempt
def delete_shopping(iid):
    wg   = current_user.get_wg()
    item = db.get_or_404(ShoppingItem, iid)
    if item.wg_id != wg.id: return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(item)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/shopping/clear-done', methods=['POST'])
@login_required
def clear_done_shopping():
    wg = current_user.get_wg()
    ShoppingItem.query.filter_by(wg_id=wg.id, completed=True).delete()
    db.session.commit()
    flash('Erledigte Artikel gelöscht.', 'info')
    return redirect(url_for('shopping'))


# ──────────────────────────────────────────────
#  FINANCE
# ──────────────────────────────────────────────
@app.route('/finance')
@login_required
def finance():
    wg = current_user.get_wg()
    if not wg: return redirect(url_for('wg_setup'))
    members        = wg.get_members()
    expenses       = Expense.query.filter_by(wg_id=wg.id).order_by(Expense.created_at.desc()).all()
    debts          = calculate_debts(wg)
    total_expenses = sum(e.amount for e in expenses)
    return render_template('finance.html', wg=wg, members=members,
                           expenses=expenses, debts=debts, total_expenses=total_expenses)


@app.route('/finance/add', methods=['POST'])
@login_required
def add_expense():
    wg         = current_user.get_wg()
    title      = request.form.get('title', '').strip()
    amount_str = request.form.get('amount', '').replace(',', '.')
    paid_by_id = request.form.get('paid_by', type=int) or current_user.id
    if not title or not amount_str:
        flash('Alle Felder erforderlich.', 'danger')
        return redirect(url_for('finance'))
    try:
        amount = float(amount_str)
        if amount <= 0: raise ValueError
    except ValueError:
        flash('Ungültiger Betrag.', 'danger')
        return redirect(url_for('finance'))
    members = wg.get_members()
    expense = Expense(wg_id=wg.id, title=title, amount=amount, paid_by=paid_by_id)
    db.session.add(expense)
    db.session.flush()
    # Distribute splits so they always sum to the exact total
    n = len(members)
    running_total = 0.0
    for i, m in enumerate(members):
        if i < n - 1:
            split_amt = round(amount / n, 2)
            running_total += split_amt
        else:
            split_amt = round(amount - running_total, 2)
        db.session.add(ExpenseSplit(expense_id=expense.id, user_id=m.id, amount=split_amt))
    db.session.commit()
    flash(f'Ausgabe "{title}" ({amount:.2f} €) hinzugefügt!', 'success')
    return redirect(url_for('finance'))


@app.route('/finance/<int:eid>/delete', methods=['POST'])
@login_required
def delete_expense(eid):
    wg      = current_user.get_wg()
    expense = db.get_or_404(Expense, eid)
    if expense.wg_id != wg.id:
        flash('Nicht autorisiert.', 'danger')
        return redirect(url_for('finance'))
    db.session.delete(expense)
    db.session.commit()
    flash('Ausgabe gelöscht.', 'info')
    return redirect(url_for('finance'))


# ──────────────────────────────────────────────
#  FEED (Pinnwand)
# ──────────────────────────────────────────────
@app.route('/feed')
@login_required
def feed():
    wg = current_user.get_wg()
    if not wg: return redirect(url_for('wg_setup'))
    posts = FeedPost.query.filter_by(wg_id=wg.id).order_by(FeedPost.created_at.desc()).limit(50).all()
    return render_template('feed.html', wg=wg, posts=posts)


@app.route('/feed/post', methods=['POST'])
@login_required
def feed_post():
    wg      = current_user.get_wg()
    content = request.form.get('content', '').strip()
    file    = request.files.get('file')
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
            flash('Nur Bilder (jpg/png/gif/webp) und Audio (mp3/ogg/wav/webm/m4a) erlaubt.', 'danger')
            return redirect(url_for('feed'))
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_name))
        file_name = unique_name

    if not content and not file_name:
        flash('Bitte Text oder Datei hinzufügen.', 'warning')
        return redirect(url_for('feed'))

    post = FeedPost(wg_id=wg.id, user_id=current_user.id,
                    content=content, file_name=file_name, file_type=file_type)
    db.session.add(post)
    db.session.commit()
    return redirect(url_for('feed'))


@app.route('/feed/<int:pid>/delete', methods=['POST'])
@login_required
def delete_feed_post(pid):
    wg   = current_user.get_wg()
    post = db.get_or_404(FeedPost, pid)
    if post.wg_id != wg.id or post.user_id != current_user.id:
        flash('Nicht autorisiert.', 'danger')
        return redirect(url_for('feed'))
    if post.file_name:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], post.file_name))
        except OSError:
            pass
    db.session.delete(post)
    db.session.commit()
    return redirect(url_for('feed'))


@app.route('/uploads/<filename>')
@login_required
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], secure_filename(filename))


# ──────────────────────────────────────────────
#  ENTRY POINT
# ──────────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
