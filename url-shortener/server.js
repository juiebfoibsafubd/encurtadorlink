const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

let urlDatabase = {};
let counter = 1000;

function generateShortCode() {
    return (counter++).toString(36);
}

app.post('/shorten', (req, res) => {
    const { longUrl } = req.body;
    
    if (!longUrl) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const shortCode = generateShortCode();
    urlDatabase[shortCode] = {
        longUrl: longUrl.startsWith('http') ? longUrl : `https://${longUrl}`,
        clicks: 0,
        createdAt: new Date()
    };

    res.json({ 
        shortCode, 
        shortUrl: `https://${req.headers.host}/${shortCode}` 
    });
});

app.get('/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    const urlData = urlDatabase[shortCode];

    if (urlData) {
        urlData.clicks++;
        res.redirect(urlData.longUrl);
    } else {
        res.status(404).send('URL não encontrada');
    }
});

app.get('/api/stats/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    const urlData = urlDatabase[shortCode];

    if (urlData) {
        res.json(urlData);
    } else {
        res.status(404).json({ error: 'URL não encontrada' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
