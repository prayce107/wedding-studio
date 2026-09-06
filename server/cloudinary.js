import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'xsjj2ypo', 
  api_key: process.env.CLOUDINARY_API_KEY || '383252648335621', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'z3zN4NAd8D9rGI6yBl9lHVIGbx8'
});

class CloudinaryDB {
  uploadFile(fileBuffer, resourceType = 'auto', originalFilename = '') {
    return new Promise((resolve, reject) => {
      const isAudio = resourceType === 'audio' || resourceType === 'video' || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(originalFilename);
      
      const options = {
        resource_type: isAudio ? 'video' : (resourceType === 'image' ? 'image' : 'auto'),
        folder: 'wedding_assets',
      };

      if (isAudio) {
        options.format = 'mp3';
      } else if (resourceType === 'image' || resourceType === 'auto') {
        options.quality = 'auto:good';
        options.fetch_format = 'auto';
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (result && result.secure_url) {
            let finalUrl = result.secure_url;
            // If audio file and doesn't end with .mp3, ensure extension for HTML5 audio MIME compatibility
            if (isAudio && !finalUrl.match(/\.(mp3|wav|ogg|m4a)$/i)) {
              finalUrl = `${finalUrl}.mp3`;
            }
            resolve(finalUrl);
          } else {
            console.error('Cloudinary upload error:', error);
            reject(error || new Error('Upload to Cloudinary failed'));
          }
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }
}

export default new CloudinaryDB();
