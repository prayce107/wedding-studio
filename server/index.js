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
app.use(express.json());

// Serve Static files for Uploads, App, Assets and Templates
app.use('/uploads', express.static(uploadsDir));
app.use('/templates', express.static(path.join(__dirname, '..', 'templates')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/app', express.static(path.join(__dirname, '..', 'app')));

// Clean Pretty URLs for published invitations
app.get(['/i/:slug', '/invitation/:slug'], (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const invite = db.findOne('invitations', i => i.slug === slug);
  if (!invite) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Undangan Tidak Ditemukan</title>
        <style>
          body { font-family: 'Segoe UI', Roboto, sans-serif; background: #090706; color: #fff8ed; text-align: center; padding: 60px 20px; }
          h2 { color: #d5a15d; }
          a { color: #d5a15d; text-decoration: none; border-bottom: 1px dashed #d5a15d; }
        </style>
      </head>
      <body>
        <h2>Undangan Tidak Ditemukan</h2>
        <p>Maaf, undangan dengan link ini tidak ditemukan atau belum dipublikasikan.</p>
        <p><a href="/app/index.html">Buka Wedding Studio</a></p>
      </body>
      </html>
    `);
  }
  const templateId = invite.template_id || 'luxury-gold';
  const templatePath = path.join(__dirname, '..', 'templates', templateId, 'index.html');
  if (fs.existsSync(templatePath)) {
    return res.sendFile(templatePath);
  }
  res.status(404).send('Template tidak ditemukan.');
});

// Root URL serves main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'app', 'index.html'));
});

// Setup Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, GIF and MP3/WAV audio files are allowed.'));
    }
  }
});

// File Upload Route (Authenticated for builder uploads)
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Public File Upload Route (For guests uploading RSVP/gift confirmation transfer receipts)
app.post('/api/public/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
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
    
    // Otomatis memberikan lisensi "Pernikahan" (LICENSE_A) selama 1 tahun
    db.insert('user_licenses', {
      user_id: user.id,
      license_code: 'LICENSE_A',
      active: true,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
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
    const user = users.find(u => u.username === username || u.email === username);
    
    let isPasswordValid = false;
    if (user) {
      if (user.passwordHash && !user.passwordHash.startsWith('$2a$') && !user.passwordHash.startsWith('$2b$')) {
        isPasswordValid = (password === user.passwordHash);
        if (isPasswordValid) {
          try {
            await googleSheetsDB.updateUser(user.id, { passwordHash: bcrypt.hashSync(password, 10) });
          } catch (e) {}
        }
      } else if (user.passwordHash) {
        isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
      }
    }

    if (!user || !isPasswordValid) {
      return res.status(400).json({ message: 'Username atau password salah. Coba: admin / admin123 atau user / user123' });
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
      return res.status(404).json({ message: 'User not found.' });
    }

    // Get active licenses for this user
    let licenses = db.find('user_licenses', ul => ul.user_id === user.id && ul.active);

    // Jika user sama sekali belum punya lisensi, berikan otomatis lisensi pernikahan
    if (licenses.length === 0) {
      const newLicense = db.insert('user_licenses', {
        user_id: user.id,
        license_code: 'LICENSE_A',
        active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
      licenses = [newLicense];
    }

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      licenses: licenses.map(l => l.license_code)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving user profile' });
  }
});

// ================= LICENSE VALIDATION UTIL =================
function hasLicenseForCategory(userId, category) {
  const licenseMap = {
    'Pernikahan': 'LICENSE_A',
    'Khitanan': 'LICENSE_B',
    'Ulang Tahun': 'LICENSE_C',
    'Aqiqah': 'LICENSE_D',
    'Wisuda': 'LICENSE_E'
  };

  const code = licenseMap[category] || 'LICENSE_A';

  let userLicense = db.findOne('user_licenses', ul => 
    ul.user_id === userId && 
    ul.license_code === code && 
    ul.active
  );

  // Auto grant free 1-year license if user doesn't have one yet
  if (!userLicense) {
    userLicense = db.insert('user_licenses', {
      user_id: userId,
      license_code: code,
      active: true,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  return true;
}

// ================= USER DASHBOARD & INVITATIONS =================

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  // If admin, they see all stats or filterable. Let's see stats for current user
  const invites = isAdmin ? db.find('invitations') : db.find('invitations', i => i.user_id === userId);

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

app.get('/api/invitations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const invites = isAdmin ? db.find('invitations') : db.find('invitations', i => i.user_id === userId);
  res.json(invites);
});

app.get('/api/invitations/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const id = parseInt(req.params.id);

  const invite = db.findOne('invitations', i => i.id === id);
  if (!invite) {
    return res.status(404).json({ message: 'Invitation not found.' });
  }

  if (!isAdmin && invite.user_id !== userId) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const detail = db.findOne('invitation_data', d => d.invitation_id === invite.id);

  res.json({
    ...invite,
    content: detail ? detail.content : {}
  });
});

app.post('/api/invitations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { category, template_id, slug, title } = req.body;

  if (!category || !template_id || !slug || !title) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Validate license
  if (req.user.role !== 'admin' && !hasLicenseForCategory(userId, category)) {
    return res.status(403).json({ message: `Anda tidak memiliki lisensi aktif untuk kategori ${category}.` });
  }

  // Validate slug uniqueness
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
  const existing = db.findOne('invitations', i => i.slug === cleanSlug);
  if (existing) {
    return res.status(400).json({ message: 'URL/Slug ini sudah digunakan. Silakan gunakan slug lain.' });
  }

  const newInvite = db.insert('invitations', {
    user_id: userId,
    category,
    template_id,
    slug: cleanSlug,
    title,
    status: 'draft',
    active_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30 days
    views: 0,
    rsvp_count: 0,
    wishes_count: 0
  });

  // Default content base
  const defaultContent = {
    theme: {
      primaryColor: '#8a2be2',
      bgColor: '#ffffff',
      textColor: '#333333',
      fontFamily: 'Inter',
      buttonStyle: 'rounded',
      showAnimations: true
    },
    opening: {
      title: 'UNDANGAN',
      couple: title,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    mempelai: {
      pria: { namaLengkap: '', namaPanggilan: '', bio: '', ortu: '' },
      wanita: { namaLengkap: '', namaPanggilan: '', bio: '', ortu: '' }
    },
    acara: [],
    countdown: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T09:00:00',
    music: { id: '', name: '', url: '', autoplay: true },
    gallery: [],
    story: [],
    gift: { accounts: [] }
  };

  db.insert('invitation_data', {
    invitation_id: newInvite.id,
    content: defaultContent
  });

  res.status(201).json({
    ...newInvite,
    content: defaultContent
  });
});

app.put('/api/invitations/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const id = parseInt(req.params.id);
  const { title, slug, status, content, active_until } = req.body;

  const invite = db.findOne('invitations', i => i.id === id);
  if (!invite) {
    return res.status(404).json({ message: 'Invitation not found.' });
  }

  if (!isAdmin && invite.user_id !== userId) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const updates = {};
  if (title) updates.title = title;
  if (status) updates.status = status;
  if (active_until) updates.active_until = active_until;
  if (slug) {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (cleanSlug !== invite.slug) {
      const existing = db.findOne('invitations', i => i.slug === cleanSlug && i.id !== id);
      if (existing) {
        return res.status(400).json({ message: 'URL/Slug ini sudah digunakan oleh undangan lain.' });
      }
      updates.slug = cleanSlug;
    }
  }

  // Update core metadata
  const updatedInvite = db.update('invitations', id, updates);

  // Update content data
  if (content) {
    const detail = db.findOne('invitation_data', d => d.invitation_id === id);
    if (detail) {
      db.update('invitation_data', detail.id, { content });
    } else {
      db.insert('invitation_data', { invitation_id: id, content });
    }
  }

  res.json({
    ...updatedInvite,
    content: content || {}
  });
});

app.delete('/api/invitations/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const id = parseInt(req.params.id);

  const invite = db.findOne('invitations', i => i.id === id);
  if (!invite) {
    return res.status(404).json({ message: 'Invitation not found.' });
  }

  if (!isAdmin && invite.user_id !== userId) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  // Delete invitation, invitation_data, guests, RSVPs, wishes
  db.delete('invitations', id);

  const detail = db.findOne('invitation_data', d => d.invitation_id === id);
  if (detail) db.delete('invitation_data', detail.id);

  const guests = db.find('guests', g => g.invitation_id === id);
  guests.forEach(g => db.delete('guests', g.id));

  const rsvps = db.find('rsvps', r => r.invitation_id === id);
  rsvps.forEach(r => db.delete('rsvps', r.id));

  const wishes = db.find('wishes', w => w.invitation_id === id);
  wishes.forEach(w => db.delete('wishes', w.id));

  res.json({ success: true, message: 'Invitation and all related data successfully deleted.' });
});

// ================= GUESTS MANAGEMENT =================

app.get('/api/invitations/:id/guests', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const list = db.find('guests', g => g.invitation_id === inviteId);
  res.json(list);
});

app.post('/api/invitations/:id/guests', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Guest name is required.' });

  const slug = encodeURIComponent(name.trim());
  const newGuest = db.insert('guests', {
    invitation_id: inviteId,
    name: name.trim(),
    slug,
    views: 0,
    rsvp_status: 'belum_konfirmasi'
  });

  res.status(201).json(newGuest);
});

app.post('/api/invitations/:id/guests/import', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const { names } = req.body;
  if (!names || !Array.isArray(names)) {
    return res.status(400).json({ message: 'Invalid data format. Expected array of names.' });
  }

  const imported = [];
  names.forEach(name => {
    if (name && name.trim()) {
      const slug = encodeURIComponent(name.trim());
      const guest = db.insert('guests', {
        invitation_id: inviteId,
        name: name.trim(),
        slug,
        views: 0,
        rsvp_status: 'belum_konfirmasi'
      });
      imported.push(guest);
    }
  });

  res.status(201).json(imported);
});

// GET all RSVPs for a specific invitation
app.get('/api/invitations/:id/rsvps', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const list = db.find('rsvps', r => r.invitation_id === inviteId);
  res.json(list);
});

// DELETE a specific RSVP entry
app.delete('/api/invitations/:id/rsvps/:rsvpId', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const rsvpId = parseInt(req.params.rsvpId);

  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  db.delete('rsvps', rsvpId);

  // Recalculate stats
  const rsvps = db.find('rsvps', r => r.invitation_id === inviteId);
  db.update('invitations', inviteId, { rsvp_count: rsvps.length });

  res.json({ success: true });
});

app.put('/api/invitations/:id/guests/:guestId', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const guestId = parseInt(req.params.guestId);

  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const guest = db.findOne('guests', g => g.id === guestId && g.invitation_id === inviteId);
  if (!guest) return res.status(404).json({ message: 'Guest not found.' });

  const { name, rsvp_status } = req.body;
  const updates = {};
  if (name) {
    updates.name = name.trim();
    updates.slug = encodeURIComponent(name.trim());
  }
  if (rsvp_status) updates.rsvp_status = rsvp_status;

  const updatedGuest = db.update('guests', guestId, updates);
  res.json(updatedGuest);
});

app.delete('/api/invitations/:id/guests/:guestId', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const guestId = parseInt(req.params.guestId);

  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const success = db.delete('guests', guestId);
  if (!success) return res.status(404).json({ message: 'Guest not found.' });

  res.json({ success: true });
});

// ================= WISHES MODERATION =================

app.get('/api/invitations/:id/wishes', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const wishes = db.find('wishes', w => w.invitation_id === inviteId);
  res.json(wishes);
});

app.put('/api/invitations/:id/wishes/:wishId', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const wishId = parseInt(req.params.wishId);

  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const wish = db.findOne('wishes', w => w.id === wishId && w.invitation_id === inviteId);
  if (!wish) return res.status(404).json({ message: 'Wish not found.' });

  const { status } = req.body;
  if (!['approved', 'pending', 'hidden'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const updatedWish = db.update('wishes', wishId, { status });
  res.json(updatedWish);
});

app.delete('/api/invitations/:id/wishes/:wishId', authenticateToken, (req, res) => {
  const inviteId = parseInt(req.params.id);
  const wishId = parseInt(req.params.wishId);

  const invite = db.findOne('invitations', i => i.id === inviteId);
  if (!invite) return res.status(404).json({ message: 'Invitation not found.' });

  if (req.user.role !== 'admin' && invite.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  const success = db.delete('wishes', wishId);
  if (!success) return res.status(404).json({ message: 'Wish not found.' });

  // Update counts
  const currentWishesCount = db.find('wishes', w => w.invitation_id === inviteId).length;
  db.update('invitations', inviteId, { wishes_count: currentWishesCount });

  res.json({ success: true });
});

// ================= PUBLIC INVITATION VIEWS =================

app.get('/api/public/invitations/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const invite = db.findOne('invitations', i => i.slug === slug);

  if (!invite) {
    return res.status(404).json({ message: 'Undangan tidak ditemukan.' });
  }

  if (invite.status !== 'active') {
    return res.status(403).json({ message: 'Undangan ini sedang tidak aktif/belum diterbitkan.' });
  }

  // Increment views
  db.update('invitations', invite.id, { views: (invite.views || 0) + 1 });

  const detail = db.findOne('invitation_data', d => d.invitation_id === invite.id);

  // If opened with user parameter ?to=Guest+Name, increment guest view counter
  const toParam = req.query.to;
  if (toParam) {
    const guest = db.findOne('guests', g => g.invitation_id === invite.id && g.name.toLowerCase() === String(toParam).trim().toLowerCase());
    if (guest) {
      db.update('guests', guest.id, { views: (guest.views || 0) + 1 });
    }
  }

  res.json({
    id: invite.id,
    category: invite.category,
    template_id: invite.template_id,
    slug: invite.slug,
    title: invite.title,
    content: detail ? detail.content : {}
  });
});

app.post('/api/public/invitations/:slug/rsvp', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const invite = db.findOne('invitations', i => i.slug === slug);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  const { name, status, guests_count, message, buktiTransferUrl } = req.body;
  if (!name || !status) {
    return res.status(400).json({ message: 'Nama dan Konfirmasi Kehadiran wajib diisi.' });
  }

  const count = parseInt(guests_count) || 1;

  // Insert RSVP
  const rsvp = db.insert('rsvps', {
    invitation_id: invite.id,
    name: name.trim(),
    status,
    guests_count: count,
    message: message || '',
    buktiTransferUrl: buktiTransferUrl || ''
  });

  // Check if guest exists and update status
  const guest = db.findOne('guests', g => g.invitation_id === invite.id && g.name.toLowerCase() === name.trim().toLowerCase());
  if (guest) {
    db.update('guests', guest.id, { rsvp_status: status });
  }

  // Recalculate stats
  const rsvps = db.find('rsvps', r => r.invitation_id === invite.id);
  db.update('invitations', invite.id, { rsvp_count: rsvps.length });

  res.status(201).json(rsvp);
});

app.post('/api/public/invitations/:slug/wish', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const invite = db.findOne('invitations', i => i.slug === slug);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  const { name, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ message: 'Nama dan Ucapan wajib diisi.' });
  }

  // Create wish. Default to approved unless there's moderation flag, let's auto-approve for ease but support status
  const wish = db.insert('wishes', {
    invitation_id: invite.id,
    name: name.trim(),
    message: message.trim(),
    status: 'approved' // Set default as approved, admin can hide/delete from dashboard
  });

  const wishes = db.find('wishes', w => w.invitation_id === invite.id && w.status === 'approved');
  db.update('invitations', invite.id, { wishes_count: wishes.length });

  res.status(201).json(wish);
});

app.get('/api/public/invitations/:slug/wishes', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const invite = db.findOne('invitations', i => i.slug === slug);
  if (!invite) return res.status(404).json({ message: 'Undangan tidak ditemukan.' });

  const approvedWishes = db.find('wishes', w => w.invitation_id === invite.id && w.status === 'approved');
  
  // Sort wishes newest first
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
    return res.status(400).json({ message: 'Username, Email and Password are required.' });
  }

  const users = await googleSheetsDB.getUsers();
  const existing = users.find(u => u.username === username || u.email === email);
  if (existing) {
    return res.status(400).json({ message: 'Username or email already registered.' });
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
  const users = await googleSheetsDB.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const { username, email, password, role } = req.body;
  const updates = {};
  if (username) updates.username = username;
  if (email) updates.email = email;
  if (role) updates.role = role;
  if (password) updates.passwordHash = bcrypt.hashSync(password, 10);

  const updated = await googleSheetsDB.updateUser(userId, updates);
  res.json({
    id: updated.id,
    username: updated.username,
    email: updated.email,
    role: updated.role,
    created_at: updated.created_at
  });
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own admin account.' });
  }

  const users = await googleSheetsDB.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  await googleSheetsDB.deleteUser(userId);

  // Delete related user licenses
  const licenses = db.find('user_licenses', ul => ul.user_id === userId);
  licenses.forEach(l => db.delete('user_licenses', l.id));

  // Delete all invitations for this user
  const userInvites = db.find('invitations', i => i.user_id === userId);
  userInvites.forEach(inv => {
    db.delete('invitations', inv.id);
    const detail = db.findOne('invitation_data', d => d.invitation_id === inv.id);
    if (detail) db.delete('invitation_data', detail.id);
  });

  res.json({ success: true, message: 'User and all related data successfully deleted.' });
});

app.post('/api/admin/users/:id/licenses', requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { license_code, duration_days } = req.body;

  if (!license_code) {
    return res.status(400).json({ message: 'License code is required.' });
  }

  const user = db.findOne('users', u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  // Expiration date
  const days = parseInt(duration_days) || 365;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // Check if user already has an active license for this code
  const existingLicense = db.findOne('user_licenses', ul => ul.user_id === userId && ul.license_code === license_code);
  
  let result;
  if (existingLicense) {
    result = db.update('user_licenses', existingLicense.id, {
      active: true,
      expires_at: expiresAt
    });
  } else {
    result = db.insert('user_licenses', {
      user_id: userId,
      license_code,
      active: true,
      expires_at: expiresAt
    });
  }

  res.status(201).json(result);
});

app.delete('/api/admin/users/:id/licenses/:userLicenseId', requireAdmin, (req, res) => {
  const userLicenseId = parseInt(req.params.userLicenseId);
  const success = db.delete('user_licenses', userLicenseId);
  if (!success) return res.status(404).json({ message: 'User license mapping not found.' });
  res.json({ success: true });
});

// Start the server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
