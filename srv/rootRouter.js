const express = require("express");
const router = express.Router();
const user = require('./user/user')
router.get('/user', user.getUser);
router.post('/user',user.postUser);
router.post('/setPassword',require("./user/password").setPassword)
router.post('/checkPassword',require("./user/password").checkPassword)
module.exports = router;
