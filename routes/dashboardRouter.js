const { Router } = require('express');

const dashboardController = require('../controllers/dashboardController');

const dashboardRouter = Router();

dashboardRouter.get('/', dashboardController.get);

module.exports = dashboardRouter;
