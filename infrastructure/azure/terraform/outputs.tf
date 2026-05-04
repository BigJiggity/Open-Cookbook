output "storage_account_name" {
  description = "Storage account hosting the static site and table."
  value       = azurerm_storage_account.main.name
}

output "static_site_url" {
  description = "Azure Storage static website URL."
  value       = azurerm_storage_account.main.primary_web_endpoint
}

output "function_app_name" {
  description = "Azure Function App name."
  value       = azurerm_linux_function_app.cookbook.name
}

output "api_base_url" {
  description = "Backend API endpoint used by site-config.js."
  value       = "https://${azurerm_linux_function_app.cookbook.default_hostname}/api/cookbook"
}

output "resource_group_name" {
  description = "Azure resource group name."
  value       = azurerm_resource_group.main.name
}
