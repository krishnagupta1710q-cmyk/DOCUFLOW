const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'super_secret_docuflow_key_2026'; // Token signature key

app.use(express.json());
app.use(cookieParser()); // Allows server to read authentication cookies

// Start in-memory DB
async function startDatabase() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        console.log('🔌 Connected to an In-Memory MongoDB successfully!');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
    }
}
startDatabase();

// --- SCHEMAS & MODELS ---

// 1. User Account Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// 2. Document Schema (Now linked to a specific user via userId)
const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" }
}, { timestamps: true });
const Document = mongoose.model('Document', documentSchema);


// --- SECURITY MIDDLEWARE ---
// Intercepts API calls to ensure a user is logged in before touching data
async function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Access denied. Please log in." });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Attaches the userId to the request object
        next(); // Passes execution to the actual route handler
    } catch (err) {
        res.status(400).json({ error: "Invalid login session." });
    }
}

// --- VISUAL ROUTING ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- AUTHENTICATION ENDPOINTS ---

// Signup Route (Registration)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Fill in all fields." });

        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ error: "Username already taken." });

        // Encrypt the password using bcrypt salt hashing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "Registration successful! You can log in now." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "User not found." });

        // Compare text pass with database hashed string
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Incorrect password." });

        // Issue a signed JSON Web Token valid for 2 hours
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });

        // Send token securely packed inside an HTTP cookie
        res.cookie('token', token, { httpOnly: true, maxAge: 2 * 60 * 60 * 1000 });
        res.json({ message: "Login successful!", username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logout Route
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Logged out successfully." });
});


// --- PROTECTED DATA CRUD ROUTES ---

// GET: Only fetches documents belonging to the authenticated user
app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const userDocs = await Document.find({ userId: req.user.id });
        res.json(userDocs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Creates a document tied to the authenticated user
app.post('/api/documents', authenticateToken, async (req, res) => {
    try {
        const { title } = req.body;
        const newDocument = new Document({ 
            userId: req.user.id, // Linked user signature
            title, 
            content: "" 
        });
        await newDocument.save();
        res.status(201).json(newDocument);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Modifies content securely
app.put('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        const updatedDoc = await Document.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id }, // Verification checkpoint
            { content: req.body.content },
            { new: true }
        );
        if (!updatedDoc) return res.status(404).json({ error: "Document mismatch or not found." });
        res.json(updatedDoc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Deletes safely
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        const deletedDoc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deletedDoc) return res.status(404).json({ error: "Document not found." });
        res.json({ message: "Deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Secure DocuFlow backend running at http://localhost:${PORT}`);
});