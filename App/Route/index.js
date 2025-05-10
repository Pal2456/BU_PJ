// Route/index.js
const express = require('express');
const router = express.Router();
const db = require('../connect1');

// ✅ หน้าแรก redirect ไป login
router.get('/', (req, res) => {
  res.redirect('/login');
});

// ✅ Login Page
router.get('/login', (req, res) => {
  res.render('index', {
    pageId: 'login',
    currentUser: null,
    meetings: [] // ป้องกัน error ใน EJS
  });
});

// ✅ Login Process
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query(
    'SELECT * FROM user WHERE gmail = ? AND password = ?',
    [username, password]
  );

  if (rows.length > 0) {
    req.session.user = rows[0];
    res.redirect('/dashboard');
  } else {
    res.send('Invalid login');
  }
});

// ✅ Signup Page
router.get('/signup', (req, res) => {
  res.render('index', {
    pageId: 'signup',
    currentUser: null,
    meetings: []
  });
});

// ✅ Signup Process
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  await db.query(
    'INSERT INTO user (gmail, password) VALUES (?, ?)',
    [username, password]
  );
  res.redirect('/login');
});

// ✅ Dashboard Page
router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  res.render('index', {
    pageId: 'dashboard',
    currentUser: req.session.user.gmail,
    meetings: [] // ป้องกัน error จาก .forEach
  });
});

// ✅ Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
