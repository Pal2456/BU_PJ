// Route/user.js
const express = require('express');
const router = express.Router();
const db = require('../connect1');


router.get('/', (req, res) => {
  res.redirect('/login');
});

// View All Meetings for User
router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const [invites] = await db.query(`
    SELECT m.*, i.status FROM meeting m
    JOIN invitation i ON m.meeting_id = i.meeting_id
    WHERE i.user_id = ?
  `, [req.session.user.user_id]);
  res.render('index', {
    pageId: 'meeting-list',
    meetings: invites,
    currentUser: req.session.user.gmail
  });
});

// Create Meeting
router.post('/create', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { title } = req.body;
  await db.query('INSERT INTO meeting (title, host_id) VALUES (?, ?)', [title, req.session.user.user_id]);
  res.redirect('/dashboard');
});

// View Meeting Detail
router.get('/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const meetingId = req.params.id;

  const [[meeting]] = await db.query(`
    SELECT m.*, u.gmail AS owner FROM meeting m
    JOIN user u ON m.host_id = u.user_id
    WHERE m.meeting_id = ?
  `, [meetingId]);

  const [invites] = await db.query(`
    SELECT i.*, u.gmail AS username FROM invitation i
    JOIN user u ON i.user_id = u.user_id
    WHERE i.meeting_id = ?
  `, [meetingId]);

  const [availabilities] = await db.query(`
    SELECT * FROM availability WHERE meeting_id = ?
  `, [meetingId]);

  // Transform to user -> slots
  const slots = {};
  const userPrefs = {};
  for (const row of availabilities) {
    const userId = row.user_id;
    const time = row.time_slot.toISOString().substr(11, 5);
    if (!slots[userId]) slots[userId] = [];
    slots[userId].push(time);
  }

  const userPreferences = Object.values(slots);
  const commonSlots = userPreferences.length > 1
    ? userPreferences.reduce((a, b) => a.filter(v => b.includes(v)))
    : [];

  res.render('index', {
    pageId: 'meeting-detail',
    meeting,
    currentUser: req.session.user.gmail,
    userPreferences,
    commonSlots,
  });
});

// Invite Users
router.post('/:id/invite', async (req, res) => {
  const meetingId = req.params.id;
  const usernames = req.body.invitees.split(',').map(u => u.trim());
  for (const name of usernames) {
    const [[user]] = await db.query('SELECT * FROM user WHERE gmail = ?', [name]);
    if (user) {
      await db.query('INSERT IGNORE INTO invitation (meeting_id, user_id) VALUES (?, ?)', [meetingId, user.user_id]);
    }
  }
  res.redirect(`/meetings/${meetingId}`);
});

// Respond to Invite
router.post('/:id/respond', async (req, res) => {
  const meetingId = req.params.id;
  const status = req.body.status;
  const userId = req.session.user.user_id;
  await db.query('UPDATE invitation SET status = ? WHERE meeting_id = ? AND user_id = ?', [status, meetingId, userId]);
  res.redirect(`/meetings/${meetingId}`);
});

// Save Availability
router.post('/:id/availability', async (req, res) => {
  const meetingId = req.params.id;
  const userId = req.session.user.user_id;
  const slots = req.body.selectedSlots || [];

  await db.query('DELETE FROM availability WHERE meeting_id = ? AND user_id = ?', [meetingId, userId]);

  const insertValues = Array.isArray(slots) ? slots : [slots];
  for (const time of insertValues) {
    const fullTime = `2025-01-01 ${time}:00`; // dummy date
    await db.query('INSERT INTO availability (meeting_id, user_id, time_slot) VALUES (?, ?, ?)', [meetingId, userId, fullTime]);
  }

  res.redirect(`/meetings/${meetingId}`);
});

// Delete Meeting
router.post('/:id/delete', async (req, res) => {
  const meetingId = req.params.id;
  await db.query('DELETE FROM meeting WHERE meeting_id = ?', [meetingId]);
  res.redirect('/meetings');
});

module.exports = router;
