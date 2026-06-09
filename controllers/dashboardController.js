const db = require('../models/queries');

async function get(req, res) {
  try {
    const games = await db.getAllGames();
    res.render('dashboard', {
      title: '100 XBOX360 GAMES',
      games: games,
      currentPage: 'dashboard',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

module.exports = { get };
