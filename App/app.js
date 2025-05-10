const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();

// View + Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'View'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Routes
const mainRoutes = require('./Route/index');
const userRoutes = require('./Route/user');
app.use('/', mainRoutes);
app.use('/meetings', userRoutes);


// Start server
app.listen(5000, () => {
  console.log('Server running at http://localhost:5000');
});
