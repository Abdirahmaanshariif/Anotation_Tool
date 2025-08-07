// ====== routes/anotationRoute.js (Back‑End) ======
const express = require("express");

const mongoose = require("mongoose");
const Annotation = require("../models/annotationModel");
const router = express.Router();
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");
const { authenticateToken } = require("../utils/auth");
const User = require("../models/usersModel");
const messages = require("../utils/messages");
// CREATE annotation
router.post("/Addannotation", authenticateToken, async (req, res) => {
  try {
    const existing = await Annotation.findOne({
      Src_Text: req.body.Src_Text,
      Annotator_ID: req.body.Annotator_ID,
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: messages.annotation.alreadyExists });
    }

    const newAnnotation = new Annotation(req.body);
    const savedAnnotation = await newAnnotation.save();
    res.status(201).json(savedAnnotation);
  } catch (error) {
    res.status(500).json({ message: messages.annotation.createError });
  }
});

// UPDATE annotation
router.put("/rebortAnnotation/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: messages.annotation.invalidId });
    }

    const annotation = await Annotation.findById(id);
    if (!annotation) {
      return res.status(404).json({ message: messages.annotation.notFound });
    }

    Object.assign(annotation, req.body);
    const updated = await annotation.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: messages.annotation.updateError });
  }
});

// DELETE single annotation
router.delete(
  "/rebortAnnotationDelete/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const id = req.params.id;
      const annotation = await Annotation.findById(id);

      if (!annotation) {
        return res.status(404).json({ message: messages.annotation.notFound });
      }

      if (annotation.Annotator_ID !== req.user.Annotator_ID) {
        return res
          .status(403)
          .json({ message: messages.annotation.unauthorized });
      }

      await annotation.remove();
      res.json({ message: "Annotation deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: messages.annotation.deleteError });
    }
  }
);

// DELETE all annotations (admin only)
router.delete("/deleteAll", authenticateToken, async (req, res) => {
  try {
    await Annotation.deleteMany({});
    res.json({ message: "All annotations deleted." });
  } catch (error) {
    res.status(500).json({ message: messages.annotation.allDeleteError });
  }
});

// SKIP annotation
router.post("/skip", authenticateToken, async (req, res) => {
  try {
    const { Src_Text, Annotator_ID } = req.body;
    if (!Src_Text || !Annotator_ID) {
      return res
        .status(400)
        .json({ message: messages.annotation.skipMissingFields });
    }

    const skipped = new Annotation({ ...req.body, skipped: true });
    const saved = await skipped.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: messages.annotation.skipError });
  }
});

// EXPORT route
router.get("/export", authenticateToken, async (req, res) => {
  try {
    const annotations = await Annotation.find({});
    if (!annotations || annotations.length === 0) {
      return res.status(400).json({ message: messages.export.noData });
    }

    const format = req.query.format || "json";

    if (format === "csv") {
      const fields = Object.keys(annotations[0].toObject());
      const parser = new Parser({ fields });
      const csv = parser.parse(annotations);
      res.header("Content-Type", "text/csv");
      res.attachment("annotations.csv");
      return res.send(csv);
    } else if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Annotations");

      worksheet.columns = Object.keys(annotations[0].toObject()).map((key) => ({
        header: key,
        key,
      }));

      annotations.forEach((ann) => {
        worksheet.addRow(ann.toObject());
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=annotations.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } else if (format === "json") {
      res.json(annotations);
    } else {
      res.status(400).json({ message: messages.export.unsupported });
    }
  } catch (error) {
    res.status(500).json({ message: messages.export.error });
  }
});

// GET my annotation count
router.get("/mycount", authenticateToken, async (req, res) => {
  try {
    const count = await Annotation.countDocuments({
      Annotator_ID: req.user.Annotator_ID,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: messages.count.myCountError });
  }
});

// GET pending reviews (total)
router.get("/pending", authenticateToken, async (req, res) => {
  try {
    const assigned = await AssignedText.find({
      Annotator_ID: req.user.Annotator_ID,
    });

    const done = await Annotation.countDocuments({
      Annotator_ID: req.user.Annotator_ID,
    });

    const total = assigned.length;
    const pending = total - done;
    res.json({ total, done, pending });
  } catch (error) {
    res.status(500).json({ message: messages.count.pendingError });
  }
});

// GET assigned texts
router.get("/assigned/:annotatorId", authenticateToken, async (req, res) => {
  try {
    const assigned = await AssignedText.find({
      Annotator_ID: req.params.annotatorId,
    });
    res.json(assigned);
  } catch (error) {
    res.status(500).json({ error: messages.assigned.fetchError });
  }
});

// GET stats for dashboard
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const total = await Annotation.countDocuments();
    const users = await Annotation.distinct("Annotator_Email");
    const avgPerUser = total / (users.length || 1);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dailyAnnotations = await Annotation.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    const errors = await Annotation.aggregate([
      {
        $match: {
          Comment: { $regex: /error|wrong|fix|mistake/i },
          createdAt: { $gte: yesterday },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          errorCount: { $sum: 1 },
        },
      },
    ]);

    res.json({ total, avgPerUser, dailyAnnotations, errors });
  } catch (error) {
    res.status(500).json({ message: messages.stats.loadError });
  }
});
module.exports = router;
