const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Supabase Connection
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const roomSettings = {};

// Login/Register API
app.post('/auth', async (req, res) => {
    try {
        const { username, password } = req.body;
        const { data: user } = await supabase.from('players').select('*').eq('username', username).single();

        if (user) {
            const valid = await bcrypt.compare(password, user.password);
            if (valid) return res.json({ success: true, points: user.points });
            return res.json({ success: false, msg: "Wrong password" });
        } else {
            const hash = await bcrypt.hash(password, 10);
            await supabase.from('players').insert([{ username, password: hash, points: 0 }]);
            return res.json({ success: true, points: 0 });
        }
    } catch (err) {
        res.json({ success: false, msg: "Auth error" });
    }
});

// Socket Logic
io.on('connection', (socket) => {
    let currentRoom = null;
    let myUser = null;

    socket.on('joinRoom', (data) => {
        const { roomID, mode, username } = data;
        myUser = username;
        socket.join(roomID);
        currentRoom = roomID;
        if (!io.sockets.adapter.rooms.get(roomID).size === 1) roomSettings[roomID] = mode;
        socket.emit('joined', { role: "X", mode: roomSettings[roomID] || mode });
    });

    socket.on('gameWin', async () => {
        if (!myUser) return;
        const { data } = await supabase.from('players').select('points').eq('username', myUser).single();
        const pts = (data.points || 0) + 10;
        await supabase.from('players').update({ points: pts }).eq('username', myUser);
        socket.emit('updatePoints', pts);
    });

    socket.on('move', (data) => { if (currentRoom) socket.to(currentRoom).emit('move', data); });
});

server.listen(process.env.PORT || 10000);
        
