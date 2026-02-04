'use client';

import { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import SportToggle from './SportToggle';
import ArbitrageBanner from './ArbitrageBanner';
import GameCard from './GameCard';
import { OddsResponse, ArbitrageResponse } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
    oddsData: OddsResponse;
    arbitrageData: ArbitrageResponse;
}

export default function Dashboard({ oddsData, arbitrageData }: DashboardProps) {
    const [activeSport, setActiveSport] = useState<'nba' | 'nfl'>('nba');

    const games = activeSport === 'nba' ? oddsData.nba : oddsData.nfl;

    // Sort games by commence time
    const sortedGames = [...games].sort((a, b) =>
        new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    );

    return (
        <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 selection:bg-cyan-500/30">
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none"></div>

            <Header lastUpdated={oddsData.last_updated} />

            <main className="flex-grow container mx-auto px-4 py-8 relative z-10 max-w-7xl">
                <ArbitrageBanner opportunities={arbitrageData.opportunities} />

                <SportToggle
                    activeSport={activeSport}
                    onToggle={setActiveSport}
                    nbaCount={oddsData.nba.length}
                    nflCount={oddsData.nfl.length}
                />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSport}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {sortedGames.map((game) => (
                            <GameCard key={game.game_id} game={game} league={activeSport} />
                        ))}
                    </motion.div>
                </AnimatePresence>

                {sortedGames.length === 0 && (
                    <div className="text-center py-20 text-slate-500 font-mono">
                        No active games found for {activeSport.toUpperCase()}.
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
