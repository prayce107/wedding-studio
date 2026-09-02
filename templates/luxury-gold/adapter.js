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

      // 7. Dynamic Frames (Lotus, Gold Classic, Minimal)
      const frameId = data.decoration.frame || "none";
      const leftFrame = dom.getElementById("frame-left");
      const rightFrame = dom.getElementById("frame-right");
      if (leftFrame && rightFrame) {
        if (frameId === "none") {
          leftFrame.innerHTML = "";
          rightFrame.innerHTML = "";
        } else {
          // Adjust paths depending on context (preview in iframe vs public page)
          // Look for assets relative to current file
          const assetsPrefix = window.invitationAssetsPrefix || "../../assets";
          const leftPath = `${assetsPrefix}/frames/${frameId}-left.svg`;
          const rightPath = `${assetsPrefix}/frames/${frameId}-right.svg`;

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

      // 8. Dynamic Animations (Gold Rain, Falling Leaves)
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

      // 9. Timeline Love Journey Stories
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

      // 10. Album Gallery
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

      // 11. Gift & Angpou Digital Details
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

      // 12. RSVP & Live Streaming Binds
      dom.querySelectorAll('[data-bind="rsvpTitle"]').forEach(el => el.innerHTML = esc(data.rsvp.rsvpTitle));
      dom.querySelectorAll('[data-bind="rsvpIntro"]').forEach(el => el.innerHTML = esc(data.rsvp.rsvpIntro));

      dom.querySelectorAll('[data-bind="liveTitle"]').forEach(el => el.innerHTML = esc(data.live.liveTitle));
      dom.querySelectorAll('[data-bind="liveIntro"]').forEach(el => el.innerHTML = esc(data.live.liveIntro));

      const liveBtn = dom.getElementById("liveBtn");
      if (liveBtn) liveBtn.href = safeUrl(data.live.liveUrl);

      // 13. Guestbook Wishes Binds
      dom.querySelectorAll('[data-bind="guestTitle"]').forEach(el => el.innerHTML = esc(data.guestBook.guestTitle));
      dom.querySelectorAll('[data-bind="guestIntro"]').forEach(el => el.innerHTML = esc(data.guestBook.guestIntro));

      // 14. Personalized Guest Names URL parameters
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

      // 15. Countdown Date Update
      if (window.TemplateScript?.updateCountdown) {
        window.TemplateScript.updateCountdown(data.event.target);
      }

      // 16. Audio Source Update
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

      // 17. Custom Colors & Fonts Theme Styles
      if (data.style && data.style.colors) {
        const root = dom.documentElement;
        root.style.setProperty('--gold', data.style.colors.primary || '#d5a15d');
        root.style.setProperty('--gold2', data.style.colors.secondary || '#f5d59d');
        root.style.setProperty('--bg', data.style.colors.background || '#090706');
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

  // Signal readiness to parent shell to avoid race conditions
  if (window.parent && window.parent !== window.self) {
    window.parent.postMessage({ type: "TEMPLATE_READY" }, "*");
  }
})();
