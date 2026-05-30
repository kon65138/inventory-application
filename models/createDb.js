#! /usr/bin/env node

const { Client } = require('pg');
const { format } = require('node-pg-format');
const XBOXGames = require('./XBOX360Games.json');

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS developers (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ) UNIQUE);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ) UNIQUE);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ), release_date VARCHAR(255), genre_id BIGINT REFERENCES genres (id), developer_id BIGINT REFERENCES developers (id));
`;

function randSelect100Games() {
  function filter(game) {
    if (game.Game === null) return true;
    if (game.Genre === null) return true;
    if (game.Dev === null) return true;
    if (game.Year === null) return true;
    if (game.Dev.trim().slice(-1) === ',') return true;
    if (devNames.includes(game.Dev)) return true;
    if (genreNames.includes(game.Genre)) return true;
    return false;
  }
  let devNames = [];
  let genreNames = [];
  let games = [];
  let num = [];
  let curNum;
  for (let i = 0; i < 100; i++) {
    do {
      curNum = Math.floor(Math.random() * 2151);
    } while (num.includes(curNum) || filter(XBOXGames[curNum]));
    num.push(curNum);
    devNames.push(XBOXGames[curNum].Dev);
    genreNames.push(XBOXGames[curNum].Genre);
    games.push(XBOXGames[num[i]]);
  }
  return games;
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

    console.log('choosing games...');
    const selectedGames = randSelect100Games();

    console.log('populating tables...');
    // Insert devs and capture returned IDs
    let devRows = [];
    let extraDevs = [];
    const primaryDevNames = []; // tracks which name to look up per game

    devRows = selectedGames.map((game) => {
      let devs = game.Dev;
      let delimiter = null;

      if (devs.includes(',')) delimiter = ',';
      else if (devs.includes(' - ')) delimiter = ' - ';
      else if (devs.includes('/')) delimiter = '/';

      if (delimiter) {
        const parts = devs.split(delimiter).map((s) => s.trim());
        primaryDevNames.push(parts[0]); // store the primary name for this game
        for (let i = 1; i < parts.length; i++) {
          extraDevs.push([parts[i]]);
        }
        return [parts[0]];
      }

      primaryDevNames.push(game.Dev);
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
    const primaryGenreNames = []; // tracks which name to look up per game

    genreRows = selectedGames.map((game) => {
      let genres = game.Genre;
      let delimiter = null;

      if (genres.includes(',')) delimiter = ',';
      else if (genres.includes(' - ')) delimiter = ' - ';
      else if (genres.includes('/')) delimiter = '/';

      if (delimiter) {
        const parts = genres.split(delimiter).map((s) => s.trim());
        primaryGenreNames.push(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          extraGenres.push([parts[i]]);
        }
        return [parts[0]];
      }

      primaryGenreNames.push(game.Genre);
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

    // Insert games using the FK IDs from the maps
    console.log('inserting games...');
    const gameRows = selectedGames.map((game, i) => [
      game.Game,
      game.Year,
      genreMap[primaryGenreNames[i]],
      devMap[primaryDevNames[i]],
    ]);
    await client.query(
      format(
        `INSERT INTO games (name, release_date, genre_id, developer_id) VALUES %L`,
        gameRows,
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
