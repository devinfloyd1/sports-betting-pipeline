import json
import boto3
import os
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)

def get_cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

def lambda_handler(event, context):
    """API endpoints for odds dashboard."""
    
    # Debug: print the event to see what we're getting
    print(f"Event: {json.dumps(event)}")
    
    # Try multiple ways to get the path
    path = event.get('rawPath') or event.get('path') or '/'
    
    # Also check routeKey for API Gateway HTTP API
    route_key = event.get('routeKey', '')
    if route_key:
        path = '/' + route_key.split(' ')[-1]
    
    print(f"Path: {path}, RouteKey: {route_key}")
    
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': get_cors_headers(), 'body': ''}
    
    odds_table = dynamodb.Table(os.environ['DYNAMODB_ODDS_TABLE'])
    arb_table = dynamodb.Table(os.environ['DYNAMODB_ARBITRAGE_TABLE'])
    
    try:
        if '/odds' in path:
            response = odds_table.scan()
            items = response.get('Items', [])
            
            games = {}
            for item in items:
                game_id = item['game_id']
                if game_id not in games:
                    games[game_id] = {
                        'game_id': game_id,
                        'sport': item['sport'],
                        'home_team': item['home_team'],
                        'away_team': item['away_team'],
                        'commence_time': item['commence_time'],
                        'bookmakers': []
                    }
                games[game_id]['bookmakers'].append({
                    'key': item['bookmaker'],
                    'title': item['bookmaker_title'],
                    'home_odds': item.get('home_odds'),
                    'away_odds': item.get('away_odds'),
                    'last_update': item.get('last_update')
                })
            
            games_list = sorted(games.values(), key=lambda x: x['commence_time'])
            nba_games = [g for g in games_list if g['sport'] == 'basketball_nba']
            nfl_games = [g for g in games_list if g['sport'] == 'americanfootball_nfl']
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'nba': nba_games,
                    'nfl': nfl_games,
                    'total_games': len(games_list),
                    'last_updated': items[0]['ingested_at'] if items else None
                }, cls=DecimalEncoder)
            }
        
        elif '/arbitrage' in path:
            response = arb_table.scan()
            items = response.get('Items', [])
            items = sorted(items, key=lambda x: float(x.get('profit_margin', 0)), reverse=True)
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'opportunities': items,
                    'count': len(items)
                }, cls=DecimalEncoder)
            }
        
        elif '/best-odds' in path:
            response = odds_table.scan()
            items = response.get('Items', [])
            
            games = {}
            for item in items:
                game_id = item['game_id']
                home_odds = float(item.get('home_odds', -9999))
                away_odds = float(item.get('away_odds', -9999))
                
                if game_id not in games:
                    games[game_id] = {
                        'game_id': game_id,
                        'sport': item['sport'],
                        'home_team': item['home_team'],
                        'away_team': item['away_team'],
                        'commence_time': item['commence_time'],
                        'best_home_odds': home_odds,
                        'best_home_book': item['bookmaker_title'],
                        'best_away_odds': away_odds,
                        'best_away_book': item['bookmaker_title']
                    }
                else:
                    if home_odds > games[game_id]['best_home_odds']:
                        games[game_id]['best_home_odds'] = home_odds
                        games[game_id]['best_home_book'] = item['bookmaker_title']
                    if away_odds > games[game_id]['best_away_odds']:
                        games[game_id]['best_away_odds'] = away_odds
                        games[game_id]['best_away_book'] = item['bookmaker_title']
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({'games': list(games.values())}, cls=DecimalEncoder)
            }
        
        elif '/health' in path:
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({'status': 'healthy'})
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Not found', 'path': path, 'routeKey': route_key})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }
