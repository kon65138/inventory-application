const { Router } = require('express');

const gamesController = require('../controllers/gamesController');

const gameRouter = Router();

gameRouter.get('/:id', gamesController.get);

module.exports = gameRouter;
