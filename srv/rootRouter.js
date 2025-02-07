const express = require("express");
const router = express.Router();
const user = require('./user')
router.get('/user', user.getUser);
module.exports = router;
