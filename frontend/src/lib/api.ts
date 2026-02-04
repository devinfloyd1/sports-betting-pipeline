import { OddsResponse, ArbitrageResponse } from '@/types';

const API_BASE_URL = 'https://nt2rh0ouek.execute-api.us-east-1.amazonaws.com';

export async function fetchOdds(): Promise<OddsResponse> {
    try {
        const res = await fetch(`${API_BASE_URL}/odds`, {
            cache: 'no-store',
        });
        if (!res.ok) {
            throw new Error('Failed to fetch odds');
        }
        return res.json();
    } catch (error) {
        console.error('Error fetching odds:', error);
        return { nfl: [], nba: [], total_games: 0, last_updated: new Date().toISOString() };
    }
}

export async function fetchArbitrage(): Promise<ArbitrageResponse> {
    try {
        const res = await fetch(`${API_BASE_URL}/arbitrage`, {
            cache: 'no-store',
        });
        if (!res.ok) {
            return { opportunities: [], last_updated: new Date().toISOString() };
        }
        return res.json();
    } catch (error) {
        console.error('Error fetching arbitrage:', error);
        return { opportunities: [], last_updated: new Date().toISOString() };
    }
}
