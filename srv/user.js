let DataBase = require("./../db/postgressql");
module.exports.getUser = async function(req,res) {
    try {
        await DataBase.getClient().query('SELECT * FROM public.test',function(err, result) {
        res.status(200).send(JSON.stringify(result.rows[0]));
        });
      } catch (error) {
        res.status(500).send('Error While retrieving the User data')
      }
}