import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

// Ensure database directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Database helper
class DB {
  constructor() {
    this.init();
  }

  init() {
    const defaultTables = {
      users: [],
      licenses: [
        { code: 'LICENSE_A', name: 'Wedding', category: 'Pernikahan', description: 'Undangan Pernikahan Premium' },
        { code: 'LICENSE_B', name: 'Khitan', category: 'Khitanan', description: 'Undangan Khitanan Modern' },
        { code: 'LICENSE_C', name: 'Birthday', category: 'Ulang Tahun', description: 'Undangan Ulang Tahun Anak' },
        { code: 'LICENSE_D', name: 'Aqiqah', category: 'Aqiqah', description: 'Undangan Aqiqah & Selapanan' },
        { code: 'LICENSE_E', name: 'Wisuda', category: 'Wisuda', description: 'Undangan Graduation / Wisuda' }
      ],
      user_licenses: [],
      templates: [
        { id: 'wedding-elegant', category: 'Pernikahan', name: 'Elegant Gold', thumbnail: '/templates/elegant.jpg', active: true },
        { id: 'wedding-floral', category: 'Pernikahan', name: 'Sweet Floral', thumbnail: '/templates/floral.jpg', active: true },
        { id: 'wedding-blossom', category: 'Pernikahan', name: 'Cherry Blossom (Pink)', thumbnail: '/templates/blossom.jpg', active: true },
        { id: 'wedding-leafy', category: 'Pernikahan', name: 'Tropical Leafy (Green)', thumbnail: '/templates/leafy.jpg', active: true },
        { id: 'wedding-minimalist', category: 'Pernikahan', name: 'Rose Minimalist (White)', thumbnail: '/templates/minimalist.jpg', active: true },
        { id: 'birthday-kids', category: 'Ulang Tahun', name: 'Cheerful Dino', thumbnail: '/templates/birthday.jpg', active: true },
        { id: 'khitan-modern', category: 'Khitanan', name: 'Khitan Modern', thumbnail: '/templates/khitan.jpg', active: true }
      ],
      invitations: [],
      invitation_data: [],
      guests: [],
      rsvps: [],
      wishes: []
    };

    for (const [table, defaultVal] of Object.entries(defaultTables)) {
      const filePath = this.getFilePath(table);
      if (!fs.existsSync(filePath)) {
        this.writeTable(table, defaultVal);
      }
    }

    // Run seeds
    this.seed();
  }

  getFilePath(table) {
    return path.join(DATA_DIR, `${table}.json`);
  }

  readTable(table) {
    try {
      const filePath = this.getFilePath(table);
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error(`Error reading table ${table}:`, err);
      return [];
    }
  }

  writeTable(table, data) {
    try {
      const filePath = this.getFilePath(table);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`Error writing table ${table}:`, err);
    }
  }

  // CRUD API
  find(table, filterFn = () => true) {
    const list = this.readTable(table);
    return list.filter(filterFn);
  }

  findOne(table, filterFn = () => true) {
    const list = this.readTable(table);
    return list.find(filterFn) || null;
  }

  insert(table, item) {
    const list = this.readTable(table);
    
    // Auto increment id
    let nextId = 1;
    if (list.length > 0) {
      const ids = list.map(i => typeof i.id === 'number' ? i.id : parseInt(i.id) || 0);
      nextId = Math.max(...ids) + 1;
    }
    
    const newItem = {
      id: nextId,
      created_at: new Date().toISOString(),
      ...item
    };
    
    list.push(newItem);
    this.writeTable(table, list);
    return newItem;
  }

  update(table, id, updates) {
    const list = this.readTable(table);
    const index = list.findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;

    const updatedItem = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    list[index] = updatedItem;
    this.writeTable(table, list);
    return updatedItem;
  }

  delete(table, id) {
    const list = this.readTable(table);
    const index = list.findIndex(item => String(item.id) === String(id));
    if (index === -1) return false;

    list.splice(index, 1);
    this.writeTable(table, list);
    return true;
  }

  seed() {
    // Seed users if none exist
    const users = this.readTable('users');
    if (users.length === 0) {
      console.log('Seeding default users...');
      const admin = this.insert('users', {
        username: 'admin',
        email: 'admin@undanganlab.com',
        passwordHash: bcrypt.hashSync('admin123', 10),
        role: 'admin'
      });

      const user = this.insert('users', {
        username: 'user',
        email: 'user@undanganlab.com',
        passwordHash: bcrypt.hashSync('user123', 10),
        role: 'user'
      });

      // Give default user licenses
      this.insert('user_licenses', {
        user_id: user.id,
        license_code: 'LICENSE_A', // Wedding
        active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      });
      this.insert('user_licenses', {
        user_id: user.id,
        license_code: 'LICENSE_B', // Khitan
        active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      });

      // Seed a default active invitation for "Sabil & Maul"
      const invitation = this.insert('invitations', {
        user_id: user.id,
        category: 'Pernikahan',
        template_id: 'wedding-elegant',
        slug: 'sabil-maul',
        title: 'Pernikahan Sabil & Maul',
        status: 'active',
        active_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        views: 327,
        rsvp_count: 2,
        wishes_count: 2
      });

      // Details inside content
      const invitationContent = {
        theme: {
          primaryColor: '#d4af37', // Gold
          bgColor: '#111111',      // Premium Dark
          textColor: '#f5f5f5',    // Off-white
          fontFamily: 'Outfit',
          buttonStyle: 'rounded-glass',
          showAnimations: true
        },
        opening: {
          title: 'THE WEDDING OF',
          couple: 'Sabil & Maul',
          date: '2026-12-20'
        },
        mempelai: {
          pria: {
            namaLengkap: 'Sabil Akbar Ramadhan',
            namaPanggilan: 'Sabil',
            foto: '',
            bio: 'Putra pertama dari pasangan Bapak H. Ahmad & Ibu Hj. Aminah. Sabil adalah seorang software engineer yang penuh semangat dan menyukai petualangan.',
            anakKe: '1',
            ortu: 'Bapak H. Ahmad & Ibu Hj. Aminah',
            instagram: 'sabil_akbar',
            facebook: 'sabil.akbar',
            tiktok: ''
          },
          wanita: {
            namaLengkap: 'Maulida Rahma Syifa',
            namaPanggilan: 'Maul',
            foto: '',
            bio: 'Putri bungsu dari pasangan Bapak Dr. Hermawan & Ibu Dra. Retno. Maulida adalah seorang desainer interior yang mencintai seni dan tanaman hijau.',
            anakKe: '2',
            ortu: 'Bapak Dr. Hermawan & Ibu Dra. Retno',
            instagram: 'maul_syifa',
            facebook: '',
            tiktok: ''
          }
        },
        acara: [
          {
            nama: 'Akad Nikah',
            tanggal: '2026-12-20',
            jam: '08:00 - 10:00 WIB',
            lokasi: 'Masjid Agung Al-Hikmah',
            alamat: 'Jl. Pemuda No. 12, Jakarta Pusat',
            mapsUrl: 'https://maps.google.com'
          },
          {
            nama: 'Resepsi Nikah',
            tanggal: '2026-12-20',
            jam: '11:00 - 16:00 WIB',
            lokasi: 'Grand Ballroom Hotel Mulia',
            alamat: 'Jl. Asia Afrika, Senayan, Jakarta Selatan',
            mapsUrl: 'https://maps.google.com'
          }
        ],
        countdown: '2026-12-20T08:00:00',
        quotes: {
          openingText: 'Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri hari istimewa kami.',
          verseText: 'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
          verseSource: 'QS. Ar-Rum: 21'
        },
        liveStreaming: {
          enabled: true,
          youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          meetingUrl: 'https://zoom.us',
          keterangan: 'Streaming Akad Nikah akan disiarkan langsung melalui pemutar di bawah ini mulai pukul 08:00 WIB.'
        },
        music: {
          id: 'romantic-acoustic',
          name: 'Acoustic Wedding Love',
          url: '/templates/music/romantic-wedding.mp3',
          autoplay: true
        },
        gallery: [
          { url: 'https://picsum.photos/id/1013/800/1000', order: 0 },
          { url: 'https://picsum.photos/id/1015/800/1000', order: 1 },
          { url: 'https://picsum.photos/id/1016/800/1000', order: 2 },
          { url: 'https://picsum.photos/id/1018/800/1000', order: 3 }
        ],
        story: [
          { tahun: '2021', judul: 'Pertemuan Pertama', cerita: 'Kami pertama kali bertemu di sebuah perpustakaan kota. Buku yang kami cari kebetulan sama, dan dari sanalah percakapan awal kami bermula.', foto: '' },
          { tahun: '2023', judul: 'Memulai Komitmen', cerita: 'Setelah dua tahun berteman baik dan saling mendukung karir masing-masing, kami sepakat untuk berkomitmen menuju jenjang yang lebih serius.', foto: '' },
          { tahun: '2025', judul: 'Pertunangan', cerita: 'Di hadapan keluarga besar, kami melangsungkan lamaran resmi. Hari yang penuh haru dan tawa menyatukan mimpi kami berdua.', foto: '' }
        ],
        gift: {
          accounts: [
            { bank: 'BCA', noRek: '1234567890', namaPenerima: 'Sabil Akbar R', qrCode: '' },
            { bank: 'Mandiri', noRek: '0987654321', namaPenerima: 'Maulida R S', qrCode: '' }
          ],
          shippingAddress: {
            enabled: true,
            penerima: 'Sabil & Maul',
            noHp: '081234567890',
            alamat: 'Jl. Kemang Raya No. 45, Mampang Prapatan, Jakarta Selatan, 12730'
          }
        }
      };

      this.insert('invitation_data', {
        invitation_id: invitation.id,
        content: invitationContent
      });

      // Seed guests
      this.insert('guests', {
        invitation_id: invitation.id,
        name: 'Andri Prayoga',
        slug: 'andri-prayoga',
        views: 1,
        rsvp_status: 'hadir'
      });
      this.insert('guests', {
        invitation_id: invitation.id,
        name: 'Budi',
        slug: 'budi',
        views: 0,
        rsvp_status: 'belum_konfirmasi'
      });

      // Seed RSVP
      this.insert('rsvps', {
        invitation_id: invitation.id,
        name: 'Andri Prayoga',
        status: 'hadir',
        guests_count: 2,
        message: 'Selamat ya Sabil & Maul! Semoga sakinah mawaddah warahmah. Amin.',
        created_at: new Date().toISOString()
      });

      // Seed wishes
      this.insert('wishes', {
        invitation_id: invitation.id,
        name: 'Andri Prayoga',
        message: 'Lancar ya bro acaranya, sampai jumpa di lokasi!',
        status: 'approved',
        created_at: new Date().toISOString()
      });
      this.insert('wishes', {
        invitation_id: invitation.id,
        name: 'Budi',
        message: 'Selamat berbahagia untuk kalian berdua!',
        status: 'approved',
        created_at: new Date().toISOString()
      });

      console.log('Database successfully seeded!');
    }
  }
}

export default new DB();
