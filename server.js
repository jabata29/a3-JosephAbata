const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Better MongoDB connection handling
let uri;
if (process.env.MONGODB_URI) {
    uri = process.env.MONGODB_URI;
} else {
    // Fallback for development
    console.log('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Please create a .env file with your MongoDB connection string');
    uri = "mongodb://localhost:27017/carTrackerDB";
}

const client = new MongoClient(uri);

let db, usersCollection, carsCollection;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration with fallback
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development-only',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/');
    }
}

// Connect to MongoDB with better error handling
async function connectDB() {
    try {
        console.log('🔗 Attempting to connect to MongoDB...');
        console.log('📝 Connection string:', uri.replace(/:[^:]*@/, ':****@')); // Hide password in logs

        await client.connect();
        db = client.db('carTrackerDB');
        usersCollection = db.collection('users');
        carsCollection = db.collection('cars');

        console.log('✅ Connected to MongoDB successfully!');

        // Create indexes
        await usersCollection.createIndex({ username: 1 }, { unique: true });
        await carsCollection.createIndex({ userId: 1 });

    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('💡 Tips for fixing:');
        console.log('   1. Check your MONGODB_URI in .env file');
        console.log('   2. Make sure your MongoDB Atlas cluster is running');
        console.log('   3. Check your IP is whitelisted in MongoDB Atlas');
        console.log('   4. Verify your username and password are correct');

        // Don't exit the process - let the server run in "demo mode"
        console.log('🔄 Starting server in demo mode (data will not persist)');
    }
}

// Demo data for when MongoDB is not available
let demoData = {
    users: [],
    cars: []
};

// User authentication functions
async function createUser(username, password) {
    // If MongoDB is not connected, use demo data
    if (!usersCollection) {
        const user = {
            _id: Date.now().toString(),
            username: username,
            password: await bcrypt.hash(password, 10),
            createdAt: new Date()
        };
        demoData.users.push(user);
        return { insertedId: user._id };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
        username: username,
        password: hashedPassword,
        createdAt: new Date()
    };
    const result = await usersCollection.insertOne(user);
    return result;
}

async function findUser(username) {
    if (!usersCollection) {
        return demoData.users.find(u => u.username === username);
    }
    return await usersCollection.findOne({ username: username });
}

async function verifyUser(username, password) {
    const user = await findUser(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
}

// Car CRUD operations
async function getUserCars(userId) {
    if (!carsCollection) {
        return demoData.cars.filter(car => car.userId === userId);
    }
    return await carsCollection.find({ userId: userId }).toArray();
}

async function addCar(carData) {
    const car = {
        ...carData,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    if (!carsCollection) {
        car._id = Date.now().toString();
        demoData.cars.push(car);
        return { insertedId: car._id };
    }

    const result = await carsCollection.insertOne(car);
    return result;
}

async function updateCar(carId, updates) {
    if (!carsCollection) {
        const carIndex = demoData.cars.findIndex(c => c._id === carId);
        if (carIndex !== -1) {
            demoData.cars[carIndex] = { ...demoData.cars[carIndex], ...updates, updatedAt: new Date() };
        }
        return { modifiedCount: 1 };
    }

    const result = await carsCollection.updateOne(
        { _id: new ObjectId(carId) },
        {
            $set: {
                ...updates,
                updatedAt: new Date()
            }
        }
    );
    return result;
}

async function deleteCar(carId) {
    if (!carsCollection) {
        demoData.cars = demoData.cars.filter(c => c._id !== carId);
        return { deletedCount: 1 };
    }

    const result = await carsCollection.deleteOne({ _id: new ObjectId(carId) });
    return result;
}

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// API Routes
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }

        let user = await verifyUser(username, password);

        if (user) {
            req.session.userId = user._id.toString();
            req.session.username = user.username;
            return res.json({ success: true, message: 'Login successful' });
        } else {
            const existingUser = await findUser(username);
            if (existingUser) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            } else {
                const result = await createUser(username, password);
                user = await findUser(username);
                req.session.userId = user._id.toString();
                req.session.username = user.username;
                return res.json({
                    success: true,
                    message: 'New account created successfully',
                    newAccount: true
                });
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ... rest of your API routes (same as before)

app.get('/api/cars', requireAuth, async (req, res) => {
    try {
        const cars = await getUserCars(req.session.userId);
        const currentYear = new Date().getFullYear();
        const carsWithAge = cars.map(car => ({
            ...car,
            age: currentYear - car.year
        }));
        res.json(carsWithAge);
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ error: 'Failed to fetch cars' });
    }
});

app.post('/api/cars', requireAuth, async (req, res) => {
    try {
        const { model, year, mpg, fuelType, features } = req.body;
        const carData = {
            model: model,
            year: parseInt(year),
            mpg: parseInt(mpg),
            fuelType: fuelType || 'gasoline',
            features: features || [],
            userId: req.session.userId,
            username: req.session.username
        };

        const result = await addCar(carData);
        res.json({ success: true, carId: result.insertedId });
    } catch (error) {
        console.error('Error adding car:', error);
        res.status(500).json({ error: 'Failed to add car' });
    }
});

app.put('/api/cars/:id', requireAuth, async (req, res) => {
    try {
        const { model, year, mpg, fuelType, features } = req.body;
        const updates = {
            model: model,
            year: parseInt(year),
            mpg: parseInt(mpg),
            fuelType: fuelType,
            features: features || []
        };

        const result = await updateCar(req.params.id, updates);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating car:', error);
        res.status(500).json({ error: 'Failed to update car' });
    }
});

app.delete('/api/cars/:id', requireAuth, async (req, res) => {
    try {
        const result = await deleteCar(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting car:', error);
        res.status(500).json({ error: 'Failed to delete car' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        mongodb: !!usersCollection ? 'connected' : 'demo mode',
        timestamp: new Date().toISOString()
    });
});

// Start server
async function startServer() {
    await connectDB();
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`💾 MongoDB: ${usersCollection ? 'Connected' : 'Demo mode'}`);
    });
}

startServer().catch(console.error);