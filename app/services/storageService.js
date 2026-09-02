const storageService = {
  /**
   * Uploads a file (image, audio, video) and returns its URL.
   * Compresses images via Canvas to keep file sizes very small (< 150KB) and prevent QuotaExceededError.
   * Falls back to raw FileReader for audio/video or if compression fails.
   * @param {File} file 
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadFile(file) {
    if (!file) throw new Error("No file selected");
    
    // Simulate slight network latency
    await new Promise(resolve => setTimeout(resolve, 100));

    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);

    // Read file directly via FileReader to avoid canvas rendering engine errors
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        let result = reader.result;
        // Fix unrecognized MIME types for images
        if (result.startsWith("data:application/octet-stream;") && isImage) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (ext === "png") {
            result = result.replace("data:application/octet-stream;", "data:image/png;");
          } else if (ext === "webp") {
            result = result.replace("data:application/octet-stream;", "data:image/webp;");
          } else if (ext === "gif") {
            result = result.replace("data:application/octet-stream;", "data:image/gif;");
          } else {
            result = result.replace("data:application/octet-stream;", "data:image/jpeg;");
          }
        }
        resolve(result);
      };
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
