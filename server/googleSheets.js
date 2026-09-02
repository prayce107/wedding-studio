import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kredensial service account diletakkan di root server folder atau atur via env var
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Pastikan Anda sudah mengatur SPREADSHEET_ID di file .env atau hardcode di sini
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1j8ljUx_W0RM98I49Czw5sV2DPVlSwAEQyf1eaCtazhs';

class GoogleSheetsDB {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.initialized = false;
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
    } catch (error) {
      console.error('❌ Gagal menginisialisasi Google Sheets API:', error);
    }
  }

  // Fungsi untuk mendapatkan semua user (baris dari Sheet 'Users')
  // Format kolom yang diharapkan: ID | Username | Email | PasswordHash | Role | CreatedAt
  async getUsers() {
    if (!this.initialized) await this.init();
    if (!this.sheets) return [];

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Users!A2:F', // Mengabaikan baris pertama (header)
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) return [];

      return rows.map((row) => ({
        id: parseInt(row[0]) || 0,
        username: row[1] || '',
        email: row[2] || '',
        passwordHash: row[3] || '',
        role: row[4] || 'user',
        created_at: row[5] || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Gagal mengambil data users dari Google Sheets:', error);
      return [];
    }
  }

  // Menambahkan user baru ke akhir sheet
  async addUser(user) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return null;

    try {
      const users = await this.getUsers();
      const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      
      const createdAt = new Date().toISOString();
      const values = [
        [nextId, user.username, user.email, user.passwordHash, user.role || 'user', createdAt]
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Users!A2:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      return { ...user, id: nextId, created_at: createdAt };
    } catch (error) {
      console.error('Gagal menambah user ke Google Sheets:', error);
      throw error;
    }
  }

  // Update user berdasarkan ID
  async updateUser(id, updates) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return null;

    try {
      // Kita perlu mencari baris mana yang memiliki ID tersebut
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Users!A2:F',
      });
      const rows = response.data.values;
      if (!rows) return null;

      const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
      if (rowIndex === -1) return null;

      // Index baris di Google Sheets dimulai dari 1, dan kita melewatkan header (baris 1).
      // Jadi baris ke-0 di array `rows` adalah baris ke-2 di Sheet.
      const sheetRowNumber = rowIndex + 2; 

      const currentRow = rows[rowIndex];
      // currentRow: [id, username, email, passwordHash, role, created_at]
      
      const updatedRow = [
        currentRow[0],
        updates.username !== undefined ? updates.username : currentRow[1],
        updates.email !== undefined ? updates.email : currentRow[2],
        updates.passwordHash !== undefined ? updates.passwordHash : currentRow[3],
        updates.role !== undefined ? updates.role : currentRow[4],
        currentRow[5]
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Users!A${sheetRowNumber}:F${sheetRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updatedRow] },
      });

      return {
        id: parseInt(updatedRow[0]),
        username: updatedRow[1],
        email: updatedRow[2],
        passwordHash: updatedRow[3],
        role: updatedRow[4],
        created_at: updatedRow[5]
      };
    } catch (error) {
      console.error('Gagal update user di Google Sheets:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    if (!this.initialized) await this.init();
    if (!this.sheets) return false;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Users!A2:F',
      });
      const rows = response.data.values;
      if (!rows) return false;

      const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
      if (rowIndex === -1) return false;

      // Google Sheets API tidak memiliki cara langsung untuk "menghapus baris" via values API
      // Untuk menghapus baris sepenuhnya, kita harus menggunakan metode batchUpdate.
      // Kita perlu mencari sheetId terlebih dahulu.
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
      });
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Users');
      const sheetId = sheet.properties.sheetId;
      
      const sheetRowNumber = rowIndex + 1; // 0-indexed di batchUpdate, baris 1 (header) dilewatkan = index 1

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: sheetRowNumber,
                  endIndex: sheetRowNumber + 1
                }
              }
            }
          ]
        }
      });
      
      return true;
    } catch (error) {
      console.error('Gagal menghapus user dari Google Sheets:', error);
      throw error;
    }
  }
}

export default new GoogleSheetsDB();
