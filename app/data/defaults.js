const UniversalDefaults = {
  general: {
    name1: "Aulia",
    name2: "Raka",
    shortNames: "A & R",
    date: "20 · 10 · 2026",
    intro: "Dengan penuh rasa syukur dan bahagia, kami mengundang Anda untuk hadir dan menjadi bagian dari hari istimewa kami.",
    photoHero: "",
    coupleIntro: "Dengan penuh cinta, kami memperkenalkan dua hati yang akan memulai perjalanan baru bersama.",
    footerText: "Terima kasih atas doa, cinta, dan kehadirannya."
  },
  couple: {
    groomName: "Raka Pratama",
    groomParents: "Putra dari Bapak Ahmad Pratama\n& Ibu Siti Rahma",
    groomBio: "A simple man, grateful for every chapter.",
    groomPhoto: "",
    brideName: "Aulia Maharani",
    brideParents: "Putri dari Bapak Budi Wijaya\n& Ibu Rina Wulandari",
    brideBio: "A gentle soul with a beautiful heart.",
    bridePhoto: ""
  },
  event: {
    specialDay: "Our Special Day",
    eventIntro: "Hari bahagia kami akan dilaksanakan pada:",
    akadTitle: "AKAD NIKAH",
    akadInfo: "09.00 WIB · Selasa, 20 Oktober 2026",
    akadVenue: "Masjid Al-Ikhlas",
    receptionTitle: "RESEPSI",
    receptionInfo: "11.00 – 14.00 WIB · Selasa, 20 Oktober 2026",
    receptionVenue: "Gedung Pernikahan Aulia & Raka",
    eventDress: "Batik / Formal",
    eventNote: "Mohon hadir 30 menit sebelum acara dimulai.",
    target: "2026-10-20T09:00:00+07:00"
  },
  story: {
    storyTitle: "Our Story",
    storyIntro: "Setiap pertemuan memiliki alasan. Ceritakan perjalanan cinta kalian di sini.",
    stories: [
      { year: "2021", title: "First Meet", text: "Awal pertemuan yang mengubah banyak hal." },
      { year: "2023", title: "Our Chapter", text: "Semakin mengenal, bertumbuh, dan saling mendukung." },
      { year: "2026", title: "The Beginning", text: "Memulai perjalanan baru sebagai keluarga." }
    ]
  },
  gallery: {
    galleryTitle: "Our Moments",
    album: [
      { src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85", caption: "Our day" },
      { src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85", caption: "Forever" },
      { src: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=900&q=85", caption: "Details" }
    ]
  },
  guest: {
    guestPrefix: "Kepada Yth.",
    guestFallback: "Bapak / Ibu / Saudara / i",
    guests: []
  },
  venue: {
    venueTitle: "Our Place",
    venueInfo: "Gedung Pernikahan Aulia & Raka\nJl. Contoh Bahagia No. 20\nJakarta, Indonesia",
    maps: "https://www.google.com/maps",
    mapsEmbed: ""
  },
  rsvp: {
    rsvpTitle: "RSVP",
    rsvpIntro: "Mohon konfirmasi kehadiran Anda.",
    rsvpButton: "KIRIM KONFIRMASI"
  },
  live: {
    liveTitle: "Prewedding Video & Live",
    liveIntro: "Saksikan video perjalanan dan siaran langsung momen bahagia kami.",
    liveUrl: "",
    videoUrl: "" // YouTube Embed / MP4 URL
  },
  music: {
    music: "https://assets.mixkit.co/music/preview/mixkit-romantic-moment-wedding-tune-493.mp3"
  },
  guestBook: {
    guestTitle: "Ucapan & Doa",
    guestIntro: "Tinggalkan ucapan terbaik untuk kedua mempelai."
  },
  gift: {
    angpouTitle: "Berikan Angpou",
    angpouIntro: "Bagi yang ingin memberikan tanda kasih secara digital.",
    angpouBank: "Bank BCA",
    angpouRek: "1234567890",
    angpouOwner: "Aulia Raka",
    giftSendTitle: "Kirim Kado",
    giftSendIntro: "Untuk keluarga dan sahabat yang ingin mengirim kado.",
    giftAddress: "Alamat penerimaan kado akan ditampilkan di sini.",
    giftTitle: "Wedding Gift",
    giftIntro: "Doa dan kehadiran Anda adalah hadiah terindah. Bila ingin mengirim tanda kasih, dapat melalui:",
    gifts: [
      { bank: "Bank BCA", rek: "1234567890", owner: "Aulia Raka" },
      { bank: "Bank Mandiri", rek: "9876543210", owner: "Aulia Raka" }
    ]
  },
  style: {
    colors: {
      primary: "#d5a15d",
      secondary: "#f5d59d",
      background: "#090706"
    },
    fonts: {
      headers: "Cormorant Garamond",
      body: "DM Sans"
    }
  },
  decoration: {
    frame: "lotus",
    animation: "gold-rain",
    decorations: []
  },
  heritage: {
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
    attireText: "Busana tradisional minangka lambang kasucian lan kajatdarian Jawi."
  },
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
  attire: {
    introText: "Para tamu undangan dipersilakan mengenakan pakaian adat Jawa atau formal bernuansa warna berikut:",
    colors: ["#7D8C76", "#FAF6F0", "#4A1521", "#C5A880"]
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalDefaults;
} else {
  window.UniversalDefaults = UniversalDefaults;
}
