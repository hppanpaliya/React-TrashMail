const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getDB } = require("../db");
const config = require("../config");
const auditService = require("../services/auditService");
const { escapeRegex } = require("../utils/regex");

const authController = {
  signup: async (req, res) => {
    const { username, password, inviteCode } = req.body;

    try {
      const db = getDB();
      const usersCollection = db.collection("users");
      const invitesCollection = db.collection("invites");

      // 1. Fast-path check if user already exists (the unique index on
      // users.username is the real guarantee; see duplicate-key handling below)
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // 2. Atomically claim the invite code. findOneAndUpdate ensures two
      // concurrent signups can never both consume the same invite.
      const invite = await invitesCollection.findOneAndUpdate(
        { code: inviteCode, used: false },
        { $set: { used: true, usedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!invite) {
        return res.status(400).json({ message: "Invalid or used invite code" });
      }

      const rollbackInvite = async () => {
        try {
          await invitesCollection.updateOne({ _id: invite._id }, { $set: { used: false }, $unset: { usedAt: "", usedBy: "" } });
        } catch (rollbackErr) {
          console.error("Failed to roll back invite after signup failure:", rollbackErr);
        }
      };

      // 3. Hash Password
      const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 4. Create User
      const user = {
        username,
        password: hashedPassword,
        role: invite.role || "user",
        allowedDomains: null, // null means use global config
        createdAt: new Date(),
      };

      let userId;
      try {
        const result = await usersCollection.insertOne(user);
        userId = result.insertedId;
      } catch (insertErr) {
        // If user creation fails after invite consumption, roll the invite back.
        await rollbackInvite();
        if (insertErr && insertErr.code === 11000) {
          // Duplicate key on users.username (concurrent signup with same name)
          return res.status(400).json({ message: "User already exists" });
        }
        throw insertErr;
      }

      // 5. Record who used the invite
      await invitesCollection.updateOne({ _id: invite._id }, { $set: { usedBy: userId } });

      // Log Signup
      await auditService.logActivity(userId, "SIGNUP", { username }, user.role);

      // 6. Return JWT
      const payload = {
        user: {
          id: userId,
          username: user.username,
          role: user.role,
        },
      };

      jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiry }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },

  login: async (req, res) => {
    const { username, password } = req.body;

    try {
      const db = getDB();
      const usersCollection = db.collection("users");

      // 1. Check if user exists
      const user = await usersCollection.findOne({ username });
      if (!user) {
        await auditService.logActivity(null, "LOGIN_FAILED", { username, ip: req.ip, reason: "User not found" }, "unknown");
        return res.status(400).json({ message: "Invalid Credentials" });
      }

      // 2. Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await auditService.logActivity(user._id, "LOGIN_FAILED", { username, ip: req.ip, reason: "Invalid password" }, user.role || "user");
        return res.status(400).json({ message: "Invalid Credentials" });
      }

      // Log Login
      await auditService.logActivity(user._id, "LOGIN", { ip: req.ip }, user.role || "user");

      // 3. Return JWT
      const payload = {
        user: {
          id: user._id,
          username: user.username,
          role: user.role || "user",
        },
      };

      jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiry }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },

  getMe: async (req, res) => {
    try {
      const db = getDB();
      const usersCollection = db.collection("users");
      const { ObjectId } = require("mongodb");

      const user = await usersCollection.findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { password: 0 } } // Exclude password
      );

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { search, sortBy = "username", sortOrder = "asc" } = req.query;
      const skip = (page - 1) * limit;

      const db = getDB();
      const usersCollection = db.collection("users");

      const filter = {};
      if (search) {
        filter.username = { $regex: escapeRegex(search), $options: "i" };
      }

      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

      const users = await usersCollection
        .find(filter, { projection: { password: 0 } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await usersCollection.countDocuments(filter);

      res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },
};

module.exports = authController;
