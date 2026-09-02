import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ORIG_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'wedding_data') : ORIG_DATA_DIR;

// Ensure database directory exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

// Ensure uploads directory exists safely
const UPLOADS_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'wedding_uploads') : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {}

// Database helper with memory cache + filesystem fallback
class DB {
  constructor() {
    this.cache = {};
    this.init();
  }

  init() {
    const defaultTables = {
      users: [
        {
          id: 1,
          created_at: new Date().toISOString(),
          username: 'admin',
          email: 'admin@undanganlab.com',
          passwordHash: bcrypt.hashSync('admin123', 10),
          role: 'admin'
        },
        {
          id: 2,
          created_at: new Date().toISOString(),
          username: 'user',
          email: 'user@undanganlab.com',
          passwordHash: bcrypt.hashSync('user123', 10),
          role: 'user'
        }
      ],
      licenses: [
        { code: 'LICENSE_A', name: 'Wedding', category: 'Pernikahan', description: 'Undangan Pernikahan Premium' },
        { code: 'LICENSE_B', name: 'Khitan', category: 'Khitanan', description: 'Undangan Khitanan Modern' },
        { code: 'LICENSE_C', name: 'Birthday', category: 'Ulang Tahun', description: 'Undangan Ulang Tahun Anak' },
        { code: 'LICENSE_D', name: 'Aqiqah', category: 'Aqiqah', description: 'Undangan Aqiqah & Selapanan' },
        { code: 'LICENSE_E', name: 'Wisuda', category: 'Wisuda', description: 'Undangan Graduation / Wisuda' }
      ],
      user_licenses: [
        {
          id: 1,
          user_id: 1,
          license_code: 'LICENSE_A',
          active: true,
          expires_at: '2099-12-31T23:59:59.999Z'
        },
        {
          id: 2,
          user_id: 2,
          license_code: 'LICENSE_A',
          active: true,
          expires_at: '2099-12-31T23:59:59.999Z'
        }
      ],
      templates: [
        { id: 'luxury-gold', category: 'Pernikahan', name: 'Luxury Gold', active: true },
        { id: 'nusantara-heritage', category: 'Pernikahan', name: 'Nusantara Heritage', active: true },
        { id: 'blue-botanical-mobile', category: 'Pernikahan', name: 'Blue Botanical', active: true },
        { id: 'korean-blossom', category: 'Pernikahan', name: 'Korean Blossom', active: true },
        { id: 'vintage-elegance', category: 'Pernikahan', name: 'Vintage Elegance', active: true }
      ],
      invitations: [],
      invitation_data: [],
      guests: [],
      rsvps: [],
      wishes: []
    };

    for (const [table, defaultVal] of Object.entries(defaultTables)) {
      // Try to load initial data from disk if exists
      let initialData = null;
      try {
        const diskPath = path.join(ORIG_DATA_DIR, `${table}.json`);
        if (fs.existsSync(diskPath)) {
          initialData = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
        }
      } catch (e) {}

      if (!initialData || !Array.isArray(initialData) || initialData.length === 0) {
        initialData = defaultVal;
      }

      this.cache[table] = initialData;
      this.writeTable(table, initialData);
    }
  }

  getFilePath(table) {
    return path.join(DATA_DIR, `${table}.json`);
  }

  readTable(table) {
    if (this.cache[table]) {
      return this.cache[table];
    }
    try {
      const filePath = this.getFilePath(table);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.cache[table] = JSON.parse(content);
        return this.cache[table];
      }
      const origPath = path.join(ORIG_DATA_DIR, `${table}.json`);
      if (fs.existsSync(origPath)) {
        const content = fs.readFileSync(origPath, 'utf8');
        this.cache[table] = JSON.parse(content);
        return this.cache[table];
      }
    } catch (err) {}
    this.cache[table] = [];
    return [];
  }

  writeTable(table, data) {
    this.cache[table] = data;
    try {
      const filePath = this.getFilePath(table);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {}
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
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.writeTable(table, list);
    return list[index];
  }

  delete(table, id) {
    const list = this.readTable(table);
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return false;

    list.splice(index, 1);
    this.writeTable(table, list);
    return true;
  }
}

export default new DB();
