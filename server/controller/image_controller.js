const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");

const uploadSingleImage = async (file, bucket) => {
  if (!file) {
    throw new Error("No file uploaded.");
  }
  const fileName = `${Date.now()}_${file.originalname}`;
  const fileUpload = bucket.file(`images/${fileName}`);

  console.log("Attempting to upload file:", fileName);

  await fileUpload.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  const firebaseStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${
    bucket.name
  }/o/${encodeURIComponent(`images/${fileName}`)}?alt=media`;

  console.log("Uploaded image URL:", firebaseStorageUrl);

  return firebaseStorageUrl;
};

const uploadMultipleImages = async (req, bucket) => {
  if (!req.files || req.files.length === 0) {
    throw new Error("No files uploaded.");
  }

  const imageUrls = [];
  for (const file of req.files) {
    const imageUrl = await uploadSingleImage(file, bucket);
    imageUrls.push(imageUrl);
  }

  console.log("All uploaded image URLs:", imageUrls);

  return imageUrls;
};

module.exports = { uploadSingleImage, uploadMultipleImages };
