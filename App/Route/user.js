const express = require('express');
const router = express.Router();
const db = require('../connect1');


// View All Meetings for User
router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const [invites] = await db.query(`
  SELECT * FROM meeting
  WHERE owner_gmail = ?
`, [req.session.user.gmail]);


  res.render('index', {
    pageId: 'meeting-list', // ✅ ใส่ให้ชัดเจน
    currentUser: req.session.user.gmail,
    meetings: invites,
    meeting: null,
    userPreferences: [],
    commonSlots: []

  });
  

});


// Create Meeting
router.get('/create', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('index', {
    pageId: 'create-meeting',
    currentUser: req.session.user.gmail,
    meetings: [],
    meeting: null,
    userPreferences: [],
    commonSlots: []
  });
});

// Route/user.js
router.post('/create', async (req, res) => {
  const { title } = req.body;
  const ownerGmail = req.session.user.gmail;

  await db.query(
    'INSERT INTO meeting (title, owner_gmail) VALUES (?, ?)',
    [title, ownerGmail]
  );

  // ✅ กลับไปหน้า create-meeting อีกครั้ง
  res.render('index', {
    pageId: 'create-meeting',
    currentUser: ownerGmail,
    meetings: [],
    meeting: null,
    userPreferences: [],
    commonSlots: [],
  });
});



// View Meeting Detail
router.get('/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const meetingId = req.params.id;

  const [[meeting]] = await db.query('SELECT * FROM meeting WHERE meeting_id = ?', [meetingId]);

  const [invites] = await db.query(`
    SELECT * FROM invitation WHERE meeting_id = ?
  `, [meetingId]);
  
  meeting.invites = invites;

  const [availabilities] = await db.query('SELECT * FROM availability WHERE meeting_id = ?', [meetingId]);

  const slots = {};
  for (const row of availabilities) {
    const user = row.user_gmail;
    const time = row.time_slot;
    if (!slots[user]) slots[user] = [];
    slots[user].push(time);
  }

  const userPreferences = Object.values(slots);
  const commonSlots = userPreferences.length > 1
    ? userPreferences.reduce((a, b) => a.filter(v => b.includes(v)))
    : userPreferences[0] || [];

  meeting.slots = slots;

  res.render('index', {
    pageId: 'meeting-detail',
    meeting,
    currentUser: req.session.user.gmail,
    userPreferences,
    commonSlots
  });
});

// Invite Users
router.post('meetings/:id/invite', async (req, res) => {
  const meetingId = req.params.id;
  const usernames = req.body.invitees.split(',').map(u => u.trim());
  for (const name of usernames) {
    await db.query('INSERT IGNORE INTO invitation (meeting_id, invitee_gmail, status) VALUES (?, ?, ?)', [meetingId, name, 'pending']);
  }
  res.redirect(`/${meetingId}`);
});

// Respond to Invite
router.post('/meetings/:id/respond', async (req, res) => {
  const meetingId = req.params.id;
  const userGmail = req.session.user.gmail;
  const status = req.body.status;
  await db.query('UPDATE invitation SET status = ? WHERE meeting_id = ? AND invitee_gmail = ?', [status, meetingId, userGmail]);
  res.redirect(`/meetings/${meetingId}`);
});

// Save Availability
router.post('/meetings/:id/availability', async (req, res) => {
  const meetingId = req.params.id;
  const userGmail = req.session.user.gmail;
  const slots = req.body.selectedSlots || [];

  await db.query('DELETE FROM availability WHERE meeting_id = ? AND user_gmail = ?', [meetingId, userGmail]);

  const insertValues = Array.isArray(slots) ? slots : [slots];
  for (const time of insertValues) {
    await db.query('INSERT INTO availability (meeting_id, user_gmail, time_slot) VALUES (?, ?, ?)', [meetingId, userGmail, time]);
  }

  res.redirect(`/meetings/${meetingId}`);
});

// Delete Meeting
router.post('/meetings/:id/delete', async (req, res) => {
  const meetingId = req.params.id;
  await db.query('DELETE FROM meeting WHERE id = ?', [meetingId]);
  res.redirect('/meetings');
});

module.exports = router;