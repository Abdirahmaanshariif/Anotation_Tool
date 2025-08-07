const express = require("express");
const mongoose = require("mongoose");
const Users = require("../models/usersModel");
const jwt = require("jsonwebtoken");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { authenticateToken, authorizeRoles } = require("../utils/auth")
require('dotenv').config();
router.get('/usersAll',
  authenticateToken,
  authorizeRoles('Admin'),
  async (req, res) => {
    try {
      const users = await Users.find();
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});

// Create a new annotation
// routes/anotationRoute.js

router.post("/addUsers", async (req, res) => {
  const { name, email, password, userType } = req.body;

  try {
    // Check for existing email
    const existing = await Users.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "A user with that email already exists." });
    }

    // Hash the password
    const hashed = await bcrypt.hash(password, 10);

    // Create and save the user (this triggers your pre('save') hook!)
    const user = new Users({
      name,
      email,
      password: hashed,
      userType,
    });
    await user.save();

    // Generate a token now that Annotator_ID exists
    const token = jwt.sign(
      { Annotator_ID: user.Annotator_ID, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Send back the new user and token
    res.status(201).json({ user, token });
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ message: err.message });
  }
});




router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // 2. Check if user exists
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Incorrect username" });
    }

    // 3. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // 4. Generate JWT
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing");
      return res.status(500).json({ error: "Internal server error" });
    }
    const token = jwt.sign(
      {
        Annotator_ID: user.Annotator_ID,
        email: user.email,
        userType: user.userType,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userData = {
      _id: user.Annotator_ID,
      name: user.name,
      email: user.email,
      userType: user.userType,
      createdAt: user.createdAt,
    };

    res.status(200).json({ token, user: userData });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

router.post("/change-password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const user = await Users.findOne({ Annotator_ID: req.user.Annotator_ID });

    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update an users by ID
router.put("/UpdateUsers/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid annotation ID format" });
  }

  try {
    const annotation = await Users.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!annotation)
      return res.status(404).json({ message: "Users not found" });
    res.status(200).json(annotation);
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Delete an annotation by ID
router.delete("/deleteUser/:id", async (req, res) => {
  try {
    const deleted = await Users.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Users not found" });
    res.status(200).json(deleted);
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports =  router;
