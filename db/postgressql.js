const { Client } = require('pg');

class DataBase {
  static async connect() {
    if (DataBase.client) return;

    const client = new Client({
      user: 'u6a8qej5bi5n4k',
      database: 'd71kv9tu2uj11a',
      password: 'p25401d81b73cac298eb9ad73b77e236db79b6e4f0790e64a14c57fd7f4e6c8ce',
      host: 'c1i13pt05ja4ag.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',
      port: 5432,
      ssl: {
        rejectUnauthorized: false,
      }
    });

    try {
      await client.connect();
      DataBase.client = client;
    } catch (err) {
      throw new Error('DB connection failed: ' + err.message);
    }
  }

  static async insert(table, jsonData) {
    const keys = Object.keys(jsonData);
    const values = Object.values(jsonData);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const query = `INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

    return DataBase.query(query, values);
  }

  static async read(table, whereJson) {
    const keys = Object.keys(whereJson);
    const values = Object.values(whereJson);
    const conditions = keys.map((key, i) => `"${key}" = $${i + 1}`);

    const query = `SELECT * FROM public.${table} WHERE ${conditions.join(' AND ')}`;
    return DataBase.query(query, values);
  }

  static async readAll(table) {
    const query = `SELECT * FROM public.${table}`;
    return DataBase.query(query);
  }

  static async update(table, jsonData, whereJson) {
    const keys = Object.keys(jsonData);
    const values = Object.values(jsonData);

    const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(', ');

    const whereKeys = Object.keys(whereJson);
    const whereValues = Object.values(whereJson);
    const whereClause = whereKeys.map((key, i) => `"${key}" = $${i + 1 + keys.length}`).join(' AND ');

    const query = `UPDATE public.${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;

    return DataBase.query(query, [...values, ...whereValues]);
  }

  static async delete(table, whereJson) {
    const keys = Object.keys(whereJson);
    const values = Object.values(whereJson);
    const conditions = keys.map((key, i) => `"${key}" = $${i + 1}`);

    const query = `DELETE FROM public.${table} WHERE ${conditions.join(' AND ')}`;
    return DataBase.query(query, values);
  }

  static async query(query, values = []) {
    try {
      const result = await DataBase.client.query(query, values);
      if (!result || !result.rows) throw new Error("Query failed or returned no rows.");
      return result.rows;
    } catch (err) {
      throw new Error("Query Error: " + err.message);
    }
  }
}

module.exports = DataBase;
