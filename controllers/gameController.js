const db = require('../models/queries');

async function get(req, res) {
  const { id } = req.params;
  try {
    const game = await db.getGameInfo(Number(id));
    res.render('game', { game: game });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

module.exports = { get };
