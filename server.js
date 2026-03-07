const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// These use the Environment Variables you set in Render
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Syncs Google Login data with your custom 'players' table
app.post('/auth/google-sync', async (req, res) => {
    const { email, name } = req.body;
    try {
        let { data: player } = await supabase.from('players').select('*').eq('email', email).single();

        if (!player) {
            // If new user, create their profile
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
    let userEmail = null;

    socket.on('joinRoom', (data) => {
        userEmail = data.email;
        socket.join(data.roomID);
        console.log(`${data.username} joined ${data.roomID}`);
    });

    socket.on('gameWin', async () => {
        if (!userEmail) return;
        // Add 10 XP on every win
        const { data } = await supabase.from('players').select('points').eq('email', userEmail).single();
        const newTotal = (data.points || 0) + 10;
        await supabase.from('players').update({ points: newTotal }).eq('email', userEmail);
        socket.emit('updatePoints', newTotal);
    });
});

server.listen(process.env.PORT || 10000, () => console.log("Arena Live"));
