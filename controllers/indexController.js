async function get(req, res) {
  res.render('index', { title: '100 XBOX360 GAMES' });
}

module.exports = { get };
