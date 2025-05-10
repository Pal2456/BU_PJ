res.render('index', {
  pageId: 'meeting-detail',
  meeting: meeting,   // ✅ ต้องส่งให้
  currentUser: req.session.user.gmail,
  commonSlots,
  userPreferences
});


// Route/user.js หรือ meeting.js
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM meetings WHERE owner = ?', [req.session.user.gmail]);
  res.render('index', {
    pageId: 'meeting-list',
    meetings: rows,
    currentUser: req.session.user.gmail
  });
});

router.get('/create', (req, res) => {
  res.render('index', {
    pageId: 'create-meeting',
    currentUser: req.session.user.gmail
  });
});

router.post('/create', async (req, res) => {
  const { title } = req.body;
  const date = new Date().toISOString().split('T')[0];
  await db.query('INSERT INTO meetings (title, owner, date) VALUES (?, ?, ?)', [
    title,
    req.session.user.gmail,
    date
  ]);
  res.redirect('/meetings');
});
