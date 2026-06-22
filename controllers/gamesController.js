const db = require('../models/queries');
const { validationResult } = require('express-validator');

async function get(req, res) {
  try {
    const allData = await db.getAllData();
    const allGenres = await db.getAllGenres();
    const allDevelopers = await db.getAllDevelopers();
    res.render('games', {
      title: 'Games',
      currentPage: 'games',
      allData: allData,
      allGenres: allGenres,
      allDevelopers: allDevelopers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

async function postEdit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty(errors)) {
    console.error(errors);
    const unique = [...new Map(errors.array().map((e) => [e.msg, e])).values()];
    return res.status(400).json({ errors: unique });
  }
  const id = Number(req.params.id);
  try {
    console.log('edit info:', req.body);
    console.log('trying to edit');
    await db.editGame(id, req.body);
    console.log('edited');
    const editedGame = await db.getGameInfo(id);
    console.log('edited game', editedGame);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

async function postDeletion(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty(errors)) {
    console.error(errors);
    const unique = [...new Map(errors.array().map((e) => [e.msg, e])).values()];
    return res.status(400).json({ errors: unique });
  }
  const id = Number(req.params.id);
  try {
    const game = await db.getGameInfo(id);
    console.log(`deleting ${game.name}...`);
    await db.deleteGame(id);
    console.log('deleted');
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

async function postAddition(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty(errors)) {
    console.error(errors);
    const unique = [...new Map(errors.array().map((e) => [e.msg, e])).values()];
    return res.status(400).json({ errors: unique });
  }
  try {
    console.log('adding...');
    const id = await db.addGame(req.body);
    const game = await db.getGameInfo(id);
    console.log('added', game);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
}

module.exports = { get, postEdit, postDeletion, postAddition };
