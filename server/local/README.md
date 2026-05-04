# Local Server Backend

The local server backend runs Apache, PHP, and MariaDB. MariaDB stores the cookbook as a JSON document in `cookbook_documents`.

## Docker Run

```bash
node scripts/setup.mjs
docker compose --env-file .env -f server/local/docker-compose.yml up -d
```

Open `http://localhost:8080`.

## Native Install

Linux/macOS:

```bash
./scripts/install-local-server.sh
```

Windows:

```powershell
.\scripts\install-local-server.ps1
```
