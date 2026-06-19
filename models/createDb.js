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

async function getWikipediaImage(wikiUrl) {
  if (!wikiUrl) {
    console.log('no wiki url, returning null');
    return null;
  }

  try {
    const slug = wikiUrl.split('/wiki/')[1];
    if (!slug) {
      console.log('non wiki url, returning null');
      return null;
    } // guard against non-/wiki/ URLs

    // The slug is already URL-encoded; decode it so URLSearchParams
    // can encode it exactly once.
    const title = decodeURIComponent(slug);

    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '500',
      pilicense: 'any', // <-- include non-free box art
      format: 'json',
      formatversion: '2',
      redirects: '1',
    });
    const apiUrl = `https://en.wikipedia.org/w/api.php?${params}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'xbox360-inventory-app/1.0 (156806318+kon65138@users.noreply.github.com)',
      },
    });
    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${wikiUrl}`);
      return null;
    }

    const data = await response.json();
    const page = data.query?.pages?.[0]; // formatversion=2: pages is an array
    console.log('returning:', page?.thumbnail?.source);
    return page?.thumbnail?.source ?? null;
  } catch (err) {
    console.error(`Failed to get image for ${wikiUrl}:`, err.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('connecting to sql db...');
  const client = new Client({
    connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
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
    let genreRows = [];
    let extraGenres = [];

    genreRows = selectedGames.map((game) => {
      let genres = game.Genre;
      let delimiter = null;

      if (genres.includes(',')) delimiter = ',';
      else if (genres.includes(' - ')) delimiter = ' - ';
      else if (genres.includes('/')) delimiter = '/';

      if (delimiter) {
        const parts = genres.split(delimiter).map((s) => s.trim());
        for (let i = 1; i < parts.length; i++) {
          extraGenres.push([parts[i]]);
        }
        return [parts[0]];
      }

      return [game.Genre];
    });
    genreRows = genreRows.concat(extraGenres);

    const uniqueGenreRows = [
      ...new Map(genreRows.map((r) => [r[0], r])).values(),
    ];

    const genreResult = await client.query(
      format(
        `INSERT INTO genres (name) VALUES %L RETURNING id, name`,
        uniqueGenreRows,
      ),
    );
    // Build a lookup map: genre name -> id
    const genreMap = {};
    genreResult.rows.forEach(({ id, name }) => {
      genreMap[name] = id;
    });

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
      let genres = game.Genre;
      let delimiter = null;
      if (genres.includes(',')) delimiter = ',';
      else if (genres.includes(' - ')) delimiter = ' - ';
      else if (genres.includes('/')) delimiter = '/';
      const parts = delimiter
        ? genres.split(delimiter).map((s) => s.trim())
        : [genres];
      parts.forEach((genre) => {
        if (genreMap[genre]) gameGenreRows.push([gameId, genreMap[genre]]);
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
