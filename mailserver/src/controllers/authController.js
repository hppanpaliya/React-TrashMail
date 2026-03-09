const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const config = require('../config');
const auditService = require('../services/auditService');

const authController = {
  signup: async (req, res) => {
    const { username, password, inviteCode } = req.body;
    let consumedInviteId = null;

    try {
      const db = getDB();
      const usersCollection = db.collection('users');
      const invitesCollection = db.collection('invites');

      // 1. Check if user already exists
      let user = await usersCollection.findOne({ username });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // 2. Validate and atomically consume invite code
      const invite = await invitesCollection.findOne({ code: inviteCode, used: false });
      if (!invite) {
        return res.status(400).json({ message: 'Invalid or used invite code' });
      }

      const consumeInviteResult = await invitesCollection.updateOne(
        { _id: invite._id, used: false },
        { $set: { used: true, usedAt: new Date() } }
      );

      if (consumeInviteResult.modifiedCount === 0) {
        return res.status(400).json({ message: 'Invalid or used invite code' });
      }

      consumedInviteId = invite._id;

      // 3. Hash Password
      const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 4. Create User
      user = {
        username,
        password: hashedPassword,
        role: invite.role || 'user',
        allowedDomains: null, // null means use global config
        createdAt: new Date(),
      };

      const result = await usersCollection.insertOne(user);
      const userId = result.insertedId;
      consumedInviteId = null;

      // 5. Attach consumed invite to created user
      await invitesCollection.updateOne(
        { _id: invite._id },
        { $set: { usedBy: userId } }
      );

      // Log Signup
      await auditService.logActivity(userId, 'SIGNUP', { username }, user.role);

      // 6. Return JWT
      const payload = {
        user: {
          id: userId,
          username: user.username,
          role: user.role
        },
      };

      jwt.sign(
        payload,
        config.jwtSecret,
        { expiresIn: config.jwtExpiry },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      if (consumedInviteId) {
        try {
          const db = getDB();
          await db.collection('invites').updateOne(
            { _id: consumedInviteId, usedBy: { $exists: false } },
            { $set: { used: false }, $unset: { usedAt: "" } }
          );
        } catch (rollbackError) {
          console.error("Failed to roll back consumed invite:", rollbackError.message);
        }
      }

      console.error(err.message);
      res.status(500).send('Server error');
    }
  },

  login: async (req, res) => {
    const { username, password } = req.body;

    try {
      const db = getDB();
      const usersCollection = db.collection('users');

      // 1. Check if user exists
      const user = await usersCollection.findOne({ username });
      if (!user) {
        await auditService.logActivity(null, 'LOGIN_FAILED', { username, ip: req.ip, reason: 'User not found' }, 'unknown');
        return res.status(400).json({ message: 'Invalid Credentials' });
      }

      // 2. Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await auditService.logActivity(user._id, 'LOGIN_FAILED', { username, ip: req.ip, reason: 'Invalid password' }, user.role || 'user');
        return res.status(400).json({ message: 'Invalid Credentials' });
      }

      // Log Login
      await auditService.logActivity(user._id, 'LOGIN', { ip: req.ip }, user.role || 'user');

      // 3. Return JWT
      const payload = {
        user: {
          id: user._id,
          username: user.username,
          role: user.role || 'user'
        },
      };

      jwt.sign(
        payload,
        config.jwtSecret,
        { expiresIn: config.jwtExpiry },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  },

  getMe: async (req, res) => {
    try {
      const db = getDB();
      const usersCollection = db.collection('users');
      const { ObjectId } = require('mongodb');

      const user = await usersCollection.findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { password: 0 } } // Exclude password
      );

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const { search, sortBy = 'username', sortOrder = 'asc' } = req.query;
      const skip = (page - 1) * limit;

      const db = getDB();
      const usersCollection = db.collection('users');

      const filter = {};
      if (search) {
        filter.username = { $regex: search, $options: 'i' };
      }

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

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
      res.status(500).send('Server error');
    }
  },
};

module.exports = authController;
