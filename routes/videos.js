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
const cosmosContainer = cosmosDB.container(process.env.COSMOS_CONTAINER);

// GET /videos - fetch all videos
router.get("/", async (req, res) => {
  try {
    const querySpec = {
      query: "SELECT * FROM c ORDER BY c.uploadedAt DESC",
    };

    const { resources: items } = await cosmosContainer.items
      .query(querySpec)
      .fetchAll();

    res.status(200).json({ videos: items });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching videos");
  }
});

module.exports = router;
