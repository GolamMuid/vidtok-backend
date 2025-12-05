const express = require("express");
const router = express.Router();
const { CosmosClient } = require("@azure/cosmos");
require("dotenv").config();

// Cosmos DB client
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

const cosmosDB = cosmosClient.database(process.env.COSMOS_DB);
const videosContainer = cosmosDB.container(process.env.COSMOS_CONTAINER);

// GET /user-videos/:userId - fetch all videos by a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) return res.status(400).send("userId is required");

    const querySpec = {
      query:
        "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@userId", value: userId }],
    };

    const { resources: videos } = await videosContainer.items
      .query(querySpec)
      .fetchAll();

    res.status(200).json({ videos });
  } catch (err) {
    console.error("Error fetching user videos:", err);
    res.status(500).send("Error fetching user videos");
  }
});

module.exports = router;
