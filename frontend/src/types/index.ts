export interface Bookmaker {
    title: string;
    home_odds: number;
    away_odds: number;
}

export interface Game {
    game_id: string;
    home_team: string;
    away_team: string;
    commence_time: string;
    bookmakers: Bookmaker[];
}

export interface OddsResponse {
    nba: Game[];
    nfl: Game[];
    total_games: number;
    last_updated: string;
}

export interface ArbitrageOpportunity {
    game_id: string;
    home_team: string;
    away_team: string;
    profit_percentage: number;
    home_bookmaker: string;
    away_bookmaker: string;
    home_odds: number;
    away_odds: number;
}

export interface ArbitrageResponse {
    opportunities: ArbitrageOpportunity[];
    last_updated: string;
}
