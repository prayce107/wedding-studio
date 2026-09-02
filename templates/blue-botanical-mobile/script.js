(() => {
  "use strict";

  let opened = false;
  let musicOn = false;
  let countdownTarget = 0;

  const $ = (id) => document.getElementById(id);

  function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function copyText(value, message = "Tersalin") {
    const done = () => toast(message);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => fallbackCopy(value, done));
    } else {
      fallbackCopy(value, done);
    }
  }

  function fallbackCopy(value, done) {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
    done();
  }

  const welcome = $("welcome");
  const openBtn = $("openBtn");
  const topbar = $("topbar");
  const bottomNav = $("mobile-bottom-nav");
  const music = $("music");
  const musicBtn = $("musicBtn");
  const shareBtn = $("shareBtn");

  if (openBtn && welcome) {
    openBtn.addEventListener("click", () => {
      if (opened) return;
      opened = true;
      document.body.classList.remove("locked");
      welcome.classList.add("closing");
      topbar?.classList.add("visible");
      bottomNav?.classList.add("visible");

      if (music?.src) {
        music.play().then(() => {
          musicOn = true;
          if (musicBtn) musicBtn.textContent = "❚❚";
        }).catch(() => {});
      }

      setTimeout(() => {
        welcome.remove();
        window.scrollTo(0, 0);
      }, 850);
    });
  }

  if (musicBtn && music) {
    musicBtn.addEventListener("click", () => {
      if (!music.src) return toast("Musik belum diatur");
      if (music.paused) {
        music.play().then(() => {
          musicOn = true;
          musicBtn.textContent = "❚❚";
        }).catch(() => toast("Musik tidak dapat diputar"));
      } else {
        music.pause();
        musicOn = false;
        musicBtn.textContent = "♫";
      }
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({
          title: document.title,
          text: "Undangan Pernikahan",
          url
        }).catch(() => {});
      } else {
        copyText(url, "Link undangan disalin");
      }
    });
  }

  const lightbox = $("lightbox");
  const lbImg = $("lbImg");
  const lbClose = $("lbClose");
  if (lightbox) {
    lightbox.addEventListener("click", e => {
      if (e.target === lightbox || e.target === lbClose) {
        lightbox.classList.remove("show");
        if (lbImg) lbImg.removeAttribute("src");
        document.body.classList.remove("locked");
      }
    });
  }

  const rsvpForm = $("rsvpForm");
  if (rsvpForm) {
    rsvpForm.addEventListener("submit", async e => {
      e.preventDefault();

      const guestName = $("guestName")?.value.trim();
      const attendance = $("attendance")?.value || "Hadir";
      const guestCount = parseInt($("guestCount")?.value, 10) || 1;
      const message = $("message")?.value.trim() || "";
      const status = $("rsvpStatus");

      if (!guestName) return;
      if (status) status.textContent = "Mengirim...";

      const item = { name: guestName, attendance, count: guestCount, message };

      try {
        if (window.rsvpService) {
          await window.rsvpService.submit(item);
        } else {
          const stored = JSON.parse(localStorage.getItem("blueBotanicalRSVP") || "[]");
          stored.unshift({ ...item, time: new Date().toLocaleString("id-ID") });
          localStorage.setItem("blueBotanicalRSVP", JSON.stringify(stored));
        }

        if (status) {
          status.innerHTML = `
            <div class="wish-item success-bubble" style="margin-top: 18px; text-align: left; background: rgba(54, 76, 108, 0.05); border-color: rgba(54, 76, 108, 0.15);">
              <strong>${escapeHtml(guestName)}</strong>
              <p style="color: #364c6c;">✔ RSVP Berhasil dikirim. Terima kasih!</p>
            </div>
          `;
        }
        
        // Automatically sync RSVP messages to guestbook wishes list
        if (message) {
          try {
            const storedWishes = JSON.parse(localStorage.getItem("blueBotanicalGuestbook") || "[]");
            storedWishes.unshift({ n: guestName, w: message, time: new Date().toLocaleString("id-ID") });
            localStorage.setItem("blueBotanicalGuestbook", JSON.stringify(storedWishes));
            renderWishes();
          } catch (e) {
            console.warn("Failed to sync RSVP wish:", e);
          }
        }
        
        rsvpForm.reset();
        if ($("guestCount")) $("guestCount").value = 1;
      } catch {
        if (status) status.textContent = "RSVP gagal dikirim. Silakan coba lagi.";
      }
    });
  }

  const wishBtn = $("wishBtn");
  function renderWishes() {
    const target = $("guestMessages");
    if (!target) return;
    const wishes = JSON.parse(localStorage.getItem("blueBotanicalGuestbook") || "[]");
    target.innerHTML = wishes.slice(0, 30).map(x => `
      <article class="wish-item">
        <strong>${escapeHtml(x.n)}</strong>
        <p>${escapeHtml(x.w)}</p>
        <small>${escapeHtml(x.time)}</small>
      </article>
    `).join("");
  }

  if (wishBtn) {
    wishBtn.addEventListener("click", () => {
      const n = $("wishName")?.value.trim();
      const w = $("wishText")?.value.trim();
      if (!n || !w) return toast("Isi nama dan ucapan terlebih dahulu");

      const wishes = JSON.parse(localStorage.getItem("blueBotanicalGuestbook") || "[]");
      wishes.unshift({ n, w, time: new Date().toLocaleString("id-ID") });
      localStorage.setItem("blueBotanicalGuestbook", JSON.stringify(wishes));

      $("wishName").value = "";
      $("wishText").value = "";
      renderWishes();
      toast("Ucapan berhasil dikirim!");
    });
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  const copyAngpou = $("copyAngpou");
  if (copyAngpou) {
    copyAngpou.addEventListener("click", () => {
      const value = $("angpouRek")?.textContent?.trim();
      if (value) copyText(value, "Nomor rekening disalin");
    });
  }

  function tick() {
    if (!countdownTarget) return;
    let diff = Math.max(0, countdownTarget - Date.now());
    const days = Math.floor(diff / 86400000);
    diff %= 86400000;
    const hours = Math.floor(diff / 3600000);
    diff %= 3600000;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    document.querySelectorAll("#countdown > div strong").forEach((el, i) => {
      el.textContent = String([days, hours, mins, secs][i]).padStart(2, "0");
    });
  }

  setInterval(tick, 1000);

  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 })
    : null;

  window.TemplateScript = {
    updateCountdown(targetDate) {
      countdownTarget = targetDate ? new Date(targetDate).getTime() : 0;
      tick();
    },
    toast,
    copyText
  };

  document.addEventListener("DOMContentLoaded", () => {
    renderWishes();
    if (revealObserver) {
      document.querySelectorAll(".screen, .feature-card, .profile-card, .story-item").forEach(el => {
        el.classList.add("reveal");
        revealObserver.observe(el);
      });
    }
  });
})();
