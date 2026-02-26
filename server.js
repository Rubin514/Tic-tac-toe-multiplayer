const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('joinRoom', (roomID) => {
        socket.join(roomID);
        currentRoom = roomID;
        socket.emit('joined', roomID);
    });

    socket.on('move', (data) => {
        if (currentRoom) socket.to(currentRoom).emit('move', data);
    });

    socket.on('chatMessage', (msg) => {
        if (currentRoom) socket.to(currentRoom).emit('chatMessage', msg);
    });

    // WebRTC Signaling for Voice
    socket.on('signal', (data) => {
        if (currentRoom) socket.to(currentRoom).emit('signal', data);
    });

    socket.on('restart', () => {
        if (currentRoom) socket.to(currentRoom).emit('restart');
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
