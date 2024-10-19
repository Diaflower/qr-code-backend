const express = require("express");
const mongoose = require("mongoose");
const shortid = require("shortid");
require("dotenv").config();
const cors = require("cors");

const app = express();
const port = process.env.PORT || 10000;
app.use(cors());

const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));

const LinkSchema = new mongoose.Schema({
  shortCode: String,
  originalUrl: String,
  scanCount: { type: Number, default: 0 },
});

const Link = mongoose.model("Link", LinkSchema);

app.get("/create", async (req, res) => {
  const { url } = req.query;
  const shortCode = shortid.generate();
  const link = new Link({ shortCode, originalUrl: url });
  await link.save();
  res.json({ shortCode });
});

app.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  const link = await Link.findOne({ shortCode });
  if (link) {
    link.scanCount++;
    await link.save();
    res.redirect(link.originalUrl);
  } else {
    res.status(404).send("Not found");
  }
});

app.get("/stats/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  const link = await Link.findOne({ shortCode });
  if (link) {
    res.json({ scanCount: link.scanCount });
  } else {
    res.status(404).send("Not found");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
