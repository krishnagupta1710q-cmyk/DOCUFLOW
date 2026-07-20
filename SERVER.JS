const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// Serve our HTML file when we visit the website
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Our temporary array acting as a database
let documents = [
    { id: 1, title: "My First Note", content: "Welcome to DocuFlow!" }
];

// ROUTE 1: Get all documents (Read)
app.get('/api/documents', (req, res) => {
    res.json(documents);
});

// ROUTE 2: Create a new document (Create)
app.post('/api/documents', (req, res) => {
    const { title } = req.body;
    
    // Create a new document object
    const newDocument = {
        id: documents.length + 1,
        title: title,
        content: "" // Starts empty
    };

    // Push it into our data array
    documents.push(newDocument);

    // Send the newly created document back as a confirmation
    res.status(201).json(newDocument);
});

app.listen(PORT, () => {
    console.log(`🚀 DocuFlow backend running at http://localhost:${PORT}`);
});