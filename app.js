require('dotenv').config();
const express = require('express');
const path = require('node:path');
const dashboardRouter = require('./routes/dashboardRouter.js');
const gamesRouter = require('./routes/gamesRouter.js');
const gameRouter = require('./routes/gameRouter.js');
const assetsPath = path.join(__dirname, 'public');

const PORT = 3000;

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));

app.use('/', dashboardRouter);
app.use('/games', gamesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(err.message);
});

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`express app running at http://localhost:${PORT}`);
});
