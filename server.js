const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CLOUD DATABASE CONNECTION ---
// These pull from the Environment Variables you set in Render
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const roomSettings = {};

// --- AUTHENTICATION API (Login & Register) ---
app.post('/auth', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, msg: "Missing fields" });

    try {
        // Search for user in Supabase
        const { data: user, error } = await supabase
            .from('players')
            .select('*')
            .eq('username', username)
            .single();

        if (user) {
            // User exists, check password
            const valid = await bcrypt.compare(password, user.password);
            if (valid) {
                return res.json({ success: true, points: user.points });
            } else {
                return res.json({ success: false, msg: "Incorrect password" });
            }
        } else {
            // New User: Register them
            const hashedPassword = await bcrypt.hash(password, 10);
            const { error: regError } = await supabase
                .from('players')
                .insert([{ username, password: hashedPassword, points: 0 }]);
            
            if (regError) throw regError;
            return res.json({ success: true, points: 0 });
        }
    } catch (err) {
        console.error(err);
        res.json({ success: false, msg: "Database error" });
    }
});

// --- REAL-TIME GAME LOGIC ---
io.on('connection', (socket) => {
    let currentRoom = null;
    let myUser = null;

    socket.on('joinRoom', (data) => {
        const { roomID, mode, username } = data;
        myUser = username;
        
        const room = io.sockets.adapter.rooms.get(roomID);
        const numClients = room ? room.size : 0;

        if (numClients < 2) {
            socket.join(roomID);
            currentRoom = roomID;

            // Set mode for the room if first player
            if (numClients === 0) {
                roomSettings[roomID] = mode;
            }
            
            const role = numClients === 0 ? "X" : "O";
            socket.emit('joined', { 
                role: role, 
                mode: roomSettings[roomID] 
            });
            console.log(`${username} joined ${roomID} as ${role}`);
        } else {
            socket.emit('errorMsg', 'Room is full!');
        }
    });

    // Handle Win and update Supabase Points
    socket.on('gameWin', async () => {
        if (!myUser) return;
        
        try {
            // Fetch current points
            const { data } = await supabase
                .from('players')
                .select('points')
                .eq('username', myUser)
                .single();

            const newTotal = (data.points || 0) + 10;

            // Update Cloud Database
            await supabase
                .from('players')
                .update({ points: newTotal })
                .eq('username', myUser);
            
            socket.emit('updatePoints', newTotal);
        } catch (err) {
            console.error("Point update failed:", err);
        }
    });

    // Relay Game Moves
    socket.on('move', (data) => {
        if (currentRoom) socket.to(currentRoom).emit('move', data);
    });

    // Chat Message Relay
    socket.on('chatMessage', (msg) => {
        if (currentRoom) socket.to(currentRoom).emit('chatMessage', msg);
    });

    // Voice Chat Signaling
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
server.listen(PORT, () => console.log(`Neon Ghost Server online on port ${PORT}`));
