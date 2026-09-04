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

  const storageService = {
    /**
     * Uploads a file (image, audio, video) directly to Cloudinary CDN via /api/upload
     * with automatic fallback to high-quality compressed Base64 Canvas.
     * @param {File} file 
     * @returns {Promise<string>} Optimized CDN file URL or compressed Data URL
     */
    async uploadFile(file) {
      if (!file) throw new Error("Tidak ada file yang dipilih");

      // 1. Try uploading to backend / Cloudinary CDN
      try {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);

        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: headers,
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            return data.url;
          }
        }
      } catch (apiErr) {
        console.warn("Cloudinary direct upload notice, falling back to local compression:", apiErr);
      }

      // 2. Client-side Image compression fallback
      const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);

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
                const maxDimension = 1280;

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
                ctx.drawImage(img, 0, 0, width, height);

                const compressed = canvas.toDataURL('image/jpeg', 0.85);
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
  }
})();
