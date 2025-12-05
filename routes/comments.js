const express = require("express");
const router = express.Router();
const { CosmosClient } = require("@azure/cosmos");
const Sentiment = require("sentiment");
require("dotenv").config();

// Initialize sentiment analyzer
const sentimentAnalyzer = new Sentiment();

// Cosmos DB client for comments
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});
const cosmosDB = cosmosClient.database(process.env.COSMOS_DB);
const commentsContainer = cosmosDB.container(
  process.env.COSMOS_COMMENTS_CONTAINER
);

// POST /comments/:videoId - add a new comment with sentiment
router.post("/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userId, userName, comment } = req.body;

    if (!userId || !userName || !comment) {
      return res.status(400).send("All fields are required");
    }

    // Analyze sentiment
    const analysis = sentimentAnalyzer.analyze(comment);
    let sentiment;
    if (analysis.score > 0) sentiment = "positive";
    else if (analysis.score < 0) sentiment = "negative";
    else sentiment = "neutral";

    // Prepare comment object
    const commentItem = {
      id: Date.now().toString(), // unique ID
      videoId,
      userId,
      userName,
      comment,
      sentiment,
      sentimentScore: analysis.score, // optional detailed score
      createdAt: new Date().toISOString(),
    };

    // Store in Cosmos DB
    await commentsContainer.items.create(commentItem);

    res
      .status(200)
      .json({ message: "Comment posted successfully", data: commentItem });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error posting comment");
  }
});

// GET /comments/:videoId - fetch comments for a video
router.get("/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const querySpec = {
      query:
        "SELECT * FROM c WHERE c.videoId = @videoId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@videoId", value: videoId }],
    };

    const { resources: comments } = await commentsContainer.items
      .query(querySpec)
      .fetchAll();

    res.status(200).json({ comments });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching comments");
  }
});

module.exports = router;
