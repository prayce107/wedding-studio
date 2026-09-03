(() => {
  "use strict";

  let opened = false;
  let musicOn = false;
  let countdownTarget = 0;

  const cover = document.getElementById("cover");
  const nav = document.getElementById("nav");
  const openBtn = document.getElementById("openBtn");
  const musicBtn = document.getElementById("musicBtn");
  const shareBtn = document.getElementById("shareBtn");
  const music = document.getElementById("music");
  const coverScene = document.getElementById("coverScene");
  const env = document.getElementById("env");
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const rsvpForm = document.getElementById("rsvpForm");
  const wishBtn = document.getElementById("wishBtn");

  // Show toast utility
  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t.timer);
    t.timer = setTimeout(() => t.classList.remove("show"), 1900);
  }

  // Escape HTML utility
  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  // Open Envelope
  if (openBtn && cover) {
    openBtn.addEventListener("click", () => {
      if (opened) return;
      opened = true;
      document.body.classList.remove("lock");
      cover.classList.add("opening");
      document.body.classList.add("invitation-open");
      
      // Try to autoplay music if URL is present
      if (music && music.src) {
        music.play()
          .then(() => {
            musicOn = true;
            window.__pendingMusicAutoplay = false;
            if (musicBtn) musicBtn.textContent = "♫";
          })
          .catch(() => {
            window.__pendingMusicAutoplay = true;
          });
      } else {
        window.__pendingMusicAutoplay = true;
      }
      
      setTimeout(() => {
        cover.classList.add("hide");
        if (nav) nav.classList.add("visible");
        document.getElementById("mobile-bottom-nav")?.classList.add("visible");
        window.scrollTo(0, 0);
      }, 1450);
      
      setTimeout(() => {
        cover.remove();
      }, 2450);
    });
  }

  // Envelope Parallax Mouse Effect
  if (cover && coverScene) {
    cover.addEventListener("pointermove", e => {
      if (opened || e.pointerType === "touch") return;
      const r = cover.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      coverScene.style.setProperty("--mx", `${x * 18}px`);
      coverScene.style.setProperty("--my", `${y * 12}px`);
    });
    
    cover.addEventListener("pointerleave", () => {
      if (opened) return;
      coverScene.style.setProperty("--mx", "0px");
      coverScene.style.setProperty("--my", "0px");
    });
    
    coverScene.addEventListener("pointerleave", () => {
      if (!opened && env) env.style.transform = "translateX(-50%) rotateX(7deg) rotateY(-4deg)";
    });
  }

  // Music Button Player
  if (musicBtn && music) {
    musicBtn.onclick = () => {
      if (!music.src) return toast("Musik belum diatur");
      if (!musicOn) {
        music.play()
          .then(() => {
            musicOn = true;
            musicBtn.textContent = "♫";
          })
          .catch(() => toast("Gagal memutar musik"));
      } else {
        music.pause();
        musicOn = false;
        musicBtn.textContent = "♪";
      }
    };
  }

  // Share Button
  if (shareBtn) {
    shareBtn.onclick = () => {
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({
          title: document.title,
          text: "Undangan Pernikahan",
          url: url
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url)
          .then(() => toast("Link undangan disalin"))
          .catch(() => {
            // fallback copy
            const ta = document.createElement("textarea");
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            toast("Link undangan disalin");
          });
      }
    };
  }

  // Lightbox Close
  if (lightbox) {
    lightbox.addEventListener("click", e => {
      if (e.target.id === "lightbox" || e.target.id === "lbClose") {
        lightbox.classList.remove("show");
        if (lbImg) lbImg.removeAttribute("src");
        document.body.classList.remove("lock");
      }
    });
  }

  // RSVP Form Submit
  if (rsvpForm) {
    rsvpForm.addEventListener("submit", async e => {
      e.preventDefault();
      
      const guestName = document.getElementById("guestName").value.trim();
      const attendance = document.getElementById("attendance").value;
      const guestCount = parseInt(document.getElementById("guestCount").value, 10) || 1;
      const message = document.getElementById("message").value.trim();
      
      if (!guestName) return;
      
      const statusEl = document.getElementById("rsvpStatus");
      if (statusEl) statusEl.textContent = "Mengirim...";
      
      const item = {
        name: guestName,
        attendance: attendance,
        count: guestCount,
        message: message
      };
      
      try {
        if (window.rsvpService) {
          await window.rsvpService.submit(item);
        } else {
          // Local fallback
          const r = JSON.parse(localStorage.getItem("weddingPremiumRSVP") || "[]");
          r.unshift({ ...item, time: new Date().toLocaleString("id-ID") });
          localStorage.setItem("weddingPremiumRSVP", JSON.stringify(r));
        }
        
        if (statusEl) {
          statusEl.innerHTML = `
            <div class="guest-message success-bubble" style="margin-top: 18px; border-color: #efca89; background: rgba(239, 202, 137, 0.08);">
              <strong>${esc(guestName)}</strong>
              <p style="color: #efdecd;">✔ Konfirmasi RSVP berhasil terkirim. Terima kasih!</p>
            </div>
          `;
        }
        
        // Automatically sync RSVP messages to guestbook wishes list
        if (message) {
          try {
            const wishes = JSON.parse(localStorage.getItem("weddingPremiumGuestbook") || "[]");
            wishes.unshift({ n: guestName, w: message, time: new Date().toLocaleString("id-ID") });
            localStorage.setItem("weddingPremiumGuestbook", JSON.stringify(wishes));
            renderWishes();
          } catch (e) {
            console.warn("Failed to sync RSVP wish:", e);
          }
        }
        
        rsvpForm.reset();
        document.getElementById("guestCount").value = 1;
      } catch (err) {
        if (statusEl) statusEl.textContent = "Gagal mengirim konfirmasi RSVP. Silakan coba lagi.";
      }
    });
  }

  // Guestbook Wishes Submit
  if (wishBtn) {
    wishBtn.onclick = () => {
      const wishNameEl = document.getElementById("wishName");
      const wishTextEl = document.getElementById("wishText");
      const n = wishNameEl.value.trim();
      const w = wishTextEl.value.trim();
      
      if (!n || !w) {
        toast("Isi nama dan ucapan terlebih dahulu");
        return;
      }
      
      const wishes = JSON.parse(localStorage.getItem("weddingPremiumGuestbook") || "[]");
      wishes.unshift({ n, w, time: new Date().toLocaleString("id-ID") });
      localStorage.setItem("weddingPremiumGuestbook", JSON.stringify(wishes));
      
      renderWishes();
      wishNameEl.value = "";
      wishTextEl.value = "";
      toast("Ucapan berhasil dikirim!");
    };
  }

  function renderWishes() {
    const messagesEl = document.getElementById("guestMessages");
    if (!messagesEl) return;
    const wishes = JSON.parse(localStorage.getItem("weddingPremiumGuestbook") || "[]");
    
    messagesEl.innerHTML = wishes.slice(0, 30).map(x => `
      <div class="guest-message">
        <strong>${esc(x.n)}</strong>
        <p>${esc(x.w)}</p>
      </div>
    `).join("");
  }

  // Countdown Ticking Engine
  function tick() {
    if (!countdownTarget) return;
    let d = Math.max(0, countdownTarget - Date.now());
    let days = Math.floor(d / 86400000);
    d %= 86400000;
    let h = Math.floor(d / 3600000);
    d %= 3600000;
    let m = Math.floor(d / 60000);
    let s = Math.floor((d % 60000) / 1000);
    
    document.querySelectorAll("#countdown .time strong").forEach((e, i) => {
      e.textContent = String([days, h, m, s][i]).padStart(2, "0");
    });
  }
  setInterval(tick, 1000);

  // Scroll Reveal Intersection Observer
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px" });

  // Initial runs
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    renderWishes();
  });

  // Expose methods globally for TemplateAdapter
  window.TemplateScript = {
    updateCountdown(targetDate) {
      countdownTarget = new Date(targetDate).getTime();
      tick();
    },
    toast: toast,
    copyText(v, msg = "Tersalin") {
      navigator.clipboard?.writeText(v)
        .then(() => toast(msg))
        .catch(() => {
          const ta = document.createElement("textarea");
          ta.value = v;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          toast(msg);
        });
    }
  };

  // Resume music on any user touch/tap if pending
  document.addEventListener("click", () => {
    if (opened && window.__pendingMusicAutoplay && music && music.src && !musicOn) {
      music.play().then(() => {
        musicOn = true;
        window.__pendingMusicAutoplay = false;
        if (musicBtn) musicBtn.textContent = "♫";
      }).catch(() => {});
    }
  }, { passive: true });
})();
