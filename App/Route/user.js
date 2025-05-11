const express = require('express');
const router = express.Router();
const db = require('../connect1');


// View All Meetings for User
router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const [meetings] = await db.query(`
  SELECT m.*, (
    SELECT i.status
    FROM invitation i
    WHERE i.meeting_id = m.meeting_id
      AND i.invitee_gmail = ?
    LIMIT 1
  ) AS status
  FROM meeting m
  WHERE m.owner_gmail = ?
     OR EXISTS (
       SELECT 1 FROM invitation i
       WHERE i.meeting_id = m.meeting_id
         AND i.invitee_gmail = ?
     )
`, [req.session.user.gmail, req.session.user.gmail, req.session.user.gmail]);






  res.render('index', {
    pageId: 'meeting-list', // ✅ ใส่ให้ชัดเจน
    currentUser: req.session.user.gmail,
    meetings: meetings,
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
router.post('/:id/invite', async (req, res) => {
  const meetingId = req.params.id;
  const usernames = req.body.invitees.split(',').map(u => u.trim());

  for (const gmail of usernames) {
    const [[user]] = await db.query('SELECT id FROM user WHERE gmail = ?', [gmail]);

    if (user) {
      await db.query(
        'INSERT IGNORE INTO invitation (meeting_id, invitee_gmail, status, user_id) VALUES (?, ?, ?, ?)',
        [meetingId, gmail, 'pending', user.id]
      );
    } else {
      console.warn(`⚠️ Gmail not found in user table: ${gmail}`);
    }
  }

  res.redirect(`/meetings/${meetingId}`);
});


// Respond to Invite
router.post('/:id/respond', async (req, res) => {
  const meetingId = req.params.id;
  const userGmail = req.session.user.gmail;
  const status = req.body.status;

  await db.query(
    'UPDATE invitation SET status = ? WHERE meeting_id = ? AND invitee_gmail = ?',
    [status, meetingId, userGmail]
  );

  if (status === 'declined') {
    // 🟥 ปฏิเสธ → กลับไปหน้า list
    res.redirect('/meetings');
  } else {
    // ✅ ตอบรับ → ไปดูรายละเอียดต่อ
    res.redirect(`/meetings/${meetingId}`);
  }
});


// Save Availability
router.get('/:id/availability', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const meetingId = req.params.id;

  // 1. Get meeting info
  const [[meeting]] = await db.query('SELECT * FROM meeting WHERE meeting_id = ?', [meetingId]);

  // 2. Get invites
  const [invites] = await db.query(`
    SELECT * FROM invitation WHERE meeting_id = ?
  `, [meetingId]);
  meeting.invites = invites;

  // 3. Get availability records
  const [availabilities] = await db.query('SELECT * FROM availability WHERE meeting_id = ?', [meetingId]);

  // 4. Group availability by user
  const slots = {};
  for (const row of availabilities) {
    const user = row.user_gmail;
    if (!slots[user]) slots[user] = [];
    slots[user].push(row.time_slot);
  }

  // 5. Filter for accepted users
  const acceptedUsers = invites
    .filter(invite => invite.status === 'accepted')
    .map(invite => invite.invitee_gmail);

  // 6. Collect their time selections
  const userPreferences = acceptedUsers.map(user => slots[user] || []);

  // 7. Calculate common slots (only if all accepted users submitted)
  const allSubmitted = userPreferences.length > 0 && userPreferences.every(p => p.length > 0);

  const commonSlots = allSubmitted
    ? userPreferences.reduce((a, b) => a.filter(time => b.includes(time)))
    : [];

  // 8. Send to frontend
  meeting.slots = slots;

  res.render('index', {
    pageId: 'meeting-detail',
    meeting,
    currentUser: req.session.user.gmail,
    userPreferences,
    commonSlots
  });
});

// Post the data for availability
router.post('/:id/availability', async (req, res) => {
  const meetingId = req.params.id;
  const userGmail = req.session.user.gmail;
  const slots = req.body.selectedSlots || [];

  // Delete old availability
  await db.query('DELETE FROM availability WHERE meeting_id = ? AND user_gmail = ?', [meetingId, userGmail]);

  // Insert new slots
  const insertValues = Array.isArray(slots) ? slots : [slots];
  for (const time of insertValues) {
    await db.query('INSERT INTO availability (meeting_id, user_gmail, time_slot) VALUES (?, ?, ?)', [meetingId, userGmail, time]);
  }

  res.redirect(`/meetings/${meetingId}`);
});


// Delete Meeting
router.post('/:id/delete', async (req, res) => {
  const meetingId = req.params.id;

  // Delete child rows first
  await db.query('DELETE FROM availability WHERE meeting_id = ?', [meetingId]);
  await db.query('DELETE FROM invitation WHERE meeting_id = ?', [meetingId]);

  // Then delete parent
  await db.query('DELETE FROM meeting WHERE meeting_id = ?', [meetingId]);

  res.redirect('/meetings');
});

module.exports = router;