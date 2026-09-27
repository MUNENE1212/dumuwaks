#!/bin/bash

# =============================================================================
# Dumuwaks VPS Initial Setup Script
# =============================================================================
# This script sets up a fresh VPS for hosting Dumuwaks.
# Run this script once on a new server.
#
# Usage:
#   ./scripts/setup-vps.sh
#
# Requirements:
#   - Ubuntu 20.04+ or Debian 11+
#   - Root access
#   - At least 2GB RAM, 20GB disk
#
# What this script installs:
#   - Node.js 20.x
#   - npm
#   - PM2
#   - Nginx
#   - Certbot (Let's Encrypt)
#   - Git
#   - UFW firewall
#   - Fail2ban
#
# WARNING: This script modifies system configuration.
# Review it carefully before running on production.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/dumuwaks}"
NODE_VERSION="${NODE_VERSION:-20}"
APP_USER="${APP_USER:-deploy}"
DOMAIN_FRONTEND="${DOMAIN_FRONTEND:-dumuwaks.co.ke}"
DOMAIN_API="${DOMAIN_API:-api.ementech.co.ke}"

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
  if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root"
    exit 1
  fi
}

# Start setup
echo ""
echo "=========================================="
echo -e "${BLUE}Dumuwaks VPS Setup Script${NC}"
echo "=========================================="
echo "This script will set up the VPS for Dumuwaks deployment."
echo ""
echo "Deploy Path: $DEPLOY_PATH"
echo "Node Version: $NODE_VERSION"
echo "Frontend Domain: $DOMAIN_FRONTEND"
echo "API Domain: $DOMAIN_API"
echo ""

read -p "Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_info "Setup cancelled"
  exit 0
fi

# Check root
check_root

# ========================================
# Step 1: Update System
# ========================================
log_info "Step 1: Updating system packages..."

apt-get update
apt-get upgrade -y

log_success "System updated"

# ========================================
# Step 2: Install Essential Packages
# ========================================
log_info "Step 2: Installing essential packages..."

apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common \
  htop \
  vim \
  unzip \
  rsync

log_success "Essential packages installed"

# ========================================
# Step 3: Install Node.js
# ========================================
log_info "Step 3: Installing Node.js ${NODE_VERSION}.x..."

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -

apt-get install -y nodejs

# Verify installation
node --version
npm --version

log_success "Node.js installed"

# ========================================
# Step 4: Install PM2
# ========================================
log_info "Step 4: Installing PM2..."

npm install -g pm2

# Set up PM2 startup script
pm2 startup systemd -u root --hp /root

log_success "PM2 installed"

# ========================================
# Step 5: Install Nginx
# ========================================
log_info "Step 5: Installing Nginx..."

apt-get install -y nginx

# Enable Nginx
systemctl enable nginx
systemctl start nginx

log_success "Nginx installed"

# ========================================
# Step 6: Install Certbot (Let's Encrypt)
# ========================================
log_info "Step 6: Installing Certbot..."

apt-get install -y certbot python3-certbot-nginx

log_success "Certbot installed"

# ========================================
# Step 7: Configure Firewall (UFW)
# ========================================
log_info "Step 7: Configuring UFW firewall..."

# Allow SSH
ufw allow OpenSSH

# Allow HTTP and HTTPS
ufw allow 'Nginx Full'

# Enable firewall
ufw --force enable

ufw status

log_success "Firewall configured"

# ========================================
# Step 8: Install Fail2ban
# ========================================
log_info "Step 8: Installing Fail2ban..."

apt-get install -y fail2ban

# Create local configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/*error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/*error.log
EOF

systemctl enable fail2ban
systemctl start fail2ban

log_success "Fail2ban installed"

# ========================================
# Step 9: Create Application Directory
# ========================================
log_info "Step 9: Creating application directory..."

mkdir -p "${DEPLOY_PATH}"
mkdir -p "${DEPLOY_PATH}/releases"
mkdir -p "${DEPLOY_PATH}/shared"
mkdir -p "${DEPLOY_PATH}/shared/logs"
mkdir -p "${DEPLOY_PATH}/shared/uploads"
mkdir -p "${DEPLOY_PATH}/scripts"

# Clone repository (if not exists)
if [ ! -d "${DEPLOY_PATH}/repo" ]; then
  log_info "Cloning repository..."
  read -p "Enter Git repository URL: " REPO_URL
  if [ -n "$REPO_URL" ]; then
    git clone "$REPO_URL" "${DEPLOY_PATH}/repo"
  fi
fi

log_success "Application directory created"

# ========================================
# Step 10: Copy Deployment Scripts
# ========================================
log_info "Step 10: Copying deployment scripts..."

if [ -d "${DEPLOY_PATH}/repo/scripts" ]; then
  cp -r "${DEPLOY_PATH}/repo/scripts/"* "${DEPLOY_PATH}/scripts/"
  chmod +x "${DEPLOY_PATH}/scripts/"*.sh
fi

log_success "Deployment scripts copied"

# ========================================
# Step 11: Create Environment File
# ========================================
log_info "Step 11: Creating environment file..."

if [ ! -f "${DEPLOY_PATH}/shared/.env" ]; then
  if [ -f "${DEPLOY_PATH}/repo/backend/.env.example" ]; then
    cp "${DEPLOY_PATH}/repo/backend/.env.example" "${DEPLOY_PATH}/shared/.env"
    log_info "Environment file created from example. Please edit it with your values."
  else
    log_warning "No .env.example found. Please create ${DEPLOY_PATH}/shared/.env manually."
  fi
fi

# ========================================
# Step 12: Configure Nginx
# ========================================
log_info "Step 12: Configuring Nginx..."

if [ -f "${DEPLOY_PATH}/repo/nginx/dumuwaks.conf" ]; then
  cp "${DEPLOY_PATH}/repo/nginx/dumuwaks.conf" /etc/nginx/sites-available/dumuwaks
  ln -sf /etc/nginx/sites-available/dumuwaks /etc/nginx/sites-enabled/dumuwaks

  # Remove default site
  rm -f /etc/nginx/sites-enabled/default

  # Test configuration
  nginx -t

  log_success "Nginx configured"
else
  log_warning "Nginx configuration not found. Please configure manually."
fi

# ========================================
# Step 13: SSL Certificates
# ========================================
log_info "Step 13: Setting up SSL certificates..."

echo ""
echo "To obtain SSL certificates, run:"
echo ""
echo "  certbot --nginx -d ${DOMAIN_FRONTEND} -d ${DOMAIN_API}"
echo ""
echo "Or for staging (test):"
echo ""
echo "  certbot --nginx --test-cert -d ${DOMAIN_FRONTEND} -d ${DOMAIN_API}"
echo ""

# ========================================
# Step 14: Optimize System
# ========================================
log_info "Step 14: Optimizing system..."

# Increase file descriptor limits
cat > /etc/security/limits.d/dumuwaks.conf << EOF
root soft nofile 65535
root hard nofile 65535
* soft nofile 65535
* hard nofile 65535
EOF

# Optimize kernel for web server
cat > /etc/sysctl.d/99-dumuwaks.conf << 'EOF'
# Increase system file descriptor limits
fs.file-max = 2097152

# Improve TCP handling
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535

# Reduce swap usage
vm.swappiness = 10
EOF

sysctl -p /etc/sysctl.d/99-dumuwaks.conf

log_success "System optimized"

# ========================================
# Step 15: Set up Log Rotation
# ========================================
log_info "Step 15: Setting up log rotation..."

cat > /etc/logrotate.d/dumuwaks << EOF
${DEPLOY_PATH}/shared/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

log_success "Log rotation configured"

# ========================================
# Final Summary
# ========================================
echo ""
echo "=========================================="
log_success "VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit the environment file:"
echo "   nano ${DEPLOY_PATH}/shared/.env"
echo ""
echo "2. Get SSL certificates:"
echo "   certbot --nginx -d ${DOMAIN_FRONTEND} -d ${DOMAIN_API}"
echo ""
echo "3. Run the deployment script:"
echo "   ${DEPLOY_PATH}/scripts/deploy.sh"
echo ""
echo "4. Set up automatic backups (cron):"
echo "   crontab -e"
echo "   0 2 * * * ${DEPLOY_PATH}/scripts/backup.sh -u"
echo ""
echo "5. Set up automatic security updates:"
echo "   dpkg-reconfigure -plow unattended-upgrades"
echo ""
echo "System Information:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  PM2: $(pm2 --version)"
echo "  Nginx: $(nginx -v 2>&1)"
echo ""
echo "Firewall Status:"
ufw status
echo ""

exit 0
