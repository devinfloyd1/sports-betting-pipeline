'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trophy } from 'lucide-react';
import { Game } from '@/types';
import { getTeamLogoUrl } from '@/lib/teams';
import { clsx } from 'clsx';

interface GameCardProps {
    game: Game;
    league: 'nba' | 'nfl';
}

export default function GameCard({ game, league }: GameCardProps) {
    const [expanded, setExpanded] = useState(false);

    const homeLogo = getTeamLogoUrl(game.home_team, league);
    const awayLogo = getTeamLogoUrl(game.away_team, league);

    // Find best odds
    const bestHomeOdds = Math.max(...game.bookmakers.map(b => b.home_odds));
    const bestAwayOdds = Math.max(...game.bookmakers.map(b => b.away_odds));

    const formatOdds = (odds: number) => {
        return odds > 0 ? `+${odds}` : odds.toString();
    };

    const getOddsColor = (odds: number) => {
        // American odds: > 0 is underdog (usually green/high payout), < 0 is favorite (red/low payout)
        // Request: Positive odds: Green (#4ade80), Negative odds: Red (#f87171)
        return odds > 0 ? 'text-odds-up' : 'text-odds-down';
    };

    return (
        <motion.div
            layout
            className="glass-card rounded-2xl overflow-hidden relative group"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}
        >
            <div
                className="p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Header: Date & Status */}
                <div className="flex justify-between items-center mb-6">
                    <span className="text-xs text-slate-500 font-mono font-semibold tracking-wider">
                        {new Date(game.commence_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                        {new Date(game.commence_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Teams & Odds Summary */}
                <div className="flex justify-between items-center gap-4">
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-16 h-16 relative bg-white/5 rounded-full p-2 grid place-items-center">
                            {awayLogo ? (
                                <img src={awayLogo} alt={game.away_team} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-8 h-8 bg-slate-700 rounded-full" />
                            )}
                        </div>
                        <h3 className="text-sm font-bold text-center leading-tight h-10 flex items-center justify-center">
                            {game.away_team}
                        </h3>
                        {/* Best Odds Badge */}
                        <div className={clsx(
                            "px-3 py-1 rounded-lg text-sm font-mono font-bold transition-all border",
                            "bg-slate-900 border-slate-700 shadow-inner",
                            getOddsColor(bestAwayOdds)
                        )}>
                            {formatOdds(bestAwayOdds)}
                        </div>
                    </div>

                    <div className="text-slate-600 font-serif italic text-lg">at</div>

                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-16 h-16 relative bg-white/5 rounded-full p-2 grid place-items-center">
                            {homeLogo ? (
                                <img src={homeLogo} alt={game.home_team} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-8 h-8 bg-slate-700 rounded-full" />
                            )}
                        </div>
                        <h3 className="text-sm font-bold text-center leading-tight h-10 flex items-center justify-center">
                            {game.home_team}
                        </h3>
                        {/* Best Odds Badge */}
                        <div className={clsx(
                            "px-3 py-1 rounded-lg text-sm font-mono font-bold transition-all border",
                            "bg-slate-900 border-slate-700 shadow-inner",
                            getOddsColor(bestHomeOdds)
                        )}>
                            {formatOdds(bestHomeOdds)}
                        </div>
                    </div>
                </div>

                {/* Expand Indicator */}
                <div className="flex justify-center mt-6">
                    <ChevronDown className={clsx("text-slate-600 transition-transform duration-300", expanded ? "rotate-180" : "")} size={20} />
                </div>
            </div>

            {/* Expanded Bookmaker Details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-900/50 border-t border-slate-800"
                    >
                        <div className="p-4 space-y-2">
                            <div className="flex justify-between text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2 px-2">
                                <span>Bookmaker</span>
                                <div className="flex gap-8">
                                    <span className="w-12 text-center">{game.away_team.split(' ').pop()}</span>
                                    <span className="w-12 text-center">{game.home_team.split(' ').pop()}</span>
                                </div>
                            </div>
                            {game.bookmakers.map((bm, i) => {
                                const isBestHome = bm.home_odds === bestHomeOdds;
                                const isBestAway = bm.away_odds === bestAwayOdds;

                                return (
                                    <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
                                        <span className="text-sm font-medium text-slate-300">{bm.title}</span>
                                        <div className="flex gap-8 font-mono text-sm">
                                            <span className={clsx(
                                                "w-12 text-center rounded py-0.5",
                                                isBestAway ? "text-slate-900 bg-gold-glow font-bold shadow-[0_0_10px_var(--color-gold-glow)]" : "text-slate-400"
                                            )}>
                                                {formatOdds(bm.away_odds)}
                                            </span>
                                            <span className={clsx(
                                                "w-12 text-center rounded py-0.5",
                                                isBestHome ? "text-slate-900 bg-gold-glow font-bold shadow-[0_0_10px_var(--color-gold-glow)]" : "text-slate-400"
                                            )}>
                                                {formatOdds(bm.home_odds)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
