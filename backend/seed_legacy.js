const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedLegacy = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🌱 Connected to MongoDB (Legacy Mode)...');

        const User = require('./models/User');
        const Bus = require('./models/Bus');
        const Crash = require('./models/Crash');
        const Settings = require('./models/Settings');

        // 1. Clear Collections
        await User.deleteMany({});
        await Bus.deleteMany({});
        await Crash.deleteMany({});
        await Settings.deleteMany({});
        console.log('✅ Cleared existing data');

        // 2. Create Users
        const users = await User.insertMany([
            {
                name: 'Admin User',
                email: 'admin@crash.lk',
                password: 'hashedpassword', // Simplified for speed
                role: 'admin',
                organization: 'CMS',
                phone: '+94771234567'
            },
            {
                name: 'Police Officer',
                email: 'police@crash.lk',
                password: 'hashedpassword',
                role: 'police',
                organization: 'Police',
                phone: '+94771112222'
            },
            {
                name: 'Bus Owner A',
                email: 'owner1@crash.lk',
                password: 'hashedpassword',
                role: 'busowner',
                organization: 'TransCo',
                phone: '+94773334444'
            }
        ]);
        console.log(`✅ Created ${users.length} users`);

        const busOwner = users.find(u => u.role === 'busowner');

        // 3. Create Buses
        const buses = await Bus.insertMany([
            {
                bus_id: 'BUS001',
                bus_number: 'NB-1111',
                vehicle_number: 'NB-1111',
                owner_id: busOwner._id,
                ownership_type: 'Private',
                registration_number: 'NB-1111',
                model: 'Leyland',
                no_of_seats: 50
            }
        ]);
        console.log(`✅ Created ${buses.length} buses`);

        // 4. Create Settings
        await Settings.create({
            setting_type: 'global',
            thresholds: { acceleration: 2.5, reconstruction_error: 0.8 },
            severity_rules: {
                critical: { acceleration_min: 5.0, reconstruction_error_min: 2.0 },
                high: { acceleration_min: 3.0, reconstruction_error_min: 1.0 },
                medium: { acceleration_min: 1.5, reconstruction_error_min: 0.5 }
            }
        });

        console.log('🎉 Seed Complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error Seeding:', error);
        process.exit(1);
    }
};

seedLegacy();
