const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Bus = require('./models/Bus');
const { connectDB } = require('./config/database');

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('🌱 Starting database seed...');

    // Clear existing data
    await User.deleteMany({});
    await Bus.deleteMany({});
    console.log('✅ Cleared existing data');

    // Create users for each role
    const hashedPassword = await bcrypt.hash('password123', 12);

    const users = await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@crash.lk',
        password: hashedPassword,
        role: 'admin',
        organization: 'Crash Management System'
      },
      {
        name: 'Police Officer Silva',
        email: 'police@crash.lk',
        password: hashedPassword,
        role: 'police',
        organization: 'Sri Lanka Police - Traffic Division'
      },
      {
        name: 'Dr. Perera',
        email: 'hospital@crash.lk',
        password: hashedPassword,
        role: 'hospital',
        organization: 'Colombo General Hospital - Emergency'
      },
      {
        name: 'Ministry Official',
        email: 'ministry@crash.lk',
        password: hashedPassword,
        role: 'ministry',
        organization: 'Ministry of Transport'
      },
      {
        name: 'Bus Owner Jayawardena',
        email: 'owner@crash.lk',
        password: hashedPassword,
        role: 'busowner',
        organization: 'Lanka Transport Services'
      }
    ]);

    console.log('✅ Created 5 users (one for each role)');

    // Find the bus owner
    const busOwner = users.find(u => u.role === 'busowner');

    // Create sample buses
    const buses = await Bus.insertMany([
      {
        bus_id: 'BUS001',
        owner_id: busOwner._id,
        registration_number: 'NC-1234',
        route: 'Colombo - Kandy',
        model: 'Ashok Leyland',
        capacity: 52,
        sensor_status: 'active',
        last_location: {
          latitude: 6.9271,
          longitude: 79.8612,
          address: 'Colombo Fort',
          timestamp: new Date()
        }
      },
      {
        bus_id: 'BUS002',
        owner_id: busOwner._id,
        registration_number: 'WP-5678',
        route: 'Colombo - Galle',
        model: 'Tata',
        capacity: 45,
        sensor_status: 'active',
        last_location: {
          latitude: 6.0535,
          longitude: 80.2210,
          address: 'Galle Fort',
          timestamp: new Date()
        }
      },
      {
        bus_id: 'BUS003',
        owner_id: busOwner._id,
        registration_number: 'CP-9012',
        route: 'Colombo - Jaffna',
        model: 'Ashok Leyland',
        capacity: 56,
        sensor_status: 'active',
        last_location: {
          latitude: 9.6615,
          longitude: 80.0255,
          address: 'Jaffna Town',
          timestamp: new Date()
        }
      }
    ]);

    console.log('✅ Created 3 sample buses');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('================================');
    console.log('Admin:');
    console.log('  Email: admin@crash.lk');
    console.log('  Password: password123\n');
    console.log('Police:');
    console.log('  Email: police@crash.lk');
    console.log('  Password: password123\n');
    console.log('Hospital:');
    console.log('  Email: hospital@crash.lk');
    console.log('  Password: password123\n');
    console.log('Ministry:');
    console.log('  Email: ministry@crash.lk');
    console.log('  Password: password123\n');
    console.log('Bus Owner:');
    console.log('  Email: owner@crash.lk');
    console.log('  Password: password123\n');
    console.log('================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
