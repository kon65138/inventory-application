require('dotenv').config();
const { rateLimit } = require('express-rate-limit');
const express = require('express');
const path = require('node:path');
const dashboardRouter = require('./routes/dashboardRouter.js');
const gamesRouter = require('./routes/gamesRouter.js');
const aboutRouter = require('./routes/aboutRouter.js');
const assetsPath = path.join(__dirname, 'public');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
});

const PORT = 3000;

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(
  '/libs',
  express.static(path.join(__dirname, 'node_modules/fuse.js/dist')),
);

app.use(limiter);

app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));

app.use('/', dashboardRouter);
app.use('/games', gamesRouter);
app.use('/about', aboutRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('error');
});

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`express app running at http://localhost:${PORT}`);
});
