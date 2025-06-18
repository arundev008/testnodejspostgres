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
        let userPasswords = await DataBase.read('user_passwords', { user_name: req.body.userName });
        let result = await generateHash(req.body.password);

        if (result.message) {
            throw new Error(result.message)
        }
        let oData = { user_name: req.body.userName, password_index: 0, hash: result,valid_from: '2025-06-18', valid_to : '9999-12-31' };
        if (!userPasswords.length) {
            oData.password_index = 1;
        }
        else {
            let sortedUserPassword = userPasswords.sort((a, b) => {
                return a.password_index - b.password_index
            })
            for (let i = sortedUserPassword.length; i > sortedUserPassword.length - 3; i--) {
                let resultCompare = await comparePassword(hash, sortedUserPassword[i - 1].hash);
                if (resultCompare.success) {
                    throw new Error('Your new password cant be match with last 3 passowrd')
                }
            }
            oData.password_index = sortedUserPassword[0].password_index + 1;
        }
        let resultInsert = await DataBase.insert('user_passwords', oData)
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
        let result = await generateHash(req.body.password);
        if (result.message) {
            throw new Error(result.message)
        }
        let resultUserPW = await DataBase.read('user_passwords', { user_name: req.body.userName })

        if (!resultUserPW.length) {
            throw new Error('There are no password is been set for you')
        }
        let resultCompare = await comparePassword(result, resultUserPW[resultUserPW.length - 1].password_hash);
        if (resultCompare.success) {
            let token = jwt.sign({userId:resultUserPW[0].UserName,username: req.body.userName},"SmodTiterp@2024",{expiresIn:"1h"});
            res.send(200).send(token)
        }
        else {
            res.send(403).send('Incorrect Password')
        }
    } catch (error) {

    }
}
async function generateHash(password) {
    let result = {};
    if (!saltGen) {
        result.message = "internal server error. Kindly contact your system administrator";
        return;
    }
    return await bcrypt.hash(password, 'smoderp');
    // return await new Promise((resolve,reject) => {
    //     bcrypt.hash(password, 10, (err, hash) => {
    //         if (err) {
    //             result.message = "internal server error. Kindly contact your system administrator"
    //             return;
    //         }
    //         result.hash = hash;
    //         resolve(result)
    //     });
    // })
}

async function comparePassword(hash, dbHash) {
    let resultCompare = { success: false }
    return await bcrypt.compare(hash,dbHash);
    // return await new Promise((resolve,reject) => {
    //     bcrypt.compare(hash, dbHash, (err, result) => {
    //         if (err) {
    //             resultCompare.message = 'Error comparing passwords:' + err
    //         }
    
    //         if (result) {
    //             resultCompare.success = true;
    //         } else {
    //             result.success = false;
    //         }
    //         resolve(result)
    //     }); 
    // })
}