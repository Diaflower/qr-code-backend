const express = require("express");
const shortid = require("shortid");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 10000;

// Enable CORS for all routes
app.use(cors());

// Use the MONGODB_URI from environment variables
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

async function connectToDatabase() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Set the database to use
    db = client.db("qr_tracker"); // Replace with your actual database name
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

// Connect to the database before starting the server
connectToDatabase().then(() => {
  // Define your routes here
  app.get("/create", async (req, res) => {
    const { url } = req.query;
    const shortCode = shortid.generate();
    try {
      await db
        .collection("links")
        .insertOne({ shortCode, originalUrl: url, scanCount: 0 });
      res.json({ shortCode });
    } catch (error) {
      console.error("Error creating short URL:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/:shortCode", async (req, res) => {
    const { shortCode } = req.params;
    try {
      const link = await db.collection("links").findOne({ shortCode });
      if (link) {
        await db
          .collection("links")
          .updateOne({ shortCode }, { $inc: { scanCount: 1 } });
        res.redirect(link.originalUrl);
      } else {
        res.status(404).send("Not found");
      }
    } catch (error) {
      console.error("Error retrieving URL:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/stats/:shortCode", async (req, res) => {
    const { shortCode } = req.params;
    try {
      const link = await db.collection("links").findOne({ shortCode });
      if (link) {
        res.json({ scanCount: link.scanCount });
      } else {
        res.status(404).send("Not found");
      }
    } catch (error) {
      console.error("Error retrieving stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
