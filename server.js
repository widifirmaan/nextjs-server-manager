const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 8001;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handle);

    const io = new Server(httpServer, {
        path: '/socket.io',
        cors: {
            origin: "*", // Allow connection from Cloudflare Tunnel domain
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: { ...process.env, TERM: 'xterm-256color' }
        });

        socket.on('terminal:input', (data) => {
            try {
                ptyProcess.write(data);
            } catch (e) {
                // Process might be dead
            }
        });

        socket.on('terminal:resize', (size) => {
            if (size && size.cols && size.rows) {
                try {
                    ptyProcess.resize(size.cols, size.rows);
                } catch (err) {
                    console.error('Resize error:', err);
                }
            }
        });

        ptyProcess.onData((data) => {
            socket.emit('terminal:output', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
            try {
                ptyProcess.kill();
            } catch (e) { }
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
