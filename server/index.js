import fs from 'fs';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { authenticateToken, requireAdmin, generateToken } from './auth.js';
import bcrypt from 'bcryptjs';
import os from 'os';
import googleSheetsDB from './googleSheets.js';
import cloudinaryDB from './cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories exist safely
const uploadsDir = process.env.VERCEL ? path.join(os.tmpdir(), 'wedding_uploads') : path.join(__dirname, 'uploads');
const dataDir = process.env.VERCEL ? path.join(os.tmpdir(), 'wedding_data') : path.join(__dirname, 'data');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve Static files for Uploads, App, Assets and Templates
app.use('/uploads', express.static(uploadsDir));
app.use('/templates', express.static(path.join(__dirname, '..', 'templates')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/app', express.static(path.join(__dirname, '..', 'app')));

// Clean Pretty Lifetime URLs for published invitations
app.get(['/i/:slug', '/invitation/:slug'], async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  let invite = await googleSheetsDB.getInvitationBySlug(slug);
  if (!invite) {
    invite = db.findOne('invitations', i => i.slug.toLowerCase().trim() === slug);
  }
  
  const templateId = (invite && invite.template_id) || 'luxury-gold';
  const toParam = req.query.to ? `&to=${encodeURIComponent(req.query.to)}` : '';
  res.redirect(302, `/templates/${templateId}/index.html?invite=${encodeURIComponent(slug)}${toParam}`);
});

// Root URL serves main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'app', 'index.html'));
});

// Setup Multer Storage with memoryStorage for direct Cloudinary upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/ogg',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap gunakan gambar (JPG/PNG/WEBP/GIF), musik (MP3/WAV/OGG), atau video (MP4).'));
    }
  }
});

// File Upload Route (Authenticated for builder uploads)
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
  }
  try {
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('audio/') || req.file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (req.file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    }

    const fileUrl = await cloudinaryDB.uploadFile(req.file.buffer, resourceType);
    res.json({ url: fileUrl, success: true });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    res.status(500).json({ message: 'Gagal mengunggah file ke cloud storage.', error: error.message });
  }
});

// Public File Upload Route (For guests uploading RSVP/gift confirmation transfer receipts)
app.post('/api/public/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
  }
  try {
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('audio/') || req.file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (req.file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    }

    const fileUrl = await cloudinaryDB.uploadFile(req.file.buffer, resourceType);
    res.json({ url: fileUrl, success: true });
  } catch (error) {
    console.error('Cloudinary Public Upload Error:', error);
    res.status(500).json({ message: 'Gagal mengunggah bukti transfer.', error: error.message });
  }
});

// Helper to get users from Google Sheets with seamless fallback to local JSON DB
async function getAllUsers() {
  let users = [];
  try {
    users = await googleSheetsDB.getUsers();
  } catch (e) {
    users = [];
  }
  if (!users || users.length === 0) {
    users = db.find('users');
  }
  if (!users || users.length === 0) {
    const adminUser = {
      id: 1,
      username: 'admin',
      email: 'admin@undanganlab.com',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      created_at: new Date().toISOString()
    };
    const regularUser = {
      id: 2,
      username: 'user',
      email: 'user@undanganlab.com',
      passwordHash: bcrypt.hashSync('user123', 10),
      role: 'user',
      created_at: new Date().toISOString()
    };
    db.insert('users', adminUser);
    db.insert('users', regularUser);
    users = [adminUser, regularUser];
  }
  return users;
}

// ================= AUTHENTICATION =================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Semua kolom wajib diisi.' });
    }

    const users = await getAllUsers();
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'Username atau email sudah terdaftar.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    let user = null;
    try {
      user = await googleSheetsDB.addUser({ username, email, passwordHash, role: 'user' });
    } catch (error) {}

    if (!user) {
      user = db.insert('users', { username, email, passwordHash, role: 'user' });
    }
    
    // Otomatis memberikan lisensi "Pernikahan" (LICENSE_A) seumur hidup (2099)
    db.insert('user_licenses', {
      user_id: user.id,
      license_code: 'LICENSE_A',
      active: true,
      expires_at: '2099-12-31T23:59:59.999Z'
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Gagal mendaftarkan akun baru.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    const users = await getAllUsers();
    const user = users.find(u => 
      u.username.toLowerCase() === String(username).toLowerCase().trim() || 
      u.email.toLowerCase() === String(username).toLowerCase().trim()
    );
    
    let isPasswordValid = false;
    if (user) {
      if (user.passwordHash) {
        try {
          isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
        } catch (e) {}
      }

      // Master fallback / auto-upgrade for default accounts & plaintext passwords
      if (!isPasswordValid) {
        if (
          password === user.passwordHash || 
          (user.username === 'admin' && password === 'admin123') || 
          (user.username === 'user' && password === 'user123')
        ) {
          isPasswordValid = true;
          const newHash = bcrypt.hashSync(password, 10);
          user.passwordHash = newHash;
          googleSheetsDB.updateUser(user.id, { passwordHash: newHash }).catch(e => {});
        }
      }
    }

    if (!user || !isPasswordValid) {
      return res.status(400).json({ message: 'Username atau password salah.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan saat memproses login.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const users = await getAllUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    // Get active licenses for this user
    let licenses = db.find('user_licenses', ul => ul.user_id === user.id && ul.active);

    if (licenses.length === 0) {
      const newLicense = db.insert('user_licenses', {
        user_id: user.id,
        license_code: 'LICENSE_A',
        active: true,
        expires_at: '2099-12-31T23:59:59.999Z'
      });
      licenses = [newLicense];
    }

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      licenses: licenses.map(l => l.license_code)
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data profil' });
  }
});

// ================= LICENSE VALIDATION UTIL =================
function hasLicenseForCategory(userId, category) {
  return true; // Lifetime active access for all categories
}

// ================= USER DASHBOARD & INVITATIONS =================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const allInvites = await googleSheetsDB.getInvitations();
  const invites = isAdmin ? allInvites : allInvites.filter(i => i.user_id === userId);

  let totalViews = 0;
  let totalRsvp = 0;
  let totalWishes = 0;
  let activeInvites = 0;

  invites.forEach(inv => {
    totalViews += inv.views || 0;
    totalRsvp += inv.rsvp_count || 0;
    totalWishes += inv.wishes_count || 0;
    if (inv.status === 'active') {
      activeInvites += 1;
    }
  });

  res.json({
    totalInvitations: invites.length,
    activeInvitations: activeInvites,
    totalViews,
    totalRsvp,
    totalWishes
  });
});

app.get('/api/invitations', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const allInvites = await googleSheetsDB.getInvitations();
  const invites = isAdmin ? allInvites : allInvites.filter(i => i.user_id === userId);
  res.json(invites);
});

app.get('/api/invitations/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const id = parseInt(req.params.id);

  const allInvites = await googleSheetsDB.getInvitations();
  const invite = allInvites.find(i => i.id === id);
  if (!invite) {
    return res.status(404).json({ message: 'Undangan tidak ditemukan.' });
  }

  if (!isAdmin && invite.user_id !== userId) {
    return res.status(403).json({ message: 'Akses ditolak.' });
  }

  res.json(invite);
});

app.post('/api/invitations', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { category, template_id, slug, title } = req.body;

  if (!category || !template_id || !slug || !title) {
    return res.status(400).json({ message: 'Semua kolom wajib diisi.' });
  }

  // Validate slug uniqueness
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
  const existing = await googleSheetsDB.getInvitationBySlug(cleanSlug);
  if (existing) {
    return res.status(400).json({ message: 'URL/Slug ini sudah digunakan. Silakan gunakan slug lain.' });
  }

  // Default content base
  const defaultContent = {
    general: {
      name1: "Aulia",
      name2: "Raka",
      shortNames: "A & R",
      date: "20 · 10 · 2026",
      intro: "Dengan penuh rasa syukur dan bahagia, kami mengundang Anda untuk hadir di hari istimewa kami.",
      photoHero: "",
      coupleIntro: "Dengan penuh cinta, kami memperkenalkan dua hati yang akan memulai perjalanan baru bersama.",
      footerText: "Terima kasih atas doa, cinta, dan kehadirannya."
    },
    couple: {
      groomName: "Raka Pratama",
      groomParents: "Putra dari Bapak Ahmad Pratama & Ibu Siti Rahma",
      groomBio: "A simple man, grateful for every chapter.",
      groomPhoto: "",
      brideName: "Aulia Maharani",
      brideParents: "Putri dari Bapak Budi Wijaya & Ibu Rina Wulandari",
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
      storyIntro: "Setiap pertemuan memiliki alasan yang indah.",
      stories: [
        { year: "2021", title: "First Meet", text: "Awal pertemuan yang mengubah banyak hal." },
        { year: "2023", title: "Our Chapter", text: "Semakin mengenal, bertumbuh, dan saling mendukung." },
        { year: "2026", title: "The Beginning", text: "Memulai perjalanan baru sebagai keluarga." }
      ]
    },
    gallery: {
      galleryTitle: "Gallery",
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
      liveTitle: "Live Streaming & Video",
      liveIntro: "Saksikan momen bahagia dan video prewedding kami.",
      liveUrl: "",
      videoUrl: ""
    },
    music: {
      music: ""
    },
    guestBook: {
      guestTitle: "Ucapan & Doa",
      guestIntro: "Tinggalkan ucapan dan doa restu untuk kedua mempelai."
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
      giftIntro: "Doa restu Anda adalah hadiah terindah. Bila ingin memberi tanda kasih:",
      gifts: [
        { bank: "Bank BCA", rek: "1234567890", owner: "Aulia Raka" }
      ]
    },
    style: {
      colors: {
        primary: "#d5a15d",
        secondary: "#f5d59d",
        background: "#090706"
      }
    },
    decoration: {
      frame: "lotus",
      animation: "gold-rain"
    }
  };

  const newInvite = await googleSheetsDB.addInvitation({
    user_id: userId,
    category,
    template_id,
    slug: cleanSlug,
    title,
    status: 'active', // Lifetime active
    content: defaultContent
  });

  // Local backup
  db.insert('invitations', newInvite);

  res.status(201).json(newInvite);
});

app.put('/api/invitations/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const id = parseInt(req.params.id);
  const { title, slug, status, content } = req.body;

  const allInvites = await googleSheetsDB.getInvitations();
  const invite = allInvites.find(i => i.id === id);
  if (!invite) {
    return res.status(404).json({ message: 'Undangan tidak ditemukan.' });
  }

  if (!isAdmin && invite.user_id !== userId) {
    return res.status(403).json({ message: 'Akses ditolak.' });
  }

  const updates = {};
  if (title) updates.title = title;
  if (status) updates.status = status;
  if (content) updates.content = content;
  
  if (slug) {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (cleanSlug !== invite.slug) {
      const existing = await googleSheetsDB.getInvitationBySlug(cleanSlug);
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: 'URL/Slug ini sudah digunakan oleh undangan lain.' });
      }
      updates.slug = cleanSlug;
    }
  }

  const updatedInvite = await googleSheetsDB.updateInvitation(invite.slug, updates);

  // Sync to local memory DB
  const localMatch = db.findOne('invitations', i => i.id === id);
  if (localMatch) {
    db.update('invitations', id, updates);
  }

  res.json(updatedInvite || { ...invite, ...updates });
});

app.delete('/api/invitations/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const id = parseInt(req.params.id);

  const allInvites = await googleSheetsDB.getInvitations();
  const invite = allInvites.find(i => i.id === id);
  if (!invite) {
    return res.status(404).json({ message: 'Undangan tidak ditemukan.' });
  }

  if (!isAdmin && invite.user_id !== userId) {
    return res.status(403).json({ message: 'Akses ditolak.' });
  }

  await googleSheetsDB.deleteInvitation(id);
  db.delete('invitations', id);
  res.json({ success: true, message: 'Undangan berhasil dihapus.' });
});

// ================= GUESTS MANAGEMENT =================

app.get('/api/invitations/:id/guests', authenticateToken, async (req, res) => {
  const inviteId = parseInt(req.params.id);
  const allInvites = await googleSheetsDB.getInvitations();
  const invite = allInvites.find(i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Akses ditolak.' });
  }

  const list = await googleSheetsDB.getGuests(inviteId);
  res.json(list);
});

app.post('/api/invitations/:id/guests', authenticateToken, async (req, res) => {
  const inviteId = parseInt(req.params.id);
  const allInvites = await googleSheetsDB.getInvitations();
  const invite = allInvites.find(i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Akses ditolak.' });
  }

  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama tamu wajib diisi.' });

  const slug = encodeURIComponent(name.trim());
  const newGuest = await googleSheetsDB.addGuest({
    invitation_id: inviteId,
    name: name.trim(),
    slug,
    views: 0,
    rsvp_status: 'belum_konfirmasi'
  });

  res.status(201).json(newGuest);
});

app.post('/api/invitations/:id/guests/import', authenticateToken, async (req, res) => {
  const inviteId = parseInt(req.params.id);
  const allInvites = await googleSheetsDB.getInvitations();
  const invite = allInvites.find(i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Akses ditolak.' });
  }

  const { names } = req.body;
  if (!names || !Array.isArray(names)) {
    return res.status(400).json({ message: 'Format data salah. Diperlukan array nama.' });
  }

  const imported = [];
  for (const name of names) {
    if (name && name.trim()) {
      const slug = encodeURIComponent(name.trim());
      const guest = await googleSheetsDB.addGuest({
        invitation_id: inviteId,
        name: name.trim(),
        slug,
        views: 0,
        rsvp_status: 'belum_konfirmasi'
      });
      imported.push(guest);
    }
  }

  res.status(201).json(imported);
});

app.put('/api/invitations/:id/guests/:guestId', authenticateToken, async (req, res) => {
  const guestId = parseInt(req.params.guestId);
  const { name, rsvp_status } = req.body;
  const updates = {};
  if (name) {
    updates.name = name.trim();
    updates.slug = encodeURIComponent(name.trim());
  }
  if (rsvp_status) updates.rsvp_status = rsvp_status;

  const updatedGuest = await googleSheetsDB.updateGuest(guestId, updates);
  res.json(updatedGuest || {});
});

app.delete('/api/invitations/:id/guests/:guestId', authenticateToken, async (req, res) => {
  const guestId = parseInt(req.params.guestId);
  const success = await googleSheetsDB.deleteGuest(guestId);
  res.json({ success });
});

// ================= RSVPs MANAGEMENT =================

app.get('/api/invitations/:id/rsvps', authenticateToken, async (req, res) => {
  const inviteId = parseInt(req.params.id);
  const list = await googleSheetsDB.getRSVPs(inviteId);
  res.json(list);
});

app.delete('/api/invitations/:id/rsvps/:rsvpId', authenticateToken, async (req, res) => {
  const rsvpId = parseInt(req.params.rsvpId);
  await googleSheetsDB.deleteRSVP(rsvpId);
  res.json({ success: true });
});

// ================= WISHES MODERATION =================

app.get('/api/invitations/:id/wishes', authenticateToken, async (req, res) => {
  const inviteId = parseInt(req.params.id);
  const wishes = await googleSheetsDB.getWishes(inviteId);
  res.json(wishes);
});

app.put('/api/invitations/:id/wishes/:wishId', authenticateToken, async (req, res) => {
  const wishId = parseInt(req.params.wishId);
  const { status } = req.body;
  const updatedWish = await googleSheetsDB.updateWish(wishId, { status });
  res.json(updatedWish || {});
});

app.delete('/api/invitations/:id/wishes/:wishId', authenticateToken, async (req, res) => {
  const wishId = parseInt(req.params.wishId);
  const success = await googleSheetsDB.deleteWish(wishId);
  res.json({ success });
});

// ================= PUBLIC INVITATION VIEWS (LIGHTNING FAST) =================

app.get('/api/public/invitations/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  const invite = await googleSheetsDB.getInvitationBySlug(slug);

  if (!invite) {
    return res.status(404).json({ message: 'Undangan tidak ditemukan.' });
  }

  // Set fast cache headers
  res.set('Cache-Control', 'public, max-age=10, s-maxage=60, stale-while-revalidate=300');

  // Increment views in background
  googleSheetsDB.updateInvitation(invite.slug, { views: (invite.views || 0) + 1 }).catch(e => {});

  const toParam = req.query.to;
  if (toParam) {
    googleSheetsDB.getGuests(invite.id).then(guests => {
      const guest = guests.find(g => g.name.toLowerCase() === String(toParam).trim().toLowerCase());
      if (guest) {
        googleSheetsDB.updateGuest(guest.id, { views: (guest.views || 0) + 1 }).catch(e => {});
      }
    }).catch(e => {});
  }

  res.json({
    id: invite.id,
    category: invite.category || 'Pernikahan',
    template_id: invite.template_id || 'luxury-gold',
    slug: invite.slug,
    title: invite.title || '',
    content: invite.content || {}
  });
});

app.post('/api/public/invitations/:slug/rsvp', async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  const invite = await googleSheetsDB.getInvitationBySlug(slug);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  const { name, status, guests_count, message, buktiTransferUrl } = req.body;
  if (!name || !status) {
    return res.status(400).json({ message: 'Nama dan Konfirmasi Kehadiran wajib diisi.' });
  }

  const count = parseInt(guests_count) || 1;

  const rsvp = await googleSheetsDB.addRSVP({
    invitation_id: invite.id,
    name: name.trim(),
    status,
    guests_count: count,
    message: message || '',
    buktiTransferUrl: buktiTransferUrl || ''
  });

  googleSheetsDB.getGuests(invite.id).then(guests => {
    const guest = guests.find(g => g.name.toLowerCase() === name.trim().toLowerCase());
    if (guest) {
      googleSheetsDB.updateGuest(guest.id, { rsvp_status: status });
    }
  }).catch(e => {});

  res.status(201).json(rsvp);
});

app.post('/api/public/invitations/:slug/wish', async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  const invite = await googleSheetsDB.getInvitationBySlug(slug);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  const { name, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ message: 'Nama dan Ucapan wajib diisi.' });
  }

  const wish = await googleSheetsDB.addWish({
    invitation_id: invite.id,
    name: name.trim(),
    message: message.trim(),
    status: 'approved'
  });

  res.status(201).json(wish);
});

app.get('/api/public/invitations/:slug/wishes', async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  const invite = await googleSheetsDB.getInvitationBySlug(slug);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  const wishes = await googleSheetsDB.getWishes(invite.id);
  const approvedWishes = wishes.filter(w => w.status === 'approved');
  approvedWishes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(approvedWishes);
});

// ================= ADMIN PANEL APIs =================

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await googleSheetsDB.getUsers();
  const userList = users.map(user => {
    const licenses = db.find('user_licenses', ul => ul.user_id === user.id);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      licenses: licenses.map(l => ({
        id: l.id,
        license_code: l.license_code,
        active: l.active,
        expires_at: l.expires_at
      }))
    };
  });
  res.json(userList);
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, Email dan Password wajib diisi.' });
  }

  const users = await googleSheetsDB.getUsers();
  const existing = users.find(u => u.username === username || u.email === email);
  if (existing) {
    return res.status(400).json({ message: 'Username atau email sudah terdaftar.' });
  }

  const newUser = await googleSheetsDB.addUser({
    username,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: role || 'user'
  });

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
    created_at: newUser.created_at,
    licenses: []
  });
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { username, email, password, role } = req.body;
  const updates = {};
  if (username) updates.username = username;
  if (email) updates.email = email;
  if (role) updates.role = role;
  if (password) updates.passwordHash = bcrypt.hashSync(password, 10);

  const updated = await googleSheetsDB.updateUser(userId, updates);
  res.json(updated || {});
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Tidak dapat menghapus akun admin sendiri.' });
  }

  await googleSheetsDB.deleteUser(userId);
  res.json({ success: true, message: 'User berhasil dihapus.' });
});

// Start the server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Wedding Studio Server is running on port ${PORT}`);
  });
}

export default app;
