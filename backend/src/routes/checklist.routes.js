const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklist.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', checklistController.getChecklists);
router.post('/', checklistController.createChecklist);
router.patch('/:id/status', checklistController.updateChecklistStatus);
router.delete('/:id', checklistController.deleteChecklist);

module.exports = router;
