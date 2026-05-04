variable "location" {
  description = "Azure region."
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Azure resource group name."
  type        = string
}

variable "storage_account_name" {
  description = "Globally unique lowercase storage account name."
  type        = string
}

variable "function_app_name" {
  description = "Globally unique Azure Function App name."
  type        = string
}

variable "cookbook_table_name" {
  description = "Azure Table Storage table name."
  type        = string
  default     = "cookbook"
}
