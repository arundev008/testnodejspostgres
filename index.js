const express = require('express');
const app = express();
const os = require("os")
let DataBase = require('./db/postgressql');
let rootRouter = require("./srv/rootRouter")
let port = process.env.port || 54467;
app.listen(port, async (req,res) => {
  await DataBase.connect();
  app.use(rootRouter)
  console.log(`App listening at port ${port}`);
});