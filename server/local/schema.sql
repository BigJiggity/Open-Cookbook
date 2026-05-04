CREATE DATABASE IF NOT EXISTS open_cookbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'open_cookbook'@'%' IDENTIFIED BY 'open_cookbook';
GRANT ALL PRIVILEGES ON open_cookbook.* TO 'open_cookbook'@'%';
FLUSH PRIVILEGES;

USE open_cookbook;

CREATE TABLE IF NOT EXISTS cookbook_documents (
  document_id VARCHAR(128) NOT NULL PRIMARY KEY,
  document_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
