const { Client } = require('ssh2');

const config = {
    host: '192.168.100.251',
    port: 22,
    username: 'root',
    password: 'Firman1998'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('Connected to server.');

    // Commands to check status
    const cmds = [
        'echo "--- APP STATUS ---"',
        'curl -I http://127.0.0.1:8001 || echo "App not responding"',
        'echo "\n--- CLOUDFLARED PROCESS ---"',
        'ps aux | grep cloudflared | grep -v grep || echo "Cloudflared not running"',
        'echo "\n--- CLOUDFLARED SERVICE ---"',
        'systemctl status cloudflared --no-pager || echo "Service not found"',
        'echo "\n--- CLOUDFLARED CONFIG ---"',
        'cat /etc/cloudflared/config.yml || cat ~/.cloudflared/config.yml || echo "Config not found"'
    ].join(' && ');

    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect(config);
