async function get(req, res) {
  res.render('category', { title: 'categories' });
}

module.exports = { get };
