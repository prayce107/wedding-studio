/**
 * Universal Invitation Live Loader & Backend Sync
 * Features:
 * - Instant Zero-Delay Client Rendering from local cache (SWR Pattern)
 * - Automatic background sync from Google Sheets / Express API
 * - Lifetime URL & Guest Personalization Support
 * - Real-time RSVP, Guest Wishes & Music Auto-Play integration
 */
(function () {
  'use strict';

  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    let slug = params.get('invite') || params.get('slug');
    if (!slug) {
      const match = window.location.pathname.match(/\/(?:i|invitation)\/([^/]+)/);
      if (match) slug = match[1];
    }
    return slug ? slug.toLowerCase().trim() : null;
  }

  function getGuestParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('to') || '';
  }

  const slug = getSlug();
  const guestTo = getGuestParam();

  window.currentInvitationSlug = slug;

  function renderData(content) {
    if (!content) return;
    window.invitationData = content;
    if (window.TemplateAdapter && typeof window.TemplateAdapter.render === 'function') {
      window.TemplateAdapter.render(document, content);
    }
  }

  async function loadLiveInvitation() {
    if (!slug) return;

    // 1. Instant Zero-Delay Cache Load (SWR Strategy)
    try {
      const cached = localStorage.getItem('invitation_cache_' + slug);
      if (cached) {
        const cachedData = JSON.parse(cached);
        if (cachedData) {
          renderData(cachedData);
        }
      }
    } catch (e) {}

    // 2. Background Sync with Live API / Google Sheets
    try {
      const apiUrl = `/api/public/invitations/${encodeURIComponent(slug)}${guestTo ? '?to=' + encodeURIComponent(guestTo) : ''}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const invite = await res.json();
        if (invite && invite.content) {
          renderData(invite.content);
          try {
            localStorage.setItem('invitation_cache_' + slug, JSON.stringify(invite.content));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Network sync notice:', e);
    }
  }

  async function loadLiveWishes() {
    if (!slug) return;
    try {
      const res = await fetch(`/api/public/invitations/${encodeURIComponent(slug)}/wishes`);
      if (!res.ok) return;
      const wishes = await res.json();
      if (Array.isArray(wishes)) {
        const messagesEl = document.getElementById('guestMessages');
        if (messagesEl && wishes.length > 0) {
          messagesEl.innerHTML = wishes.map(w => `
            <div class="guest-message" style="background:rgba(255,255,255,0.04); border:1px solid rgba(213,161,93,0.15); border-radius:10px; padding:14px; margin-bottom:10px;">
              <strong style="color:var(--gold,#d5a15d); font-size:14px; display:block; margin-bottom:4px;">${escapeHtml(w.name)}</strong>
              <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">${escapeHtml(w.message)}</p>
            </div>
          `).join('');
        }
      }
    } catch (e) {}
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t.timer);
    t.timer = setTimeout(() => t.classList.remove('show'), 2500);
  }

  function hookLiveForms() {
    if (!slug) return;

    // Hook RSVP Form
    const rsvpForm = document.getElementById('rsvpForm');
    if (rsvpForm) {
      rsvpForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const guestNameEl = document.getElementById('guestName');
        const attendanceEl = document.getElementById('attendance');
        const guestCountEl = document.getElementById('guestCount');
        const messageEl = document.getElementById('message');
        const statusEl = document.getElementById('rsvpStatus');

        const name = guestNameEl ? guestNameEl.value.trim() : '';
        const status = attendanceEl ? attendanceEl.value : 'Hadir';
        const count = guestCountEl ? parseInt(guestCountEl.value, 10) || 1 : 1;
        const msg = messageEl ? messageEl.value.trim() : '';

        if (!name) {
          showToast('Nama wajib diisi.');
          return;
        }

        if (statusEl) {
          statusEl.textContent = 'Mengirim konfirmasi kehadiran...';
          statusEl.style.color = '#d5a15d';
        }

        try {
          const res = await fetch(`/api/public/invitations/${encodeURIComponent(slug)}/rsvp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name,
              status: status,
              guests_count: count,
              message: msg
            })
          });

          if (res.ok) {
            showToast('Konfirmasi RSVP berhasil dikirim!');
            if (statusEl) {
              statusEl.textContent = '✓ Terima kasih! Konfirmasi kehadiran Anda telah tersimpan.';
              statusEl.style.color = '#a3c285';
            }
            if (messageEl) messageEl.value = '';
          } else {
            showToast('Gagal mengirim RSVP.');
          }
        } catch (err) {
          showToast('Koneksi terganggu.');
        }
      });
    }

    // Hook Wish Form
    const wishBtn = document.getElementById('wishBtn');
    if (wishBtn) {
      wishBtn.addEventListener('click', async function () {
        const wishNameEl = document.getElementById('wishName');
        const wishTextEl = document.getElementById('wishText');
        const n = wishNameEl ? wishNameEl.value.trim() : '';
        const w = wishTextEl ? wishTextEl.value.trim() : '';

        if (!n || !w) {
          showToast('Nama dan ucapan doa wajib diisi.');
          return;
        }

        wishBtn.disabled = true;
        wishBtn.textContent = 'Mengirim...';

        try {
          const res = await fetch(`/api/public/invitations/${encodeURIComponent(slug)}/wish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, message: w })
          });

          if (res.ok) {
            showToast('Ucapan dan doa berhasil dikirim!');
            if (wishTextEl) wishTextEl.value = '';
            setTimeout(loadLiveWishes, 400);
          } else {
            showToast('Gagal mengirim ucapan.');
          }
        } catch (err) {
          showToast('Koneksi terganggu.');
        } finally {
          wishBtn.disabled = false;
          wishBtn.textContent = 'KIRIM UCAPAN';
        }
      });
    }
  }

  function init() {
    if (!window.parent || window.parent === window.self) {
      loadLiveInvitation();
      loadLiveWishes();
      hookLiveForms();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
