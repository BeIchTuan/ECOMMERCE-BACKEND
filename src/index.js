const express = require('express')
const dotenv = require('dotenv')
const morgan = require('morgan');
const app = express()

dotenv.config()
app.use(morgan('combined'));
const port = process.env.PORT || 3001

app.get('/', (req, res) => {
  res.send('Hello world!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})