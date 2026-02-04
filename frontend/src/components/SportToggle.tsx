'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface SportToggleProps {
    activeSport: 'nba' | 'nfl';
    onToggle: (sport: 'nba' | 'nfl') => void;
    nbaCount: number;
    nflCount: number;
}

export default function SportToggle({ activeSport, onToggle, nbaCount, nflCount }: SportToggleProps) {
    return (
        <div className="flex justify-center w-full mb-8">
            <div className="bg-slate-800/50 p-1 rounded-full border border-slate-700/50 flex gap-1 relative backdrop-blur-md">
                {/* Animated Background Pill */}
                <motion.div
                    className={clsx(
                        "absolute top-1 bottom-1 rounded-full z-0 shadow-lg",
                        activeSport === 'nba' ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-green-500 to-emerald-600"
                    )}
                    initial={false}
                    animate={{
                        x: activeSport === 'nba' ? 0 : '100%',
                        width: '50%'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />

                <button
                    onClick={() => onToggle('nba')}
                    className={clsx(
                        "relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors duration-200 flex items-center gap-2",
                        activeSport === 'nba' ? "text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                    style={{ width: '140px', justifyContent: 'center' }}
                >
                    <span>NBA</span>
                    <span className={clsx("text-xs px-1.5 py-0.5 rounded-full bg-black/20", activeSport === 'nba' ? "opacity-100" : "opacity-0")}>
                        {nbaCount}
                    </span>
                </button>

                <button
                    onClick={() => onToggle('nfl')}
                    className={clsx(
                        "relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors duration-200 flex items-center gap-2",
                        activeSport === 'nfl' ? "text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                    style={{ width: '140px', justifyContent: 'center' }}
                >
                    <span>NFL</span>
                    <span className={clsx("text-xs px-1.5 py-0.5 rounded-full bg-black/20", activeSport === 'nfl' ? "opacity-100" : "opacity-0")}>
                        {nflCount}
                    </span>
                </button>
            </div>
        </div>
    );
}
