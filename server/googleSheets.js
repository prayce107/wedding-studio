import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service account credentials path
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Google Spreadsheet ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1j8ljUx_W0RM98I49Czw5sV2DPVlSwAEQyf1eaCtazhs';

// Cache TTL in milliseconds (e.g., 2 minutes for background refresh)
const CACHE_TTL = 2 * 60 * 1000;

class GoogleSheetsDB {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.initialized = false;

    // High-performance in-memory cache
    this.cache = {
      users: { data: [], timestamp: 0 },
      invitations: { data: [], timestamp: 0 },
      guests: { data: [], timestamp: 0 },
      rsvps: { data: [], timestamp: 0 },
      wishes: { data: [], timestamp: 0 }
    };
  }

  async init() {
    if (this.initialized) return;

    let authConfig = null;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        const creds = typeof process.env.GOOGLE_CREDENTIALS_JSON === 'string' 
          ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) 
          : process.env.GOOGLE_CREDENTIALS_JSON;
        authConfig = {
          credentials: creds,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
      } catch (e) {
        console.warn('Failed to parse GOOGLE_CREDENTIALS_JSON env:', e);
      }
    }

    if (!authConfig && fs.existsSync(CREDENTIALS_PATH)) {
      authConfig = {
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      };
    }

    if (!authConfig) {
      console.warn('⚠️ Kredensial Google Sheets tidak ditemukan. Menggunakan database lokal JSON.');
      return;
    }

    try {
      this.auth = new google.auth.GoogleAuth(authConfig);
      const client = await this.auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: client });
      this.initialized = true;
      console.log('✅ Google Sheets API berhasil diinisialisasi.');

      // Background pre-warm cache
      this.prewarmCache().catch(e => console.warn('Cache pre-warm notice:', e.message));
    } catch (error) {
      console.error('❌ Gagal menginisialisasi Google Sheets API:', error);
    }
  }

  async prewarmCache() {
    await Promise.allSettled([
      this.getUsers(true),
      this.getInvitations(true),
      this.getGuests(null, true),
      this.getRSVPs(null, true),
      this.getWishes(null, true)
    ]);
  }

  // ================= USERS =================
  // Format: ID | Username | Email | PasswordHash | Role | CreatedAt
  async getUsers(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache.users.data.length > 0 && (now - this.cache.users.timestamp) < CACHE_TTL) {
      return this.cache.users.data;
    }

    if (!this.initialized) await this.init();
    if (!this.sheets) return this.cache.users.data;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Users!A2:F',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return this.cache.users.data;
      }

      const users = rows.map((row) => ({
        id: parseInt(row[0]) || 0,
        username: row[1] || '',
        email: row[2] || '',
        passwordHash: row[3] || '',
        role: row[4] || 'user',
        created_at: row[5] || new Date().toISOString(),
      }));

      this.cache.users = { data: users, timestamp: Date.now() };
      return users;
    } catch (error) {
      console.error('Gagal mengambil data users dari Google Sheets:', error.message);
      return this.cache.users.data;
    }
  }

  async addUser(user) {
    if (!this.initialized) await this.init();
    
    const users = await this.getUsers();
    const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const createdAt = new Date().toISOString();
    
    const newUser = {
      ...user,
      id: nextId,
      created_at: createdAt
    };

    // 1. Instant Cache Update (Zero Latency)
    this.cache.users.data.push(newUser);
    this.cache.users.timestamp = Date.now();

    // 2. Background Google Sheets Write
    if (this.sheets) {
      const values = [[nextId, user.username, user.email, user.passwordHash, user.role || 'user', createdAt]];
      this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Users!A2:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      }).catch(err => console.error('Background write user failed:', err));
    }

    return newUser;
  }

  async updateUser(id, updates) {
    if (!this.initialized) await this.init();
    
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;

    const updatedUser = { ...users[index], ...updates };
    this.cache.users.data[index] = updatedUser;
    this.cache.users.timestamp = Date.now();

    // Background sync to Google Sheets
    if (this.sheets) {
      this._updateUserInSheet(id, updatedUser).catch(err => console.error('Background updateUser failed:', err));
    }

    return updatedUser;
  }

  async _updateUserInSheet(id, user) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:F',
    });
    const rows = response.data.values;
    if (!rows) return;

    const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
    if (rowIndex === -1) return;

    const sheetRowNumber = rowIndex + 2;
    const updatedRow = [
      user.id,
      user.username,
      user.email,
      user.passwordHash,
      user.role || 'user',
      user.created_at || new Date().toISOString()
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Users!A${sheetRowNumber}:F${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });
  }

  async deleteUser(id) {
    this.cache.users.data = this.cache.users.data.filter(u => u.id !== id);
    return await this._deleteRowByColumn('Users', 0, id);
  }

  // ================= INVITATIONS =================
  // Column format: ID | Slug | UserId | TemplateId | Title | Status | ContentJSON | CreatedAt
  async getInvitations(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache.invitations.data.length > 0 && (now - this.cache.invitations.timestamp) < CACHE_TTL) {
      return this.cache.invitations.data;
    }

    if (!this.initialized) await this.init();
    if (!this.sheets) return this.cache.invitations.data;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Invitations!A2:H',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) return this.cache.invitations.data;

      const invites = rows.map((row) => {
        let content = {};
        try {
          if (row[6]) content = JSON.parse(row[6]);
        } catch (e) {}

        return {
          id: parseInt(row[0]) || 0,
          slug: row[1] || '',
          user_id: parseInt(row[2]) || 0,
          template_id: row[3] || 'luxury-gold',
          title: row[4] || '',
          status: row[5] || 'active',
          content: content,
          created_at: row[7] || new Date().toISOString()
        };
      });

      this.cache.invitations = { data: invites, timestamp: Date.now() };
      return invites;
    } catch (error) {
      console.error('Gagal mengambil data invitations dari Google Sheets:', error.message);
      return this.cache.invitations.data;
    }
  }

  async getInvitationBySlug(slug) {
    if (!slug) return null;
    const clean = String(slug).toLowerCase().trim();
    
    // Fast lookup in memory cache first
    const cached = this.cache.invitations.data.find(i => i.slug.toLowerCase().trim() === clean);
    if (cached) return cached;

    // Fallback refresh
    const invites = await this.getInvitations(true);
    return invites.find(i => i.slug.toLowerCase().trim() === clean) || null;
  }

  async addInvitation(inv) {
    if (!this.initialized) await this.init();
    
    const invites = await this.getInvitations();
    const nextId = invites.length > 0 ? Math.max(...invites.map(i => i.id)) + 1 : 1;
    const createdAt = new Date().toISOString();

    const newInvite = {
      id: nextId,
      slug: inv.slug,
      user_id: inv.user_id || 1,
      template_id: inv.template_id || 'luxury-gold',
      title: inv.title || '',
      status: inv.status || 'active',
      content: inv.content || {},
      created_at: createdAt
    };

    // 1. Instant Cache Update
    this.cache.invitations.data.push(newInvite);
    this.cache.invitations.timestamp = Date.now();

    // 2. Background Google Sheets Append
    if (this.sheets) {
      const contentStr = typeof inv.content === 'object' ? JSON.stringify(inv.content) : String(inv.content || '{}');
      const values = [[
        nextId,
        newInvite.slug,
        newInvite.user_id,
        newInvite.template_id,
        newInvite.title,
        newInvite.status,
        contentStr,
        createdAt
      ]];

      this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Invitations!A2:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      }).catch(err => console.error('Background addInvitation failed:', err));
    }

    return newInvite;
  }

  async updateInvitation(slug, updates) {
    if (!this.initialized) await this.init();
    
    const invites = await this.getInvitations();
    const cleanSlug = String(slug).toLowerCase().trim();
    const index = invites.findIndex(i => i.slug.toLowerCase().trim() === cleanSlug);

    if (index === -1) {
      return await this.addInvitation({ slug, ...updates });
    }

    const current = invites[index];
    const updated = {
      ...current,
      ...updates,
      content: updates.content ? updates.content : current.content
    };

    // 1. Instant Cache Update
    this.cache.invitations.data[index] = updated;
    this.cache.invitations.timestamp = Date.now();

    // 2. Background Google Sheets Update
    if (this.sheets) {
      this._updateInvitationInSheet(cleanSlug, updated).catch(err => console.error('Background updateInvitation failed:', err));
    }

    return updated;
  }

  async _updateInvitationInSheet(cleanSlug, updated) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Invitations!A2:H',
    });
    const rows = response.data.values;
    if (!rows) return;

    const rowIndex = rows.findIndex(row => String(row[1]).toLowerCase().trim() === cleanSlug);
    if (rowIndex === -1) return;

    const sheetRowNumber = rowIndex + 2;
    const contentStr = typeof updated.content === 'object' ? JSON.stringify(updated.content) : String(updated.content || '{}');

    const updatedRow = [
      updated.id,
      updated.slug,
      updated.user_id,
      updated.template_id,
      updated.title,
      updated.status,
      contentStr,
      updated.created_at || new Date().toISOString()
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Invitations!A${sheetRowNumber}:H${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });
  }

  async deleteInvitation(id) {
    this.cache.invitations.data = this.cache.invitations.data.filter(i => i.id !== id);
    return await this._deleteRowByColumn('Invitations', 0, id);
  }

  // ================= GUESTS =================
  // Format: ID | InvitationId | Name | Slug | Views | RsvpStatus | CreatedAt
  async getGuests(invitationId = null, forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache.guests.data.length > 0 && (now - this.cache.guests.timestamp) < CACHE_TTL) {
      return invitationId ? this.cache.guests.data.filter(g => g.invitation_id === parseInt(invitationId)) : this.cache.guests.data;
    }

    const rows = await this._getRows('Guests!A2:G');
    const guests = rows.map(row => ({
      id: parseInt(row[0]) || 0,
      invitation_id: parseInt(row[1]) || 0,
      name: row[2] || '',
      slug: row[3] || '',
      views: parseInt(row[4]) || 0,
      rsvp_status: row[5] || 'belum_konfirmasi',
      created_at: row[6] || new Date().toISOString()
    }));

    this.cache.guests = { data: guests, timestamp: Date.now() };
    return invitationId ? guests.filter(g => g.invitation_id === parseInt(invitationId)) : guests;
  }

  async addGuest(guest) {
    const guests = await this.getGuests();
    const nextId = guests.length > 0 ? Math.max(...guests.map(g => g.id)) + 1 : 1;
    const createdAt = new Date().toISOString();
    
    const newGuest = {
      ...guest,
      id: nextId,
      created_at: createdAt
    };

    this.cache.guests.data.push(newGuest);
    this.cache.guests.timestamp = Date.now();

    const values = [[
      nextId, guest.invitation_id, guest.name, guest.slug, guest.views || 0, guest.rsvp_status || 'belum_konfirmasi', createdAt
    ]];
    this._appendRows('Guests!A2:G', values).catch(e => {});

    return newGuest;
  }

  async updateGuest(id, updates) {
    const guests = await this.getGuests();
    const index = guests.findIndex(g => g.id === id);
    if (index !== -1) {
      this.cache.guests.data[index] = { ...this.cache.guests.data[index], ...updates };
      this.cache.guests.timestamp = Date.now();
    }

    // Update in sheet in background
    const rows = await this._getRows('Guests!A2:G');
    const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
    if (rowIndex === -1) return null;
    
    const currentRow = rows[rowIndex];
    const updatedRow = [
      currentRow[0],
      currentRow[1],
      updates.name !== undefined ? updates.name : currentRow[2],
      updates.slug !== undefined ? updates.slug : currentRow[3],
      updates.views !== undefined ? updates.views : currentRow[4],
      updates.rsvp_status !== undefined ? updates.rsvp_status : currentRow[5],
      currentRow[6]
    ];
    await this._updateRow('Guests', rowIndex + 2, 'A', 'G', updatedRow);
    return { id: parseInt(updatedRow[0]), invitation_id: parseInt(updatedRow[1]), name: updatedRow[2], slug: updatedRow[3], views: parseInt(updatedRow[4]), rsvp_status: updatedRow[5], created_at: updatedRow[6] };
  }

  async deleteGuest(id) {
    this.cache.guests.data = this.cache.guests.data.filter(g => g.id !== id);
    return await this._deleteRowByColumn('Guests', 0, id);
  }

  // ================= RSVPs =================
  // Format: ID | InvitationId | Name | Status | GuestsCount | Message | BuktiTransferUrl | CreatedAt
  async getRSVPs(invitationId = null, forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache.rsvps.data.length > 0 && (now - this.cache.rsvps.timestamp) < CACHE_TTL) {
      return invitationId ? this.cache.rsvps.data.filter(r => r.invitation_id === parseInt(invitationId)) : this.cache.rsvps.data;
    }

    const rows = await this._getRows('RSVPs!A2:H');
    const rsvps = rows.map(row => ({
      id: parseInt(row[0]) || 0,
      invitation_id: parseInt(row[1]) || 0,
      name: row[2] || '',
      status: row[3] || '',
      guests_count: parseInt(row[4]) || 1,
      message: row[5] || '',
      buktiTransferUrl: row[6] || '',
      created_at: row[7] || new Date().toISOString()
    }));

    this.cache.rsvps = { data: rsvps, timestamp: Date.now() };
    return invitationId ? rsvps.filter(r => r.invitation_id === parseInt(invitationId)) : rsvps;
  }

  async addRSVP(rsvp) {
    const rsvps = await this.getRSVPs();
    const nextId = rsvps.length > 0 ? Math.max(...rsvps.map(r => r.id)) + 1 : 1;
    const createdAt = new Date().toISOString();

    const newRsvp = {
      ...rsvp,
      id: nextId,
      created_at: createdAt
    };

    this.cache.rsvps.data.push(newRsvp);
    this.cache.rsvps.timestamp = Date.now();

    const values = [[
      nextId, rsvp.invitation_id, rsvp.name, rsvp.status, rsvp.guests_count || 1, rsvp.message || '', rsvp.buktiTransferUrl || '', createdAt
    ]];
    this._appendRows('RSVPs!A2:H', values).catch(e => {});

    return newRsvp;
  }

  async deleteRSVP(id) {
    this.cache.rsvps.data = this.cache.rsvps.data.filter(r => r.id !== id);
    return await this._deleteRowByColumn('RSVPs', 0, id);
  }

  // ================= WISHES =================
  // Format: ID | InvitationId | Name | Message | Status | CreatedAt
  async getWishes(invitationId = null, forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache.wishes.data.length > 0 && (now - this.cache.wishes.timestamp) < CACHE_TTL) {
      return invitationId ? this.cache.wishes.data.filter(w => w.invitation_id === parseInt(invitationId)) : this.cache.wishes.data;
    }

    const rows = await this._getRows('Wishes!A2:F');
    const wishes = rows.map(row => ({
      id: parseInt(row[0]) || 0,
      invitation_id: parseInt(row[1]) || 0,
      name: row[2] || '',
      message: row[3] || '',
      status: row[4] || 'approved',
      created_at: row[5] || new Date().toISOString()
    }));

    this.cache.wishes = { data: wishes, timestamp: Date.now() };
    return invitationId ? wishes.filter(w => w.invitation_id === parseInt(invitationId)) : wishes;
  }

  async addWish(wish) {
    const wishes = await this.getWishes();
    const nextId = wishes.length > 0 ? Math.max(...wishes.map(w => w.id)) + 1 : 1;
    const createdAt = new Date().toISOString();

    const newWish = {
      ...wish,
      id: nextId,
      status: wish.status || 'approved',
      created_at: createdAt
    };

    this.cache.wishes.data.unshift(newWish);
    this.cache.wishes.timestamp = Date.now();

    const values = [[
      nextId, wish.invitation_id, wish.name, wish.message || '', newWish.status, createdAt
    ]];
    this._appendRows('Wishes!A2:F', values).catch(e => {});

    return newWish;
  }

  async updateWish(id, updates) {
    const wishes = await this.getWishes();
    const index = wishes.findIndex(w => w.id === id);
    if (index !== -1) {
      this.cache.wishes.data[index] = { ...this.cache.wishes.data[index], ...updates };
      this.cache.wishes.timestamp = Date.now();
    }

    const rows = await this._getRows('Wishes!A2:F');
    const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
    if (rowIndex === -1) return null;
    
    const currentRow = rows[rowIndex];
    const updatedRow = [
      currentRow[0],
      currentRow[1],
      currentRow[2],
      currentRow[3],
      updates.status !== undefined ? updates.status : currentRow[4],
      currentRow[5]
    ];
    await this._updateRow('Wishes', rowIndex + 2, 'A', 'F', updatedRow);
    return { id: parseInt(updatedRow[0]), invitation_id: parseInt(updatedRow[1]), name: updatedRow[2], message: updatedRow[3], status: updatedRow[4], created_at: updatedRow[5] };
  }

  async deleteWish(id) {
    this.cache.wishes.data = this.cache.wishes.data.filter(w => w.id !== id);
    return await this._deleteRowByColumn('Wishes', 0, id);
  }

  // ================= HELPERS =================
  async _getRows(range) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return [];
    try {
      const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
      return response.data.values || [];
    } catch (e) { return []; }
  }

  async _appendRows(range, values) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return;
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values }
      });
    } catch (e) {
      console.warn('Failed to append rows to sheet:', e.message);
    }
  }

  async _updateRow(sheetName, rowNumber, startCol, endCol, rowData) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return;
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!${startCol}${rowNumber}:${endCol}${rowNumber}`,
        valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] }
      });
    } catch (e) {
      console.warn(`Failed to update row in ${sheetName}:`, e.message);
    }
  }

  async _deleteRowByColumn(sheetTitle, colIndex, matchValue) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return false;
    try {
      const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetTitle}!A2:Z` });
      const rows = response.data.values;
      if (!rows) return false;
      const rowIndex = rows.findIndex(row => String(row[colIndex]) === String(matchValue));
      if (rowIndex === -1) return false;
      
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetTitle);
      if (!sheet) return false;
      const sheetId = sheet.properties.sheetId;
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 } } }]
        }
      });
      return true;
    } catch (e) {
      console.error(`Failed to delete row in ${sheetTitle}:`, e);
      return false;
    }
  }

  async deleteInvitation(id) {
    return await this._deleteRowByColumn('Invitations', 0, id);
  }

  // ================= GUESTS =================
  // Format: ID | InvitationId | Name | Slug | Views | RsvpStatus | CreatedAt
  async getGuests(invitationId = null) {
    const rows = await this._getRows('Guests!A2:G');
    const guests = rows.map(row => ({
      id: parseInt(row[0]) || 0,
      invitation_id: parseInt(row[1]) || 0,
      name: row[2] || '',
      slug: row[3] || '',
      views: parseInt(row[4]) || 0,
      rsvp_status: row[5] || 'belum_konfirmasi',
      created_at: row[6] || new Date().toISOString()
    }));
    return invitationId ? guests.filter(g => g.invitation_id === parseInt(invitationId)) : guests;
  }

  async addGuest(guest) {
    const nextId = await this._getNextId('Guests!A2:A');
    const createdAt = new Date().toISOString();
    const values = [[
      nextId, guest.invitation_id, guest.name, guest.slug, guest.views || 0, guest.rsvp_status || 'belum_konfirmasi', createdAt
    ]];
    await this._appendRows('Guests!A2:G', values);
    return { ...guest, id: nextId, created_at: createdAt };
  }

  async updateGuest(id, updates) {
    const rows = await this._getRows('Guests!A2:G');
    const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
    if (rowIndex === -1) return null;
    
    const currentRow = rows[rowIndex];
    const updatedRow = [
      currentRow[0],
      currentRow[1],
      updates.name !== undefined ? updates.name : currentRow[2],
      updates.slug !== undefined ? updates.slug : currentRow[3],
      updates.views !== undefined ? updates.views : currentRow[4],
      updates.rsvp_status !== undefined ? updates.rsvp_status : currentRow[5],
      currentRow[6]
    ];
    await this._updateRow('Guests', rowIndex + 2, 'A', 'G', updatedRow);
    return { id: parseInt(updatedRow[0]), invitation_id: parseInt(updatedRow[1]), name: updatedRow[2], slug: updatedRow[3], views: parseInt(updatedRow[4]), rsvp_status: updatedRow[5], created_at: updatedRow[6] };
  }

  async deleteGuest(id) {
    return await this._deleteRowByColumn('Guests', 0, id);
  }

  // ================= RSVPs =================
  // Format: ID | InvitationId | Name | Status | GuestsCount | Message | BuktiTransferUrl | CreatedAt
  async getRSVPs(invitationId = null) {
    const rows = await this._getRows('RSVPs!A2:H');
    const rsvps = rows.map(row => ({
      id: parseInt(row[0]) || 0,
      invitation_id: parseInt(row[1]) || 0,
      name: row[2] || '',
      status: row[3] || '',
      guests_count: parseInt(row[4]) || 1,
      message: row[5] || '',
      buktiTransferUrl: row[6] || '',
      created_at: row[7] || new Date().toISOString()
    }));
    return invitationId ? rsvps.filter(r => r.invitation_id === parseInt(invitationId)) : rsvps;
  }

  async addRSVP(rsvp) {
    const nextId = await this._getNextId('RSVPs!A2:A');
    const createdAt = new Date().toISOString();
    const values = [[
      nextId, rsvp.invitation_id, rsvp.name, rsvp.status, rsvp.guests_count || 1, rsvp.message || '', rsvp.buktiTransferUrl || '', createdAt
    ]];
    await this._appendRows('RSVPs!A2:H', values);
    return { ...rsvp, id: nextId, created_at: createdAt };
  }

  async deleteRSVP(id) {
    return await this._deleteRowByColumn('RSVPs', 0, id);
  }

  // ================= WISHES =================
  // Format: ID | InvitationId | Name | Message | Status | CreatedAt
  async getWishes(invitationId = null) {
    const rows = await this._getRows('Wishes!A2:F');
    const wishes = rows.map(row => ({
      id: parseInt(row[0]) || 0,
      invitation_id: parseInt(row[1]) || 0,
      name: row[2] || '',
      message: row[3] || '',
      status: row[4] || 'pending',
      created_at: row[5] || new Date().toISOString()
    }));
    return invitationId ? wishes.filter(w => w.invitation_id === parseInt(invitationId)) : wishes;
  }

  async addWish(wish) {
    const nextId = await this._getNextId('Wishes!A2:A');
    const createdAt = new Date().toISOString();
    const values = [[
      nextId, wish.invitation_id, wish.name, wish.message || '', wish.status || 'pending', createdAt
    ]];
    await this._appendRows('Wishes!A2:F', values);
    return { ...wish, id: nextId, created_at: createdAt };
  }

  async updateWish(id, updates) {
    const rows = await this._getRows('Wishes!A2:F');
    const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
    if (rowIndex === -1) return null;
    
    const currentRow = rows[rowIndex];
    const updatedRow = [
      currentRow[0],
      currentRow[1],
      currentRow[2],
      currentRow[3],
      updates.status !== undefined ? updates.status : currentRow[4],
      currentRow[5]
    ];
    await this._updateRow('Wishes', rowIndex + 2, 'A', 'F', updatedRow);
    return { id: parseInt(updatedRow[0]), invitation_id: parseInt(updatedRow[1]), name: updatedRow[2], message: updatedRow[3], status: updatedRow[4], created_at: updatedRow[5] };
  }

  async deleteWish(id) {
    return await this._deleteRowByColumn('Wishes', 0, id);
  }

  // ================= HELPERS =================
  async _getRows(range) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return [];
    try {
      const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
      return response.data.values || [];
    } catch (e) { return []; }
  }

  async _appendRows(range, values) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return;
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values }
    });
  }

  async _updateRow(sheetName, rowNumber, startCol, endCol, rowData) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!${startCol}${rowNumber}:${endCol}${rowNumber}`,
      valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] }
    });
  }

  async _getNextId(idRange) {
    const ids = await this._getRows(idRange);
    if (!ids || ids.length === 0) return 1;
    const max = Math.max(...ids.map(row => parseInt(row[0]) || 0));
    return max + 1;
  }

  async _deleteRowByColumn(sheetTitle, colIndex, matchValue) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return false;
    try {
      const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetTitle}!A2:Z` });
      const rows = response.data.values;
      if (!rows) return false;
      const rowIndex = rows.findIndex(row => String(row[colIndex]) === String(matchValue));
      if (rowIndex === -1) return false;
      
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetTitle);
      if (!sheet) return false;
      const sheetId = sheet.properties.sheetId;
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 } } }]
        }
      });
      return true;
    } catch (e) {
      console.error(`Failed to delete row in ${sheetTitle}:`, e);
      return false;
    }
  }
}

export default new GoogleSheetsDB();
