const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server'); // Import memory server
const app = express();
const PORT = 3000;

app.use(express.json());

// Function to start a temporary database and connect to it automatically
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

// Define what a "Document" looks like in our database
const documentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, default: "" }
}, { timestamps: true });

const Document = mongoose.model('Document', documentSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ROUTE 1: Read all documents
app.get('/api/documents', async (req, res) => {
    try {
        const documents = await Document.find();
        res.json(documents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROUTE 2: Create a new document
app.post('/api/documents', async (req, res) => {
    try {
        const { title } = req.body;
        const newDocument = new Document({ title, content: "" });
        await newDocument.save();
        res.status(201).json(newDocument);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROUTE 3: Update an existing document
app.put('/api/documents/:id', async (req, res) => {
    try {
        const docId = req.params.id;
        const { content } = req.body;

        const updatedDoc = await Document.findByIdAndUpdate(docId, { content }, { new: true });

        if (updatedDoc) {
            res.json(updatedDoc);
        } else {
            res.status(404).json({ error: "Document not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROUTE 4: Delete a document
app.delete('/api/documents/:id', async (req, res) => {
    try {
        const docId = req.params.id;
        const deletedDoc = await Document.findByIdAndDelete(docId);

        if (deletedDoc) {
            res.json({ message: "Document deleted successfully" });
        } else {
            res.status(404).json({ error: "Document not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 DocuFlow backend running at http://localhost:${PORT}`);
});