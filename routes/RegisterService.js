const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const listOfService = require("./serviceRegistry.json");
const arrayOfOperations = ["get", "post", "delete", "put", "patch"];
for (let obj of listOfService.withAuth) {
    const controller = require(obj.controllerPath);
    if(!controller){
        console.error(`No Controller found for entity ${obj.entityName} with path ${obj.controllerPath}`);
        continue
    }
    for (let operation of arrayOfOperations) {
        if(obj[`${operation}Disabled`]){
            console.log(`${operation} operation of entity ${obj.entityName} is not registered due to disable`)
            continue;
        }
        try {
            let isMethodAvailable = controller.hasOwnProperty(`${operation}${obj.entityName}`)
            if(!isMethodAvailable){
                console.error(`No Controller method for ${operation} found for entity ${obj.entityName} with path ${obj.controllerPath}`);
                continue
            }
            
            router[operation](`/${obj.entityName}`,authenticate,async (req, res) => {
                try {
                    const controller = require(obj.controllerPath);
                    const payload = (operation === "get" || operation === "delete") ? req.query : req.body;
                    const result = await controller[`${operation}${obj.entityName}`](payload);
                   // const result = await controller[`${operation}${obj.entityName}`](req.query)
                    if (!result) {
                        return res.status(404).json({ message: `${obj.entityName} not found` });
                    }
                    res.status(200).json(result);
                } catch (error) {
                    console.error(`Error in /${obj.entityName} (${operation}):`, error.message);
                    res.status(500).json({ error: error.message });
                }
            });
        } catch (error) {
            console.error(error.message);
        }

    }
}


for (let obj of listOfService.functions) {
    const controller = require(obj.ControllerPath);
    if(!controller){
        console.error(`No Controller found for function ${obj.Name} with path ${obj.ControllerPath}`);
        continue
    }
        try {
            let isMethodAvailable = controller.hasOwnProperty(`${obj.HandlerName}`)
            if(!isMethodAvailable){
                console.error(`No Controller method ${obj.HandlerName} for function ${obj.Name} found with path ${obj.controllerPath}`);
                continue
            }
            router[obj.Operation](`/${obj.Name}`, controller[obj.HandlerName])
        } catch (error) {
            console.error(error.message);
        }
}

module.exports = router ;
function authenticate(req,res,next){
    const authHeader = req.headers["authorization"];
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

