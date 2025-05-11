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
    meetings: [],
    meeting: null,
    userPreferences: [],
    commonSlots: []
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
    meetings: [],
    meeting: null,
    userPreferences: [],
    commonSlots: []
  });
});


// ✅ Signup Process
// ✅ Signup Process
// ✅ Signup Process with popup alert
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [existing] = await db.query('SELECT * FROM user WHERE gmail = ?', [username]);

    if (existing.length > 0) {
      // ถ้ามี user ซ้ำ → ส่ง script alert กลับไป
      return res.send(`
        <script>
          alert("บัญชี Gmail นี้มีอยู่แล้ว กรุณาใช้บัญชีอื่น");
          window.location.href = "/signup";
        </script>
      `);
    }

    await db.query(
      'INSERT INTO user (gmail, password) VALUES (?, ?)',
      [username, password]
    );

    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.send(`
      <script>
        alert("เกิดข้อผิดพลาดในระบบ: ${err.message}");
        window.location.href = "/signup";
      </script>
    `);
  }
});



// ✅ Dashboard Page
router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  res.render('index', {
    pageId: 'dashboard',
    currentUser: req.session.user.gmail,
    meetings: [],
    meeting: null,
    userPreferences: [],
    commonSlots: []
  });
});


// ✅ Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
