require('dotenv').config();
const express = require('express');
const path = require('node:path');
const dashboardRouter = require('./routes/dashboardRouter.js');
const gamesRouter = require('./routes/gamesRouter.js');
const aboutRouter = require('./routes/aboutRouter.js');
const assetsPath = path.join(__dirname, 'public');

const PORT = 3000;

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(
  '/libs',
  express.static(path.join(__dirname, 'node_modules/fuse.js/dist')),
);

app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));

app.use('/', dashboardRouter);
app.use('/games', gamesRouter);
app.use('/about', aboutRouter);

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
