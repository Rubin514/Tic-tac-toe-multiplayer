const _supabase = supabase.createClient('https://pcvszmvpazwkfufiaowm.supabase.co', 'YOUR_ANON_KEY');
const socket = io();

// CHECK AUTH ON LOAD
async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = '/index.html';
    } else {
        document.getElementById('name').innerText = session.user.user_metadata.full_name;
        syncXP(session.user);
    }
}

async function syncXP(user) {
    const res = await fetch('/auth/google-sync', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: user.email, name: user.user_metadata.full_name })
    });
    const data = await res.json();
    document.getElementById('xp').innerText = data.points || 0;
}

function joinGame() {
    const code = document.getElementById('roomID').value;
    if (code) {
        socket.emit('joinRoom', { roomID: code });
        console.log("Joining room:", code);
    }
}

init();
