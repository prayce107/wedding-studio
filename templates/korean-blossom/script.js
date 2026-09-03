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

  // Open Invitation Ribbon
  if (openBtn && cover) {
    openBtn.addEventListener("click", () => {
      if (opened) return;
      opened = true;
      
      // Animate ribbon bow spin
      openBtn.style.transform = "scale(1.3) rotate(360deg)";
      
      setTimeout(() => {
        cover.classList.add("opening");
        document.body.classList.remove("lock");
        document.body.classList.add("invitation-open");
        
        // Autoplay music
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
      }, 400);
      
      setTimeout(() => {
        if (nav) nav.classList.add("visible");
        document.getElementById("mobile-bottom-nav")?.classList.add("visible");
        window.scrollTo(0, 0);
      }, 1500);
      
      setTimeout(() => {
        cover.style.display = "none";
        cover.remove();
      }, 2500);
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
          const r = JSON.parse(localStorage.getItem("koreanBlossomRSVP") || "[]");
          r.unshift({ ...item, time: new Date().toLocaleString("id-ID") });
          localStorage.setItem("koreanBlossomRSVP", JSON.stringify(r));
        }
        
        if (statusEl) {
          statusEl.innerHTML = `
            <div class="success-bubble">
              <strong>${esc(guestName)}</strong>
              <p style="margin-top: 5px; color: var(--accent-dark);">✔ Konfirmasi RSVP berhasil dikirim. Terima kasih!</p>
            </div>
          `;
        }
        
        if (message) {
          try {
            const wishes = JSON.parse(localStorage.getItem("koreanBlossomGuestbook") || "[]");
            wishes.unshift({ n: guestName, w: message, time: new Date().toLocaleString("id-ID") });
            localStorage.setItem("koreanBlossomGuestbook", JSON.stringify(wishes));
            renderWishes();
          } catch (e) {
            console.warn("Wishes sync error:", e);
          }
        }
        
        rsvpForm.reset();
        document.getElementById("guestCount").value = 1;
      } catch (err) {
        if (statusEl) statusEl.textContent = "Gagal mengirim RSVP. Coba lagi.";
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
      
      const wishes = JSON.parse(localStorage.getItem("koreanBlossomGuestbook") || "[]");
      wishes.unshift({ n, w, time: new Date().toLocaleString("id-ID") });
      localStorage.setItem("koreanBlossomGuestbook", JSON.stringify(wishes));
      
      renderWishes();
      wishNameEl.value = "";
      wishTextEl.value = "";
      toast("Ucapan berhasil dikirim!");
    };
  }

  function renderWishes() {
    const messagesEl = document.getElementById("guestMessages");
    if (!messagesEl) return;
    const wishes = JSON.parse(localStorage.getItem("koreanBlossomGuestbook") || "[]");
    
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
    
    document.querySelectorAll("#countdown .time-block strong").forEach((e, i) => {
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
  }, { threshold: 0.1, rootMargin: "0px 0px -50px" });

  // ----------------------------------------------------
  // HIGH PERFORMANCE HTML5 CANVAS SAKURA PETALS ENGINE
  // ----------------------------------------------------
  function initSakuraParticles() {
    const canvas = document.getElementById("sakuraCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let petals = [];
    const maxPetals = 45;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    class Petal {
      constructor() {
        this.reset();
        this.y = Math.random() * canvas.height; // spread initially
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.r = Math.random() * 5 + 5; // size
        this.d = Math.random() * 1.5 + 0.8; // fall speed
        this.w = Math.random() * 1 - 0.5; // wind drift
        this.rot = Math.random() * 360;
        this.rotSpeed = Math.random() * 1.5 - 0.75;
        this.opacity = Math.random() * 0.4 + 0.5;
      }

      draw() {
        ctx.beginPath();
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot * Math.PI / 180);
        
        ctx.fillStyle = `rgba(255, 182, 193, ${this.opacity})`;
        // draw realistic petal leaf path
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-this.r, -this.r, -this.r * 1.5, this.r/2, 0, this.r * 1.2);
        ctx.bezierCurveTo(this.r * 1.5, this.r/2, this.r, -this.r, 0, 0);
        ctx.fill();
        
        ctx.restore();
      }

      update() {
        this.y += this.d;
        this.x += this.w + Math.sin(this.y / 30) * 0.3; // gentle sway
        this.rot += this.rotSpeed;

        if (this.y > canvas.height + 20 || this.x < -20 || this.x > canvas.width + 20) {
          this.reset();
        }
      }
    }

    for (let i = 0; i < maxPetals; i++) {
      petals.push(new Petal());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      petals.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  // Initial runs
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    renderWishes();
    initSakuraParticles();
  });

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
