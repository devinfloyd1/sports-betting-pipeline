variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "sports-betting"
}

variable "odds_api_key" {
  description = "The Odds API key"
  type        = string
  sensitive   = true
}
