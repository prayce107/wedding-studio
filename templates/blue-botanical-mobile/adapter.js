(() => {
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

  const setText = (dom, bind, value) => {
    dom.querySelectorAll(`[data-bind="${bind}"]`).forEach(el => {
      el.textContent = value ?? "";
    });
  };

  const TemplateAdapter = {
    render(dom, data) {
      if (!data) return;

      const general = data.general || {};
      const couple = data.couple || {};
      const event = data.event || {};
      const venue = data.venue || {};
      const story = data.story || {};
      const galleryData = data.gallery || {};
      const rsvp = data.rsvp || {};
      const live = data.live || {};
      const guestBook = data.guestBook || {};
      const gift = data.gift || {};
      const guest = data.guest || {};
      const musicData = data.music || {};
      const style = data.style || {};

      setText(dom, "name1", general.name1);
      setText(dom, "name2", general.name2);
      setText(dom, "shortNames", general.shortNames);
      setText(dom, "date", general.date);
      setText(dom, "intro", general.intro);
      setText(dom, "coupleIntro", general.coupleIntro);
      setText(dom, "footerText", general.footerText);
      setText(dom, "guestPrefix", guest.guestPrefix || "Kepada Yth.");

      setText(dom, "groomName", couple.groomName);
      dom.querySelectorAll('[data-bind="groomParents"]').forEach(el => el.innerHTML = nl(couple.groomParents));
      dom.querySelectorAll('[data-bind="groomBio"]').forEach(el => el.innerHTML = nl(couple.groomBio));
      setText(dom, "brideName", couple.brideName);
      dom.querySelectorAll('[data-bind="brideParents"]').forEach(el => el.innerHTML = nl(couple.brideParents));
      dom.querySelectorAll('[data-bind="brideBio"]').forEach(el => el.innerHTML = nl(couple.brideBio));

      setText(dom, "specialDay", event.specialDay);
      setText(dom, "eventIntro", event.eventIntro);
      setText(dom, "akadTitle", event.akadTitle);
      setText(dom, "akadInfo", event.akadInfo);
      setText(dom, "receptionTitle", event.receptionTitle);
      setText(dom, "receptionInfo", event.receptionInfo);

      const akadVenue = dom.getElementById("akadVenueText");
      if (akadVenue) akadVenue.textContent = event.akadVenue || "";
      const recVenue = dom.getElementById("receptionVenueText");
      if (recVenue) recVenue.textContent = event.receptionVenue || "";
      const dress = dom.getElementById("eventDressText");
      if (dress) dress.textContent = event.eventDress || "";
      const note = dom.getElementById("eventNoteText");
      if (note) note.textContent = event.eventNote || "";

      setText(dom, "storyTitle", story.storyTitle);
      setText(dom, "storyIntro", story.storyIntro);
      setText(dom, "galleryTitle", galleryData.galleryTitle);

      setText(dom, "venueTitle", venue.venueTitle);
      const venueInfo = dom.getElementById("venueInfo");
      if (venueInfo) venueInfo.innerHTML = nl(venue.venueInfo);
      const venueNote = dom.getElementById("venueNote");
      if (venueNote) venueNote.innerHTML = nl(venue.venueNote || "");

      setText(dom, "rsvpTitle", rsvp.rsvpTitle);
      setText(dom, "rsvpIntro", rsvp.rsvpIntro);
      setText(dom, "rsvpButton", rsvp.rsvpButton || "KIRIM RSVP");

      setText(dom, "liveTitle", live.liveTitle);
      setText(dom, "liveIntro", live.liveIntro);

      setText(dom, "guestTitle", guestBook.guestTitle);
      setText(dom, "guestIntro", guestBook.guestIntro);

      setText(dom, "angpouTitle", gift.angpouTitle);
      setText(dom, "angpouIntro", gift.angpouIntro);
      setText(dom, "angpouBank", gift.angpouBank);
      setText(dom, "angpouOwner", gift.angpouOwner);
      setText(dom, "giftSendTitle", gift.giftSendTitle);
      setText(dom, "giftSendIntro", gift.giftSendIntro);
      setText(dom, "giftTitle", gift.giftTitle);
      setText(dom, "giftIntro", gift.giftIntro);

      const heroSrc = general.photoHero || (galleryData.album?.[0]?.src || "");
      const groomSrc = couple.groomPhoto || (galleryData.album?.[1]?.src || "");
      const brideSrc = couple.bridePhoto || (galleryData.album?.[2]?.src || "");

      const coverPhoto = dom.getElementById("coverPhoto");
      if (coverPhoto) coverPhoto.src = heroSrc;
      const heroPhoto = dom.getElementById("heroPhoto");
      if (heroPhoto) heroPhoto.src = heroSrc;
      const groomPhoto = dom.getElementById("groomPhoto");
      if (groomPhoto) groomPhoto.src = groomSrc;
      const bridePhoto = dom.getElementById("bridePhoto");
      if (bridePhoto) bridePhoto.src = brideSrc;

      const urlParams = new URLSearchParams(window.location.search);
      const guestName = urlParams.get("to");
      const coverGuest = dom.getElementById("coverGuestName");
      const greeting = dom.getElementById("guestGreeting");

      if (coverGuest) {
        coverGuest.textContent = guestName || guest.guestFallback || "Bapak / Ibu / Saudara / i";
      }
      if (greeting) {
        if (guestName) {
          greeting.textContent = `${guest.guestPrefix || "Kepada Yth."} ${guestName}`;
          greeting.classList.add("show");
        } else {
          greeting.classList.remove("show");
        }
      }

      const mapsBtn = dom.getElementById("mapsBtn");
      if (mapsBtn) mapsBtn.href = safeUrl(venue.maps);

      const mf = dom.getElementById("mapsFrame");
      const mp = dom.getElementById("mapPlaceholder");
      if (mf && mp) {
        const autoMap = venue.venueInfo
          ? `https://www.google.com/maps?q=${encodeURIComponent(String(venue.venueInfo).replace(/\n/g, ", "))}&output=embed`
          : "";
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

      if (window.TemplateScript?.updateCountdown) {
        window.TemplateScript.updateCountdown(event.target);
      }

      const music = dom.getElementById("music");
      if (music) {
        const src = musicData.music || "";
        if (src) music.src = safeUrl(src);
        else {
          music.removeAttribute("src");
          music.load();
        }
      }

      const rek = dom.getElementById("angpouRek");
      if (rek) rek.textContent = gift.angpouRek || "";

      const address = dom.getElementById("giftAddress");
      if (address) address.innerHTML = nl(gift.giftAddress || "");

      const liveBtn = dom.getElementById("liveBtn");
      if (liveBtn) {
        if (live.liveUrl) {
          liveBtn.href = safeUrl(live.liveUrl);
          liveBtn.style.display = "inline-block";
        } else {
          liveBtn.style.display = "none";
        }
      }

      // Prewedding Video Embed
      const liveSection = dom.getElementById("liveSection");
      if (liveSection) {
        let videoFrame = dom.getElementById("botanicalVideoFrame");
        const videoUrl = live.videoUrl || "";
        if (videoUrl) {
          const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
          let embedSrc = videoUrl;
          if (ytMatch && ytMatch[1]) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
          else if (vimeoMatch && vimeoMatch[1]) embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

          if (!videoFrame) {
            videoFrame = dom.createElement("iframe");
            videoFrame.id = "botanicalVideoFrame";
            videoFrame.setAttribute("allowfullscreen", "true");
            videoFrame.style.width = "100%";
            videoFrame.style.aspectRatio = "16/9";
            videoFrame.style.border = "1px solid rgba(79, 118, 184, 0.3)";
            videoFrame.style.borderRadius = "14px";
            videoFrame.style.marginBottom = "15px";
            const targetContainer = liveSection.querySelector(".streaming-box") || liveSection;
            targetContainer.insertBefore(videoFrame, targetContainer.firstChild);
          }
          if (videoFrame.src !== embedSrc) videoFrame.src = embedSrc;
          videoFrame.style.display = "block";
        } else if (videoFrame) {
          videoFrame.style.display = "none";
        }
      }

      const root = dom.documentElement;
      const colors = style.colors || {};
      root.style.setProperty("--primary", colors.primary || "#4f76b8");
      root.style.setProperty("--primary-dark", colors.secondary || "#2f568f");
      root.style.setProperty("--page-bg", colors.background || "#f7f9f3");

      const timeline = dom.getElementById("timeline");
      if (timeline) {
        const stories = story.stories || [];
        timeline.innerHTML = stories.length ? stories.map(s => `
          <article class="story-item">
            <span class="story-year">${esc(s.year)}</span>
            <div class="story-dot"></div>
            <div class="story-box">
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.text)}</p>
            </div>
          </article>
        `).join("") : `<div class="empty-card">Belum ada cerita yang ditambahkan.</div>`;
      }

      const gallery = dom.getElementById("gallery");
      if (gallery) {
        const album = galleryData.album || [];
        gallery.innerHTML = album.length ? album.map((x, i) => `
          <figure data-src="${esc(x.src)}">
            <img loading="lazy" src="${esc(x.src)}" alt="${esc(x.caption || `Album ${i + 1}`)}">
            <figcaption>${esc(x.caption || "")}</figcaption>
          </figure>
        `).join("") : `<div class="empty-card">Belum ada foto album.</div>`;

        gallery.querySelectorAll("figure").forEach(fig => {
          fig.addEventListener("click", () => {
            const lbImg = dom.getElementById("lbImg");
            const lightbox = dom.getElementById("lightbox");
            if (lbImg && lightbox) {
              lbImg.src = fig.dataset.src;
              lightbox.classList.add("show");
              dom.body.classList.add("locked");
            }
          });
        });
      }

      const giftGrid = dom.getElementById("giftGrid");
      if (giftGrid) {
        const gifts = gift.gifts || [];
        giftGrid.innerHTML = gifts.length ? gifts.map(g => `
          <div class="gift-item">
            <strong>${esc(g.bank)}</strong>
            <span>${esc(g.rek)}</span>
            <small>${esc(g.owner)}</small>
            <button class="copy-blue" data-copy="${esc(g.rek)}">SALIN</button>
          </div>
        `).join("") : `<div class="empty-card">Belum ada data hadiah.</div>`;

        giftGrid.querySelectorAll("[data-copy]").forEach(btn => {
          btn.addEventListener("click", () => window.TemplateScript?.copyText(btn.dataset.copy, "Nomor rekening disalin"));
        });
      }

      dom.title = `${general.name1 || "Wedding"} & ${general.name2 || ""} — Undangan Pernikahan`;
    }
  };

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
