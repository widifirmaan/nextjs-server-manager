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

    const [
        diskSpace,
        publicIp,
        wifiSSID,
        powerStatus,
        temp,
        watts,
        weather
    ] = await Promise.all([
        getDiskSpace(),
        getPublicIp(),
        getWifiSSID(),
        getPowerStatus(),
        getCpuTemp(),
        getWattage(),
        getWeather()
    ]);

    return NextResponse.json({
        cpus: {
            model: cpus[0]?.model || 'Unknown',
            speed: cpus[0]?.speed ? (cpus[0].speed / 1000).toFixed(2) : 0,
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
        disk: diskSpace,
        network: {
            publicIp,
            ssid: wifiSSID
        },
        power: {
            status: powerStatus, // "Listrik Dirumah Menyala" or "Listrik Dirumah Mati"
            watts
        },
        cpu: {
            temp,
            usage: await getCpuUsage(cpus.length)
        },
        weather
    });
}

async function getDiskSpace() {
    try {
        const { stdout } = await execAsync('df -k /');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            const total = parseInt(parts[1]) * 1024;
            const used = parseInt(parts[2]) * 1024;
            const free = parseInt(parts[3]) * 1024;
            return {
                total, used, free,
                percent: total > 0 ? Math.round((used / total) * 100) : 0
            };
        }
    } catch (e) {
        console.error('Disk space check failed', e);
    }
    return { total: 0, used: 0, free: 0, percent: 0 };
}

async function getPublicIp() {
    try {
        const { stdout } = await execAsync('curl -s --connect-timeout 2 ifconfig.me');
        return stdout.trim();
    } catch (e) {
        return 'Unknown';
    }
}

async function getWifiSSID() {
    try {
        // Try nmcli first
        const { stdout } = await execAsync("nmcli -t -f active,ssid dev wifi | grep '^yes'");
        const parts = stdout.split(':');
        return parts.length > 1 ? parts[1].trim() : 'Unknown';
    } catch (e) {
        // Fallback or just return null
        return null;
    }
}

async function getPowerStatus() {
    try {
        // Check BAT1 status
        const { stdout } = await execAsync('cat /sys/class/power_supply/BAT1/status');
        const status = stdout.trim();
        if (status === 'Charging' || status === 'Full') return "Listrik Dirumah Menyala";
        if (status === 'Discharging') return "Listrik Dirumah Mati";
        return status;
    } catch (e) {
        return "Unknown";
    }
}

async function getCpuUsage(coreCount: number) {
    try {
        const { stdout } = await execAsync("ps -A -o %cpu | awk '{s+=$1} END {print s}'");
        const totalParams = parseFloat(stdout.trim());
        if (isNaN(totalParams)) return 0;
        // Total usage divided by cores
        const usage = totalParams / coreCount;
        return Math.min(Math.round(usage), 100);
    } catch (e) {
        return 0;
    }
}

async function getCpuTemp() {
    try {
        const { stdout } = await execAsync('cat /sys/class/thermal/thermal_zone0/temp');
        return parseInt(stdout.trim()) / 1000;
    } catch (e) {
        return 0;
    }
}

async function getWattage() {
    try {
        const { stdout } = await execAsync('cat /sys/class/power_supply/BAT1/power_now');
        return parseInt(stdout.trim()) / 1000000; // microWatts to Watts
    } catch (e) {
        return 0;
    }
}

async function getWeather() {
    try {
        // Logandeng Coordinates
        const lat = -7.938;
        const lon = 110.575;
        const locationName = "Logandeng";
        const countryCode = "ID";

        const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`,
            { next: { revalidate: 300 } }
        );
        const weatherData = await weatherRes.json();

        // Process hourly data
        const hourly: any[] = [];
        if (weatherData.hourly && weatherData.hourly.time) {
            weatherData.hourly.time.forEach((t: string, i: number) => {
                const date = new Date(t);
                const hour = date.getHours().toString().padStart(2, '0') + ':00';
                hourly.push({
                    time: t,
                    hour: hour,
                    temp: weatherData.hourly.temperature_2m[i],
                    code: weatherData.hourly.weathercode[i]
                });
            });
        }

        return {
            temp: weatherData.current_weather?.temperature,
            code: weatherData.current_weather?.weathercode,
            location: locationName,
            country: countryCode,
            hourly: hourly
        };
    } catch (e) {
        return null;
    }
}
