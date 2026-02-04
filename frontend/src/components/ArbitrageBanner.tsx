'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ScanLine } from 'lucide-react';
import { ArbitrageOpportunity } from '@/types';

export default function ArbitrageBanner({ opportunities }: { opportunities: ArbitrageOpportunity[] }) {
    const hasArbitrage = opportunities.length > 0;

    return (
        <div className="w-full mb-6">
            <AnimatePresence mode='wait'>
                {hasArbitrage ? (
                    <motion.div
                        key="arbitrage-found"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full bg-gradient-to-r from-emerald-500/10 via-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg">
                                <AlertTriangle className="text-emerald-400 h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-emerald-300 font-semibold text-sm">Arbitrage Opportunity Detected</h3>
                                <p className="text-emerald-400/80 text-xs">
                                    {opportunities.length} profitable bet(s) available
                                </p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs rounded-lg transition-colors">
                            View Opportunities
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="scanning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex items-center justify-center gap-3"
                    >
                        <ScanLine className="text-cyan-500/50 h-4 w-4 animate-pulse" />
                        <span className="text-slate-500 text-xs font-mono tracking-wider">SCANNING FOR ARBITRAGE...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
