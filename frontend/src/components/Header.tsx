'use client';

import { useEffect, useState } from 'react';

export default function Header({ lastUpdated }: { lastUpdated: string }) {
    const [formattedTime, setFormattedTime] = useState('');

    useEffect(() => {
        if (lastUpdated) {
            setFormattedTime(new Date(lastUpdated).toLocaleTimeString());
        }
    }, [lastUpdated]);

    return (
        <header className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-slate-700/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    OrbsTracker
                </h1>
            </div>
            <div className="text-xs text-slate-400 font-mono">
                Last Updated: <span className="text-slate-200">{formattedTime || 'Loading...'}</span>
            </div>
        </header>
    );
}
