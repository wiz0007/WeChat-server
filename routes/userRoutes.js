// routes/userRoutes.js
import express from "express";
import User from "../models/User.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "-__v");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

export default router;
