const pool = require('./pool');

async function getAllGames() {
  const { rows } = await pool.query('SELECT * FROM games;');
  return rows;
}

async function getGameInfo(id) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.release_date, STRING_AGG(DISTINCT d.name, ', ' ORDER BY d.name) AS developers, STRING_AGG(DISTINCT ge.name, ', ' ORDER BY ge.name) AS genres, g.game_link, g.img_src FROM games g LEFT JOIN games_developers gd ON gd.game_id = g.id LEFT JOIN developers d ON d.id = gd.developer_id LEFT JOIN games_genres gg ON gg.game_id = g.id LEFT JOIN genres ge ON ge.id = gg.genre_id WHERE g.id = ${id} GROUP BY g.id ORDER BY g.name;`,
  );
  return rows[0];
}

module.exports = {
  getAllGames,
  getGameInfo,
};
