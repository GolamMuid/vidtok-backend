const express = require("express");
const router = express.Router();
const { CosmosClient } = require("@azure/cosmos");

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

const database = cosmosClient.database(process.env.COSMOS_DB);

// Containers
const videosContainer = database.container("Videos");
const commentsContainer = database.container("Comments");

// GET /video-details/:videoId
router.get("/:videoId", async (req, res) => {
  try {
    const videoId = req.params.videoId;

    console.log("📌 videoId received:", videoId);

    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }

    // -------------------------
    // 1️⃣ Fetch Video (Partition Key = id)
    // -------------------------
    const { resource: video } = await videosContainer
      .item(videoId, videoId)
      .read();

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // -------------------------
    // 2️⃣ Fetch Comments (Partition Key = videoId)
    // -------------------------
    const query = {
      query: "SELECT * FROM c WHERE c.videoId = @videoId",
      parameters: [{ name: "@videoId", value: videoId }],
    };

    const { resources: comments } = await commentsContainer.items
      .query(query, { partitionKey: videoId })
      .fetchAll();

    return res.json({
      video,
      comments,
    });
  } catch (err) {
    console.error("Error fetching video details:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
