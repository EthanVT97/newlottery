const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with caching headers
app.use(express.static(path.join(__dirname), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else if (filePath.match(/\.(css|js|png|jpg|jpeg|gif|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// Routes
const routes = ['/', '/login', '/admin', '/customer'];

app.get(routes, (req, res) => {
    const route = req.path === '/' ? '/index.html' : `${req.path}.html`;
    res.sendFile(path.join(__dirname, route));
});

// Fallback route for direct file access
app.get('*.html', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.redirect('/login');
    }
});

// Fallback route for SPA
app.get('*', (req, res) => {
    res.redirect('/login');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
