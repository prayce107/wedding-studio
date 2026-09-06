(function () {
  'use strict';

  const getToken = () => {
    const session = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
    if (!session) return null;
    try {
      const parsed = JSON.parse(session);
      return parsed.token || null;
    } catch (e) {
      return null;
    }
  };

  // Lightweight high-capacity IndexedDB Key-Value Store
  const DB_NAME = 'wedding_lab_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'invitations_store';

  let dbPromise = null;
  function getDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          return resolve(null);
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = (err) => {
          console.warn('IndexedDB initialization notice:', err);
          resolve(null);
        };
      });
    }
    return dbPromise;
  }

  const idbStore = {
    async get(key) {
      try {
        const db = await getDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },
    async set(key, value) {
      try {
        const db = await getDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(value, key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },
    async del(key) {
      try {
        const db = await getDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    }
  };

  const storageService = {
    idb: idbStore,

    /**
     * Uploads a file (image, audio, video) directly to Cloudinary CDN / local backend via /api/upload
     * with automatic fallback to high-efficiency compressed Base64 Canvas.
     * @param {File} file 
     * @param {Object} options Optional settings: { maxDimension: number, quality: number }
     * @returns {Promise<string>} Optimized CDN file URL or compressed Data URL
     */
    async uploadFile(file, options = {}) {
      if (!file) throw new Error("Tidak ada file yang dipilih");

      // 1. Try uploading to backend / Cloudinary CDN / Local Uploads
      try {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);

        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        let res = await fetch('/api/upload', {
          method: 'POST',
          headers: headers,
          body: formData
        });

        if (!res.ok) {
          // Fallback to public upload endpoint if /api/upload was restricted
          res = await fetch('/api/public/upload', {
            method: 'POST',
            body: formData
          });
        }

        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            return data.url;
          }
        }
      } catch (apiErr) {
        console.warn("Direct server upload notice, falling back to local compression:", apiErr);
      }

      // 2. Client-side Image compression fallback (Smart resizing + high efficiency encoding)
      const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|jfif)$/i.test(file.name);

      if (isImage) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDimension = options.maxDimension || 1200;
                const quality = options.quality || 0.78;

                if (width > maxDimension || height > maxDimension) {
                  if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                  } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                  }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Better smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Try WebP first, fallback to JPEG
                let compressed = '';
                try {
                  compressed = canvas.toDataURL('image/webp', quality);
                  if (!compressed.startsWith('data:image/webp')) {
                    compressed = canvas.toDataURL('image/jpeg', quality);
                  }
                } catch {
                  compressed = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(compressed);
              } catch (err) {
                resolve(e.target.result);
              }
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }

      // Audio & video fallback
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Gagal membaca file"));
        reader.readAsDataURL(file);
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageService;
  } else {
    window.storageService = storageService;
    window.idbStore = idbStore;
  }
})();
