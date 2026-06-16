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

async function getTotalStock() {
  const { rows } = await pool.query('SELECT SUM(quantity) FROM games;');
  return rows[0];
}

async function getLowStock() {
  const { rows } = await pool.query(
    'SELECT id, name, quantity FROM games WHERE quantity < 30;',
  );
  return rows;
}

async function getOutOfStock() {
  const { rows } = await pool.query(
    'SELECT id, name, quantity FROM games WHERE quantity = 0;',
  );
  return rows;
}

async function getGenreDistribution() {
  const { rows } = await pool.query(`
    SELECT ge.name, COUNT(DISTINCT gg.game_id) AS game_count
    FROM genres ge
    JOIN games_genres gg ON ge.id = gg.genre_id
    GROUP BY ge.name
    ORDER BY game_count DESC;
  `);
  return rows;
}

async function getAllData() {
  const { rows } =
    await pool.query(`SELECT g.id, g.name, g.release_date, g.quantity, g.game_link, g.img_src,
       STRING_AGG(DISTINCT ge.name, ', ' ORDER BY ge.name) AS genres,
       STRING_AGG(DISTINCT d.name, ', ' ORDER BY d.name) AS developers
FROM games g
LEFT JOIN games_genres gg ON gg.game_id = g.id
LEFT JOIN genres ge ON ge.id = gg.genre_id
LEFT JOIN games_developers gd ON gd.game_id = g.id
LEFT JOIN developers d ON d.id = gd.developer_id
GROUP BY g.id
ORDER BY g.id;
`);
  return rows;
}

async function getAllGenres() {
  const { rows } = await pool.query('SELECT * FROM genres;');
  return rows;
}

async function getAllDevelopers() {
  const { rows } = await pool.query('SELECT * FROM developers;');
  return rows;
}

async function editGame(
  id,
  { name, release_date, game_link, quantity, genres, developers },
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update the scalar columns on games
    await client.query(
      `UPDATE games
         SET name = $1, release_date = $2, game_link = $3, quantity = $4
       WHERE id = $5`,
      [name, release_date, game_link, quantity, id],
    );

    // 2. Genres: ensure each exists, then replace the junction rows
    await client.query('DELETE FROM games_genres WHERE game_id = $1', [id]);
    for (const genre of genres) {
      const { rows } = await client.query(
        `INSERT INTO genres (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [genre],
      );
      await client.query(
        'INSERT INTO games_genres (game_id, genre_id) VALUES ($1, $2)',
        [id, rows[0].id],
      );
    }

    // 3. Developers: same pattern
    await client.query('DELETE FROM games_developers WHERE game_id = $1', [id]);
    for (const dev of developers) {
      const { rows } = await client.query(
        `INSERT INTO developers (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [dev],
      );
      await client.query(
        'INSERT INTO games_developers (game_id, developer_id) VALUES ($1, $2)',
        [id, rows[0].id],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAllGames,
  getGameInfo,
  getTotalStock,
  getLowStock,
  getOutOfStock,
  getGenreDistribution,
  getAllData,
  getAllGenres,
  getAllDevelopers,
  editGame,
};
