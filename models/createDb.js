#! /usr/bin/env node

const { Client } = require('pg');
const { format } = require('node-pg-format');
const XBOXGames = require('./XBOX360Games.json');

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS developers (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255),
  release_date INTEGER,
  game_link VARCHAR(255),
  quantity INTEGER
);

CREATE TABLE IF NOT EXISTS games_developers (
  game_id INTEGER REFERENCES games(id),
  developer_id INTEGER REFERENCES developers(id),
  PRIMARY KEY (game_id, developer_id)
);

CREATE TABLE IF NOT EXISTS games_genres (
  game_id INTEGER REFERENCES games(id),
  genre_id INTEGER REFERENCES genres(id),
  PRIMARY KEY (game_id, genre_id)
);
`;

function filterGames() {
  function filter(game) {
    if (game.Game === null) return true;
    if (game.Genre === null) return true;
    if (game.Dev === null) return true;
    if (game.GameLink === null) return true;
    if (game.Year === null) return true;
    if (game.Dev.trim().slice(-1) === ',') return true;
    return false;
  }
  let games = [];
  for (let game of XBOXGames) {
    if (filter(game)) continue;
    games.push(game);
  }
  return games;
}

// Split a raw Genre/Dev field into individual trimmed parts. Mirrors the
// delimiter precedence used elsewhere: comma, then spaced hyphen, then slash.
function splitField(value) {
  let delimiter = null;
  if (value.includes(',')) delimiter = ',';
  else if (value.includes(' - ')) delimiter = ' - ';
  else if (value.includes('/')) delimiter = '/';
  return delimiter
    ? value
        .split(delimiter)
        .map((s) => s.trim())
        .filter(Boolean)
    : [value.trim()];
}

// Dedup key for a single genre: case-insensitive, with '&', the word 'and',
// and hyphens all flattened to spaces so "Action & Adventure",
// "Action-adventure" and "action adventure" collapse to one genre.
function canonicalKey(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Given every genre spelling seen in the data, pick one display name per
// canonical key: the spelling that occurs most often (ties -> first seen).
function buildCanonicalNames(tokens) {
  const byKey = new Map(); // key -> Map(spelling -> { count, order })
  let order = 0;
  for (const tok of tokens) {
    const key = canonicalKey(tok);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, new Map());
    const spellings = byKey.get(key);
    if (!spellings.has(tok)) spellings.set(tok, { count: 0, order: order++ });
    spellings.get(tok).count++;
  }
  const canon = new Map(); // key -> chosen display name
  for (const [key, spellings] of byKey) {
    let best = null;
    for (const [spelling, info] of spellings) {
      if (
        !best ||
        info.count > best.count ||
        (info.count === best.count && info.order < best.order)
      ) {
        best = { spelling, count: info.count, order: info.order };
      }
    }
    canon.set(key, best.spelling);
  }
  return canon;
}

async function main() {
  console.log('connecting to sql db...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log('creating tables...');
    await client.query(createTablesSQL);

    console.log('filtering games...');
    const selectedGames = filterGames();

    console.log('populating tables...');

    // Insert devs and capture returned IDs
    console.log('inserting developers...');
    let devRows = [];
    let extraDevs = [];

    devRows = selectedGames.map((game) => {
      let devs = game.Dev;
      let delimiter = null;

      if (devs.includes(',')) delimiter = ',';
      else if (devs.includes(' - ')) delimiter = ' - ';
      else if (devs.includes('/')) delimiter = '/';

      if (delimiter) {
        const parts = devs.split(delimiter).map((s) => s.trim());
        for (let i = 1; i < parts.length; i++) {
          extraDevs.push([parts[i]]);
        }
        return [parts[0]];
      }

      return [game.Dev];
    });
    devRows = devRows.concat(extraDevs);

    const uniqueDevRows = [...new Map(devRows.map((r) => [r[0], r])).values()];

    const devResult = await client.query(
      format(
        `INSERT INTO developers (name) VALUES %L RETURNING id, name`,
        uniqueDevRows,
      ),
    );
    // Build a lookup map: dev name -> id
    const devMap = {};
    devResult.rows.forEach(({ id, name }) => {
      devMap[name] = id;
    });

    // Insert genres and capture returned IDs
    console.log('inserting genres...');

    // Gather every genre spelling across all games (split into single genres).
    const genreTokens = [];
    selectedGames.forEach((game) => {
      splitField(game.Genre).forEach((g) => genreTokens.push(g));
    });

    // Pick one canonical display name per genre, then insert the unique set.
    const genreCanonName = buildCanonicalNames(genreTokens);
    const uniqueGenreRows = [...new Set(genreCanonName.values())].map((n) => [
      n,
    ]);

    const genreResult = await client.query(
      format(
        `INSERT INTO genres (name) VALUES %L RETURNING id, name`,
        uniqueGenreRows,
      ),
    );
    // canonical display name -> id, then collapse to canonical key -> id so any
    // raw spelling can be resolved to the genre it was merged into.
    const genreNameToId = {};
    genreResult.rows.forEach(({ id, name }) => {
      genreNameToId[name] = id;
    });
    const genreMap = {};
    for (const [key, name] of genreCanonName) {
      genreMap[key] = genreNameToId[name];
    }

    // Insert games first (no FK columns needed anymore)
    console.log('inserting games...');
    const gameRows = [];
    for (let i = 0; i < selectedGames.length; i++) {
      const game = selectedGames[i];
      const quantity = Math.floor(Math.random() * 50);
      gameRows.push([
        game.Game,
        Number(game.Year),
        game.GameLink,
        Number(quantity),
      ]);
    }

    const gameResult = await client.query(
      format(
        `INSERT INTO games (name, release_date, game_link, quantity) VALUES %L RETURNING id, name`,
        gameRows,
      ),
    );
    // Build a lookup map: game name -> id
    const gameMap = {};
    gameResult.rows.forEach(({ id, name }) => {
      gameMap[name] = id;
    });

    // Insert junction rows for games <-> developers
    console.log('inserting games_developers...');
    const gameDevRows = [];
    selectedGames.forEach((game) => {
      const gameId = gameMap[game.Game];
      let devs = game.Dev;
      let delimiter = null;
      if (devs.includes(',')) delimiter = ',';
      else if (devs.includes(' - ')) delimiter = ' - ';
      else if (devs.includes('/')) delimiter = '/';
      const parts = delimiter
        ? devs.split(delimiter).map((s) => s.trim())
        : [devs];
      parts.forEach((dev) => {
        if (devMap[dev]) gameDevRows.push([gameId, devMap[dev]]);
      });
    });
    await client.query(
      format(
        `INSERT INTO games_developers (game_id, developer_id) VALUES %L ON CONFLICT DO NOTHING`,
        gameDevRows,
      ),
    );

    // Insert junction rows for games <-> genres
    console.log('inserting games_genres...');
    const gameGenreRows = [];
    selectedGames.forEach((game) => {
      const gameId = gameMap[game.Game];
      splitField(game.Genre).forEach((genre) => {
        const genreId = genreMap[canonicalKey(genre)];
        if (genreId) gameGenreRows.push([gameId, genreId]);
      });
    });
    await client.query(
      format(
        `INSERT INTO games_genres (game_id, genre_id) VALUES %L ON CONFLICT DO NOTHING`,
        gameGenreRows,
      ),
    );
    console.log('done');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
