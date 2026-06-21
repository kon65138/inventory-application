const { Router } = require('express');
const { body } = require('express-validator');

const gamesController = require('../controllers/gamesController');

const gamesRouter = Router();

const arraySanitizer = (value) =>
  []
    .concat(value || [])
    .flatMap((g) => g.split(','))
    .map((s) => s.trim());

const validationChain = (name) =>
  body(name).trim().notEmpty().withMessage(`fields can not be empty`);

const validateEdit = [
  validationChain('name', 'Name'),
  validationChain('genres', 'Genres').customSanitizer(arraySanitizer),
  validationChain('developers', 'Developers').customSanitizer(arraySanitizer),
  validationChain('release_date', 'Year')
    .isNumeric()
    .withMessage('Year has to be an integer'),
  validationChain('game_link', 'About'),
  validationChain('quantity', 'Quantity')
    .isNumeric()
    .withMessage('Quantity has to be an integer'),
  validationChain('adminPassword')
    .equals(process.env.ADMIN_PASSWORD)
    .withMessage('password incorrect'),
];

const validateDeletion = [
  validationChain('adminPassword')
    .equals(process.env.ADMIN_PASSWORD)
    .withMessage('password incorrect'),
];

gamesRouter.get('/', gamesController.get);
gamesRouter.post('/edit/:id', validateEdit, gamesController.postEdit);
gamesRouter.post('/delete/:id', validateDeletion, gamesController.postDeletion);

module.exports = gamesRouter;
