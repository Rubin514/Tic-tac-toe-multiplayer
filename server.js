const express = require('express');
const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the lobby explicitly
app.get('/lobby.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
});

// Your existing /auth/google-sync logic goes here...

server.listen(process.env.PORT || 10000, () => {
    console.log("Server running on port 10000");
});
