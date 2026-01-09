const { Client } = require('ssh2');

const config = {
    host: '192.168.100.251',
    port: 22,
    username: 'root',
    password: 'Firman1998'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('Connected. Searching for cloudflared config...');
    // Search in common locations and process list
    const cmds = [
        'find /etc -name "config.yml" 2>/dev/null',
        'find /root -name "config.yml" 2>/dev/null',
        'find /home -name "config.yml" 2>/dev/null',
        'ps aux | grep cloudflared'
    ].join('; echo "--- SPLIT ---"; ');

    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        });
    });
}).connect(config);
