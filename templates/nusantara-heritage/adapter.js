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

      // 7. Dynamic Frames
      const frameId = data.decoration.frame || "none";
      const leftFrame = dom.getElementById("frame-left");
      const rightFrame = dom.getElementById("frame-right");
      if (leftFrame && rightFrame) {
        if (frameId === "none") {
          leftFrame.innerHTML = "";
          rightFrame.innerHTML = "";
        } else {
          const isCulturalFrame = ["javanese", "sundanese", "balinese", "minang", "bugis", "batak", "melayu"].includes(frameId);
          let leftPath, rightPath;
          if (isCulturalFrame) {
            leftPath = `assets/frames/${frameId}-left.svg`;
            rightPath = `assets/frames/${frameId}-right.svg`;
          } else {
            const assetsPrefix = window.invitationAssetsPrefix || "../../assets";
            leftPath = `${assetsPrefix}/frames/${frameId}-left.svg`;
            rightPath = `${assetsPrefix}/frames/${frameId}-right.svg`;
          }

          fetch(leftPath)
            .then(res => {
              if (!res.ok) throw new Error();
              return res.text();
            })
            .then(svg => { leftFrame.innerHTML = svg; })
            .catch(() => { leftFrame.innerHTML = ""; });

          fetch(rightPath)
            .then(res => {
              if (!res.ok) throw new Error();
              return res.text();
            })
            .then(svg => { rightFrame.innerHTML = svg; })
            .catch(() => { rightFrame.innerHTML = ""; });
        }
      }

      // 8. Dynamic Animations
      const animId = data.decoration.animation || "none";
      const animContainer = dom.getElementById("animation-container");
      if (animContainer) {
        if (animId === "none") {
          animContainer.innerHTML = "";
        } else {
          const assetsPrefix = window.invitationAssetsPrefix || "../../assets";
          const cssId = `anim-css-${animId}`;
          if (!dom.getElementById(cssId)) {
            const link = dom.createElement("link");
            link.id = cssId;
            link.rel = "stylesheet";
            link.href = `${assetsPrefix}/animations/${animId}.css`;
            dom.head.appendChild(link);
          }

          const jsId = `anim-js-${animId}`;
          if (!dom.getElementById(jsId)) {
            const script = dom.createElement("script");
            script.id = jsId;
            script.src = `${assetsPrefix}/animations/${animId}.js`;
            script.onload = () => {
              initializeAnimation(animId, animContainer, data.decoration);
            };
            dom.head.appendChild(script);
          } else {
            initializeAnimation(animId, animContainer, data.decoration);
          }
        }
      }

      // 9. Day Program Timeline Binds
      const timelineContainer = dom.getElementById("programTimeline");
      if (timelineContainer) {
        const programItems = data.program?.items || [
          { time: "08.00 - 09.30", title: "Akad Nikah", desc: "Upacara sakral ijab kabul.", icon: "ceremony" },
          { time: "09.30 - 10.30", title: "Sesi Foto", desc: "Foto bersama keluarga.", icon: "cocktail" },
          { time: "11.00 - 13.00", title: "Resepsi & Jamuan", desc: "Ramah tamah dan makan siang.", icon: "lunch" },
          { time: "13.00 - 13.30", title: "Potong Kue", desc: "Pemotongan kue pengantin.", icon: "cake" },
          { time: "13.30 - selesai", title: "Tarian & Pesta", desc: "Pesta dansa penutup.", icon: "party" }
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

      // 10. Accommodation (Where to Stay) Hotel Cards Binds
      const hotelsContainer = dom.getElementById("hotelsGrid");
      if (hotelsContainer) {
        const hotels = data.accommodation?.hotels || [
          { name: "The Plaza Hotel Nusantara", desc: "Hotel butik premium dengan pemandangan taman kota.", address: "Jl. Pemuda No. 10 (5 menit ke lokasi)", link: "https://booking.com" },
          { name: "Hotel Bowery Traditional", desc: "Penginapan berarsitektur kolonial dengan fasilitas lengkap.", address: "Jl. Sudirman No. 25 (10 menit ke lokasi)", link: "https://booking.com" }
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

      // 11. Wedding Attire Palette Binds
      const attireIntro = dom.getElementById("attireIntroText");
      if (attireIntro && data.attire?.introText) {
        attireIntro.textContent = data.attire.introText;
      }
      const attireContainer = dom.getElementById("attirePalette");
      if (attireContainer) {
        const colors = data.attire?.colors || ["#7D8C76", "#FAF6F0", "#4A1521", "#C5A880"];
        attireContainer.innerHTML = colors.map(c => `
          <div class="color-dot" style="background: ${esc(c)};" title="${esc(c)}"></div>
        `).join("");
      }

      // 12. Timeline Love Journey Stories
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

      // 13. Album Gallery
      const gallery = dom.getElementById("gallery");
      if (gallery) {
        const album = data.gallery.album || [];
        gallery.innerHTML = album.length ? album.map((x, i) => `
          <figure data-src="${esc(x.src)}">
            <img loading="lazy" src="${esc(x.src)}" alt="Album ${i + 1}">
            <figcaption>${esc(x.caption || "Our moment")}</figcaption>
          </figure>
        `).join("") : `<div class="publish-box">Belum ada foto album.</div>`;

        // Wire gallery click event
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

      // 14. Gift & Angpou Digital Details
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

      // 15. RSVP & Live Streaming / Video Binds
      dom.querySelectorAll('[data-bind="rsvpTitle"]').forEach(el => el.innerHTML = esc(data.rsvp.rsvpTitle));
      dom.querySelectorAll('[data-bind="rsvpIntro"]').forEach(el => el.innerHTML = esc(data.rsvp.rsvpIntro));

      dom.querySelectorAll('[data-bind="liveTitle"]').forEach(el => el.innerHTML = esc(data.live.liveTitle || 'Prewedding Video & Live'));
      dom.querySelectorAll('[data-bind="liveIntro"]').forEach(el => el.innerHTML = esc(data.live.liveIntro));

      const liveBtn = dom.getElementById("liveBtn");
      if (liveBtn) {
        if (data.live.liveUrl) {
          liveBtn.href = safeUrl(data.live.liveUrl);
          liveBtn.style.display = "inline-block";
        } else {
          liveBtn.style.display = "none";
        }
      }

      // Prewedding Video Embed
      const streamingScreen = dom.querySelector(".streaming-screen");
      if (streamingScreen) {
        let videoFrame = dom.getElementById("nusantaraVideoFrame");
        const videoUrl = data.live.videoUrl || "";
        if (videoUrl) {
          const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
          let embedSrc = videoUrl;
          if (ytMatch && ytMatch[1]) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
          else if (vimeoMatch && vimeoMatch[1]) embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

          if (!videoFrame) {
            videoFrame = dom.createElement("iframe");
            videoFrame.id = "nusantaraVideoFrame";
            videoFrame.setAttribute("allowfullscreen", "true");
            videoFrame.style.width = "100%";
            videoFrame.style.aspectRatio = "16/9";
            videoFrame.style.border = "1px solid rgba(213, 161, 93, 0.4)";
            videoFrame.style.borderRadius = "12px";
            videoFrame.style.marginBottom = "15px";
            streamingScreen.insertBefore(videoFrame, streamingScreen.firstChild);
          }
          if (videoFrame.src !== embedSrc) videoFrame.src = embedSrc;
          videoFrame.style.display = "block";
        } else if (videoFrame) {
          videoFrame.style.display = "none";
        }
      }

      // 16. Guestbook Wishes Binds
      dom.querySelectorAll('[data-bind="guestTitle"]').forEach(el => el.innerHTML = esc(data.guestBook.guestTitle));
      dom.querySelectorAll('[data-bind="guestIntro"]').forEach(el => el.innerHTML = esc(data.guestBook.guestIntro));

      // 17. Personalized Guest Names
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

      // 18. Countdown Date Update
      if (window.TemplateScript?.updateCountdown) {
        window.TemplateScript.updateCountdown(data.event.target);
      }

      // 19. Audio Source Update
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

      // 20. Custom Colors & Fonts Theme Styles
      if (data.style && data.style.colors) {
        const root = dom.documentElement;
        root.style.setProperty('--primary', data.style.colors.primary || '#4A1521');
        root.style.setProperty('--accent', data.style.colors.secondary || '#C5A880');
        root.style.setProperty('--bg', data.style.colors.background || '#2d0b12');
      }

      // Dynamic Title
      dom.title = `${data.general.name1} & ${data.general.name2} — Undangan Pernikahan`;
    }
  };

  function initializeAnimation(animId, container, decorationData) {
    let animObject = null;
    if (animId === "gold-rain") animObject = window.GoldRainAnimation;
    if (animId === "falling-leaves") animObject = window.FallingLeavesAnimation;

    if (animObject && animObject.init) {
      const settings = decorationData.animationSettings || {};
      animObject.init(container, settings);
    }
  }

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
