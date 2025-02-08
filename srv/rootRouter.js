const express = require("express");

const router = express.Router();
const user = require('./user/user');
const jwt = require("jsonwebtoken");
router.get('/user',authenticate, user.getUser);
router.post('/user',authenticate,user.postUser);
router.post('/setPassword',require("./user/password").setPassword)
router.post('/login',require("./user/password").checkPassword)
module.exports = router;
function authenticate(req,res,next){
    const authHeader = req.headers["Authorization"];
    const token = authHeader && authHeader.split(' ')[1];
    if(!token){
        res.status(401).send({message:'You are not authorized'})
    }
    jwt.verify(token,'SmodTiterp@2024',(err,user) => {
        if(err){
            res.status(403).send('Invalid token')
        }
        req.user = user;
        next()
    })
}
