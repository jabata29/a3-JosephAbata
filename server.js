const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

let app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

var db, usersCollection, carsCollection;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/');
    }
}

async function connectDB() {
    try {
        await client.connect();
        db = client.db("carTrackerDB");
        usersCollection = db.collection("users");
        carsCollection = db.collection('cars');

        console.log('Connected to MongoDB successfully');

        await usersCollection.createIndex({ username: 1 }, { unique: true });
        await carsCollection.createIndex({ userId: 1 });

    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
}

async function createUser(username, password) {
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
    return await usersCollection.findOne({ username: username });
}

async function verifyUser(username, password) {
    const user = await findUser(username);
    if (!user) {
        return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if(isValid) {
        return user;
    } else {
        return null;
    }
}

async function getUserCars(userId) {
    return await carsCollection.find({ userId: userId }).toArray();
}

async function addCar(carData) {
    const car = {
        ...carData,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const result = await carsCollection.insertOne(car);
    return result;
}

async function updateCar(carId, updates) {
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
    return await carsCollection.deleteOne({ _id: new ObjectId(carId) });
}

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

app.post('/api/login', async (req, res) => {
    console.log('Login attempt for user:', req.body.username);

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }

        let user = await verifyUser(username, password);

        if (user) {
            req.session.userId = String(user._id);
            req.session.username = user.username;
            return res.json({ success: true, message: 'Login successful' });
        } else {
            const existingUser = await findUser(username);
            if (existingUser) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            } else {
                await createUser(username, password);
                let newUser = await findUser(username);
                req.session.userId = String(newUser._id);
                req.session.username = newUser.username;
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

app.get('/api/cars', requireAuth, async (req, res) => {
    try {
        const cars = await getUserCars(req.session.userId);
        const currentYear = new Date().getFullYear();
        const carsWithAge = cars.map(car => {
            return {
                ...car,
                _id: car._id.toString(),
                age: currentYear - car.year
            }
        });
        res.json(carsWithAge);
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ error: 'Failed to fetch cars' });
    }
});

app.post('/api/cars', requireAuth, async (req, res) => {
    try {
        const carData = {
            model: req.body.model,
            year: parseInt(req.body.year),
            mpg: parseInt(req.body.mpg),
            fuelType: req.body.fuelType || 'gasoline',
            features: req.body.features || [],
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
        const car_id = req.params.id;
        const updates = {};
        updates.model = req.body.model;
        updates.year = parseInt(req.body.year);
        updates.mpg = parseInt(req.body.mpg);
        updates.fuelType = req.body.fuelType;
        updates.features = req.body.features || [];

        await updateCar(car_id, updates);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating car:', error);
        res.status(500).json({ error: 'Failed to update car' });
    }
});

app.delete('/api/cars/:id', requireAuth, async (req, res) => {
    try {
        await deleteCar(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting car:', error);
        res.status(500).json({ error: 'Failed to delete car' });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        mongodb: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

async function startServer() {
    await connectDB();
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

startServer().catch(console.error);