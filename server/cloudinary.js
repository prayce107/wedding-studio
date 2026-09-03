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
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder: 'wedding_assets' },
        (error, result) => {
          if (result) {
            resolve(result.secure_url);
          } else {
            reject(error);
          }
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }
}

export default new CloudinaryDB();
