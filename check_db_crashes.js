import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const MONGO_URI = process.env.MONGO_URI;

const checkCrashes = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const crashes = await db.collection('crashes').find({}).toArray();
        
        console.log(`Found ${crashes.length} crashes`);
        if (crashes.length > 0) {
            console.log('Last crash:', JSON.stringify(crashes[crashes.length - 1], null, 2));
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkCrashes();
