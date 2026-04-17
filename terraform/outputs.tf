# VoiceBridge - Terraform Outputs

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.app.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i voicebridge-key.pem ubuntu@${aws_eip.app.public_ip}"
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "http://${aws_eip.app.public_ip}"
}

output "api_url" {
  description = "API URL"
  value       = "http://${aws_eip.app.public_ip}:3000/api"
}

output "github_secrets" {
  description = "Values to add as GitHub Secrets"
  value = {
    EC2_HOST     = aws_eip.app.public_ip
    VITE_API_URL = "http://${aws_eip.app.public_ip}/api"
  }
}

output "env_production_values" {
  description = "Values for .env.production file"
  value       = <<-EOT

    ========================================
    Update .env.production with these values:
    ========================================
    FRONTEND_URL=http://${aws_eip.app.public_ip}
    BASE_URL=http://${aws_eip.app.public_ip}
    VITE_API_URL=http://${aws_eip.app.public_ip}/api
    CORS_ORIGINS=http://${aws_eip.app.public_ip}
    AWS_RECORDINGS_BUCKET=${aws_s3_bucket.recordings.id}
    AWS_REGION=ap-south-1
    ========================================
  EOT
}

output "s3_recordings_bucket" {
  description = "S3 bucket name for recordings"
  value       = aws_s3_bucket.recordings.id
}

output "s3_recordings_url" {
  description = "S3 bucket URL for recordings"
  value       = "https://${aws_s3_bucket.recordings.bucket_regional_domain_name}"
}
