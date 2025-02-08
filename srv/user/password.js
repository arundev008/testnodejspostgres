let DataBase = require("../../db/postgressql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
let saltGen;
bcrypt.genSalt(10, (err, salt) => {
    if (err) {
        return;
    }
    saltGen = salt;
});
module.exports.setPassword = async function (req, res) {
    try {
        let userPasswords = await DataBase.read('USER_PASSWORD', { UserName: req.data.userName });
        let result = generateHash(req.data.password);

        if (result.message) {
            throw new Error(result.message)
        }
        let oData = { UserName: req.data.userName, index: 0, hash: result.hash };
        if (!userPasswords.length) {
            oData.index = 1;
        }
        else {
            let sortedUserPassword = userPasswords.sort((a, b) => {
                return a.index - b.index
            })
            for (let i = sortedUserPassword.length; i > sortedUserPassword.length - 3; i--) {
                let resultCompare = comparePassword(hash, sortedUserPassword[i - 1].hash);
                if (resultCompare.success) {
                    throw new Error('Your new password cant be match with last 3 passowrd')
                }
            }
            oData.index = sortedUserPassword[0].index + 1;
        }
        let resultInsert = await DataBase.insert('USER_PASSWORD', oData)
        if (resultInsert) {
            res.status(200).send("Password has been successfully chnaged")
        }
        else {
            throw new Error('Error while changing password. PLease contact your system administrator')
        }
    } catch (error) {
        res.status(500).send(error)
    }
}
module.exports.checkPassword = async function (req, res) {
    try {
        let result = generateHash(req.data.password);
        if (result.message) {
            throw new Error(result.message)
        }
        let resultUserPW = await DataBase.read('USER_PASSWORD', { UserName: req.data.userName })

        if (!resultUserPW.length) {
            throw new Error('There are no password is been set for you')
        }
        let resultCompare = comparePassword(hash, resultUserPW[resultUserPW.length - 1].hash);
        if (resultCompare.success) {
            let token = jwt.sign({userId:resultUserPW[0].UserName,username: req.data.userName},"SmodTiterp@2024",{expiresIn:"1h"});
            res.send(200).send(token)
        }
        else {
            res.send(403).send('Incorrect Password')
        }
    } catch (error) {

    }
}
function generateHash(password) {
    let result = {};
    if (!saltGen) {
        result.message = "internal server error. Kindly contact your system administrator";
        return;
    }
    bcrypt.hash(password, saltGen, (err, hash) => {
        if (err) {
            result.message = "internal server error. Kindly contact your system administrator"
            return;
        }
        result.hash = hash;
    });
    return result
}

function comparePassword(hash, dbHash) {
    let resultCompare = { success: false }
    bcrypt.compare(hash, dbHash, (err, result) => {
        if (err) {
            resultCompare.message = 'Error comparing passwords:' + err
            return;
        }

        if (result) {
            resultCompare.success = true;
        } else {
            result.success = false;
        }
    });
    return resultCompare;
}