import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'xsjj2ypo', 
  api_key: process.env.CLOUDINARY_API_KEY || '383252648335621', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'z3zN4NAd8D9rGI6yBl9lHVIGbx8'
});

class CloudinaryDB {
  uploadFile(fileBuffer, resourceType = 'auto') {
    return new Promise((resolve, reject) => {
      const options = {
        resource_type: resourceType,
        folder: 'wedding_assets',
      };

      // If image, enable progressive loading & webp auto format
      if (resourceType === 'image' || resourceType === 'auto') {
        options.quality = 'auto:good';
        options.fetch_format = 'auto';
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (result && result.secure_url) {
            resolve(result.secure_url);
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
