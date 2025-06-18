const express = require('express');
const app = express();
const os = require("os")
let DataBase = require('./db/postgressql');
let rootRouter = require("./routes/rootRouter");
let registerService = require("./routes/RegisterService")
let port = process.env.PORT || 54467;
app.use(express.json());

app.get('/',(req,res) => {
  res.status(200).send('Welcome to Devsoft Portal API')
})
app.listen(port, async (req,res) => {
  await DataBase.connect();
  // app.use(rootRouter)
  app.use(registerService);
  console.log(`App listening at port ${port}`);
  console.log("http://localhost:54467")
});