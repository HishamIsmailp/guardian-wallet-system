const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Menu CRUD routes
router.get('/', menuController.getMenuItems);
router.post('/', menuController.createMenuItem);
router.put('/:id', menuController.updateMenuItem);
router.delete('/:id', menuController.deleteMenuItem);
router.patch('/:id/toggle', menuController.toggleAvailability);

module.exports = router;
