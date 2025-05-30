const express = require('express');
const { protectRoute } = require('../middleware/auth.middleware');
const { checkAuth, signup, login, logout } = require('../controller/auth.controller');
const router = express.Router();

router.get('/check', protectRoute, checkAuth);
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;