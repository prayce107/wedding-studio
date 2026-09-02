/**
 * Universal Invitation Live Loader & Backend Sync
 * Automatically connects published invitation pages to Express API
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
    return slug ? slug.toLowerCase() : null;
  }

  function getGuestParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('to') || '';
  }

  const slug = getSlug();
  const guestTo = getGuestParam();

  window.currentInvitationSlug = slug;

  async function loadLiveInvitation() {
    if (!slug) return;
    try {
      const apiUrl = `/api/public/invitations/${encodeURIComponent(slug)}${guestTo ? '?to=' + encodeURIComponent(guestTo) : ''}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        console.warn('Gagal memuat undangan dari API live:', res.statusText);
        return;
      }
      const invite = await res.json();
      if (invite && invite.content) {
        window.invitationData = invite.content;
        if (window.TemplateAdapter && typeof window.TemplateAdapter.render === 'function') {
          window.TemplateAdapter.render(document, invite.content);
        }
      }
    } catch (e) {
      console.warn('Error fetching live invitation:', e);
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
            <div class="guest-message">
              <strong>${escapeHtml(w.name)}</strong>
              <p>${escapeHtml(w.message)}</p>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('Error loading wishes:', e);
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function hookLiveForms() {
    if (!slug) return;

    // Hook RSVP Form
    const rsvpForm = document.getElementById('rsvpForm');
    if (rsvpForm) {
      rsvpForm.addEventListener('submit', async function (e) {
        const guestNameEl = document.getElementById('guestName');
        const attendanceEl = document.getElementById('attendance');
        const guestCountEl = document.getElementById('guestCount');
        const messageEl = document.getElementById('message');

        const name = guestNameEl ? guestNameEl.value.trim() : '';
        const status = attendanceEl ? attendanceEl.value : 'hadir';
        const count = guestCountEl ? parseInt(guestCountEl.value, 10) || 1 : 1;
        const msg = messageEl ? messageEl.value.trim() : '';

        if (!name) return;

        try {
          await fetch(`/api/public/invitations/${encodeURIComponent(slug)}/rsvp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name,
              status: status,
              guests_count: count,
              message: msg
            })
          });
        } catch (err) {
          console.warn('Server RSVP error:', err);
        }
      }, true); // Capture phase
    }

    // Hook Wish Form
    const wishBtn = document.getElementById('wishBtn');
    if (wishBtn) {
      wishBtn.addEventListener('click', async function () {
        const wishNameEl = document.getElementById('wishName');
        const wishTextEl = document.getElementById('wishText');
        const n = wishNameEl ? wishNameEl.value.trim() : '';
        const w = wishTextEl ? wishTextEl.value.trim() : '';

        if (!n || !w) return;

        try {
          await fetch(`/api/public/invitations/${encodeURIComponent(slug)}/wish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, message: w })
          });
          setTimeout(loadLiveWishes, 600);
        } catch (err) {
          console.warn('Server Wish error:', err);
        }
      }, true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Only auto-load if opened directly, not inside builder iframe
    if (!window.parent || window.parent === window.self) {
      loadLiveInvitation();
      loadLiveWishes();
      hookLiveForms();
    }
  });
})();
