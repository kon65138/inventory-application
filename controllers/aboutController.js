async function get(req, res) {
  res.render('about', { title: 'About', currentPage: 'about' });
}

module.exports = { get };
