/* ══════════════════════════════
   WG Manager – Main JS v2
   ══════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Mobile Sidebar ─────────────────────────
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const openBtn  = document.getElementById('sidebarOpen');
  const closeBtn = document.getElementById('sidebarClose');

  function openSidebar() {
    sidebar?.classList.add('show');
    overlay?.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar?.classList.remove('show');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  openBtn?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  sidebar?.querySelectorAll('.snav-link').forEach(link => {
    link.addEventListener('click', () => { if (window.innerWidth < 768) closeSidebar(); });
  });

  // ── Auto-dismiss alerts after 4s ──────────
  document.querySelectorAll('.alert.fade.show').forEach(alert => {
    setTimeout(() => {
      bootstrap.Alert.getOrCreateInstance(alert)?.close();
    }, 4000);
  });

  // ── CSRF token helper ──────────────────────
  function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
  }

  // Attach to window so inline scripts can use it
  window.getCsrfToken = getCsrfToken;

  // ── Fetch wrapper with CSRF ────────────────
  window.apiFetch = (url, options = {}) => {
    options.headers = options.headers || {};
    options.headers['X-CSRFToken'] = getCsrfToken();
    return fetch(url, options);
  };

  // ── Button loading state ───────────────────
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function () {
      const btn = this.querySelector('[type="submit"]');
      if (btn && !btn.classList.contains('no-loading')) {
        btn.classList.add('loading');
      }
    });
  });

  // ── Invite code: auto-uppercase ────────────
  document.querySelector('input[name="invite_code"]')
    ?.addEventListener('input', function () { this.value = this.value.toUpperCase(); });

  // ── Number input: comma → dot ──────────────
  document.querySelectorAll('input[name="amount"]').forEach(inp => {
    inp.addEventListener('blur', function () {
      this.value = this.value.replace(',', '.');
    });
  });

  // ── Copy invite code on click ──────────────
  const inviteCode = document.querySelector('.invite-code');
  if (inviteCode) {
    inviteCode.title = 'Klicken zum Kopieren';
    inviteCode.addEventListener('click', () => {
      navigator.clipboard?.writeText(inviteCode.textContent.trim()).then(() => {
        const orig = inviteCode.textContent;
        inviteCode.textContent = '✓ Kopiert!';
        inviteCode.style.color = 'var(--green)';
        setTimeout(() => {
          inviteCode.textContent = orig;
          inviteCode.style.color = '';
        }, 1600);
      });
    });
  }

  // ── Task row remove animation ──────────────
  window.animateRemove = (el, delay = 350) => {
    el.style.transition = 'opacity .3s ease, max-height .35s ease, padding .3s ease, margin .3s ease';
    el.style.overflow = 'hidden';
    el.style.opacity = '0';
    el.style.maxHeight = el.offsetHeight + 'px';
    requestAnimationFrame(() => {
      el.style.maxHeight = '0';
      el.style.paddingTop = '0';
      el.style.paddingBottom = '0';
      el.style.marginTop = '0';
      el.style.marginBottom = '0';
    });
    setTimeout(() => el.remove(), delay);
  };

  // ── Animate number counters on stat cards ──
  document.querySelectorAll('.stat-value').forEach(el => {
    const target = parseInt(el.textContent, 10);
    if (isNaN(target) || target === 0) return;
    let start = 0;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

});
