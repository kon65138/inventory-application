const { Router } = require('express');
const { body } = require('express-validator');

const gamesController = require('../controllers/gamesController');

const gamesRouter = Router();

const arraySanitizer = (value) =>
  []
    .concat(value || [])
    .flatMap((g) => g.split(','))
    .map((s) => s.trim());

const validationChain = (name, displayName) =>
  body(name).trim().notEmpty().withMessage(`${displayName} can not be empty.`);

const validateEdit = [
  validationChain('name', 'Name'),
  validationChain('genres', 'Genres').customSanitizer(arraySanitizer),
  validationChain('developers', 'Developers').customSanitizer(arraySanitizer),
  validationChain('release_date', 'Year'),
  validationChain('game_link', 'About'),
  validationChain('quantity', 'Quantity')
    .isNumeric()
    .withMessage('Quantity has to be an integer.'),
];

gamesRouter.get('/', gamesController.get);
gamesRouter.post('/edit/:id', validateEdit, gamesController.postEdit);

module.exports = gamesRouter;
