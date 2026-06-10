const { Router } = require('express');

const gamesController = require('../controllers/gamesController');

const gamesRouter = Router();

gamesRouter.get('/', gamesController.get);

module.exports = gamesRouter;
