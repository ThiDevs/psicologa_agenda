#!/usr/bin/env bash
# server-setup.sh - Run this script on the Ubuntu server as root or a user with sudo access.
set -euo pipefail

DEPLOY_USER="deploy"
APP_DIR="/opt/psi-agenda"

echo "==> Atualizando pacotes"
sudo apt update
sudo apt upgrade -y

echo "==> Instalando dependencias base"
sudo apt install -y ca-certificates curl gnupg git nginx ufw

echo "==> Removendo pacotes Docker conflitantes, se existirem"
sudo apt remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc || true

echo "==> Adicionando repositorio oficial do Docker"
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update

echo "==> Instalando Docker Engine + Compose plugin"
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Habilitando Docker"
sudo systemctl enable docker
sudo systemctl start docker

echo "==> Criando usuario de deploy"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi

sudo usermod -aG docker "$DEPLOY_USER"

echo "==> Preparando diretorio da aplicacao"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "==> Configurando firewall"
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw --force enable

echo "==> Testando Docker"
sudo docker run --rm hello-world

echo "Servidor base configurado."
echo "Reconecte o SSH para atualizar o grupo docker do usuario deploy."
