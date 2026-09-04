(() => {
  "use strict";

  // Global Error Boundary Banner
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    const banner = document.createElement("div");
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.width = "100%";
    banner.style.background = "#ff3333";
    banner.style.color = "#fff";
    banner.style.padding = "15px";
    banner.style.zIndex = "999999";
    banner.style.fontFamily = "monospace";
    banner.style.fontSize = "12px";
    banner.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
    banner.innerHTML = `<strong>Error Terdeteksi:</strong> ${msg} <br> <small>File: ${url} | Baris: ${lineNo}:${columnNo}</small>`;
    document.body.appendChild(banner);
    console.error("Global Error Captured:", msg, error);
    return false;
  };

  // State Management
  let activeSlug = "default";
  let activeDraft = {
    id: "invitation-default",
    templateId: "luxury-gold",
    status: "draft",
    data: {}
  };
  
  // Helpers
  const $ = id => document.getElementById(id);
  const esc = str => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  const toast = msg => {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t.timer);
    t.timer = setTimeout(() => t.classList.remove("show"), 1900);
  };

  // Get data path value (e.g., getValByPath(obj, "couple.groomName"))
  function getValByPath(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  // Set data path value (e.g., setValByPath(obj, "couple.groomName", "Raka"))
  function setValByPath(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((acc, part) => {
      if (!acc[part]) acc[part] = {};
      return acc[part];
    }, obj);
    target[last] = value;
  }

  // Clone Helper
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        if (target[key] === undefined) {
          target[key] = JSON.parse(JSON.stringify(source[key]));
        }
      }
    }
    return target;
  }

  const CulturalPresets = {
    javanese: {
      label: "JAVANESE HERITAGE",
      title: "Warisan yang Menyatukan",
      intro: "Tradisi, keluarga, lan simbol budaya dados bagian saking cariyos katresnan kita.",
      tradition: "Adat Krama Jawi",
      traditionText: "Tradisi Jawa ingkang nggadahi piwulang luhur lan pakurmatan dhateng tiyang sepuh.",
      motif: "Batik Parang",
      motifText: "Motif ingkang nggambaraken lampahing gesang lan keteguhan manah.",
      symbol: "Gunungan Kayon",
      symbolText: "Simbol alam semesta lan panggesangan manungsa ingkang laras.",
      attire: "Beskap Jawi & Kebaya",
      attireText: "Busana tradisional minangka lambang kasucian lan kajatdarian Jawi.",
      program: {
        items: [
          { time: "08.00 - 09.30", title: "Akad Nikah", desc: "Upacara sakral ijab kabul.", icon: "ceremony" },
          { time: "09.30 - 10.30", title: "Sesi Foto", desc: "Foto bersama keluarga.", icon: "cocktail" },
          { time: "11.00 - 13.00", title: "Resepsi & Jamuan", desc: "Ramah tamah dan makan siang.", icon: "lunch" },
          { time: "13.00 - 13.30", title: "Potong Kue", desc: "Pemotongan kue pengantin.", icon: "cake" },
          { time: "13.30 - selesai", title: "Tarian & Pesta", desc: "Pesta dansa penutup.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "The Plaza Hotel Javanese", desc: "Hotel butik premium dengan pemandangan taman kota.", address: "Jl. Pemuda No. 10 (5 menit ke lokasi)", link: "https://booking.com" },
          { name: "Hotel Bowery Traditional", desc: "Penginapan berarsitektur kolonial dengan fasilitas lengkap.", address: "Jl. Sudirman No. 25 (10 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan pakaian adat Jawa atau formal bernuansa warna berikut:",
        colors: ["#7D8C76", "#FAF6F0", "#4A1521", "#C5A880"]
      }
    },
    sundanese: {
      label: "SUNDANESE HERITAGE",
      title: "Rasa Sareng Warisan Hurip",
      intro: "Sareng rasa hormat ka leluhur, urang ngahijikeun dua kulawarga dina tali asih.",
      tradition: "Upacara Adat Sunda",
      traditionText: "Nyangkut panyaweran, nincak endog, sareng patarik-tarik bakakak.",
      motif: "Batik Megamendung / Merak",
      motifText: "Simbol kain sunda nu pinuh ku kaéndahan sareng kasucian.",
      symbol: "Kujang",
      symbolText: "Simbol kakuatan, kaadilan, sareng panyalindungan kulawarga.",
      attire: "Kebaya Sunda & Siger",
      attireText: "Keindahan busana pengantin Sunda dengan siger mahkota yang agung.",
      program: {
        items: [
          { time: "08.00 - 09.30", title: "Akad Nikah", desc: "Ijab kabul adat Sunda.", icon: "ceremony" },
          { time: "09.30 - 11.00", title: "Upacara Sawer", desc: "Saweran sawer endog adat Sunda.", icon: "cocktail" },
          { time: "11.00 - 13.00", title: "Resepsi & Hiburan", desc: "Jamuan makan dan pertunjukan musik.", icon: "lunch" },
          { time: "13.00 - 13.30", title: "Huap Lingkung", desc: "Suapan nasi kuning manis.", icon: "cake" },
          { time: "13.30 - selesai", title: "Sesi Foto & Ramah Tamah", desc: "Foto bersama seluruh tamu.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "Grand Siger Hotel", desc: "Akomodasi bintang 4 mewah dengan dekorasi Sunda.", address: "Jl. Riau No. 12 (7 menit ke lokasi)", link: "https://booking.com" },
          { name: "Villa Priangan Heritage", desc: "Resort berkonsep alam pegunungan Sunda.", address: "Jl. Dago No. 80 (12 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan pakaian kebaya Sunda atau formal bernuansa warna berikut:",
        colors: ["#6B7F6C", "#FAF6F0", "#2E4A3E", "#D4AF37"]
      }
    },
    balinese: {
      label: "BALINESE HERITAGE",
      title: "Pawiwahan Agung Karang",
      intro: "Ring sajeroning rasa bhakti lan tresna, prasida ngamargiang pawiwahan manut adat Bali.",
      tradition: "Pawiwahan Adat Bali",
      traditionText: "Upacara suci madewa saksi lan papagungan ring kulawarga.",
      motif: "Kain Songket Bali",
      motifText: "Tenunan emas emas kemewahan tradisi para leluhur.",
      symbol: "Padma / Kamasan",
      symbolText: "Simbol kesucian pikiran dan keseimbangan alam semesta.",
      attire: "Payas Agung",
      attireText: "Kemegahan busana adat Payas Agung Bali dengan mahkota emas menjulang.",
      program: {
        items: [
          { time: "09.00 - 10.30", title: "Mekala-kalaan", desc: "Upacara pembersihan diri pengantin.", icon: "ceremony" },
          { time: "10.30 - 11.30", title: "Mewidhi Widana", desc: "Persembahyangan di Pemerajan.", icon: "cocktail" },
          { time: "12.00 - 14.30", title: "Jamuan Pawiwahan", desc: "Makan siang kuliner khas Bali.", icon: "lunch" },
          { time: "14.30 - 15.00", title: "Sesi Foto Adat", desc: "Foto dengan Payas Agung.", icon: "cake" },
          { time: "15.00 - selesai", title: "Ramah Tamah", desc: "Pelepasan balon dan ramah tamah.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "Ubud Padma Resort", desc: "Resort berkonsep alam tropis khas Bali.", address: "Jl. Hanoman Ubud (15 menit ke lokasi)", link: "https://booking.com" },
          { name: "Dewata Heritage Stay", desc: "Homestay tradisional dengan arsitektur Bali.", address: "Jl. Monkey Forest (10 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan busana adat Bali atau formal bernuansa warna berikut:",
        colors: ["#C29B38", "#FAF6F0", "#1C1C1C", "#8B0000"]
      }
    },
    minang: {
      label: "MINANG HERITAGE",
      title: "Baralek Gadang Minangkabau",
      intro: "Sasuai adat basandi syarak, syarak basandi kitabullah, duo jantuang disatukan.",
      tradition: "Baralek Adat Minang",
      traditionText: "Prosesi malam bainai, babako, sahinggo alek gadang.",
      motif: "Songket Pandai Sikek",
      motifText: "Keagungan tenunan emas songket Minang yang melegenda.",
      symbol: "Rumah Gadang",
      symbolText: "Simbol kehormatan, musyawarah, dan peran bundo kanduang.",
      attire: "Baju Kuruang & Suntiang",
      attireText: "Busana adat Minang lengkap dengan hiasan kepala Suntiang yang megah.",
      program: {
        items: [
          { time: "08.00 - 09.30", title: "Akad Nikah", desc: "Prosesi akad nikah resmi.", icon: "ceremony" },
          { time: "09.30 - 11.00", title: "Manjapuik Marapulai", desc: "Penjemputan pengantin pria.", icon: "cocktail" },
          { time: "11.00 - 13.30", title: "Baralek Gadang", desc: "Resepsi agung makan bajamba.", icon: "lunch" },
          { time: "13.30 - 14.00", title: "Tari Piring", desc: "Pertunjukan seni tari piring khas.", icon: "cake" },
          { time: "14.00 - selesai", title: "Foto & Doa", desc: "Foto bersama bundo kanduang.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "Grand Inna Muara Padang", desc: "Hotel premium dekat pantai dan pusat kota.", address: "Jl. Gereja No. 34 (8 menit ke lokasi)", link: "https://booking.com" },
          { name: "Minangkabau Heritage Hotel", desc: "Penginapan bernuansa khas rumah adat Minang.", address: "Jl. Khatib Sulaiman (12 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan pakaian adat Minang atau formal bernuansa warna berikut:",
        colors: ["#B8860B", "#FAF6F0", "#800020", "#556B2F"]
      }
    },
    bugis: {
      label: "BUGIS HERITAGE",
      title: "Mappabotting Ri Tana Celebes",
      intro: "Sipakatau, sipakalebbi, sipakainge, nauraga maseddi ri pamase Dewata.",
      tradition: "Mappabotting Adat Bugis",
      traditionText: "Prosesi madduttu, mappacci, hingga akad nikah kehormatan.",
      motif: "Sutra Lipa Sabbe",
      motifText: "Kain tenun sutra Bugis Makassar yang berwarna cerah penuh filosofi.",
      symbol: "Phinisi / Badik",
      symbolText: "Simbol keberanian, keteguhan hati, dan arah pelayaran hidup.",
      attire: "Baju Bodo & Jas Tutu",
      attireText: "Keunikan busana adat tertua Baju Bodo dengan sarung sutra bersinar.",
      program: {
        items: [
          { time: "09.00 - 10.30", title: "Mappacing", desc: "Ritual pensucian adat Bugis.", icon: "ceremony" },
          { time: "10.30 - 11.30", title: "Akad Nikah", desc: "Ijab kabul kehormatan.", icon: "cocktail" },
          { time: "11.30 - 14.00", title: "Walimah Resepsi", desc: "Jamuan makanan tradisional Bugis.", icon: "lunch" },
          { time: "14.00 - 14.30", title: "Mappalettu Dui", desc: "Sesi hantaran mas kawin.", icon: "cake" },
          { time: "14.30 - selesai", title: "Tarian & Foto", desc: "Pertunjukan tari Pakarena.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "Phinisi Heritage Hotel", desc: "Hotel modern dengan pemandangan pelabuhan Phinisi.", address: "Jl. Somba Opu (5 menit ke lokasi)", link: "https://booking.com" },
          { name: "Celebes Marine Resort", desc: "Resort tepi pantai eksklusif.", address: "Jl. Metro Tanjung Bunga (15 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan Baju Bodo, Jas Tutu, atau formal bernuansa warna berikut:",
        colors: ["#E0115F", "#FAF6F0", "#4B0082", "#FFD700"]
      }
    },
    batak: {
      label: "BATAK HERITAGE",
      title: "Ulaon Unjuk Hula-Hula",
      intro: "Renta roha mangadopi parpadanan na badia di jolo ni Debata lan adat Batak.",
      tradition: "Ulaon Unjuk Adat Batak",
      traditionText: "Pemberian Ulos, manjalo tumpak, dan pembagian jambar.",
      motif: "Ulos Ragi Hotang",
      motifText: "Ulos simbol pengikat kasih sayang dan ikatan pernikahan yang kokoh.",
      symbol: "Gorga Batak / Ruma Bolon",
      symbolText: "Simbol pelindung, kebenaran, dan lambang kekeluargaan Dalihan Na Tolu.",
      attire: "Baju Kurung & Sortali",
      attireText: "Busana pengantin adat Batak lengkap dengan mahkota Sortali.",
      program: {
        items: [
          { time: "08.00 - 10.00", title: "Pamasu-masuon", desc: "Pemberkatan suci di Gereja.", icon: "ceremony" },
          { time: "10.00 - 12.00", title: "Manjalo Ulos", desc: "Ritual penyematan Ulos oleh orang tua.", icon: "cocktail" },
          { time: "12.00 - 15.00", title: "Ulaon Unjuk", desc: "Pesta adat besar makan bersama.", icon: "lunch" },
          { time: "15.00 - 15.30", title: "Gondang Batak", desc: "Tarian tortor adat penghormatan.", icon: "cake" },
          { time: "15.30 - selesai", title: "Manjalo Tumpak", desc: "Salam penutup dari keluarga.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "Lake Toba Heritage Inn", desc: "Hotel premium menghadap pemandangan Danau Toba.", address: "Jl. Parapat No. 45 (10 menit ke lokasi)", link: "https://booking.com" },
          { name: "Ruma Bolon Stay", desc: "Penginapan tradisional berarsitektur Batak.", address: "Jl. Balige No. 12 (15 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan busana dengan aksen Ulos atau formal bernuansa warna berikut:",
        colors: ["#800000", "#FAF6F0", "#000000", "#C0C0C0"]
      }
    },
    melayu: {
      label: "MALAY HERITAGE",
      title: "Adat Bersanding Melayu",
      intro: "Tepuk tepung tawar dipersembahkan, doa restu ikatan kasih diikrarkan.",
      tradition: "Adat Resepsi Melayu",
      traditionText: "Prosesi tepuk tepung tawar, berarak, dan merisik adat.",
      motif: "Tenun Songket Riau",
      motifText: "Tenunan corak berbenang emas yang elok nan santun bertradisi.",
      symbol: "Sirih Junjung",
      symbolText: "Simbol keterbukaan, kehormatan, dan kerukunan bersaudara.",
      attire: "Baju Melayu & Kebaya Labuh",
      attireText: "Busana Kebaya Labuh dan Songket bersamping yang sopan dan anggun.",
      program: {
        items: [
          { time: "08.30 - 09.30", title: "Akad Nikah", desc: "Ijab kabul pernikahan Melayu.", icon: "ceremony" },
          { time: "09.30 - 10.30", title: "Tepuk Tepung Tawar", desc: "Upacara doa restu adat Melayu.", icon: "cocktail" },
          { time: "11.00 - 13.30", title: "Alek Bersanding", desc: "Resepsi bersanding dan makan nasi hadap-hadapan.", icon: "lunch" },
          { time: "13.30 - 14.00", title: "Tari Persembahan", desc: "Tari sekapur sirih penyambutan.", icon: "cake" },
          { time: "14.00 - selesai", title: "Sesi Berfoto", desc: "Foto bersama kerabat diraja.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "Grand Riau Palace", desc: "Hotel mewah bernuansa melayu klasik modern.", address: "Jl. Sudirman Pekanbaru (6 menit ke lokasi)", link: "https://booking.com" },
          { name: "Lancang Kuning Inn", desc: "Penginapan nyaman bernuansa khas Melayu.", address: "Jl. Arifin Ahmad (11 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan Baju Kurung Melayu atau formal bernuansa warna berikut:",
        colors: ["#228B22", "#FAF6F0", "#FFD700", "#FF8C00"]
      }
    },
    nusantara: {
      label: "INDONESIAN HERITAGE",
      title: "Pesona Ragam Budaya Nusantara",
      intro: "Menyatukan keragaman tradisi Indonesia dalam ikatan suci pernikahan.",
      tradition: "Pernikahan Nusantara",
      traditionText: "Perpaduan harmonis berbagai tradisi suku bangsa Indonesia.",
      motif: "Batik Nusantara",
      motifText: "Keberagaman corak batik dari berbagai daerah di Indonesia.",
      symbol: "Garuda / Bhinneka",
      symbolText: "Simbol persatuan dalam perbedaan yang indah.",
      attire: "Busana Nasional Nusantara",
      attireText: "Pakaian adat Indonesia pilihan yang merepresentasikan keragaman budaya.",
      program: {
        items: [
          { time: "08.00 - 09.30", title: "Akad Nikah", desc: "Prosesi ijab kabul sakral.", icon: "ceremony" },
          { time: "09.30 - 11.00", title: "Prosesi Adat", desc: "Perpaduan upacara adat tradisional.", icon: "cocktail" },
          { time: "11.00 - 13.30", title: "Resepsi Nusantara", desc: "Jamuan resep makanan khas daerah.", icon: "lunch" },
          { time: "13.30 - 14.00", title: "Tari Nusantara", desc: "Ragam pertunjukan tari budaya.", icon: "cake" },
          { time: "14.00 - selesai", title: "Ramah Tamah", desc: "Foto bersama seluruh tamu daerah.", icon: "party" }
        ]
      },
      accommodation: {
        hotels: [
          { name: "The Plaza Hotel Nusantara", desc: "Hotel butik premium dengan pemandangan taman kota.", address: "Jl. Pemuda No. 10 (5 menit ke lokasi)", link: "https://booking.com" },
          { name: "Hotel Bowery Traditional", desc: "Penginapan berarsitektur kolonial dengan fasilitas lengkap.", address: "Jl. Sudirman No. 25 (10 menit ke lokasi)", link: "https://booking.com" }
        ]
      },
      attirePreset: {
        introText: "Para tamu undangan dipersilakan mengenakan busana nasional Indonesia atau formal bernuansa warna berikut:",
        colors: ["#7D8C76", "#FAF6F0", "#4A1521", "#C5A880"]
      }
    }
  };;

  // Initialize App
  async function init() {
    // Determine active slug from URL ?draft=slug
    const params = new URLSearchParams(window.location.search);
    const slugParam = params.get("draft") || params.get("invite") || params.get("slug");
    if (slugParam) activeSlug = slugParam.trim().toLowerCase();

    // Check template param if specified in URL
    const templateParam = params.get("template");

    // Load existing draft or load defaults
    let existing = null;
    try {
      if (window.publishService && typeof window.publishService.getDraft === 'function') {
        existing = await window.publishService.getDraft(activeSlug);
      }
    } catch (e) {
      console.warn("getDraft failed, fallback to defaults:", e);
    }

    const universalDefaults = window.UniversalDefaults || {};

    if (existing) {
      activeDraft = existing;
      if (!activeDraft.templateId && templateParam) activeDraft.templateId = templateParam;
      if (!activeDraft.templateId) activeDraft.templateId = "luxury-gold";
      // Deep merge defaults to guarantee all nested fields exist
      activeDraft.data = deepMerge(activeDraft.data || {}, universalDefaults);
    } else {
      activeDraft = {
        id: `invitation-${Date.now()}`,
        templateId: templateParam || "luxury-gold",
        status: "draft",
        data: clone(universalDefaults)
      };
      try {
        if (window.publishService && typeof window.publishService.saveDraft === 'function') {
          await window.publishService.saveDraft(activeSlug, activeDraft);
        }
      } catch (err) {
        console.warn("Initial saveDraft failed:", err);
      }
    }

    // Ensure fundamental data structures exist
    if (!activeDraft.data) activeDraft.data = clone(universalDefaults);
    if (!activeDraft.data.general) activeDraft.data.general = {};
    if (!activeDraft.data.couple) activeDraft.data.couple = {};
    if (!activeDraft.data.event) activeDraft.data.event = {};
    if (!activeDraft.data.decoration) activeDraft.data.decoration = {};

    // Set initial Javanese theme presets if it is Nusantara Heritage template and empty
    if (activeDraft.templateId === "nusantara-heritage") {
      if (!activeDraft.data.general.cultureTheme) {
        activeDraft.data.general.cultureTheme = "javanese";
      }
      if (!activeDraft.data.heritage && CulturalPresets.javanese) {
        activeDraft.data.heritage = clone(CulturalPresets.javanese);
        activeDraft.data.heritage.theme = "javanese";
      }
      if (!activeDraft.data.program && CulturalPresets.javanese?.program) {
        activeDraft.data.program = clone(CulturalPresets.javanese.program);
      }
      if (!activeDraft.data.accommodation && CulturalPresets.javanese?.accommodation) {
        activeDraft.data.accommodation = clone(CulturalPresets.javanese.accommodation);
      }
      if (!activeDraft.data.attire && CulturalPresets.javanese?.attirePreset) {
        activeDraft.data.attire = {
          introText: CulturalPresets.javanese.attirePreset.introText,
          colors: clone(CulturalPresets.javanese.attirePreset.colors)
        };
      }
    }

    if ($("publish-slug")) $("publish-slug").value = activeSlug;

    // Load template iframe with solid path
    const iframe = $("previewIframe");
    if (iframe) {
      iframe.src = `../../templates/${activeDraft.templateId || 'luxury-gold'}/index.html`;
      
      // Iframe loaded callback
      iframe.onload = () => {
        updatePreview();
      };
    }

    // Toggle template-specific sections
    updateTemplateSpecificVisibility();

    // Bind sidebar tabs
    bindTabs();

    // Bind UI accordions
    bindAccordions();

    // Bind device toggles
    bindDeviceToggles();

    // Populate editor fields
    populateEditorFields();

    // Setup input events
    setupInputBindings();

    // Bind cultural preset change event
    const themeSelect = $("cultureThemeSelect");
    if (themeSelect) {
      themeSelect.onchange = () => {
        const theme = themeSelect.value;
        const preset = CulturalPresets[theme];
        if (preset) {
          if (!activeDraft.data.heritage) activeDraft.data.heritage = {};
          activeDraft.data.heritage.theme = theme;
          activeDraft.data.heritage.label = preset.label;
          activeDraft.data.heritage.title = preset.title;
          activeDraft.data.heritage.intro = preset.intro;
          activeDraft.data.heritage.tradition = preset.tradition;
          activeDraft.data.heritage.traditionText = preset.traditionText;
          activeDraft.data.heritage.motif = preset.motif;
          activeDraft.data.heritage.motifText = preset.motifText;
          activeDraft.data.heritage.symbol = preset.symbol;
          activeDraft.data.heritage.symbolText = preset.symbolText;
          activeDraft.data.heritage.attire = preset.attire;
          activeDraft.data.heritage.attireText = preset.attireText;

          // Auto-set matching new presets
          if (preset.program) {
            activeDraft.data.program = clone(preset.program);
          }
          if (preset.accommodation) {
            activeDraft.data.accommodation = clone(preset.accommodation);
          }
          if (preset.attirePreset) {
            activeDraft.data.attire = {
              introText: preset.attirePreset.introText,
              colors: clone(preset.attirePreset.colors)
            };
          }

          // Auto-set frame matching the theme
          if (theme !== "nusantara") {
            activeDraft.data.decoration.frame = theme;
          } else {
            activeDraft.data.decoration.frame = "none";
          }

          populateEditorFields();
          populateFrameSelector();
          
          if (activeDraft.templateId === "nusantara-heritage") {
            renderProgramList();
            renderHotelsList();
            setupAttireColorPickers();
          }

          updatePreview();
          triggerAutoSave();
        }
      };
    }

    // Render lists
    renderStoryList();
    renderGiftList();
    renderAlbumList();
    renderGuestList();
    renderRSVPList();

    // Nusantara Heritage lists
    if (activeDraft.templateId === "nusantara-heritage") {
      renderProgramList();
      renderHotelsList();
      setupAttireColorPickers();
    }

    // Setup addition buttons
    $("addStoryBtn").onclick = addStoryNode;
    $("addGiftBtn").onclick = addGiftNode;
    $("add-guest-btn").onclick = addNewGuest;
    $("clearRSVPsBtn").onclick = clearRSVPData;
    $("publishSaveBtn").onclick = publishInvitation;
    $("headerPublishBtn").onclick = () => {
      // Switch tab to publish
      switchTab("publish");
      publishInvitation();
    };

    // Program & Hotels buttons
    const addProg = $("addProgramBtn");
    if (addProg) addProg.onclick = addProgramNode;
    const addHot = $("addHotelBtn");
    if (addHot) addHot.onclick = addHotelNode;

    // Setup Media & File uploads
    setupUploadHandlers();

    // Setup mobile preview toggle button
    const mEditBtn = $("mobileEditBtn");
    const mPrevBtn = $("mobilePreviewBtn");
    const toggleBtn = $("mobilePreviewToggle");
    
    if (mEditBtn && mPrevBtn) {
      const setMobileMode = (previewActive) => {
        if (previewActive) {
          document.body.classList.add("preview-active");
          mPrevBtn.classList.add("active");
          mEditBtn.classList.remove("active");
          if (toggleBtn) toggleBtn.textContent = "✍ Edit";
        } else {
          document.body.classList.remove("preview-active");
          mEditBtn.classList.add("active");
          mPrevBtn.classList.remove("active");
          if (toggleBtn) toggleBtn.textContent = "👁 Preview";
        }
      };
      
      mEditBtn.onclick = () => setMobileMode(false);
      mPrevBtn.onclick = () => setMobileMode(true);
      
      if (toggleBtn) {
        toggleBtn.onclick = () => {
          const isActive = document.body.classList.toggle("preview-active");
          setMobileMode(isActive);
        };
      }
    } else if (toggleBtn) {
      toggleBtn.onclick = () => {
        const isActive = document.body.classList.toggle("preview-active");
        toggleBtn.textContent = isActive ? "✍ Edit" : "👁 Preview";
      };
    }

    // Dynamic slug change handler
    const slugInput = $("publish-slug");
    if (slugInput) {
      slugInput.onchange = async () => {
        const val = slugInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
        if (!val) {
          slugInput.value = activeSlug;
          return toast("Alamat URL tidak boleh kosong");
        }
        
        if (val !== activeSlug) {
          const oldSlug = activeSlug;
          activeSlug = val;
          slugInput.value = val;
          
          // Update URL query parameters without page reload
          const newUrl = `${window.location.pathname}?draft=${val}`;
          window.history.pushState({ path: newUrl }, '', newUrl);
          
          toast("Memindahkan alamat URL...");
          try {
            // Save under new slug
            await window.publishService.saveDraft(activeSlug, activeDraft);
            // Delete old slug to avoid duplicate clutter
            await window.publishService.deleteDraft(oldSlug);
            toast("Alamat URL kustom berhasil diubah!");
          } catch (err) {
            console.error("Failed to rename slug:", err);
            toast("Gagal mengubah alamat URL.");
          }
        }
      };
    }
  }

  function updatePreview() {
    try {
      const iframe = $("previewIframe");
      if (!iframe || !iframe.contentWindow) return;

      // Send data via postMessage for CORS compatibility on file://
      const message = {
        type: "RENDER_TEMPLATE",
        data: activeDraft.data,
        assetsPrefix: "../../assets"
      };
      iframe.contentWindow.postMessage(message, "*");

      // Direct access fallback for same-origin
      try {
        iframe.contentWindow.invitationData = activeDraft.data;
        iframe.contentWindow.invitationAssetsPrefix = "../../assets";
        if (iframe.contentWindow.TemplateAdapter) {
          iframe.contentWindow.TemplateAdapter.render(iframe.contentWindow.document, activeDraft.data);
        }
      } catch (e) {
        // Ignore same-origin security warning if it's cross-origin
      }
    } catch (e) {
      console.warn("Pratinjau tidak dapat di-update (kemungkinan masalah lintas-asal / CORS):", e);
    }
  }

  // Trigger open invitation action in preview iframe
  function triggerOpenInvitation() {
    try {
      const iframe = $("previewIframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "OPEN_INVITATION" }, "*");
      }
    } catch (e) {
      console.warn("Gagal mengirim OPEN_INVITATION:", e);
    }
  }

  // Auto-Save Draft
  let saveTimer;
  function triggerAutoSave() {
    $("saveStatus").textContent = "Menyimpan draf...";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await window.publishService.saveDraft(activeSlug, activeDraft);
        $("saveStatus").textContent = "Draft tersimpan otomatis";
      } catch (e) {
        $("saveStatus").textContent = "Gagal menyimpan draf";
      }
    }, 1200);
  }

  // Populate form fields with data
  function populateEditorFields() {
    document.querySelectorAll("[data-edit]").forEach(el => {
      const path = el.dataset.edit;
      const val = getValByPath(activeDraft.data, path);
      
      if (el.type === "checkbox") {
        el.checked = !!val;
      } else if (el.type === "color") {
        el.value = val || "#000000";
      } else {
        el.value = val !== undefined ? val : "";
      }
    });

    // Populate previews
    if (activeDraft.data.general.photoHero) {
      $("preview-hero").src = activeDraft.data.general.photoHero;
      $("preview-hero").classList.remove("hidden");
    }
    if (activeDraft.data.couple.groomPhoto) {
      $("preview-groom").src = activeDraft.data.couple.groomPhoto;
      $("preview-groom").classList.remove("hidden");
    }
    if (activeDraft.data.couple.bridePhoto) {
      $("preview-bride").src = activeDraft.data.couple.bridePhoto;
      $("preview-bride").classList.remove("hidden");
    }
    
    // Populate music file label if exists
    if (activeDraft.data.music && activeDraft.data.music.music) {
      const placeholder = $("upload-music").nextElementSibling;
      if (placeholder) placeholder.textContent = "Musik Terpasang: (Lagu Simpanan)";
    }

    // Set active Frame & Animation selected values
    populateFrameSelector();

    const currentAnim = activeDraft.data.decoration.animation || "none";
    document.querySelectorAll("#animSelector .asset-option").forEach(opt => {
      if (opt.dataset.value === currentAnim) opt.classList.add("active");
      else opt.classList.remove("active");
    });

    // Set animation sliders
    if (activeDraft.data.decoration.animationSettings) {
      const s = activeDraft.data.decoration.animationSettings;
      $("anim-density").value = s.density || 24;
      $("anim-density").nextElementSibling.textContent = s.density || 24;

      $("anim-speed").value = s.speed || 1;
      $("anim-speed").nextElementSibling.textContent = `${s.speed || 1}x`;

      $("anim-size").value = s.size || 1;
      $("anim-size").nextElementSibling.textContent = `${s.size || 1}x`;

      $("anim-opacity").value = s.opacity || 0.75;
      $("anim-opacity").nextElementSibling.textContent = s.opacity || 0.75;
    }
  }

  // Setup dynamic inputs changes
  function setupInputBindings() {
    document.querySelectorAll("[data-edit]").forEach(el => {
      const handler = () => {
        const path = el.dataset.edit;
        let value = el.value;
        if (el.type === "checkbox") value = el.checked;
        if (el.type === "number") value = parseInt(el.value, 10) || 0;
        
        setValByPath(activeDraft.data, path, value);
        updatePreview();
        triggerAutoSave();
      };
      
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });

    // Frame selector dynamic click bindings are handled inside populateFrameSelector

    // Animation Selector Option Click
    document.querySelectorAll("#animSelector .asset-option").forEach(opt => {
      opt.onclick = () => {
        document.querySelectorAll("#animSelector .asset-option").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        
        activeDraft.data.decoration.animation = opt.dataset.value;
        updatePreview();
        triggerAutoSave();
      };
    });

    // Animation settings slider inputs
    const getSliderSettings = () => {
      return {
        density: parseInt($("anim-density").value, 10),
        speed: parseFloat($("anim-speed").value),
        size: parseFloat($("anim-size").value),
        opacity: parseFloat($("anim-opacity").value)
      };
    };

    const handleSlider = (el, suffix = "") => {
      el.oninput = () => {
        el.nextElementSibling.textContent = `${el.value}${suffix}`;
        activeDraft.data.decoration.animationSettings = getSliderSettings();
        updatePreview();
        triggerAutoSave();
      };
    };

    handleSlider($("anim-density"));
    handleSlider($("anim-speed"), "x");
    handleSlider($("anim-size"), "x");
    handleSlider($("anim-opacity"));
  }

  // Upload handlers
  function setupUploadHandlers() {
    // Cover Hero
    $("upload-hero").onchange = async e => {
      console.log("upload-hero change event fired");
      const file = e.target.files[0];
      if (!file) {
        console.log("No file selected for cover");
        return;
      }
      
      const placeholder = $("upload-hero").nextElementSibling;
      if (placeholder) placeholder.textContent = "Mengunggah: " + file.name;
      
      console.log("Cover file selected:", file.name, "size:", file.size, "type:", file.type);
      toast("Mengunggah foto cover...");
      try {
        const url = await window.storageService.uploadFile(file);
        console.log("Cover file successfully read as Data URL, length:", url.length);
        
        if (!activeDraft.data.general) activeDraft.data.general = {};
        activeDraft.data.general.photoHero = url;
        
        $("preview-hero").src = url;
        $("preview-hero").classList.remove("hidden");
        
        updatePreview();
        triggerOpenInvitation();
        triggerAutoSave();
        toast("Foto cover terpasang!");
        console.log("Cover file applied and draft saved.");
      } catch (err) {
        console.error("Cover upload failed:", err);
        toast("Upload cover gagal: " + err.message);
      }
    };

    // Groom Photo
    $("upload-groom").onchange = async e => {
      console.log("upload-groom change event fired");
      const file = e.target.files[0];
      if (!file) {
        console.log("No file selected for groom");
        return;
      }
      
      const placeholder = $("upload-groom").nextElementSibling;
      if (placeholder) placeholder.textContent = "Mengunggah: " + file.name;
      
      console.log("Groom file selected:", file.name, "size:", file.size, "type:", file.type);
      toast("Mengunggah foto pria...");
      try {
        const url = await window.storageService.uploadFile(file);
        console.log("Groom file successfully read as Data URL, length:", url.length);
        
        if (!activeDraft.data.couple) activeDraft.data.couple = {};
        activeDraft.data.couple.groomPhoto = url;
        
        $("preview-groom").src = url;
        $("preview-groom").classList.remove("hidden");
        
        updatePreview();
        triggerOpenInvitation();
        triggerAutoSave();
        toast("Foto pria terpasang!");
        console.log("Groom file applied and draft saved.");
      } catch (err) {
        console.error("Groom upload failed:", err);
        toast("Upload foto pria gagal: " + err.message);
      }
    };

    // Bride Photo
    $("upload-bride").onchange = async e => {
      console.log("upload-bride change event fired");
      const file = e.target.files[0];
      if (!file) {
        console.log("No file selected for bride");
        return;
      }
      
      const placeholder = $("upload-bride").nextElementSibling;
      if (placeholder) placeholder.textContent = "Mengunggah: " + file.name;
      
      console.log("Bride file selected:", file.name, "size:", file.size, "type:", file.type);
      toast("Mengunggah foto wanita...");
      try {
        const url = await window.storageService.uploadFile(file);
        console.log("Bride file successfully read as Data URL, length:", url.length);
        
        if (!activeDraft.data.couple) activeDraft.data.couple = {};
        activeDraft.data.couple.bridePhoto = url;
        
        $("preview-bride").src = url;
        $("preview-bride").classList.remove("hidden");
        
        updatePreview();
        triggerOpenInvitation();
        triggerAutoSave();
        toast("Foto wanita terpasang!");
        console.log("Bride file applied and draft saved.");
      } catch (err) {
        console.error("Bride upload failed:", err);
        toast("Upload foto wanita gagal: " + err.message);
      }
    };

    // Album Upload (Multi)
    $("upload-album").onchange = async e => {
      console.log("upload-album change event fired");
      const files = Array.from(e.target.files);
      if (!files.length) {
        console.log("No files selected for gallery");
        return;
      }
      
      const placeholder = $("upload-album").nextElementSibling;
      if (placeholder) placeholder.textContent = `Mengunggah ${files.length} foto...`;
      
      console.log("Gallery files count:", files.length);
      toast(`Mengunggah ${files.length} foto album...`);
      try {
        if (!activeDraft.data.gallery) activeDraft.data.gallery = {};
        if (!activeDraft.data.gallery.album) activeDraft.data.gallery.album = [];
        
        for (const f of files) {
          console.log("Reading gallery file:", f.name, "size:", f.size);
          const url = await window.storageService.uploadFile(f);
          activeDraft.data.gallery.album.push({
            src: url,
            caption: f.name.replace(/\.[^/.]+$/, "")
          });
        }
        
        renderAlbumList();
        updatePreview();
        triggerOpenInvitation();
        triggerAutoSave();
        toast("Foto ditambahkan ke album!");
        console.log("Gallery files added and draft saved.");
      } catch (err) {
        console.error("Gallery upload failed:", err);
        toast("Sebagian foto gagal diunggah: " + err.message);
      }
    };

    // Music Audio Upload
    $("upload-music").onchange = async e => {
      console.log("upload-music change event fired");
      const file = e.target.files[0];
      if (!file) {
        console.log("No audio file selected");
        return;
      }
      
      console.log("Audio file selected:", file.name, "size:", file.size, "type:", file.type);
      toast("Mengunggah lagu MP3 ke Cloud CDN...");
      try {
        const url = await window.storageService.uploadFile(file);
        console.log("Audio file successfully uploaded, length:", url.length);
        
        if (!activeDraft.data.music) activeDraft.data.music = {};
        activeDraft.data.music.music = url;
        
        const musicInput = document.querySelector('[data-edit="music.music"]');
        if (musicInput) musicInput.value = url;
        
        const placeholder = $("upload-music").nextElementSibling;
        if (placeholder) placeholder.textContent = "Musik Terpasang: " + file.name;
        
        updatePreview();
        triggerOpenInvitation();
        triggerAutoSave();
        toast("Musik MP3 terpasang!");
        console.log("Audio file applied and draft saved.");
      } catch (err) {
        console.error("Audio upload failed:", err);
        toast("Lagu gagal diunggah: " + err.message);
      }
    };

    // Preset Music Dropdown
    const presetSelect = $("presetMusicSelect");
    if (presetSelect) {
      presetSelect.onchange = () => {
        const val = presetSelect.value;
        if (val) {
          if (!activeDraft.data.music) activeDraft.data.music = {};
          activeDraft.data.music.music = val;
          
          const musicInput = document.querySelector('[data-edit="music.music"]');
          if (musicInput) musicInput.value = val;
          
          updatePreview();
          triggerOpenInvitation();
          triggerAutoSave();
          toast("Musik romantis dipilih!");
        }
      };
    }

    // Test Music Audio Player
    let previewAudio = null;
    const testBtn = $("testMusicBtn");
    if (testBtn) {
      testBtn.onclick = () => {
        const musicUrl = (activeDraft.data.music && activeDraft.data.music.music) || "";
        if (!musicUrl) {
          return toast("Pilih atau masukkan link musik terlebih dahulu");
        }

        if (previewAudio && !previewAudio.paused) {
          previewAudio.pause();
          testBtn.textContent = "▶ Play";
          toast("Musik dijeda");
        } else {
          if (!previewAudio || previewAudio.src !== musicUrl) {
            previewAudio = new Audio(musicUrl);
            previewAudio.onended = () => { testBtn.textContent = "▶ Play"; };
          }
          previewAudio.play().then(() => {
            testBtn.textContent = "⏸ Pause";
            toast("Memutar preview musik...");
          }).catch(err => {
            toast("Gagal memutar audio: " + err.message);
          });
        }
      };
    }
  }

  // Love Story list rendering
  function renderStoryList() {
    const list = $("story-list");
    list.innerHTML = "";
    const stories = activeDraft.data.story.stories || [];

    stories.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "list-item-row";
      row.innerHTML = `
        <input type="text" value="${esc(item.year)}" class="story-yr" placeholder="Tahun">
        <input type="text" value="${esc(item.title)}" class="story-ttl" placeholder="Judul Momen">
        <button class="btn-remove">×</button>
        <input type="text" value="${esc(item.text)}" class="story-txt full-width" style="grid-column: span 3; margin-top: 4px;" placeholder="Teks cerita detail...">
      `;

      const yearIn = row.querySelector(".story-yr");
      const titleIn = row.querySelector(".story-ttl");
      const textIn = row.querySelector(".story-txt");
      const removeBtn = row.querySelector(".btn-remove");

      const updateNode = () => {
        stories[index] = {
          year: yearIn.value,
          title: titleIn.value,
          text: textIn.value
        };
        updatePreview();
        triggerAutoSave();
      };

      yearIn.addEventListener("input", updateNode);
      titleIn.addEventListener("input", updateNode);
      textIn.addEventListener("input", updateNode);
      
      removeBtn.onclick = () => {
        stories.splice(index, 1);
        renderStoryList();
        updatePreview();
        triggerAutoSave();
      };

      list.appendChild(row);
    });
  }

  function addStoryNode() {
    if (!activeDraft.data.story.stories) activeDraft.data.story.stories = [];
    activeDraft.data.story.stories.push({
      year: "2027",
      title: "Judul Baru",
      text: "Tulis penjelasan cerita mimpimu..."
    });
    renderStoryList();
    updatePreview();
    triggerAutoSave();
  }

  // Other Transfer Accounts list rendering
  function renderGiftList() {
    const list = $("gift-list");
    list.innerHTML = "";
    const gifts = activeDraft.data.gift.gifts || [];

    gifts.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "list-item-row three-col";
      row.innerHTML = `
        <input type="text" value="${esc(item.bank)}" class="g-bank" placeholder="Bank">
        <input type="text" value="${esc(item.rek)}" class="g-rek" placeholder="Rekening">
        <input type="text" value="${esc(item.owner)}" class="g-owner" placeholder="Pemilik">
        <button class="btn-remove">×</button>
      `;

      const bankIn = row.querySelector(".g-bank");
      const rekIn = row.querySelector(".g-rek");
      const ownerIn = row.querySelector(".g-owner");
      const removeBtn = row.querySelector(".btn-remove");

      const updateNode = () => {
        gifts[index] = {
          bank: bankIn.value,
          rek: rekIn.value,
          owner: ownerIn.value
        };
        updatePreview();
        triggerAutoSave();
      };

      bankIn.addEventListener("input", updateNode);
      rekIn.addEventListener("input", updateNode);
      ownerIn.addEventListener("input", updateNode);

      removeBtn.onclick = () => {
        gifts.splice(index, 1);
        renderGiftList();
        updatePreview();
        triggerAutoSave();
      };

      list.appendChild(row);
    });
  }

  function addGiftNode() {
    if (!activeDraft.data.gift.gifts) activeDraft.data.gift.gifts = [];
    activeDraft.data.gift.gifts.push({
      bank: "Bank BCA",
      rek: "Rekening Baru",
      owner: activeDraft.data.gift.angpouOwner || ""
    });
    renderGiftList();
    updatePreview();
    triggerAutoSave();
  }

  // Album/Gallery Grid rendering
  function renderAlbumList() {
    const list = $("album-list");
    list.innerHTML = "";
    const album = activeDraft.data.gallery.album || [];

    album.forEach((item, index) => {
      const box = document.createElement("div");
      box.className = "album-item";
      box.innerHTML = `
        <img src="${esc(item.src)}" alt="">
        <button class="album-item-delete" title="Hapus Foto">×</button>
      `;
      box.querySelector(".album-item-delete").onclick = () => {
        album.splice(index, 1);
        renderAlbumList();
        updatePreview();
        triggerAutoSave();
      };
      list.appendChild(box);
    });
  }

  // Guest list manager
  function getGuestUrl(name) {
    return `${window.location.origin}/i/${activeSlug}?to=${encodeURIComponent(name)}`;
  }

  function getWhatsAppMessage(name, url) {
    const coupleName = (activeDraft.data.general && activeDraft.data.general.name1 && activeDraft.data.general.name2)
      ? `${activeDraft.data.general.name1} & ${activeDraft.data.general.name2}`
      : "Kami";
    
    return `Kepada Yth. Bapak/Ibu/Saudara/i *${name}*\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk hadir dan memberikan doa restu pada acara pernikahan kami:\n\n💍 *${coupleName}*\n\nUntuk informasi lengkap mengenai detail acara, waktu, dan lokasi, silakan buka tautan undangan digital berikut:\n${url}\n\nMerupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir.\n\nTerima kasih.`;
  }

  function renderGuestList() {
    const box = $("guest-admin-list");
    box.innerHTML = "";
    
    if (!activeDraft.data.guest) {
      activeDraft.data.guest = {
        guestPrefix: "Kepada Yth.",
        guestFallback: "Bapak / Ibu / Saudara / i",
        guests: []
      };
    }
    if (!activeDraft.data.guest.guests) {
      activeDraft.data.guest.guests = [];
    }
    
    const list = activeDraft.data.guest.guests;

    if (!list.length) {
      box.innerHTML = `<div class="publish-box">Belum ada tamu undangan terdaftar. Tambahkan nama tamu di atas untuk membuat link personal.</div>`;
      return;
    }

    list.forEach((g, index) => {
      const row = document.createElement("div");
      row.className = "guest-row";
      const url = getGuestUrl(g.name);
      
      row.innerHTML = `
        <div class="guest-row-header">
          <input type="text" value="${esc(g.name)}" class="guest-name-edit">
          <div class="guest-actions">
            <button class="btn-wa-share" style="background:#25D366; color:#fff; border:0; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;" title="Kirim Undangan via WhatsApp">📲 Kirim WA</button>
            <button class="btn-copy-link">Copy Link</button>
            <button class="btn-delete-guest">Hapus</button>
          </div>
        </div>
        <div class="guest-link-display">${esc(url)}</div>
      `;

      const input = row.querySelector(".guest-name-edit");
      input.onchange = () => {
        g.name = input.value.trim();
        renderGuestList();
        triggerAutoSave();
      };

      row.querySelector(".btn-wa-share").onclick = () => {
        const waText = encodeURIComponent(getWhatsAppMessage(g.name, url));
        window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
      };

      row.querySelector(".btn-copy-link").onclick = () => {
        navigator.clipboard.writeText(url)
          .then(() => toast("Link tamu disalin!"))
          .catch(() => toast("Gagal menyalin link."));
      };

      row.querySelector(".btn-delete-guest").onclick = () => {
        list.splice(index, 1);
        renderGuestList();
        triggerAutoSave();
      };

      box.appendChild(row);
    });
  }

  function addNewGuest() {
    const inEl = $("new-guest-name");
    const name = inEl.value.trim();
    if (!name) return toast("Isi nama tamu terlebih dahulu");
    
    if (!activeDraft.data.guest) {
      activeDraft.data.guest = {
        guestPrefix: "Kepada Yth.",
        guestFallback: "Bapak / Ibu / Saudara / i",
        guests: []
      };
    }
    if (!activeDraft.data.guest.guests) {
      activeDraft.data.guest.guests = [];
    }
    activeDraft.data.guest.guests.push({ name });
    
    inEl.value = "";
    renderGuestList();
    triggerAutoSave();
    toast("Tamu berhasil ditambahkan!");
  }

  // RSVP list report
  async function renderRSVPList() {
    const listEl = $("rsvp-admin-list");
    const statsEl = $("rsvp-stats-box");
    listEl.innerHTML = "";
    
    const rsvps = await window.rsvpService.get();
    
    // Stats calculation
    const total = rsvps.length;
    const present = rsvps.filter(x => x.attendance === "Hadir").length;
    const absent = total - present;
    
    statsEl.innerHTML = `
      <div class="rsvp-stat-card">
        <strong>${total}</strong>
        <span>Total RSVP</span>
      </div>
      <div class="rsvp-stat-card">
        <strong>${present}</strong>
        <span>Hadir</span>
      </div>
    `;

    if (!rsvps.length) {
      listEl.innerHTML = `<div class="publish-box">Belum ada respon RSVP masuk.</div>`;
      return;
    }

    rsvps.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "rsvp-card";
      
      const badgeClass = item.attendance === "Hadir" ? "hadir" : "tidak";
      const badgeText = item.attendance === "Hadir" ? `Hadir (${item.count} orang)` : "Tidak Hadir";
      
      card.innerHTML = `
        <div class="rsvp-card-header">
          <div>
            <span class="rsvp-name">${esc(item.name)}</span>
            <div class="rsvp-badge ${badgeClass}">${badgeText}</div>
          </div>
          <span class="rsvp-time">${esc(item.time)}</span>
        </div>
        ${item.message ? `<div class="rsvp-message">${esc(item.message)}</div>` : ""}
        <button class="rsvp-delete-btn">Hapus</button>
      `;

      card.querySelector(".rsvp-delete-btn").onclick = async () => {
        if (confirm("Hapus respon RSVP ini?")) {
          await window.rsvpService.delete(index);
          renderRSVPList();
          toast("Respon RSVP dihapus!");
        }
      };

      listEl.appendChild(card);
    });
  }

  async function clearRSVPData() {
    if (confirm("Hapus seluruh respon RSVP tamu? Tindakan ini tidak dapat dibatalkan.")) {
      await window.rsvpService.clear();
      renderRSVPList();
      toast("Seluruh RSVP dihapus!");
    }
  }

  // Publication
  async function publishInvitation() {
    const slugIn = $("publish-slug");
    const slug = slugIn.value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    if (!slug) return toast("Alamat URL tidak boleh kosong");

    toast("Sedang menerbitkan...");
    
    try {
      // Check if slug changed
      if (slug !== activeSlug) {
        // Transfer data to new slug
        activeSlug = slug;
        // Update URL query parameters without reloading
        const newUrl = `${window.location.pathname}?draft=${slug}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }

      activeDraft.status = "published";
      const res = await window.publishService.publish(slug, activeDraft);
      const fullUrl = `${window.location.origin}/i/${slug}`;
      const resultBox = $("publishedResult");
      
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="published-result-card">
            <h3>✓ Berhasil Diterbitkan!</h3>
            <p class="section-desc" style="color:#a3c285; margin-bottom:10px;">Undangan digital Anda kini aktif secara publik pada link berikut:</p>
            <code>${esc(fullUrl)}</code>
            <div class="result-actions">
              <button class="btn-primary" id="copyPubLink">Salin Link</button>
              <button class="btn-secondary" id="openPubLink">Buka Web</button>
            </div>
          </div>
        `;
        resultBox.classList.remove("hidden");
      }
      
      $("copyPubLink").onclick = () => {
        navigator.clipboard.writeText(fullUrl)
          .then(() => toast("Link undangan disalin!"))
          .catch(() => toast("Gagal menyalin link."));
      };

      $("openPubLink").onclick = () => {
        window.open(fullUrl, "_blank");
      };

      toast("Undangan berhasil diterbitkan!");
    } catch (e) {
      console.error(e);
      toast(e.message || "Gagal menerbitkan.");
    }
  }

  // Tabs switching
  function bindTabs() {
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.onclick = () => {
        switchTab(tab.dataset.tab);
      };
    });
  }

  function switchTab(tabId) {
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

    const activeTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add("active");
    
    // Design tab redirects to design/inputs
    if (tabId === "data") $("panel-data").classList.add("active");
    else if (tabId === "design") $("panel-design").classList.add("active");
    else if (tabId === "guests") {
      $("panel-guests").classList.add("active");
      renderGuestList();
    } else if (tabId === "rsvp") {
      $("panel-rsvp").classList.add("active");
      renderRSVPList();
    } else if (tabId === "publish") $("panel-publish").classList.add("active");
  }

  // Accordion Expand / Collapse
  function bindAccordions() {
    document.querySelectorAll(".accordion-header").forEach(header => {
      header.onclick = () => {
        const item = header.parentElement;
        const active = item.classList.contains("active");
        
        // Collapse sibling accordions in same group
        item.parentElement.querySelectorAll(".accordion-item").forEach(sib => sib.classList.remove("active"));
        
        if (!active) {
          item.classList.add("active");
          
          // Auto-open invitation in preview when entering inside sections
          if (!header.textContent.includes("Sampul") && !header.textContent.includes("Cover")) {
            triggerOpenInvitation();
          }
        }
      };
    });

    // Auto open first accordion in the active tab panel
    const firstAcc = document.querySelector(".tab-panel.active .accordion-item");
    if (firstAcc) firstAcc.classList.add("active");
  }

  // Device toggling (responsive mockup frame sizes)
  function bindDeviceToggles() {
    document.querySelectorAll(".device-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".device-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const device = btn.dataset.device;
        const vp = $("previewViewport");
        
        vp.className = `viewport-shell device-${device}`;
      };
    });
  }

  // Listen for template ready event to render initial preview safely
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "TEMPLATE_READY") {
      updatePreview();
    }
  });
  function updateTemplateSpecificVisibility() {
    document.querySelectorAll("[data-templates]").forEach(el => {
      const allowed = el.dataset.templates.split(",");
      if (allowed.includes(activeDraft.templateId)) {
        el.classList.remove("hidden-template-specific");
      } else {
        el.classList.add("hidden-template-specific");
      }
    });
  }

  function populateFrameSelector() {
    const selector = $("frameSelector");
    if (!selector) return;

    let frames = [
      { id: "none", name: "Tanpa Bingkai" },
      { id: "lotus", name: "Lotus Botanical" },
      { id: "gold-classic", name: "Classic Gold" },
      { id: "minimal", name: "Minimalist Border" }
    ];

    if (activeDraft.templateId === "nusantara-heritage") {
      frames = [
        { id: "none", name: "Tanpa Bingkai" },
        { id: "javanese", name: "Bingkai Jawa (Jawa)" },
        { id: "sundanese", name: "Bingkai Sunda (Sunda)" },
        { id: "balinese", name: "Bingkai Bali (Bali)" },
        { id: "minang", name: "Bingkai Minang (Minang)" },
        { id: "bugis", name: "Bingkai Bugis (Bugis)" },
        { id: "batak", name: "Bingkai Batak (Batak)" },
        { id: "melayu", name: "Bingkai Melayu (Melayu)" },
        ...frames.slice(1)
      ];
    }

    selector.innerHTML = frames.map(f => `
      <div class="asset-option" data-value="${f.id}">
        <div class="asset-preview-box" style="text-transform: capitalize; font-size: 10px;">${f.id.split('-')[0]}</div>
        <span style="font-size: 11px;">${f.name}</span>
      </div>
    `).join("");

    // Bind click events
    selector.querySelectorAll(".asset-option").forEach(opt => {
      opt.onclick = () => {
        selector.querySelectorAll(".asset-option").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        
        activeDraft.data.decoration.frame = opt.dataset.value;
        updatePreview();
        triggerAutoSave();
      };
    });

    // Mark current selected
    const currentFrame = activeDraft.data.decoration.frame || "none";
    selector.querySelectorAll(".asset-option").forEach(opt => {
      if (opt.dataset.value === currentFrame) opt.classList.add("active");
      else opt.classList.remove("active");
    });
  }

  // ----------------------------------------------------
  // NUSANTARA HERITAGE: DAY PROGRAM LIST MANAGER
  // ----------------------------------------------------
  function renderProgramList() {
    const list = $("program-list");
    if (!list) return;
    list.innerHTML = "";
    
    if (!activeDraft.data.program) activeDraft.data.program = { items: [] };
    const items = activeDraft.data.program.items || [];

    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "list-item-row";
      row.style.display = "grid";
      row.style.gridTemplateColumns = "80px 1fr 34px";
      row.style.gap = "6px";
      row.style.marginBottom = "8px";
      
      row.innerHTML = `
        <input type="text" value="${esc(item.time)}" class="prog-time" placeholder="Jam">
        <input type="text" value="${esc(item.title)}" class="prog-title" placeholder="Acara">
        <button class="btn-remove">×</button>
        <select class="prog-icon" style="grid-column: span 2; background:#060403; border:1px solid var(--border-color); color:#fff; padding:6px; border-radius:6px; font-size:11px; margin-top:2px;">
          <option value="ceremony" ${item.icon === 'ceremony' ? 'selected' : ''}>Ceremony (Cincin)</option>
          <option value="cocktail" ${item.icon === 'cocktail' ? 'selected' : ''}>Cocktail (Gelas)</option>
          <option value="lunch" ${item.icon === 'lunch' ? 'selected' : ''}>Lunch (Sendok Garpu)</option>
          <option value="cake" ${item.icon === 'cake' ? 'selected' : ''}>Cake (Kue)</option>
          <option value="party" ${item.icon === 'party' ? 'selected' : ''}>Party (Musik/Dansa)</option>
        </select>
        <input type="text" value="${esc(item.desc)}" class="prog-desc" style="grid-column: span 3; margin-top: 4px;" placeholder="Penjelasan acara singkat...">
      `;

      const timeIn = row.querySelector(".prog-time");
      const titleIn = row.querySelector(".prog-title");
      const descIn = row.querySelector(".prog-desc");
      const iconIn = row.querySelector(".prog-icon");
      const removeBtn = row.querySelector(".btn-remove");

      const updateNode = () => {
        items[index] = {
          time: timeIn.value,
          title: titleIn.value,
          desc: descIn.value,
          icon: iconIn.value
        };
        updatePreview();
        triggerAutoSave();
      };

      timeIn.addEventListener("input", updateNode);
      titleIn.addEventListener("input", updateNode);
      descIn.addEventListener("input", updateNode);
      iconIn.addEventListener("change", updateNode);
      
      removeBtn.onclick = () => {
        items.splice(index, 1);
        renderProgramList();
        updatePreview();
        triggerAutoSave();
      };

      list.appendChild(row);
    });
  }

  function addProgramNode() {
    if (!activeDraft.data.program) activeDraft.data.program = { items: [] };
    activeDraft.data.program.items.push({
      time: "10.00",
      title: "Kegiatan Baru",
      desc: "Tulis keterangan singkat...",
      icon: "ceremony"
    });
    renderProgramList();
    updatePreview();
    triggerAutoSave();
  }

  // ----------------------------------------------------
  // NUSANTARA HERITAGE: HOTEL ACCOMMODATIONS MANAGER
  // ----------------------------------------------------
  function renderHotelsList() {
    const list = $("hotels-list");
    if (!list) return;
    list.innerHTML = "";
    
    if (!activeDraft.data.accommodation) activeDraft.data.accommodation = { hotels: [] };
    const hotels = activeDraft.data.accommodation.hotels || [];

    hotels.forEach((hotel, index) => {
      const row = document.createElement("div");
      row.className = "list-item-row";
      row.style.marginBottom = "10px";
      
      row.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 34px; gap:6px;">
          <input type="text" value="${esc(hotel.name)}" class="hotel-name-input" style="font-weight:600;" placeholder="Nama Hotel">
          <button class="btn-remove">×</button>
        </div>
        <input type="text" value="${esc(hotel.desc)}" class="hotel-desc-input" style="width:100%; margin-top:4px;" placeholder="Penjelasan singkat/Fasilitas">
        <input type="text" value="${esc(hotel.address)}" class="hotel-address-input" style="width:100%; margin-top:4px;" placeholder="Jarak/Alamat Lengkap">
        <input type="text" value="${esc(hotel.link)}" class="hotel-link-input" style="width:100%; margin-top:4px; font-family:monospace; font-size:10px;" placeholder="Link Booking (https://...)">
      `;

      const nameIn = row.querySelector(".hotel-name-input");
      const descIn = row.querySelector(".hotel-desc-input");
      const addrIn = row.querySelector(".hotel-address-input");
      const linkIn = row.querySelector(".hotel-link-input");
      const removeBtn = row.querySelector(".btn-remove");

      const updateNode = () => {
        hotels[index] = {
          name: nameIn.value,
          desc: descIn.value,
          address: addrIn.value,
          link: linkIn.value
        };
        updatePreview();
        triggerAutoSave();
      };

      nameIn.addEventListener("input", updateNode);
      descIn.addEventListener("input", updateNode);
      addrIn.addEventListener("input", updateNode);
      linkIn.addEventListener("input", updateNode);
      
      removeBtn.onclick = () => {
        hotels.splice(index, 1);
        renderHotelsList();
        updatePreview();
        triggerAutoSave();
      };

      list.appendChild(row);
    });
  }

  function addHotelNode() {
    if (!activeDraft.data.accommodation) activeDraft.data.accommodation = { hotels: [] };
    activeDraft.data.accommodation.hotels.push({
      name: "Rekomendasi Hotel",
      desc: "Fasilitas kolam renang & sarapan gratis.",
      address: "Jl. Contoh Alamat (5 menit ke lokasi)",
      link: "https://booking.com"
    });
    renderHotelsList();
    updatePreview();
    triggerAutoSave();
  }

  // ----------------------------------------------------
  // NUSANTARA HERITAGE: ATTIRE PALETTE SWATCH
  // ----------------------------------------------------
  function setupAttireColorPickers() {
    if (!activeDraft.data.attire) {
      activeDraft.data.attire = {
        introText: "",
        colors: ["#7D8C76", "#FAF6F0", "#4A1521", "#C5A880"]
      };
    }
    
    // Set initial colors
    const colors = activeDraft.data.attire.colors || ["#7D8C76", "#FAF6F0", "#4A1521", "#C5A880"];
    
    for (let i = 1; i <= 4; i++) {
      const picker = $(`attireColor${i}`);
      if (picker) {
        picker.value = colors[i - 1] || "#000000";
        picker.onchange = () => {
          activeDraft.data.attire.colors[i - 1] = picker.value;
          updatePreview();
          triggerAutoSave();
        };
      }
    }

    const introIn = $("attireIntroInput");
    if (introIn) {
      introIn.value = activeDraft.data.attire.introText || "";
      introIn.oninput = () => {
        activeDraft.data.attire.introText = introIn.value;
        updatePreview();
        triggerAutoSave();
      };
    }
  }
  // Robust load initialization to ensure init() runs even if document is already loaded
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("load", init);
  }

})();
