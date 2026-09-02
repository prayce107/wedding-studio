const storageService = {
  /**
   * Uploads a file (image, audio, video) and returns its optimized URL / Base64.
   * Automatically compresses images using Canvas to max 1200px and 80% quality,
   * keeping photos ultra-sharp while reducing size from 5-10MB down to ~150KB.
   * @param {File} file 
   * @returns {Promise<string>} Optimized file URL / data
   */
  async uploadFile(file) {
    if (!file) throw new Error("Tidak ada file yang dipilih");

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
              const maxDimension = 1200;

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

              const compressed = canvas.toDataURL('image/jpeg', 0.82);
              resolve(compressed);
            } catch (err) {
              // Fallback to original read result if canvas fails
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

    // Audio & other files
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
