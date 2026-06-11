/**
 * Seed script — run with:  npm run seed
 * Creates: 1 admin, 3 sample students, 4 sample service orders
 * WARNING: clears all existing users and orders first.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const User = require('./models/User');
const Order = require('./models/Order');

// ── Seed data ────────────────────────────────────────────────────────────────
const ADMIN = {
  name: 'Campus Admin',
  email: 'admin@campushub.com',
  password: 'Admin@1234',
  role: 'admin',
  hostel: 'Admin Block',
  phone: '+91 9000000000',
};

const STUDENTS = [
  {
    name: 'Arjun Mehta',
    email: 'arjun@gmail.com',
    password: 'Student@123',
    hostel: 'Block A',
    phone: '+91 9111111111',
    walletBalance: 500,
  },
  {
    name: 'Priya Sharma',
    email: 'priya@gmail.com',
    password: 'Student@123',
    hostel: 'Block B',
    phone: '+91 9222222222',
    isAvailable: true,
    rating: 4.5,
    totalRatings: 8,
    completedOrders: 8,
    walletBalance: 350,
  },
  {
    name: 'Rahul Verma',
    email: 'rahul@gmail.com',
    password: 'Student@123',
    hostel: 'Block C',
    phone: '+91 9333333333',
    isAvailable: true,
    rating: 4.8,
    totalRatings: 12,
    completedOrders: 12,
    walletBalance: 750,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected\n');

    // ── Clear existing data ──
    await Promise.all([User.deleteMany({}), Order.deleteMany({})]);
    console.log('🗑  Cleared existing users and orders\n');

    // ── Create admin  (pre-save hook hashes password automatically) ──
    const admin = await User.create(ADMIN);
    console.log('👑 Admin created');
    console.log(`   Email   : ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}\n`);

    // ── Create students ──
    const studentDocs = [];
    for (const s of STUDENTS) {
      const doc = await User.create({ ...s, role: 'student' });
      studentDocs.push(doc);
      console.log(`🎓 Student: ${s.name} (${s.email})`);
    }
    console.log('');

    // ── Create sample orders ──
    // category enum: 'food' | 'print' | 'notes' | 'ride' | 'others'
    // mode enum:     'fixed' | 'bidding'
    // status enum:   'CREATED' | 'BROADCASTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    const [arjun, priya, rahul] = studentDocs;
    const sampleOrders = [
      {
        userId: arjun._id,
        assignedTo: priya._id,
        category: 'food',
        description: 'Please pick up a veg thali from the canteen and deliver to Block A Room 204.',
        budget: 50,
        mode: 'fixed',
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        location: { type: 'Point', coordinates: [77.209, 28.6139], address: 'Block A' },
      },
      {
        userId: arjun._id,
        category: 'print',
        description: 'Need 10 pages printed double-sided from USB. Willing to pay ₹30.',
        budget: 30,
        mode: 'bidding',
        status: 'BROADCASTED',
        location: { type: 'Point', coordinates: [77.21, 28.615], address: 'Library' },
      },
      {
        userId: priya._id,
        assignedTo: rahul._id,
        category: 'others',
        description: 'Amazon delivery expected today. Please collect from main gate and bring to Block B Room 105.',
        budget: 40,
        mode: 'fixed',
        status: 'IN_PROGRESS',
        location: { type: 'Point', coordinates: [77.208, 28.613], address: 'Main Gate' },
      },
      {
        userId: rahul._id,
        category: 'notes',
        description: 'Need handwritten notes for Data Structures (Unit 3 & 4). Will pay ₹100.',
        budget: 100,
        mode: 'bidding',
        status: 'CREATED',
        location: { type: 'Point', coordinates: [77.211, 28.614], address: 'Block C' },
      },
    ];

    await Order.insertMany(sampleOrders);
    console.log(`📦 ${sampleOrders.length} sample orders created\n`);

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('─'.repeat(48));
    console.log('✅  Seed complete!');
    console.log('─'.repeat(48));
    console.log('\n🔑  Admin login:');
    console.log(`   Email   : ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
    console.log('\n🔑  Sample student logins (same password for all):');
    STUDENTS.forEach((s) => console.log(`   ${s.email.padEnd(22)} →  ${s.password}`));
    console.log('');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (err.errors) console.error(err.errors);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

seed();
