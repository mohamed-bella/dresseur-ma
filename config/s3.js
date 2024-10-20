const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

// Configure the S3 client with your credentials and region
const s3 = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});

// Upload file to S3 and convert to WebP format using Sharp
async function uploadImageToS3(file) {
     try {
          // Convert image buffer to WebP format
          const buffer = await sharp(file.buffer)
               .webp({ quality: 80 })
               .toBuffer();

          // Generate a unique key for the file in the uploads folder
          const key = `uploads/${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;

          // Set up S3 upload parameters
          const uploadParams = {
               Bucket: process.env.AWS_S3_BUCKET_NAME,
               Key: key,
               Body: buffer,
               ContentType: 'image/webp'
          };

          // Use AWS SDK v3 to upload the file
          const parallelUploads3 = new Upload({
               client: s3,
               params: uploadParams
          });

          // Perform the upload and return the S3 URL
          const data = await parallelUploads3.done();
          return data.Location;
     } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error('Image upload failed');
     }
}

// Generate a pre-signed URL for a specific S3 object
async function generatePresignedUrl(key) {
     try {
          const command = new GetObjectCommand({
               Bucket: process.env.AWS_S3_BUCKET_NAME,
               Key: key
          });

          // Generate a pre-signed URL that is valid for 5 minutes (300 seconds)
          const url = await getSignedUrl(s3, command, { expiresIn: 300 });
          return url;
     } catch (error) {
          console.error('Error generating presigned URL:', error);
          throw new Error('Presigned URL generation failed');
     }
}

module.exports = {
     uploadImageToS3,
     generatePresignedUrl
};
