const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let documents = [
    { id: 1, title: "My First Note", content: "Welcome to DocuFlow!" }
];

// ROUTE 1: Read all documents
app.get('/api/documents', (req, res) => {
    res.json(documents);
});

// ROUTE 2: Create a new document
app.post('/api/documents', (req, res) => {
    const { title } = req.body;
    const newDocument = {
        id: documents.length + 1,
        title: title,
        content: "" 
    };
    documents.push(newDocument);
    res.status(201).json(newDocument);
});

// ROUTE 3: Update an existing document's content (Update)
app.put('/api/documents/:id', (req, res) => {
    const docId = parseInt(req.params.id);
    const { content } = req.body;

    // Find the document in our array that matches the ID
    const document = documents.find(d => d.id === docId);

    if (document) {
        document.content = content; // Update its content text
        res.json(document);
    } else {
        res.status(404).json({ error: "Document not found" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 DocuFlow backend running at http://localhost:${PORT}`);
});