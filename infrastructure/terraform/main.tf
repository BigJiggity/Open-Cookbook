terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

locals {
  has_custom_domain = var.custom_domain_name != "" && var.route53_zone_id != ""
  table_name        = var.cookbook_table_name != "" ? var.cookbook_table_name : "${var.site_bucket_name}-cookbook"
}

resource "aws_s3_bucket" "site" {
  bucket = var.site_bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.site_bucket_name}-oac"
  description                       = "Origin access control for Open Cookbook static site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_acm_certificate" "site" {
  count             = local.has_custom_domain ? 1 : 0
  provider          = aws.use1
  domain_name       = var.custom_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.has_custom_domain ? {
    for record in aws_acm_certificate.site[0].domain_validation_options : record.domain_name => {
      name   = record.resource_record_name
      record = record.resource_record_value
      type   = record.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "site" {
  count                   = local.has_custom_domain ? 1 : 0
  provider                = aws.use1
  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${var.site_bucket_name}-security-headers"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "same-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = local.has_custom_domain ? [var.custom_domain_name] : []
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = local.has_custom_domain ? aws_acm_certificate_validation.site[0].certificate_arn : null
    cloudfront_default_certificate = local.has_custom_domain ? false : true
    minimum_protocol_version       = local.has_custom_domain ? "TLSv1.2_2021" : null
    ssl_support_method             = local.has_custom_domain ? "sni-only" : null
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.site.arn
          }
        }
      }
    ]
  })
}

resource "aws_route53_record" "site_a" {
  count   = local.has_custom_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "site_aaaa" {
  count   = local.has_custom_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.custom_domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_dynamodb_table" "cookbook" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "document_id"

  attribute {
    name = "document_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

data "archive_file" "cookbook_api" {
  type        = "zip"
  source_file = "${path.module}/../../../server/aws/lambda/cookbook_api.py"
  output_path = "${path.module}/.terraform/cookbook_api.zip"
}

resource "aws_iam_role" "cookbook_api" {
  name = "${var.site_bucket_name}-cookbook-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cookbook_api_logs" {
  role       = aws_iam_role.cookbook_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "cookbook_api_dynamodb" {
  name = "${var.site_bucket_name}-cookbook-api-dynamodb"
  role = aws_iam_role.cookbook_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem"
        ]
        Resource = aws_dynamodb_table.cookbook.arn
      }
    ]
  })
}

resource "aws_lambda_function" "cookbook_api" {
  function_name    = "${var.site_bucket_name}-cookbook-api"
  role             = aws_iam_role.cookbook_api.arn
  handler          = "cookbook_api.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.cookbook_api.output_path
  source_code_hash = data.archive_file.cookbook_api.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.cookbook.name
    }
  }
}

resource "aws_apigatewayv2_api" "cookbook" {
  name          = "${var.site_bucket_name}-cookbook-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Content-Type"]
    allow_methods = ["GET", "PUT", "OPTIONS"]
    allow_origins = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "cookbook" {
  api_id                 = aws_apigatewayv2_api.cookbook.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.cookbook_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "cookbook" {
  api_id    = aws_apigatewayv2_api.cookbook.id
  route_key = "ANY /cookbook"
  target    = "integrations/${aws_apigatewayv2_integration.cookbook.id}"
}

resource "aws_apigatewayv2_stage" "cookbook" {
  api_id      = aws_apigatewayv2_api.cookbook.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "cookbook_api" {
  statement_id  = "AllowExecutionFromHttpApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cookbook_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.cookbook.execution_arn}/*/*"
}
