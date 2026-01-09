const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.post('/create', requestController.createRequest);
router.get('/list', requestController.listRequests);
router.post('/approve/:requestId', requestController.approveRequest);
router.post('/reject/:requestId', requestController.rejectRequest);

module.exports = router;
