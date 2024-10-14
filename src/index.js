const express = require('express')
const dotenv = require('dotenv')
const morgan = require('morgan');
const { MongoClient } = require('mongodb');
const app = express()

dotenv.config()
app.use(morgan('combined'));
const port = process.env.PORT || 3001

app.get('/', (req, res) => {
  res.send('Hello world!')
})

async function main(){
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
   */
  const uri = "mongodb+srv://hoangvanluong:hvl123456@ecommerce.ko8pa.mongodb.net/sample_airbnb?retryWrites=true&w=majority";


  const client = new MongoClient(uri);

  try {
      // Connect to the MongoDB cluster
      await client.connect();

      // Make the appropriate DB calls
      await  listDatabases(client);

  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

main().catch(console.error);
async function listDatabases(client){
  databasesList = await client.db().admin().listDatabases();
  console.log("Databases:");
  databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})