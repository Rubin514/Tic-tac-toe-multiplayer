const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const roomSettings = {};

io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('joinRoom', (data) => {
        // We extract BOTH roomID and mode from the object sent by the client
        const { roomID, mode } = data; 
        
        if (!roomID) return;

        const room = io.sockets.adapter.rooms.get(roomID);
        const numClients = room ? room.size : 0;

        if (numClients < 2) {
            socket.join(roomID);
            currentRoom = roomID;

            if (numClients === 0) {
                roomSettings[roomID] = mode;
            }
            
            const role = numClients === 0 ? "X" : "O";
            // We send the confirmation back to the client
            socket.emit('joined', { 
                role: role, 
                mode: roomSettings[roomID] 
            });
            console.log(`User joined ${roomID} as ${role} in ${roomSettings[roomID]} mode`);
        } else {
            socket.emit('errorMsg', 'This room is full!');
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
        if (currentRoom && !io.sockets.adapter.rooms.get(currentRoom)) {
            delete roomSettings[currentRoom];
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
