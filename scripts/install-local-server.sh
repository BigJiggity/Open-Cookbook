#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${OPEN_COOKBOOK_PORT:-8080}"

install_linux_apt() {
  sudo apt-get update
  sudo apt-get install -y apache2 mariadb-server php libapache2-mod-php php-mysql
  sudo mysql < "${REPO_ROOT}/server/local/schema.sql"
  sudo mkdir -p /var/www/open-cookbook
  sudo rsync -a --delete \
    --exclude ".git/" \
    --exclude "infrastructure/" \
    --exclude "server/" \
    "${REPO_ROOT}/" /var/www/open-cookbook/
  sudo mkdir -p /var/www/open-cookbook/api
  sudo cp "${REPO_ROOT}/server/local/api/cookbook.php" /var/www/open-cookbook/api/cookbook.php
  sudo tee /etc/apache2/sites-available/open-cookbook.conf >/dev/null <<APACHE
<VirtualHost *:80>
  DocumentRoot /var/www/open-cookbook
  <Directory /var/www/open-cookbook>
    Require all granted
    AllowOverride All
  </Directory>
</VirtualHost>
APACHE
  sudo a2ensite open-cookbook.conf
  sudo systemctl reload apache2
}

install_macos_brew() {
  command -v brew >/dev/null 2>&1 || {
    echo "Homebrew is required for native macOS install. Use Docker Compose otherwise." >&2
    exit 1
  }
  brew install httpd mariadb php
  brew services start mariadb
  mysql.server start || true
  mysql < "${REPO_ROOT}/server/local/schema.sql"
  echo "Native macOS packages installed. For the simplest run path, use Docker Compose:"
  echo "docker compose --env-file .env -f server/local/docker-compose.yml up -d"
}

case "$(uname -s)" in
  Linux)
    if command -v apt-get >/dev/null 2>&1; then
      install_linux_apt
    else
      echo "This script currently supports Debian/Ubuntu native LAMP installs. Use Docker Compose on this host:" >&2
      echo "docker compose --env-file .env -f server/local/docker-compose.yml up -d" >&2
      exit 1
    fi
    ;;
  Darwin)
    install_macos_brew
    ;;
  *)
    echo "Unsupported OS. Use Docker Compose on port ${PORT}." >&2
    exit 1
    ;;
esac
