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
        console.log(`User ${socket.id} joined room: ${roomID}`);
        socket.emit('joined', roomID);
    });

    // Handle game moves
    socket.on('move', (data) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('move', data);
        }
    });

    // Handle chat messages
    socket.on('chatMessage', (msg) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('chatMessage', msg);
        }
    });

    // Handle restart
    socket.on('restart', () => {
        if (currentRoom) {
            socket.to(currentRoom).emit('restart');
        }
    });
});

const PORT = process.env.PORT || 10000; // Render uses port 10000 by default
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
