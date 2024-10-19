const express = require("express");
const shortid = require("shortid");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

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
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB Atlas");
    db = client.db("qr_tracker");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

connectToDatabase().then(() => {
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
        console.log(`Redirecting to: ${link.originalUrl}`);
        return res.redirect(link.originalUrl);
      } else {
        return res.status(404).send("Short code not found");
      }
    } catch (error) {
      console.error("Error retrieving URL:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/stats/:shortCode", async (req, res) => {
    const { shortCode } = req.params;
    try {
      const link = await db.collection("links").findOne({ shortCode });
      if (link) {
        res.json({ scanCount: link.scanCount });
      } else {
        res.status(404).json({ error: "Short code not found" });
      }
    } catch (error) {
      console.error("Error retrieving stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
