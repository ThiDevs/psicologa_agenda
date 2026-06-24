#!/usr/bin/env bash
# deploy-prod.sh - Automatic deployment script executed on the server by GitHub Actions.
set -euo pipefail

APP_DIR="/home/prod/.gemini/antigravity/scratch/psi-agenda"
BRANCH="main"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
BACKUP_DIR="$APP_DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

echo "==> Atualizando versao"
VERSION_FILE=".version"
if [ ! -f "$VERSION_FILE" ]; then
  echo "1" > "$VERSION_FILE"
else
  VER=$(cat "$VERSION_FILE")
  echo "$((VER + 1))" > "$VERSION_FILE"
fi
export APP_VERSION=$(cat "$VERSION_FILE")

echo "==> Carregando variaveis de ambiente de $ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "ERRO: Arquivo $ENV_FILE nao encontrado em $APP_DIR"
  exit 1
fi

echo "==> Atualizando codigo"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Instalando dependencias do Frontend e fazendo build"
npm install
npx expo export

echo "==> Reiniciando PM2 (Frontend Web)"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

echo "==> Garantindo PostgreSQL ativo"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres

echo "==> Aguardando PostgreSQL"
until docker exec psi-agenda-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  sleep 2
done

echo "==> Backup antes da migration"
docker exec psi-agenda-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > "$BACKUP_DIR/psi_agenda-$STAMP.sql"
gzip "$BACKUP_DIR/psi_agenda-$STAMP.sql"

echo "==> Aplicando migrations EF Core"
NETWORK_NAME="$(docker inspect psi-agenda-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')"

docker run --rm \
  --network "$NETWORK_NAME" \
  -v "$APP_DIR/backend:/src" \
  -w /src \
  --env-file "$APP_DIR/$ENV_FILE" \
  mcr.microsoft.com/dotnet/sdk:10.0 \
  bash -lc '
    dotnet tool install --global dotnet-ef &&
    export PATH="$PATH:/root/.dotnet/tools" &&
    dotnet restore src/PsiAgenda.Api/PsiAgenda.Api.csproj &&
    dotnet ef database update \
      --project src/PsiAgenda.Infrastructure \
      --startup-project src/PsiAgenda.Api
  '

echo "==> Corrigindo permissoes dos arquivos gerados pelo Docker"
docker run --rm -v "$APP_DIR/backend:/src" alpine chown -R 1000:1000 /src

echo "==> Build e restart da API"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build api

echo "==> Healthcheck"
sleep 5
curl -f https://api.felicio.app/api/health

echo "Deploy concluido."
