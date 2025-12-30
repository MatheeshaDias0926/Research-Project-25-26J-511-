const mongoose = require('mongoose');
require('dotenv').config();

const dropOldIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop all collections to start fresh
    const collections = ['users', 'buses', 'crashes', 'alerts', 'responses', 'settings'];

    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).drop();
        console.log(`✅ Dropped collection: ${collectionName}`);
      } catch (err) {
        console.log(`ℹ️  Collection ${collectionName} does not exist`);
      }
    }

    await mongoose.connection.close();
    console.log('Done! All old collections dropped.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropOldIndexes();
