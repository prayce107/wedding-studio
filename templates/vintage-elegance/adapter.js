(function () {
  "use strict";

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));

  const nl = (v) => esc(v).replace(/\n/g, "<br>");

  const safeUrl = (v, fallback = "#") => {
    if (!v) return fallback;
    if (v.startsWith("data:") || v.startsWith("blob:") || v.startsWith("http:") || v.startsWith("https:") || v.startsWith(".")) {
      return v;
    }
    try {
      const u = new URL(v, window.location.href);
      return u.href;
    } catch {
      return fallback;
    }
  };

  const setImg = (el, src, fallback) => {
    if (!el) return;
    const s = src || fallback || "";
    if (s) {
      el.src = s;
      el.onerror = () => {
        if (fallback && el.src !== fallback) el.src = fallback;
      };
    }
  };

  const TimelineIcons = {
    ceremony: `<svg class="program-icon-svg" viewBox="0 0 24 24"><path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM15 20a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="1.5"/><path d="M12 8a3 3 0 0 1 3-3M9 16a3 3 0 0 1 3 3" stroke="currentColor" stroke-width="1.5"/></svg>`,
    cocktail: `<svg class="program-icon-svg" viewBox="0 0 24 24"><path d="M5 5h14l-7 8-7-8zM12 13v7M9 20h6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="9" r="1" fill="currentColor"/></svg>`,
    lunch: `<svg class="program-icon-svg" viewBox="0 0 24 24"><path d="M12 5v14M15 5v5a3 3 0 0 1-3 3M6 5v8a4 4 0 0 0 8 0V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    cake: `<svg class="program-icon-svg" viewBox="0 0 24 24"><path d="M4 20h16M5 16h14v4H5zm2-6h10v6H7zm3-4h4v4h-4zm2-3v3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    party: `<svg class="program-icon-svg" viewBox="0 0 24 24"><path d="M9 18V5l10 3v13" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="21" r="3" stroke="currentColor" stroke-width="1.5"/></svg>`
  };

  const TemplateAdapter = {
    render(dom, data) {
      if (!data) return;

      const general = data.general || {};
      const couple = data.couple || {};
      const event = data.event || {};
      const venue = data.venue || {};
      const story = data.story || {};
      const gallery = data.gallery || {};
      const gift = data.gift || {};
      const rsvp = data.rsvp || {};
      const live = data.live || {};
      const guestBook = data.guestBook || {};
      const musicData = data.music || {};
      const decoration = data.decoration || {};
      const guestData = data.guest || {};
      const style = data.style || {};

      // 1. Text Binds (General Info)
      dom.querySelectorAll('[data-bind="name1"]').forEach(el => el.innerHTML = esc(general.name1 || ""));
      dom.querySelectorAll('[data-bind="name2"]').forEach(el => el.innerHTML = esc(general.name2 || ""));
      dom.querySelectorAll('[data-bind="shortNames"]').forEach(el => el.innerHTML = esc(general.shortNames || `${general.name1 || ''} & ${general.name2 || ''}`));
      dom.querySelectorAll('[data-bind="date"]').forEach(el => el.innerHTML = esc(general.date || ""));
      dom.querySelectorAll('[data-bind="intro"]').forEach(el => el.innerHTML = esc(general.intro || ""));
      dom.querySelectorAll('[data-bind="coupleIntro"]').forEach(el => el.innerHTML = esc(general.coupleIntro || ""));
      dom.querySelectorAll('[data-bind="footerText"]').forEach(el => el.innerHTML = esc(general.footerText || ""));

      // 2. Mempelai Pria (Groom)
      dom.querySelectorAll('[data-bind="groomName"]').forEach(el => el.innerHTML = esc(couple.groomName || ""));
      dom.querySelectorAll('[data-bind="groomParents"]').forEach(el => el.innerHTML = nl(couple.groomParents || ""));
      dom.querySelectorAll('[data-bind="groomBio"]').forEach(el => el.innerHTML = nl(couple.groomBio || ""));

      // 3. Mempelai Wanita (Bride)
      dom.querySelectorAll('[data-bind="brideName"]').forEach(el => el.innerHTML = esc(couple.brideName || ""));
      dom.querySelectorAll('[data-bind="brideParents"]').forEach(el => el.innerHTML = nl(couple.brideParents || ""));
      dom.querySelectorAll('[data-bind="brideBio"]').forEach(el => el.innerHTML = nl(couple.brideBio || ""));

      // 4. Photos (Hero, Groom, Bride)
      const album = Array.isArray(gallery.album) ? gallery.album : [];
      setImg(dom.getElementById("heroPhoto"), general.photoHero, album[0]?.src);
      setImg(dom.getElementById("groomPhoto"), couple.groomPhoto, album[1]?.src);
      setImg(dom.getElementById("bridePhoto"), couple.bridePhoto, album[2]?.src);

      // 5. Event Details
      dom.querySelectorAll('[data-bind="specialDay"]').forEach(el => el.innerHTML = esc(event.specialDay || "OUR WEDDING DAY"));
      dom.querySelectorAll('[data-bind="eventIntro"]').forEach(el => el.innerHTML = esc(event.eventIntro || ""));
      dom.querySelectorAll('[data-bind="akadTitle"]').forEach(el => el.innerHTML = esc(event.akadTitle || "Akad Nikah"));
      dom.querySelectorAll('[data-bind="akadInfo"]').forEach(el => el.innerHTML = esc(event.akadInfo || ""));
      dom.querySelectorAll('[data-bind="receptionTitle"]').forEach(el => el.innerHTML = esc(event.receptionTitle || "Resepsi"));
      dom.querySelectorAll('[data-bind="receptionInfo"]').forEach(el => el.innerHTML = esc(event.receptionInfo || ""));
      dom.querySelectorAll('[data-bind="rsvpButton"]').forEach(el => el.innerHTML = esc(rsvp.rsvpButton || "KONFIRMASI RSVP"));

      const akadVenue = dom.getElementById("akadVenueText");
      if (akadVenue) akadVenue.textContent = event.akadVenue || "";
      const recVenue = dom.getElementById("receptionVenueText");
      if (recVenue) recVenue.textContent = event.receptionVenue || "";
      const dress = dom.getElementById("eventDressText");
      if (dress) dress.textContent = event.eventDress || "";
      const note = dom.getElementById("eventNoteText");
      if (note) note.textContent = event.eventNote || "";

      // 6. Map Integration
      const mapsBtn = dom.getElementById("mapsBtn");
      if (mapsBtn) mapsBtn.href = safeUrl(venue.maps);

      const venueInfo = dom.getElementById("venueInfo");
      if (venueInfo) venueInfo.innerHTML = nl(venue.venueInfo || "");

      const venueNote = dom.getElementById("venueNote");
      if (venueNote) venueNote.innerHTML = nl(venue.venueNote || "");

      const mf = dom.getElementById("mapsFrame");
      const mp = dom.getElementById("mapPlaceholder");
      if (mf && mp) {
        const autoMap = venue.venueInfo ? `https://www.google.com/maps?q=${encodeURIComponent(venue.venueInfo.replace(/\n/g, ", "))}&output=embed` : "";
        const mapSrc = venue.mapsEmbed || autoMap;
        if (mapSrc) {
          mf.src = safeUrl(mapSrc);
          mf.style.display = "block";
          mp.style.display = "none";
        } else {
          mf.removeAttribute("src");
          mf.style.display = "none";
          mp.style.display = "grid";
        }
      }

      // 7. Dynamic Dust Particles
      const particlesContainer = dom.getElementById("dust-container");
      if (particlesContainer && window.VintageParticlesAnimation) {
        window.VintageParticlesAnimation.init(particlesContainer, decoration);
      }

      // 8. Love Timeline Story
      const timeline = dom.getElementById("timeline");
      if (timeline) {
        const stories = story.stories || [];
        timeline.innerHTML = stories.map(s => `
          <div class="story-item">
            <div class="story-year">${esc(s.year)}</div>
            <div class="story-box">
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.text)}</p>
            </div>
          </div>
        `).join("");
      }

      // 9. Wedding Event Schedule Timeline
      const scheduleTimeline = dom.getElementById("scheduleTimeline");
      if (scheduleTimeline) {
        const program = event.program || [];
        scheduleTimeline.innerHTML = program.map(p => `
          <div class="program-item">
            <div class="program-time">${esc(p.time)}</div>
            <div class="program-icon">${TimelineIcons[p.icon] || TimelineIcons.ceremony}</div>
            <div class="program-info">
              <h4>${esc(p.title)}</h4>
              <p>${esc(p.desc)}</p>
            </div>
          </div>
        `).join("");
      }

      // 10. Album Gallery
      const galleryEl = dom.getElementById("gallery");
      if (galleryEl) {
        const albumItems = gallery.album || [];
        galleryEl.innerHTML = albumItems.length ? albumItems.map((x, i) => `
          <figure data-src="${esc(x.src)}">
            <img loading="lazy" src="${esc(x.src)}" alt="Album ${i + 1}" onerror="this.style.opacity='0.6'">
            <figcaption>${esc(x.caption || "Vintage Moment")}</figcaption>
          </figure>
        `).join("") : `<div class="publish-box">Belum ada foto album.</div>`;

        galleryEl.querySelectorAll("figure").forEach(fig => {
          fig.addEventListener("click", () => {
            const lbImg = dom.getElementById("lbImg");
            const lightbox = dom.getElementById("lightbox");
            if (lbImg && lightbox) {
              lbImg.src = fig.dataset.src;
              lightbox.classList.add("show");
              dom.body.classList.add("lock");
            }
          });
        });
      }

      // 11. Gift & Angpou Digital Details
      dom.querySelectorAll('[data-bind="angpouTitle"]').forEach(el => el.innerHTML = esc(gift.angpouTitle || "Wedding Gift"));
      dom.querySelectorAll('[data-bind="angpouIntro"]').forEach(el => el.innerHTML = esc(gift.angpouIntro || ""));
      dom.querySelectorAll('[data-bind="angpouBank"]').forEach(el => el.innerHTML = esc(gift.angpouBank || ""));
      dom.querySelectorAll('[data-bind="angpouOwner"]').forEach(el => el.innerHTML = esc(gift.angpouOwner || ""));

      const angpouRek = dom.getElementById("angpouRek");
      if (angpouRek) angpouRek.value = gift.angpouRek || "";

      const copyAngpou = dom.getElementById("copyAngpou");
      if (copyAngpou) {
        copyAngpou.onclick = () => {
          window.TemplateScript?.copyText(gift.angpouRek, "Nomor rekening disalin");
        };
      }

      dom.querySelectorAll('[data-bind="giftSendTitle"]').forEach(el => el.innerHTML = esc(gift.giftSendTitle || "Kirim Kado"));
      dom.querySelectorAll('[data-bind="giftSendIntro"]').forEach(el => el.innerHTML = esc(gift.giftSendIntro || ""));

      const giftAddress = dom.getElementById("giftAddress");
      if (giftAddress) giftAddress.innerHTML = nl(gift.giftAddress || "");

      dom.querySelectorAll('[data-bind="giftTitle"]').forEach(el => el.innerHTML = esc(gift.giftTitle || ""));
      dom.querySelectorAll('[data-bind="giftIntro"]').forEach(el => el.innerHTML = esc(gift.giftIntro || ""));

      const giftGrid = dom.getElementById("giftGrid");
      if (giftGrid) {
        const giftsList = gift.gifts || [];
        giftGrid.innerHTML = giftsList.map(g => `
          <div class="gift-card">
            <strong>${esc(g.bank)}</strong>
            <p>${esc(g.rek)}<br>${esc(g.owner)}</p>
            <button class="copy-btn" data-copy="${esc(g.rek)}">SALIN REKENING</button>
          </div>
        `).join("");

        giftGrid.querySelectorAll("[data-copy]").forEach(b => {
          b.addEventListener("click", () => {
            window.TemplateScript?.copyText(b.dataset.copy, "Rekening disalin");
          });
        });
      }

      // 12. RSVP & Live Streaming Binds
      dom.querySelectorAll('[data-bind="rsvpTitle"]').forEach(el => el.innerHTML = esc(rsvp.rsvpTitle || "RSVP"));
      dom.querySelectorAll('[data-bind="rsvpIntro"]').forEach(el => el.innerHTML = esc(rsvp.rsvpIntro || ""));

      dom.querySelectorAll('[data-bind="liveTitle"]').forEach(el => el.innerHTML = esc(live.liveTitle || "Live Streaming"));
      dom.querySelectorAll('[data-bind="liveIntro"]').forEach(el => el.innerHTML = esc(live.liveIntro || ""));

      const liveBtn = dom.getElementById("liveBtn");
      if (liveBtn) liveBtn.href = safeUrl(live.liveUrl);

      // 13. Guestbook Wishes Binds
      dom.querySelectorAll('[data-bind="guestTitle"]').forEach(el => el.innerHTML = esc(guestBook.guestTitle || "Wishes"));
      dom.querySelectorAll('[data-bind="guestIntro"]').forEach(el => el.innerHTML = esc(guestBook.guestIntro || ""));

      // 14. Personalized Guest Names URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const guest = window.__INITIAL_INVITATION_GUEST__ || urlParams.get("to");
      const coverGuest = dom.getElementById("coverGuestName");
      const greeting = dom.getElementById("guestGreeting");
      if (greeting) {
        if (guest) {
          greeting.textContent = `${guestData.guestPrefix || "Kepada Yth."} ${guest}`;
          greeting.classList.add("show");
        } else {
          greeting.classList.remove("show");
        }
      }
      if (coverGuest) {
        coverGuest.textContent = guest || guestData.guestFallback || "Bapak / Ibu / Saudara / i";
      }

      // 15. Countdown Date Update
      if (window.TemplateScript?.updateCountdown) {
        window.TemplateScript.updateCountdown(event.target || general.date);
      }

      // 16. Audio Source Update
      const musicEl = dom.getElementById("music");
      if (musicEl) {
        const musicSrc = musicData.music || "";
        if (musicSrc) {
          if (musicEl.src !== musicSrc) {
            musicEl.src = safeUrl(musicSrc);
            musicEl.load();
          }
          if (window.__pendingMusicAutoplay) {
            musicEl.play().then(() => {
              window.__pendingMusicAutoplay = false;
              const musicBtn = dom.getElementById("musicBtn");
              if (musicBtn) musicBtn.textContent = "♫";
            }).catch(() => {});
          }
        }
      }

      // 17. Custom Colors Theme Styles
      if (style.colors) {
        const root = dom.documentElement;
        if (style.colors.primary) root.style.setProperty('--primary', style.colors.primary);
        if (style.colors.secondary) root.style.setProperty('--accent', style.colors.secondary);
        if (style.colors.background) root.style.setProperty('--bg', style.colors.background);
      }

      // Dynamic Title
      if (general.name1 || general.name2) {
        dom.title = `${general.name1 || ''} & ${general.name2 || ''} — Undangan Pernikahan`;
      }
    }
  };

  // Register Adapter Globally
  window.TemplateAdapter = TemplateAdapter;

  // Listen to postMessage events from the editor shell
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "RENDER_TEMPLATE") {
      window.invitationData = e.data.data;
      window.invitationAssetsPrefix = e.data.assetsPrefix;
      TemplateAdapter.render(document, e.data.data);
    }
    if (e.data && e.data.type === "OPEN_INVITATION") {
      const openBtn = document.getElementById("openBtn");
      if (openBtn) openBtn.click();
    }
  });

  // Signal readiness to parent shell
  if (window.parent && window.parent !== window.self) {
    window.parent.postMessage({ type: "TEMPLATE_READY" }, "*");
  }
})();
