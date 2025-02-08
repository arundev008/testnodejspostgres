const express = require('express');
const app = express();
const os = require("os")
let DataBase = require('./db/postgressql');
let rootRouter = require("./srv/rootRouter")
let port = process.env.PORT || 54467;

app.get('/',(req,res) => {
  res.status(200).send('Welcome to Devsoft Portal API')
})
app.listen(port, async (req,res) => {
  await DataBase.connect();
  app.use(rootRouter)
  console.log(`App listening at port ${port}`);
  console.log("http://localhost:3000")
});