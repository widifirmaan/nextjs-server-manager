'use client';
import { useEffect, useState } from 'react';
import {
  Cpu, HardDrive, Clock, Activity,
  Wifi, Zap, Thermometer, Cloud, Globe,
  Power, Download, List, Percent
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Dashboard() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [stats, setStats] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/system');
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: string) => {
    const prompt = action === 'reboot' ? 'Reboot system?' : 'Upgrade packages? This may take a while.';
    if (!confirm(prompt)) return;

    setLoadingAction(action);
    try {
      const res = await fetch('/api/system/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      alert(data.message || 'Action triggered');
    } catch (e) {
      alert('Action failed');
    } finally {
      setLoadingAction('');
    }
  };

  if (!stats) return <div className="p-8 text-center text-muted">Loading system metrics...</div>;

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-2xl font-bold neon-text">System Overview</h1>
        <div className="flex gap-4">
          <Link href="/processes" className="btn btn-info">
            <List size={18} /> Process Monitor
          </Link>
          <button
            onClick={() => handleAction('upgrade')}
            disabled={!!loadingAction}
            className="btn btn-success"
          >
            <Download size={18} /> {loadingAction === 'upgrade' ? 'Upgrading...' : 'Upgrade Pkg'}
          </button>
          <button
            onClick={() => handleAction('reboot')}
            disabled={!!loadingAction}
            className="btn btn-danger"
          >
            <Power size={18} /> {loadingAction === 'reboot' ? 'Rebooting...' : 'Reboot'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weather Card (First) */}
        {stats.weather && (
          <div className="col-span-1 md:col-span-2 lg:col-span-4 glass-panel p-6 relative overflow-hidden group">
            {/* Background Gradient Effect */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-400/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md">
                  <Cloud className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" size={42} />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted text-sm font-medium mb-2 uppercase tracking-wider">
                    <Globe size={14} className="text-cyan-400" />
                    {stats.weather.location}, {stats.weather.country}
                  </div>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                    <span className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                      {Math.round(stats.weather.temp)}°
                    </span>
                    <div className="flex flex-col mb-1.5">
                      <span className="text-lg font-medium text-cyan-100/90">{getWeatherLabel(stats.weather.code)}</span>
                      <span className="text-xs text-muted/60 hidden md:inline-block">RealFeel® {Math.round(stats.weather.temp)}°</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto flex justify-between md:block text-right border-t md:border-t-0 border-white/5 pt-4 md:pt-0 mt-2 md:mt-0">
                <div>
                  <div className="text-sm font-medium text-white/90">Today's Forecast</div>
                  <div className="text-xs text-muted">24-Hour Overview</div>
                </div>
                {/* Mobile Only Weather Icon/Label Duplicate if needed, or just keep simple */}
              </div>
            </div>

            {/* Hourly Forecast Scrollable Area */}
            <div className="relative w-full">
              {/* Fade masks for scroll indication */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none hidden md:block"></div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none hidden md:block"></div>

              <div className="flex gap-3 overflow-x-auto pb-4 pt-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {stats.weather.hourly?.map((h: any, i: number) => (
                  <div key={i} className="snap-start flex flex-col items-center justify-center gap-3 min-w-[80px] p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group/item cursor-default">
                    <span className="text-xs text-muted font-mono">{h.hour}</span>
                    <span className="text-3xl filter drop-shadow-lg transform group-hover/item:scale-110 transition-transform duration-300" title={getWeatherLabel(h.code)}>
                      {getWeatherEmoji(h.code)}
                    </span>
                    <span className="text-sm font-bold text-white/90">{Math.round(h.temp)}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Row 1: Core Resources */}
        <StatsCard
          title="CPU Usage"
          value={`${stats.cpu?.usage || 0}%`}
          sub={`${stats.cpus?.count} Cores @ ${stats.cpus?.speed} GHz`}
          icon={Percent}
          percent={stats.cpu?.usage}
        />
        <StatsCard
          title="Memory"
          value={formatBytes(stats.memory?.used)}
          sub={`${stats.memory?.percent}% / ${formatBytes(stats.memory?.total)}`}
          icon={Activity}
          percent={stats.memory?.percent}
        />
        <StatsCard
          title="Storage"
          value={formatBytes(stats.disk?.used)}
          sub={`${stats.disk?.percent}% / ${formatBytes(stats.disk?.total)}`}
          icon={HardDrive}
          percent={stats.disk?.percent}
        />
        <StatsCard
          title="Uptime"
          value={formatUptime(stats.uptime)}
          sub="Since last boot"
          icon={Clock}
        />

        {/* Row 2: Network & Environment */}
        <StatsCard
          title="Public IP"
          value={stats.network?.publicIp || 'Unknown'}
          sub="External Address"
          icon={Globe}
          color="text-blue-400"
        />
        <StatsCard
          title="WiFi SSID"
          value={stats.network?.ssid || 'Ethernet'}
          sub="Network Connection"
          icon={Wifi}
          color={stats.network?.ssid === 'Unknown' ? 'text-gray-500' : 'text-green-400'}
        />
        <StatsCard
          title="House Power"
          value={stats.power?.status === "Listrik Dirumah Menyala" ? "On / Charging" : (stats.power?.status === "Listrik Dirumah Mati" ? "OFF / Outage" : "On Grid")}
          sub={stats.power?.status === "Listrik Dirumah Menyala" ? "Power is OK" : (stats.power?.status === "Listrik Dirumah Mati" ? "Running on Battery!" : "Power Stable")}
          icon={Zap}
          color={stats.power?.status === "Listrik Dirumah Mati" ? "text-red-500" : "text-yellow-400"}
        />
        <div className="grid grid-cols-2 gap-4">
          <MiniCard
            title="Consump."
            value={`${stats.power?.watts?.toFixed(1) || 0} W`}
            icon={Zap}
          />
          <MiniCard
            title="CPU Temp"
            value={`${stats.cpu?.temp?.toFixed(1) || 0}°C`}
            icon={Thermometer}
            isDanger={(stats.cpu?.temp || 0) > 80}
          />
        </div>
      </div>
    </div>
  )
}

function getWeatherEmoji(code: number) {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95 && code <= 99) return '⚡';
  return '🌡️';
}

function getWeatherLabel(code: number) {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function StatsCard({ title, value, sub, icon: Icon, percent, color }: any) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card hover:border-primary transition-colors cursor-default flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-muted text-sm font-medium">{title}</div>
          <Icon className={color || "text-primary"} size={20} />
        </div>
        <div className="text-xl font-bold mb-1 truncate" title={value}>{value}</div>
        <div className="text-xs text-muted truncate">{sub}</div>
      </div>
      {percent !== undefined && (
        <div className="mt-4 h-1.5 w-full bg-[#333] rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </motion.div>
  )
}

function MiniCard({ title, value, icon: Icon, isDanger }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`card flex flex-col justify-center items-center text-center p-3 ${isDanger ? 'border-red-500/50 bg-red-500/10' : ''}`}
    >
      <Icon className={`mb-2 ${isDanger ? 'text-red-500' : 'text-primary'}`} size={18} />
      <div className="text-xs text-muted mb-1">{title}</div>
      <div className="text-lg font-bold">{value}</div>
    </motion.div>
  )
}

function formatBytes(bytes: number) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds: number) {
  if (!seconds) return '-';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return `${d}d ${h}h ${m}m`;
}
