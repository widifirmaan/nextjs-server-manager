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
    // Check if port 8001 is listening
    conn.exec('netstat -tulpn | grep 8001', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write('Port 8001 check:\n' + data);
        });
    });
}).connect(config);
