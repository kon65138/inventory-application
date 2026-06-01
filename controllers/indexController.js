async function get(req, res) {
  res.render('index', { title: 'homepage' });
}

module.exports = { get };
