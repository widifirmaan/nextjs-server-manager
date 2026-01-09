'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                setError('Invalid password');
            }
        } catch (e) {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
            <div className="w-full max-w-sm p-8 bg-[#111] border border-[#333] rounded-xl shadow-2xl">
                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-primary/10 rounded-full mb-4">
                        <Lock className="text-primary" size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-white">Access Restricted</h1>
                    <p className="text-sm text-gray-400 mt-1">Please enter your password</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input text-center tracking-widest"
                        placeholder="••••••••"
                        autoFocus
                    />

                    {error && (
                        <div className="text-red-500 text-xs text-center font-medium bg-red-900/20 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary justify-center w-full mt-2"
                        disabled={loading}
                    >
                        {loading ? 'Verifying...' : 'Unlock Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}
