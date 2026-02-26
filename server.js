const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Stores which mode (Classic/Ghost) each room is using
const roomSettings = {};

io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('joinRoom', (data) => {
        const { roomID, mode } = data;
        const room = io.sockets.adapter.rooms.get(roomID);
        const numClients = room ? room.size : 0;

        if (numClients < 2) {
            socket.join(roomID);
            currentRoom = roomID;

            // If first player, set the room mode. If second, inherit it.
            if (numClients === 0) {
                roomSettings[roomID] = mode;
            }
            
            const role = numClients === 0 ? "X" : "O";
            socket.emit('joined', { 
                role: role, 
                mode: roomSettings[roomID] 
            });
            console.log(`User joined ${roomID} as ${role} in ${roomSettings[roomID]} mode`);
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

    socket.on('disconnect', () => {
        // Cleanup room settings if room is empty
        if (currentRoom && !io.sockets.adapter.rooms.get(currentRoom)) {
            delete roomSettings[currentRoom];
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Neon Ghost Server active on port ${PORT}`));
