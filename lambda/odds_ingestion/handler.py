import json
import boto3
import urllib.request
import os
from datetime import datetime

kinesis = boto3.client('kinesis')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    """Fetch live odds and push to Kinesis stream."""
    
    api_key = os.environ['ODDS_API_KEY']
    stream_name = os.environ['KINESIS_STREAM']
    bucket = os.environ['S3_BUCKET']
    
    # Sports to fetch
    sports = ['basketball_nba', 'americanfootball_nfl']
    
    all_games = []
    
    for sport in sports:
        try:
            url = f'https://api.the-odds-api.com/v4/sports/{sport}/odds/?apiKey={api_key}&regions=us&markets=h2h&oddsFormat=american'
            
            with urllib.request.urlopen(url, timeout=10) as response:
                games = json.loads(response.read().decode())
                
                for game in games:
                    # Flatten the data for streaming
                    for bookmaker in game.get('bookmakers', []):
                        for market in bookmaker.get('markets', []):
                            if market['key'] == 'h2h':
                                outcomes = {o['name']: o['price'] for o in market['outcomes']}
                                
                                record = {
                                    'game_id': game['id'],
                                    'sport': game['sport_key'],
                                    'home_team': game['home_team'],
                                    'away_team': game['away_team'],
                                    'commence_time': game['commence_time'],
                                    'bookmaker': bookmaker['key'],
                                    'bookmaker_title': bookmaker['title'],
                                    'home_odds': outcomes.get(game['home_team']),
                                    'away_odds': outcomes.get(game['away_team']),
                                    'last_update': bookmaker['last_update'],
                                    'ingested_at': datetime.utcnow().isoformat()
                                }
                                
                                all_games.append(record)
                                
                                # Push to Kinesis
                                kinesis.put_record(
                                    StreamName=stream_name,
                                    Data=json.dumps(record),
                                    PartitionKey=game['id']
                                )
                
                print(f"Fetched {len(games)} games for {sport}")
                
        except Exception as e:
            print(f"Error fetching {sport}: {e}")
    
    # Archive raw data to S3
    if all_games:
        timestamp = datetime.utcnow().strftime('%Y/%m/%d/%H%M%S')
        key = f'raw/{timestamp}_odds.json'
        
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(all_games, indent=2),
            ContentType='application/json'
        )
        print(f"Archived {len(all_games)} records to s3://{bucket}/{key}")
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'records_processed': len(all_games),
            'timestamp': datetime.utcnow().isoformat()
        })
    }
