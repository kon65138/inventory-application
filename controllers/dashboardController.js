const db = require('../models/queries');

async function get(req, res) {
  try {
    const games = await db.getAllGames();
    const totalStock = await db.getTotalStock();
    const lowStock = await db.getLowStock();
    const outOfStock = await db.getOutOfStock();
    const genresDistribution = await db.getGenreDistribution();
    res.render('dashboard', {
      title: '100 XBOX360 GAMES',
      games: games,
      totalStock: totalStock,
      lowStock: lowStock,
      outOfStock: outOfStock,
      currentPage: 'dashboard',
      genresDistribution: genresDistribution,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

module.exports = { get };
