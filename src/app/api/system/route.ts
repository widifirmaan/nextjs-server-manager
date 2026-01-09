import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET() {
    const cpus = os.cpus();
    const memoryTotal = os.totalmem();
    const memoryFree = os.freemem();
    const uptime = os.uptime();
    const loadAvg = os.loadavg();

    let diskSpace = { total: 0, used: 0, free: 0, percent: 0 };

    try {
        const { stdout } = await execAsync('df -k /');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
            // Typically: Filesystem 1K-blocks Used Available Use% Mounted on
            const parts = lines[1].trim().split(/\s+/);
            // df -k returns KB
            const total = parseInt(parts[1]) * 1024;
            const used = parseInt(parts[2]) * 1024;
            const free = parseInt(parts[3]) * 1024;

            diskSpace = {
                total, used, free,
                percent: total > 0 ? Math.round((used / total) * 100) : 0
            };
        }
    } catch (e) {
        console.error('Disk space check failed', e);
    }

    return NextResponse.json({
        cpus: {
            model: cpus[0]?.model || 'Unknown',
            count: cpus.length,
        },
        memory: {
            total: memoryTotal,
            free: memoryFree,
            used: memoryTotal - memoryFree,
            percent: Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100)
        },
        uptime,
        loadAvg,
        disk: diskSpace
    });
}
