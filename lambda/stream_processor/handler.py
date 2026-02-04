import json
import boto3
import base64
import os
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

def calculate_arbitrage(odds_list):
    """
    Check if arbitrage opportunity exists.
    
    Arbitrage formula:
    (1/decimal_odds_home) + (1/decimal_odds_away) < 1
    
    If sum < 1, there's an arbitrage opportunity!
    """
    if len(odds_list) < 2:
        return None
    
    # Find best odds across all bookmakers
    best_home = None
    best_away = None
    best_home_book = None
    best_away_book = None
    
    for odds in odds_list:
        home_odds = odds.get('home_odds')
        away_odds = odds.get('away_odds')
        
        if home_odds is None or away_odds is None:
            continue
        
        # Convert American odds to decimal
        home_decimal = american_to_decimal(home_odds)
        away_decimal = american_to_decimal(away_odds)
        
        if best_home is None or home_decimal > best_home:
            best_home = home_decimal
            best_home_book = odds['bookmaker']
        
        if best_away is None or away_decimal > best_away:
            best_away = away_decimal
            best_away_book = odds['bookmaker']
    
    if best_home and best_away:
        # Arbitrage check
        implied_prob_sum = (1 / best_home) + (1 / best_away)
        
        if implied_prob_sum < 1:
            profit_margin = (1 - implied_prob_sum) * 100
            return {
                'has_arbitrage': True,
                'profit_margin': round(profit_margin, 2),
                'best_home_odds': best_home,
                'best_home_book': best_home_book,
                'best_away_odds': best_away,
                'best_away_book': best_away_book,
                'implied_prob_sum': round(implied_prob_sum, 4)
            }
    
    return {'has_arbitrage': False}


def american_to_decimal(american_odds):
    """Convert American odds to decimal odds."""
    if american_odds > 0:
        return (american_odds / 100) + 1
    else:
        return (100 / abs(american_odds)) + 1


def lambda_handler(event, context):
    """Process Kinesis records, store in DynamoDB, detect arbitrage."""
    
    odds_table = dynamodb.Table(os.environ['DYNAMODB_ODDS_TABLE'])
    arb_table = dynamodb.Table(os.environ['DYNAMODB_ARBITRAGE_TABLE'])
    
    # Group records by game_id
    games = {}
    
    for record in event['Records']:
        # Decode Kinesis record
        payload = base64.b64decode(record['kinesis']['data']).decode('utf-8')
        data = json.loads(payload)
        
        game_id = data['game_id']
        
        if game_id not in games:
            games[game_id] = {
                'game_info': {
                    'home_team': data['home_team'],
                    'away_team': data['away_team'],
                    'sport': data['sport'],
                    'commence_time': data['commence_time']
                },
                'odds': []
            }
        
        games[game_id]['odds'].append(data)
        
        # Store in DynamoDB (hot storage)
        ttl = int((datetime.utcnow() + timedelta(hours=24)).timestamp())
        
        odds_table.put_item(Item={
            'game_id': game_id,
            'bookmaker': data['bookmaker'],
            'home_team': data['home_team'],
            'away_team': data['away_team'],
            'sport': data['sport'],
            'commence_time': data['commence_time'],
            'home_odds': Decimal(str(data['home_odds'])) if data['home_odds'] else None,
            'away_odds': Decimal(str(data['away_odds'])) if data['away_odds'] else None,
            'bookmaker_title': data['bookmaker_title'],
            'last_update': data['last_update'],
            'ingested_at': data['ingested_at'],
            'ttl': ttl
        })
    
    # Check for arbitrage opportunities
    arbitrage_found = 0
    
    for game_id, game_data in games.items():
        arb_result = calculate_arbitrage(game_data['odds'])
        
        if arb_result and arb_result.get('has_arbitrage'):
            arbitrage_found += 1
            
            ttl = int((datetime.utcnow() + timedelta(hours=24)).timestamp())
            detected_at = datetime.utcnow().isoformat()
            
            arb_table.put_item(Item={
                'game_id': game_id,
                'detected_at': detected_at,
                'home_team': game_data['game_info']['home_team'],
                'away_team': game_data['game_info']['away_team'],
                'sport': game_data['game_info']['sport'],
                'commence_time': game_data['game_info']['commence_time'],
                'profit_margin': Decimal(str(arb_result['profit_margin'])),
                'best_home_odds': Decimal(str(arb_result['best_home_odds'])),
                'best_home_book': arb_result['best_home_book'],
                'best_away_odds': Decimal(str(arb_result['best_away_odds'])),
                'best_away_book': arb_result['best_away_book'],
                'ttl': ttl
            })
            
            print(f"🚨 ARBITRAGE FOUND: {game_data['game_info']['home_team']} vs {game_data['game_info']['away_team']} - {arb_result['profit_margin']}% profit")
    
    print(f"Processed {len(event['Records'])} records, {len(games)} games, {arbitrage_found} arbitrage opportunities")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'records_processed': len(event['Records']),
            'games_processed': len(games),
            'arbitrage_found': arbitrage_found
        })
    }
