const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Store room settings
const roomData = {};

io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('joinRoom', (data) => {
        const { roomID, mode } = data;
        const room = io.sockets.adapter.rooms.get(roomID);
        const numClients = room ? room.size : 0;

        if (numClients < 2) {
            socket.join(roomID);
            currentRoom = roomID;

            // If it's a new room, set the mode. If joining, get the mode.
            if (numClients === 0) {
                roomData[roomID] = mode;
            }
            
            const role = numClients === 0 ? "X" : "O";
            socket.emit('joined', { 
                roomID, 
                role, 
                mode: roomData[roomID] 
            });
        } else {
            socket.emit('error', 'Room is full!');
        }
    });

    socket.on('move', (data) => {
        if (currentRoom) socket.to(currentRoom).emit('move', data);
    });

    socket.on('chatMessage', (msg) => {
        if (currentRoom) socket.to(currentRoom).emit('chatMessage', msg);
    });

    socket.on('signal', (data) => {
        if (currentRoom) socket.to(currentRoom).emit('signal', data);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
