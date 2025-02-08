let DataBase = require("../../db/postgressql");
module.exports.getUser = async function(req,res) {
    try {
        let result = await DataBase.read(`"MASTER_USER"`,{Username:req.query.userName})
        res.status(200).send(JSON.stringify(result[0]));
      } catch (error) {
        res.status(500).send(error)
      }
}
module.exports.postUser = async function(req,res) {
  try {
    let users = await DataBase.read('MASTER_USER',{Username:req.data.userName});
    let oData = {Username: req.data.userName,FirstName: req.data.FirstName,
                 LastName: req.data.LastName, EmailId: req.data.EmailId,
                  ValidFrom: req.data.ValidFrom, ValidTo: req.data.ValidTo}
    if(users.length){
      let userUpdated = await DataBase.update('MASTER_USER',oData,{Username:req.data.userName});
      res.status(200).send(JSON.stringify(userUpdated))
    }
    else {
      let userInserted = await DataBase.insert('MASTER_USER',oData);
      res.status(200).send(JSON.stringify(userInserted));
    }
    
  } catch (error) {
    res.status(500).send('Error While retrieving the User data')
  }
}