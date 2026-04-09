#! /usr/bin/env node

const { Client } = require('pg');
const { format } = require('node-pg-format');
const XBOXGames = require('./XBOX360Games.json');

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ), genre VARCHAR ( 255 ), developers VARCHAR ( 255 ), release_date VARCHAR( 225 ));

CREATE TABLE IF NOT EXISTS developers (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ), game_ids VARCHAR ( 255 ));

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name VARCHAR ( 255 ), game_ids VARCHAR ( 255 ));
`;

function randSelect100Games() {
  const games = [];
  const num = [];
  let curNum;
  for (let i = 0; i < 100; i++) {
    do {
      curNum = Math.floor(Math.random() * 2151);
    } while (num.includes(curNum));
    num.push(curNum);
    games.push(XBOXGames[num[i]]);
  }
  return games;
}

function formatData(type, dataSet) {
  let formattedData = [];
  switch (type) {
    case 'games':
      formattedData = dataSet.map((data) => {
        return [
          data.Game === null ? '' : data.Game,
          data.Genre === null ? '' : data.Genre,
          data.Dev === null ? '' : data.Dev,
          data.Year === null ? '' : data.Year,
        ];
      });
      break;
    case 'developers':
      formattedData = dataSet.map((data) => {
        return [data.Game === null ? '' : data.Game, ''];
      });
      break;
    case 'genres':
      formattedData = dataSet.map((data) => {
        return [data.Genre === null ? '' : data.Genre, ''];
      });
      break;
  }

  return formattedData;
}

async function createDb() {
  console.log('connecting to sql db...');
  const client = new Client({
    connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
  });
  await client.connect();
  console.log('creating tables...');
  await client.query(createTablesSQL);
  await client.end();
}

async function populateGamesDb(formattedGames) {
  const client = new Client({
    connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
  });
  await client.connect();
  await client.query(
    format(
      `INSERT INTO games (name, genre, developers, release_date) VALUES %L`,
      formattedGames,
    ),
    [],
    (err, result) => {
      console.log(err);
      console.log(result);
    },
  );
  await client.end();
}
async function populateDevelopersDb(formattedDevelopers) {
  const client = new Client({
    connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
  });
  await client.connect();
  await client.query(
    format(
      `INSERT INTO developers (name, game_ids) VALUES %L`,
      formattedDevelopers,
    ),
    [],
    (err, result) => {
      console.log(err);
      console.log(result);
    },
  );
  await client.end();
}
async function populateGenreDb(formattedGenres) {
  const client = new Client({
    connectionString: `postgresql://${process.env.USER}:${process.env.DATABASE_PASSWORD}@localhost:5432/${process.env.USER}`,
  });
  await client.connect();
  await client.query(
    format(`INSERT INTO genres (name, game_ids) VALUES %L`, formattedGenres),
    [],
    (err, result) => {
      console.log(err);
      console.log(result);
    },
  );
  await client.end();
}

async function main() {
  await createDb();
  console.log('choosing games...');
  const selectedGames = randSelect100Games();
  let formattedGames = formatData('games', selectedGames);
  let formattedDevelopers = formatData('developers', selectedGames);
  let formattedGenres = formatData('genres', selectedGames);
  console.log(formattedGames, formattedDevelopers, formattedGenres);
  await populateGamesDb(formattedGames);
  await populateDevelopersDb(formattedDevelopers);
  await populateGenreDb(formattedGenres);
}

main();
