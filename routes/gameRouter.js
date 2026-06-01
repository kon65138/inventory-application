const { Router } = require('express');

const gameController = require('../controllers/gameController');

const gameRouter = Router();

gameRouter.get('/', gameController.get);

module.exports = gameRouter;
