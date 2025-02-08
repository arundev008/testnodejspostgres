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
  static async insert(table, jsonData) {
    try {
      let insertqry = 'INSERT INTO public.' + table;
      let aKeys = Object.keys(jsonData);
      let aValues = Object.values(jsonData);
      let sKeysJoin = aKeys.join(',');
      insertqry = insertqry.concat('(' + sKeysJoin, + ')');
      insertqry = insertqry.concat(' VALUES(')
      let placeholderArray = []
      for (let j = 1; j <= aValues.length; j++) {
        placeholderArray.push('$' + j)
      }
      insertqry = insertqry.concat(placeholderArray.join(','), ')')
      return await new Promise(async (resolve, reject) => {
        await DataBase.client.query(insertqry, aValues, function (err, result) {
          if (err) {
            reject(err)
          }
          resolve(result.rows);
        })
      })
    } catch (error) {
      throw new Error(error)
    }
  }
  static async read(table, whereJson) {
    try {
      let selectqry = 'SELECT * FROM public.' + table;
      let aValues = Object.values(whereJson);
      if (whereJson) {
        let aKeys = Object.keys(whereJson);
        let placeholderArray = []
        for (let j = 0; j < aKeys.length; j++) {
          placeholderArray.push(`"${aKeys[j]}" = $${j + 1}`)
        }
        selectqry = selectqry.concat(' WHERE ', placeholderArray.join(','))
      }
      return await new Promise(async (resolve, reject) => {
        await DataBase.client.query(selectqry, aValues, function (err, result) {
          if (err) {
            reject(err)
          }
          resolve(result.rows);
        })
      })

    }
    catch (err) {
      throw new Error(err)
    }

  }
  static async update(table, jsonData, whereJson) {
    try {
      let updateqry = 'UPDATE public.' + table + ' SET ';
      let aKeys = Object.keys(jsonData);
      let placeholderArray = []
      for (let j = 0; j < aKeys.length; j++) {
        placeholderArray.push(`${aKeys[j]} = ($${j + 1})`)
      }
      updateqry = updateqry.concat(placeholderArray.join(','), ')', ' WHERE ')
      let aKeysWhere = Object.keys(whereJson);
      for (let i = 0; i < aKeysWhere.length; i++) {
        updateqry = updateqry.concat(aKeysWhere[0], ' = ', whereJson[aKeysWhere[0]])
      }
      return await new Promise(async (resolve, reject) => {
        await DataBase.client.query(updateqry, aValues, function (err, result) {
          if (err) {
            reject(err)
          }
          resolve(result.rows);
        })
      })
    } catch (error) {
      throw new Error(error)
    }
  }

}


module.exports = DataBase;