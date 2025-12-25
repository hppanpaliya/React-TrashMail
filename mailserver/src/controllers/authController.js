const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const config = require('../config');

const authController = {
  signup: async (req, res) => {
    const { username, password, inviteCode } = req.body;

    try {
      const db = getDB();
      const usersCollection = db.collection('users');
      const invitesCollection = db.collection('invites');

      // 1. Verify Invite Code
      const invite = await invitesCollection.findOne({ code: inviteCode, used: false });
      if (!invite) {
        return res.status(400).json({ message: 'Invalid or used invite code' });
      }

      // 2. Check if user already exists
      let user = await usersCollection.findOne({ username });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // 3. Hash Password
      const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 4. Create User
      user = {
        username,
        password: hashedPassword,
        role: invite.role || 'user',
        createdAt: new Date(),
      };

      const result = await usersCollection.insertOne(user);
      const userId = result.insertedId;

      // 5. Mark invite as used
      await invitesCollection.updateOne(
        { _id: invite._id },
        { $set: { used: true, usedBy: userId, usedAt: new Date() } }
      );

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
        return res.status(400).json({ message: 'Invalid Credentials' });
      }

      // 2. Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid Credentials' });
      }

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
      const db = getDB();
      const usersCollection = db.collection('users');

      const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
      res.json(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  },
};

module.exports = authController;
