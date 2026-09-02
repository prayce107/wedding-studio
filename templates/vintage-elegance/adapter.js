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

      // 1. Text Binds (General Info)
      dom.querySelectorAll('[data-bind="name1"]').forEach(el => el.innerHTML = esc(data.general.name1));
      dom.querySelectorAll('[data-bind="name2"]').forEach(el => el.innerHTML = esc(data.general.name2));
      dom.querySelectorAll('[data-bind="shortNames"]').forEach(el => el.innerHTML = esc(data.general.shortNames));
      dom.querySelectorAll('[data-bind="date"]').forEach(el => el.innerHTML = esc(data.general.date));
      dom.querySelectorAll('[data-bind="intro"]').forEach(el => el.innerHTML = esc(data.general.intro));
      dom.querySelectorAll('[data-bind="coupleIntro"]').forEach(el => el.innerHTML = esc(data.general.coupleIntro));
      dom.querySelectorAll('[data-bind="footerText"]').forEach(el => el.innerHTML = esc(data.general.footerText));

      // 2. Mempelai Pria (Groom)
      dom.querySelectorAll('[data-bind="groomName"]').forEach(el => el.innerHTML = esc(data.couple.groomName));
      dom.querySelectorAll('[data-bind="groomParents"]').forEach(el => el.innerHTML = nl(data.couple.groomParents));
      dom.querySelectorAll('[data-bind="groomBio"]').forEach(el => el.innerHTML = nl(data.couple.groomBio));

      // 3. Mempelai Wanita (Bride)
      dom.querySelectorAll('[data-bind="brideName"]').forEach(el => el.innerHTML = esc(data.couple.brideName));
      dom.querySelectorAll('[data-bind="brideParents"]').forEach(el => el.innerHTML = nl(data.couple.brideParents));
      dom.querySelectorAll('[data-bind="brideBio"]').forEach(el => el.innerHTML = nl(data.couple.brideBio));

      // 4. Photos (Hero, Groom, Bride)
      const heroPhoto = dom.getElementById("heroPhoto");
      if (heroPhoto) {
        heroPhoto.src = data.general.photoHero || (data.gallery.album[0]?.src || "");
      }
      const groomPhoto = dom.getElementById("groomPhoto");
      if (groomPhoto) {
        groomPhoto.src = data.couple.groomPhoto || (data.gallery.album[1]?.src || "");
      }
      const bridePhoto = dom.getElementById("bridePhoto");
      if (bridePhoto) {
        bridePhoto.src = data.couple.bridePhoto || (data.gallery.album[2]?.src || "");
      }

      // 5. Event Details
      dom.querySelectorAll('[data-bind="specialDay"]').forEach(el => el.innerHTML = esc(data.event.specialDay));
      dom.querySelectorAll('[data-bind="eventIntro"]').forEach(el => el.innerHTML = esc(data.event.eventIntro));
      dom.querySelectorAll('[data-bind="akadTitle"]').forEach(el => el.innerHTML = esc(data.event.akadTitle));
      dom.querySelectorAll('[data-bind="akadInfo"]').forEach(el => el.innerHTML = esc(data.event.akadInfo));
      dom.querySelectorAll('[data-bind="receptionTitle"]').forEach(el => el.innerHTML = esc(data.event.receptionTitle));
      dom.querySelectorAll('[data-bind="receptionInfo"]').forEach(el => el.innerHTML = esc(data.event.receptionInfo));
      dom.querySelectorAll('[data-bind="rsvpButton"]').forEach(el => el.innerHTML = esc(data.rsvp.rsvpButton));

      const akadVenue = dom.getElementById("akadVenueText");
      if (akadVenue) akadVenue.textContent = data.event.akadVenue || "";
      const recVenue = dom.getElementById("receptionVenueText");
      if (recVenue) recVenue.textContent = data.event.receptionVenue || "";
      const dress = dom.getElementById("eventDressText");
      if (dress) dress.textContent = data.event.eventDress || "";
      const note = dom.getElementById("eventNoteText");
      if (note) note.textContent = data.event.eventNote || "";

      // 6. Map Integration
      const mapsBtn = dom.getElementById("mapsBtn");
      if (mapsBtn) mapsBtn.href = safeUrl(data.venue.maps);

      const venueInfo = dom.getElementById("venueInfo");
      if (venueInfo) venueInfo.innerHTML = nl(data.venue.venueInfo);

      const venueNote = dom.getElementById("venueNote");
      if (venueNote) venueNote.innerHTML = nl(data.venue.venueNote || "");

      const mf = dom.getElementById("mapsFrame");
      const mp = dom.getElementById("mapPlaceholder");
      if (mf && mp) {
        const autoMap = data.venue.venueInfo ? `https://www.google.com/maps?q=${encodeURIComponent(data.venue.venueInfo.replace(/\n/g, ", "))}&output=embed` : "";
        const mapSrc = data.venue.mapsEmbed || autoMap;
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

      // 7. Day Program Timeline Binds
      const timelineContainer = dom.getElementById("programTimeline");
      if (timelineContainer) {
        const programItems = data.program?.items || [
          { time: "09.00 - 10.30", title: "Akad Nikah", desc: "Upacara sakral ijab kabul.", icon: "ceremony" },
          { time: "10.30 - 11.30", title: "Sesi Foto", desc: "Foto bersama seluruh keluarga.", icon: "cocktail" },
          { time: "11.30 - 13.30", title: "Resepsi & Jamuan", desc: "Makan siang bersama.", icon: "lunch" },
          { time: "13.30 - selesai", title: "Pemotongan Kue & Acara", desc: "Pemotongan kue dan ramah tamah.", icon: "cake" }
        ];
        timelineContainer.innerHTML = programItems.map(item => {
          const iconSvg = TimelineIcons[item.icon] || TimelineIcons.ceremony;
          return `
            <div class="program-item">
              <div class="program-icon-wrap">
                ${iconSvg}
              </div>
              <span class="program-time">${esc(item.time)}</span>
              <strong class="program-title">${esc(item.title)}</strong>
              <p class="program-desc">${esc(item.desc)}</p>
            </div>
          `;
        }).join("");
      }

      // 8. Accommodation Hotel Cards Binds
      const hotelsContainer = dom.getElementById("hotelsGrid");
      if (hotelsContainer) {
        const hotels = data.accommodation?.hotels || [
          { name: "Grand Estate Chateau", desc: "Akomodasi hotel bintang 5 dengan pelayanan klasik kelas atas.", address: "Jl. Royal Garden No. 1 (2 menit ke lokasi)", link: "https://booking.com" },
          { name: "The Olive Inn", desc: "Resort butik nyaman bernuansa taman hijau mediterania.", address: "Jl. Villa Hijau No. 10 (7 menit ke lokasi)", link: "https://booking.com" }
        ];
        hotelsContainer.innerHTML = hotels.map(h => `
          <div class="hotel-card">
            <div>
              <h3 class="hotel-name">${esc(h.name)}</h3>
              <p class="hotel-desc">
                ${esc(h.desc)}<br>
                <small style="opacity: 0.7; margin-top: 5px; display: inline-block;">📍 ${esc(h.address)}</small>
              </p>
            </div>
            <a class="book-btn" href="${safeUrl(h.link)}" target="_blank" rel="noopener">BOOK ROOM ↗</a>
          </div>
        `).join("");
      }

      // 9. Wedding Attire Palette Binds
      const attireIntro = dom.getElementById("attireIntroText");
      if (attireIntro && data.attire?.introText) {
        attireIntro.textContent = data.attire.introText;
      }
      const attireContainer = dom.getElementById("attirePalette");
      if (attireContainer) {
        const colors = data.attire?.colors || ["#121614", "#C5A880", "#FBF9F6", "#FFFFFF"];
        attireContainer.innerHTML = colors.map(c => `
          <div class="color-dot" style="background: ${esc(c)};" title="${esc(c)}"></div>
        `).join("");
      }

      // 10. Timeline Stories
      const timeline = dom.getElementById("timeline");
      if (timeline) {
        const stories = data.story.stories || [];
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

      // 11. Album Gallery (Polaroid Frames)
      const gallery = dom.getElementById("gallery");
      if (gallery) {
        const album = data.gallery.album || [];
        gallery.innerHTML = album.length ? album.map((x, i) => `
          <figure data-src="${esc(x.src)}">
            <img loading="lazy" src="${esc(x.src)}" alt="Album ${i + 1}">
            <figcaption>${esc(x.caption || "Our moment")}</figcaption>
          </figure>
        `).join("") : `<div class="publish-box">Belum ada foto album.</div>`;

        gallery.querySelectorAll("figure").forEach(fig => {
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

      // 12. Gift & Angpou Digital Details
      dom.querySelectorAll('[data-bind="angpouTitle"]').forEach(el => el.innerHTML = esc(data.gift.angpouTitle));
      dom.querySelectorAll('[data-bind="angpouIntro"]').forEach(el => el.innerHTML = esc(data.gift.angpouIntro));
      dom.querySelectorAll('[data-bind="angpouBank"]').forEach(el => el.innerHTML = esc(data.gift.angpouBank));
      dom.querySelectorAll('[data-bind="angpouOwner"]').forEach(el => el.innerHTML = esc(data.gift.angpouOwner));

      const angpouRek = dom.getElementById("angpouRek");
      if (angpouRek) angpouRek.value = data.gift.angpouRek || "";

      const copyAngpou = dom.getElementById("copyAngpou");
      if (copyAngpou) {
        copyAngpou.onclick = () => {
          window.TemplateScript?.copyText(data.gift.angpouRek, "Nomor rekening disalin");
        };
      }

      dom.querySelectorAll('[data-bind="giftSendTitle"]').forEach(el => el.innerHTML = esc(data.gift.giftSendTitle));
      dom.querySelectorAll('[data-bind="giftSendIntro"]').forEach(el => el.innerHTML = esc(data.gift.giftSendIntro));

      const giftAddress = dom.getElementById("giftAddress");
      if (giftAddress) giftAddress.innerHTML = nl(data.gift.giftAddress);

      dom.querySelectorAll('[data-bind="giftTitle"]').forEach(el => el.innerHTML = esc(data.gift.giftTitle));
      dom.querySelectorAll('[data-bind="giftIntro"]').forEach(el => el.innerHTML = esc(data.gift.giftIntro));

      const giftGrid = dom.getElementById("giftGrid");
      if (giftGrid) {
        const giftsList = data.gift.gifts || [];
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

      // 13. RSVP & Live Streaming Binds
      dom.querySelectorAll('[data-bind="rsvpTitle"]').forEach(el => el.innerHTML = esc(data.rsvp.rsvpTitle));
      dom.querySelectorAll('[data-bind="rsvpIntro"]').forEach(el => el.innerHTML = esc(data.rsvp.rsvpIntro));

      dom.querySelectorAll('[data-bind="liveTitle"]').forEach(el => el.innerHTML = esc(data.live.liveTitle));
      dom.querySelectorAll('[data-bind="liveIntro"]').forEach(el => el.innerHTML = esc(data.live.liveIntro));

      const liveBtn = dom.getElementById("liveBtn");
      if (liveBtn) liveBtn.href = safeUrl(data.live.liveUrl);

      // 14. Guestbook Wishes Binds
      dom.querySelectorAll('[data-bind="guestTitle"]').forEach(el => el.innerHTML = esc(data.guestBook.guestTitle));
      dom.querySelectorAll('[data-bind="guestIntro"]').forEach(el => el.innerHTML = esc(data.guestBook.guestIntro));

      // 15. Personalized Guest Names
      const urlParams = new URLSearchParams(window.location.search);
      const guest = urlParams.get("to");
      const coverGuest = dom.getElementById("coverGuestName");
      const greeting = dom.getElementById("guestGreeting");
      const guestData = data.guest || {};
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

      // 16. Countdown Date Update
      if (window.TemplateScript?.updateCountdown) {
        window.TemplateScript.updateCountdown(data.event.target);
      }

      // 17. Audio Source Update
      const music = dom.getElementById("music");
      if (music) {
        const musicSrc = data.music.music || "";
        if (musicSrc) {
          if (music.src !== musicSrc) {
            music.src = safeUrl(musicSrc);
          }
        } else {
          music.removeAttribute("src");
          music.load();
        }
      }

      // 18. Custom Colors Theme Styles
      if (data.style && data.style.colors) {
        const root = dom.documentElement;
        root.style.setProperty('--primary', data.style.colors.primary || '#1C1E1D');
        root.style.setProperty('--accent-gold', data.style.colors.secondary || '#C5A880');
        root.style.setProperty('--bg-light', data.style.colors.background || '#FBF9F6');
      }

      // Dynamic Title
      dom.title = `${data.general.name1} & ${data.general.name2} — Undangan Pernikahan`;
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
