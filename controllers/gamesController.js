async function get(req, res) {
  try {
    res.render('games', { title: '100 XBOX360 games', currentPage: 'games' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

module.exports = { get };
