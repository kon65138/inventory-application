const { Router } = require('express');

const gameController = require('../controllers/gameController');

const gameRouter = Router();

gameRouter.get('/:id', gameController.get);

module.exports = gameRouter;
