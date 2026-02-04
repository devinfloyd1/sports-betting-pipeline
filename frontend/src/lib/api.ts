import { OddsResponse, ArbitrageResponse } from '@/types';

const API_BASE_URL = 'https://nt2rh0ouek.execute-api.us-east-1.amazonaws.com';

export async function fetchOdds(): Promise<OddsResponse> {
    try {
        const res = await fetch(`${API_BASE_URL}/odds`, {
            cache: 'no-store', // Ensure fresh data on every request
            next: { revalidate: 30 }, // Or revalidate every 30 seconds
        });

        if (!res.ok) {
            throw new Error('Failed to fetch odds');
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching odds:', error);
        // Return empty structure on error to prevent UI crash
        return { nfl: [], nba: [], total_games: 0, last_updated: new Date().toISOString() };
    }
}

export async function fetchArbitrage(): Promise<ArbitrageResponse> {
    try {
        const res = await fetch(`${API_BASE_URL}/arbitrage`, {
            cache: 'no-store',
            next: { revalidate: 30 },
        });

        if (!res.ok) {
            // If 404 or other error, return empty
            return { opportunities: [], last_updated: new Date().toISOString() };
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching arbitrage:', error);
        return { opportunities: [], last_updated: new Date().toISOString() };
    }
}
