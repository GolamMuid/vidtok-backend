const express = require("express");
const router = express.Router();
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");
require("dotenv").config();

// Memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Azure Blob client
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_STORAGE_CONTAINER
);

// Cosmos client
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});
const cosmosDB = cosmosClient.database(process.env.COSMOS_DB);
const cosmosContainer = cosmosDB.container(process.env.COSMOS_CONTAINER);

// Upload API
router.post(
  "/",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const videoFile = req.files.video?.[0];
      const thumbnailFile = req.files.thumbnail?.[0];
      const { userId, userName, title, description } = req.body;

      if (!videoFile) return res.status(400).send("Video is required");
      if (!userId || !userName || !title || !description)
        return res.status(400).send("All text fields are required");

      // Upload video
      const videoBlobName = Date.now() + "-" + videoFile.originalname;
      const videoClient = containerClient.getBlockBlobClient(videoBlobName);
      await videoClient.upload(videoFile.buffer, videoFile.size);
      const videoUrl = videoClient.url;

      // Upload thumbnail
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbnailBlobName = Date.now() + "-" + thumbnailFile.originalname;
        const thumbnailClient =
          containerClient.getBlockBlobClient(thumbnailBlobName);
        await thumbnailClient.upload(thumbnailFile.buffer, thumbnailFile.size);
        thumbnailUrl = thumbnailClient.url;
      }

      // Save metadata to Cosmos DB
      const dbItem = {
        id: videoBlobName,
        userId,
        userName,
        title,
        description,
        videoUrl,
        thumbnailUrl,
        uploadedAt: new Date().toISOString(),
      };

      await cosmosContainer.items.create(dbItem);

      res.status(200).json({ message: "Upload successful", data: dbItem });
    } catch (err) {
      console.error(err);
      console.log(err);
      res.status(500).send("Error uploading files");
    }
  }
);

module.exports = router;
