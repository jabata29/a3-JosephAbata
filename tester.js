require('dotenv').config();

console.log('=== Simple Test ===');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
if (process.env.MONGODB_URI) {
    console.log('First 30 chars:', process.env.MONGODB_URI.substring(0, 30) + '...');
}