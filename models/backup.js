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

function formatData(type, dataSet) {
  let formattedData = [];
  switch (type) {
    case 'games': {
      formattedData = dataSet.map((data) => {
        return [data.Game, data.Genre, data.Dev, data.Year];
      });
      break;
    }

    case 'developers': {
      formattedData = dataSet.map((data) => {
        return [data.Dev, ''];
      });
      break;
    }

    case 'genres': {
      formattedData = dataSet.map((data) => {
        return [data.Genre, ''];
      });
      break;
    }
  }

  return formattedData;
}

// async function createDb() {
//   console.log('connecting to sql db...');
//   const client = new Client({
//     connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
//   });
//   await client.connect();
//   console.log('creating tables...');
//   await client.query(createTablesSQL);
//   await client.end();
// }

// async function populateGamesDb(formattedGames) {
//   const client = new Client({
//     connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
//   });
//   await client.connect();
//   await client.query(
//     format(`INSERT INTO games (name, genre_ids) VALUES %L`, formattedGames),
//     [],
//     (err, result) => {
//       console.log(err);
//       console.log(result);
//     },
//   );
//   await client.end();
// }
// async function populateDevelopersDb(formattedDevelopers) {
//   const client = new Client({
//     connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
//   });
//   await client.connect();
//   await client.query(
//     format(
//       `INSERT INTO developers (name, game_ids) VALUES %L`,
//       formattedDevelopers,
//     ),
//     [],
//     (err, result) => {
//       console.log(err);
//       console.log(result);
//     },
//   );
//   await client.end();
// }
// async function populateGenreDb(formattedGenres) {
//   const client = new Client({
//     connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
//   });
//   await client.connect();
//   await client.query(
//     format(`INSERT INTO genres (name, game_ids) VALUES %L`, formattedGenres),
//     [],
//     (err, result) => {
//       console.log(err);
//       console.log(result);
//     },
//   );
//   await client.end();
// }

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

  console.log('formatting data...');
  let formattedGames = formatData('games', selectedGames);
  let formattedDevelopers = formatData('developers', selectedGames);
  let formattedGenres = formatData('genres', selectedGames);

  // console.log(formattedGames, formattedDevelopers, formattedGenres);
  // await populateDevelopersDb(formattedDevelopers);
  // await populateGenreDb(formattedGenres);
  // await populateGamesDb(formattedGames);
  console.log('populating tables...');
  await client.query(
    format(
      `INSERT INTO developers (name, game_ids) VALUES %L`,
      formattedDevelopers,
    ),
  );
  await client.query(
    format(`INSERT INTO genres (name, game_ids) VALUES %L`, formattedGenres),
  );
  await client.query(
    format(
      `INSERT INTO games (name, genre_ids, dev_ids, release_date) VALUES %L`,
      formattedGames,
    ),
  );

  await client.end();
  console.log('done');
}

main();
