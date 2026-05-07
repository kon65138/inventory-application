#! /usr/bin/env node

const { Client } = require('pg');
const { format } = require('node-pg-format');
const XBOXGames = require('./XBOX360Games.json');

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS developers (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ), game_ids VARCHAR ( 255 ));

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ) UNIQUE, game_ids VARCHAR ( 255 ));

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ), genre_ids BIGINT REFERENCES genres (id), developer_ids BIGINT REFERENCES developers (id), release_date VARCHAR( 225 ));
`;

function randSelect100Games() {
  function filter(game) {
    if (game.Game === null) return true;
    if (game.Genre === null) return true;
    if (game.Dev === null) return true;
    if (game.Year === null) return true;
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
  await client.connect();

  console.log('creating tables...');
  await client.query(createTablesSQL);

  console.log('choosing games...');
  const selectedGames = randSelect100Games();

  console.log('populating tables...');

  const devRows = selectedGames.map((game) => [game.Dev]);
  const devResult = await client.query(
    format(
      `INSERT INTO developers (name) VALUES %L RETURNING id, name`,
      devRows,
    ),
  );

  const devMap = {};
  devResult.rows.forEach(({ id, name }) => {
    devMap[name] = id;
  });

  // Insert genres and capture returned IDs
  console.log('inserting genres...');
  const genreRows = selectedGames.map((game) => [game.Genre]);
  const genreResult = await client.query(
    format(`INSERT INTO genres (name) VALUES %L RETURNING id, name`, genreRows),
  );
  // Build a lookup map: genre name -> id
  const genreMap = {};
  genreResult.rows.forEach(({ id, name }) => {
    genreMap[name] = id;
  });

  // Insert games using the FK IDs from the maps
  console.log('inserting games...');
  const gameRows = selectedGames.map((game) => [
    game.Game,
    genreMap[game.Genre],
    devMap[game.Dev],
    game.Year,
  ]);
  await client.query(
    format(
      `INSERT INTO games (name, genre_ids, developer_ids, release_date) VALUES %L`,
      gameRows,
    ),
  );

  await client.end();
  console.log('done');
}

main();
