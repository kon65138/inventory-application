async function get(req, res) {
  res.render('game', { title: 'games' });
}

module.exports = { get };
