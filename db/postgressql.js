const pg = require('pg')
class DataBase {
  static getClient() {
    return DataBase.client;
  }
  static async connect() {
    pg.defaults.ssl = true;
    let client = new pg.Client({
      user: 'u6a8qej5bi5n4k',
      database: 'd71kv9tu2uj11a',
      password: 'p25401d81b73cac298eb9ad73b77e236db79b6e4f0790e64a14c57fd7f4e6c8ce',
      host: 'c1i13pt05ja4ag.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',
      port: 5432,
      ssl: {
        rejectUnauthorized: false,
      }
    })
    DataBase.client = await new Promise((resolve, reject) => {
      client.connect().then(() => {
        resolve(client)
      }).catch(() => {
        reject('DB connection is not successful')
      });
    })
  }
}


module.exports =  DataBase;