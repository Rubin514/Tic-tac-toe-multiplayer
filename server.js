const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Uses your Render Environment Variables
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// SYNC GOOGLE USER WITH DATABASE
app.post('/auth/google-sync', async (req, res) => {
    const { email, name } = req.body;
    try {
        let { data: player } = await supabase.from('players').select('*').eq('email', email).single();

        if (!player) {
            // New Google User: Create them in your table
            const { data: newPlayer } = await supabase.from('players')
                .insert([{ username: name, email: email, points: 0 }])
                .select().single();
            player = newPlayer;
        }
        res.json({ success: true, points: player.points });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

io.on('connection', (socket) => {
    let myEmail = null;

    socket.on('joinRoom', (data) => {
        myEmail = data.email; // Identify player by email for security
        socket.join(data.roomID);
    });

    socket.on('gameWin', async () => {
        if (!myEmail) return;
        const { data } = await supabase.from('players').select('points').eq('email', myEmail).single();
        const newTotal = (data.points || 0) + 10;
        await supabase.from('players').update({ points: newTotal }).eq('email', myEmail);
        socket.emit('updatePoints', newTotal);
    });
});

server.listen(process.env.PORT || 10000);
