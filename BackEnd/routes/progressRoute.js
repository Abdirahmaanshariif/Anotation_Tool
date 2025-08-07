// routes/progress.js
const express = require("express");
const router = express.Router();
const Progress = require("../models/progresModel");
const { authenticateToken } = require("../utils/auth");

// 1) Save progress
router.post("/", authenticateToken, async (req, res) => {
  const { index } = req.body;
  try {
    await Progress.findOneAndUpdate(
      { userId: req.user.Annotator_ID },          // ← use the numeric Annotator_ID
      { lastAnnotationIndex: index, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Progress save error:", err);
    res.status(500).json({ error: "Failed to save progress." });
  }
});

// 2) Get progress
router.get("/", authenticateToken, async (req, res) => {
  console.log("→ token says user:", req.user);
  try {
    const prog = await Progress.findOne({ userId: req.user.Annotator_ID });
    console.log("→ Progress.findOne returned:", prog);
    res.json({ index: prog?.lastAnnotationIndex ?? 0 });
  } catch (err) {
    console.error("Progress load error:", err);
    res.status(500).json({ error: "Failed to load progress." });
  }
});

module.exports = router;
