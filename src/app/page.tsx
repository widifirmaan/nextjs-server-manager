'use client';
import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Clock, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [stats, setStats] = useState<any>(null);

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
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 neon-text">System Overview</h1>

      {!stats ? <div className="text-muted">Loading system metrics...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="CPU Load"
            value={`${stats.loadAvg[0].toFixed(2)}`}
            sub={`${stats.cpus.count} Threads`}
            icon={Cpu}
          />
          <StatsCard
            title="Memory"
            value={`${formatBytes(stats.memory.used)}`}
            sub={`${stats.memory.percent}% / ${formatBytes(stats.memory.total)}`}
            icon={Activity}
            percent={stats.memory.percent}
          />
          <StatsCard
            title="Storage"
            value={`${formatBytes(stats.disk.used)}`}
            sub={`${stats.disk.percent}% / ${formatBytes(stats.disk.total)}`}
            icon={HardDrive}
            percent={stats.disk.percent}
          />
          <StatsCard
            title="Uptime"
            value={formatUptime(stats.uptime)}
            sub="Since last boot"
            icon={Clock}
          />
        </div>
      )}
    </div>
  )
}

function StatsCard({ title, value, sub, icon: Icon, percent }: any) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card hover:border-primary transition-colors cursor-default"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="text-muted text-sm font-medium">{title}</div>
        <Icon className="text-primary" size={20} />
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
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

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return `${d}d ${h}h ${m}m`;
}
