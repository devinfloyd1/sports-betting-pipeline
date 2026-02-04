# ============================================
# KINESIS DATA STREAM (Real-time ingestion)
# ============================================
resource "aws_kinesis_stream" "odds_stream" {
  name             = "${var.project_name}-odds-stream"
  shard_count      = 1
  retention_period = 24

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  tags = {
    Project = var.project_name
  }
}

# ============================================
# DYNAMODB (Hot storage - real-time queries)
# ============================================
resource "aws_dynamodb_table" "live_odds" {
  name         = "${var.project_name}-live-odds"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "game_id"
  range_key    = "bookmaker"

  attribute {
    name = "game_id"
    type = "S"
  }

  attribute {
    name = "bookmaker"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Project = var.project_name
  }
}

# Arbitrage opportunities table
resource "aws_dynamodb_table" "arbitrage" {
  name         = "${var.project_name}-arbitrage"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "game_id"
  range_key    = "detected_at"

  attribute {
    name = "game_id"
    type = "S"
  }

  attribute {
    name = "detected_at"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Project = var.project_name
  }
}

# ============================================
# S3 BUCKET (Cold storage - historical)
# ============================================
resource "aws_s3_bucket" "odds_archive" {
  bucket = "${var.project_name}-odds-archive-${data.aws_caller_identity.current.account_id}"

  tags = {
    Project = var.project_name
  }
}

data "aws_caller_identity" "current" {}

# ============================================
# IAM ROLE FOR LAMBDAS
# ============================================
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords",
          "kinesis:GetRecords",
          "kinesis:GetShardIterator",
          "kinesis:DescribeStream",
          "kinesis:ListShards"
        ]
        Resource = aws_kinesis_stream.odds_stream.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.live_odds.arn,
          aws_dynamodb_table.arbitrage.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.odds_archive.arn}/*"
      }
    ]
  })
}

# ============================================
# LAMBDA: ODDS INGESTION (Fetches from API)
# ============================================
resource "aws_lambda_function" "odds_ingestion" {
  filename         = "${path.module}/../lambda/odds_ingestion/function.zip"
  function_name    = "${var.project_name}-odds-ingestion"
  role             = aws_iam_role.lambda_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ODDS_API_KEY    = var.odds_api_key
      KINESIS_STREAM  = aws_kinesis_stream.odds_stream.name
      S3_BUCKET       = aws_s3_bucket.odds_archive.id
    }
  }

  depends_on = [aws_iam_role_policy.lambda_policy]
}

# ============================================
# LAMBDA: STREAM PROCESSOR (Kinesis consumer)
# ============================================
resource "aws_lambda_function" "stream_processor" {
  filename         = "${path.module}/../lambda/stream_processor/function.zip"
  function_name    = "${var.project_name}-stream-processor"
  role             = aws_iam_role.lambda_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_ODDS_TABLE      = aws_dynamodb_table.live_odds.name
      DYNAMODB_ARBITRAGE_TABLE = aws_dynamodb_table.arbitrage.name
    }
  }

  depends_on = [aws_iam_role_policy.lambda_policy]
}

# Kinesis trigger for stream processor
resource "aws_lambda_event_source_mapping" "kinesis_trigger" {
  event_source_arn  = aws_kinesis_stream.odds_stream.arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"
  batch_size        = 100
}

# ============================================
# EVENTBRIDGE: SCHEDULE INGESTION
# ============================================
resource "aws_cloudwatch_event_rule" "every_5_minutes" {
  name                = "${var.project_name}-every-5-min"
  description         = "Trigger odds ingestion every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "trigger_ingestion" {
  rule      = aws_cloudwatch_event_rule.every_5_minutes.name
  target_id = "trigger-odds-ingestion"
  arn       = aws_lambda_function.odds_ingestion.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.odds_ingestion.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every_5_minutes.arn
}

# ============================================
# OUTPUTS
# ============================================
output "kinesis_stream_name" {
  value = aws_kinesis_stream.odds_stream.name
}

output "dynamodb_odds_table" {
  value = aws_dynamodb_table.live_odds.name
}

output "dynamodb_arbitrage_table" {
  value = aws_dynamodb_table.arbitrage.name
}

output "s3_bucket" {
  value = aws_s3_bucket.odds_archive.id
}

# ============================================
# LAMBDA: ODDS API (serves dashboard)
# ============================================
resource "aws_lambda_function" "odds_api" {
  filename         = "${path.module}/../lambda/odds_api/function.zip"
  function_name    = "${var.project_name}-odds-api"
  role             = aws_iam_role.lambda_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_ODDS_TABLE      = aws_dynamodb_table.live_odds.name
      DYNAMODB_ARBITRAGE_TABLE = aws_dynamodb_table.arbitrage.name
    }
  }

  depends_on = [aws_iam_role_policy.lambda_policy]
}

# ============================================
# API GATEWAY (HTTP API for dashboard)
# ============================================
resource "aws_apigatewayv2_api" "odds_api" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "odds_api" {
  api_id             = aws_apigatewayv2_api.odds_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.odds_api.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "odds" {
  api_id    = aws_apigatewayv2_api.odds_api.id
  route_key = "GET /odds"
  target    = "integrations/${aws_apigatewayv2_integration.odds_api.id}"
}

resource "aws_apigatewayv2_route" "arbitrage" {
  api_id    = aws_apigatewayv2_api.odds_api.id
  route_key = "GET /arbitrage"
  target    = "integrations/${aws_apigatewayv2_integration.odds_api.id}"
}

resource "aws_apigatewayv2_route" "best_odds" {
  api_id    = aws_apigatewayv2_api.odds_api.id
  route_key = "GET /best-odds"
  target    = "integrations/${aws_apigatewayv2_integration.odds_api.id}"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.odds_api.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.odds_api.id}"
}

resource "aws_apigatewayv2_stage" "odds_api" {
  api_id      = aws_apigatewayv2_api.odds_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.odds_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.odds_api.execution_arn}/*/*"
}

output "api_url" {
  value = aws_apigatewayv2_api.odds_api.api_endpoint
}
