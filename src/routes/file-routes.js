'use strict';

const { Router } = require('express');
const fileController = require('../controllers/file-controller');

const router = Router();

router.post('/upload', fileController.upload.bind(fileController));
router.get('/', fileController.getAll.bind(fileController));
router.get('/:id', fileController.getById.bind(fileController));
router.put('/:id', fileController.update.bind(fileController));
router.delete('/:id', fileController.delete.bind(fileController));

module.exports = router;
