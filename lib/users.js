const {
  MongoClient,
} = require('mongodb');



// 2
module.exports = async (dbURI) => {
  console.log(dbURI.substr(0, dbURI.lastIndexOf('/')));
  console.log(dbURI.substr(dbURI.lastIndexOf('/') + 1));
  
  
  const client = await MongoClient.connect(dbURI, { useNewUrlParser: true });
  const db = client.db(dbURI.substr(dbURI.lastIndexOf('/') + 1));
  const Users = db.collection('Users');
  
  let methods = {};

  methods.createUser = async (fid, location, unit = 'ca') => {
    const exist = await Users.findOne( { _id : fid } );
    if (!exist) {
      await Users.insert( { _id : fid, location, unit } );
    }
  }


  methods.getUser = async (fid) => await Users.findOne( { _id : fid } );

  methods.setLocation = async (fid, location) => await Users.update( { _id : fid }, { $set: { location: location } });

  methods.setUnit = async (fid, unit) => await Users.update( { _id : fid }, { $set: { unit: unit } });


  return methods;

};