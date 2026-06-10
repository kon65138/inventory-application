const db = require('../models/queries');

async function get(req, res) {
  try {
    const allData = await db.getAllData();
    const allGenres = await db.getAllGenres();
    const allDevelopers = await db.getAllDevelopers();
    res.render('games', {
      title: '100 XBOX360 games',
      currentPage: 'games',
      allData: allData,
      allGenres: allGenres,
      allDevelopers: allDevelopers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

module.exports = { get };
