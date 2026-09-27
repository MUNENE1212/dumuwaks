#!/bin/bash

# =============================================================================
# Dumuwaks VPS Deployment Script
# =============================================================================
# This script handles the complete deployment process for Dumuwaks on the VPS.
# It supports zero-downtime deployments with automatic rollback on failure.
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   -b, --branch      Git branch to deploy (default: master)
#   -e, --env         Environment file to use (default: .env)
#   -s, --skip-build  Skip frontend build (use existing dist)
#   -h, --help        Show this help message
#
# Requirements:
#   - Node.js 18+
#   - npm
#   - PM2
#   - Git
#   - Nginx
#
# Exit codes:
#   0 - Success
#   1 - General error
#   2 - Health check failed
#   3 - Rollback triggered
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
APP_NAME="${APP_NAME:-dumuwaks-backend}"
RELEASE_TS=$(date +%Y%m%d_%H%M%S)
BRANCH="master"
ENV_FILE=".env"
SKIP_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -b|--branch)
      BRANCH="$2"
      shift 2
      ;;
    -e|--env)
      ENV_FILE="$2"
      shift 2
      ;;
    -s|--skip-build)
      SKIP_BUILD=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -b, --branch      Git branch to deploy (default: master)"
      echo "  -e, --env         Environment file to use (default: .env)"
      echo "  -s, --skip-build  Skip frontend build (use existing dist)"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

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

health_check() {
  local url=$1
  local max_retries=${2:-12}
  local retry_count=0

  while [ $retry_count -lt $max_retries ]; do
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [ "$status" = "200" ]; then
      return 0
    fi

    retry_count=$((retry_count + 1))
    log_info "Health check attempt $retry_count/$max_retries (HTTP $status)"
    sleep 5
  done

  return 1
}

rollback() {
  log_warning "Initiating rollback..."

  if [ -d "${DEPLOY_PATH}/backup" ]; then
    # Restore frontend
    if [ -d "${DEPLOY_PATH}/backup/frontend/dist" ]; then
      rm -rf "${DEPLOY_PATH}/current-frontend"
      cp -r "${DEPLOY_PATH}/backup/frontend/dist" "${DEPLOY_PATH}/current-frontend"
      log_info "Frontend restored from backup"
    fi

    # Restore backend
    if [ -d "${DEPLOY_PATH}/backup/backend" ]; then
      cd "${DEPLOY_PATH}/backup/backend"
      pm2 restart "$APP_NAME" || pm2 start src/server.js --name "$APP_NAME"
      log_info "Backend restored from backup"
    fi

    # Restore symlink
    ln -sfn "${DEPLOY_PATH}/backup" "${DEPLOY_PATH}/current"
    log_success "Rollback completed"
    exit 3
  else
    log_error "No backup available for rollback"
    exit 1
  fi
}

# Start deployment
echo ""
echo "=========================================="
echo -e "${BLUE}Dumuwaks VPS Deployment${NC}"
echo "=========================================="
echo "Release: $RELEASE_TS"
echo "Branch: $BRANCH"
echo "Deploy Path: $DEPLOY_PATH"
echo "Skip Build: $SKIP_BUILD"
echo "=========================================="
echo ""

# Step 1: Pre-deployment checks
log_info "Step 1: Pre-deployment checks"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  log_error "PM2 is not installed"
  exit 1
fi

# Check if we're in the right directory
if [ ! -d "$DEPLOY_PATH" ]; then
  log_error "Deploy path does not exist: $DEPLOY_PATH"
  exit 1
fi

# Check current health
log_info "Checking current application health..."
CURRENT_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health 2>/dev/null || echo "000")
log_info "Current health status: $CURRENT_HEALTH"

# Step 2: Pull latest code
log_info "Step 2: Pulling latest code"

cd "${DEPLOY_PATH}/repo"

if [ ! -d ".git" ]; then
  log_error "Not a git repository: ${DEPLOY_PATH}/repo"
  exit 1
fi

git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

COMMIT_SHA=$(git rev-parse HEAD)
log_info "Deploying commit: $COMMIT_SHA"

# Step 3: Create release directory
log_info "Step 3: Creating release directory"

RELEASE_DIR="${DEPLOY_PATH}/releases/${RELEASE_TS}"
mkdir -p "$RELEASE_DIR"
mkdir -p "${DEPLOY_PATH}/shared/logs"
mkdir -p "${DEPLOY_PATH}/shared/uploads"

# Copy files to release directory
cp -r "${DEPLOY_PATH}/repo"/* "$RELEASE_DIR/"
cp -r "${DEPLOY_PATH}/repo"/.* "$RELEASE_DIR/" 2>/dev/null || true

cd "$RELEASE_DIR"

# Step 4: Backup current version
log_info "Step 4: Backing up current version"

if [ -L "${DEPLOY_PATH}/current" ]; then
  CURRENT_RELEASE=$(readlink "${DEPLOY_PATH}/current")
  log_info "Current release: $CURRENT_RELEASE"

  rm -rf "${DEPLOY_PATH}/backup"
  cp -r "$CURRENT_RELEASE" "${DEPLOY_PATH}/backup"
  log_success "Backup created"
else
  log_warning "No current release to backup"
fi

# Step 5: Build backend
log_info "Step 5: Building backend"

cd "${RELEASE_DIR}/backend"

# Copy environment file
if [ -f "${DEPLOY_PATH}/shared/${ENV_FILE}" ]; then
  cp "${DEPLOY_PATH}/shared/${ENV_FILE}" .env
  log_info "Environment file copied"
else
  log_warning "Environment file not found: ${DEPLOY_PATH}/shared/${ENV_FILE}"
fi

npm ci --production
log_success "Backend dependencies installed"

# Step 6: Build frontend
if [ "$SKIP_BUILD" = false ]; then
  log_info "Step 6: Building frontend"

  cd "${RELEASE_DIR}/frontend"

  # Create production env if not exists
  if [ ! -f "${DEPLOY_PATH}/shared/.env.frontend" ]; then
    echo "VITE_API_URL=https://dumuwaks.co.ke/api/v1" > "${DEPLOY_PATH}/shared/.env.frontend"
  fi

  cp "${DEPLOY_PATH}/shared/.env.frontend" .env.production

  npm ci
  npm run build
  log_success "Frontend built successfully"
else
  log_info "Step 6: Skipping frontend build"
fi

# Step 7: Deploy frontend (atomic symlink swap)
log_info "Step 7: Deploying frontend"

ln -sfn "${RELEASE_DIR}/frontend/dist" "${DEPLOY_PATH}/current-frontend-staging"
mv -Tf "${DEPLOY_PATH}/current-frontend-staging" "${DEPLOY_PATH}/current-frontend"

log_success "Frontend deployed (symlink updated)"

# Step 8: Deploy backend (PM2 graceful reload)
log_info "Step 8: Deploying backend"

cd "${RELEASE_DIR}/backend"

# Check if ecosystem config exists
if [ -f "${RELEASE_DIR}/ecosystem.config.js" ]; then
  cp "${RELEASE_DIR}/ecosystem.config.js" "${RELEASE_DIR}/backend/"

  if pm2 list | grep -q "$APP_NAME"; then
    pm2 reload "$APP_NAME" --update-env
    log_info "Backend reloaded with PM2"
  else
    pm2 start ecosystem.config.js --only "$APP_NAME" --env production
    log_info "Backend started with PM2"
  fi
else
  if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart "$APP_NAME" --update-env
    log_info "Backend restarted with PM2"
  else
    pm2 start src/server.js --name "$APP_NAME"
    log_info "Backend started with PM2"
  fi
fi

pm2 save
log_success "Backend deployed"

# Step 9: Update current symlink
log_info "Step 9: Updating current symlink"

ln -sfn "$RELEASE_DIR" "${DEPLOY_PATH}/current-staging"
mv -Tf "${DEPLOY_PATH}/current-staging" "${DEPLOY_PATH}/current"

log_success "Current symlink updated"

# Step 10: Post-deployment health check
log_info "Step 10: Post-deployment health check"

sleep 5

if health_check "http://localhost:5000/api/v1/health" 12; then
  log_success "Health check passed!"
else
  log_error "Health check failed!"
  rollback
fi

# Step 11: Cleanup old releases
log_info "Step 11: Cleaning up old releases"

cd "${DEPLOY_PATH}/releases"
RELEASE_COUNT=$(ls -1t | wc -l)

if [ "$RELEASE_COUNT" -gt 5 ]; then
  ls -1t | tail -n +6 | xargs -r rm -rf
  log_info "Removed $((RELEASE_COUNT - 5)) old release(s)"
else
  log_info "No old releases to remove (current: $RELEASE_COUNT)"
fi

# Step 12: Reload Nginx
log_info "Step 12: Reloading Nginx"

if command -v nginx &> /dev/null; then
  nginx -t && systemctl reload nginx
  log_success "Nginx reloaded"
else
  log_warning "Nginx not found, skipping"
fi

# Deployment complete
echo ""
echo "=========================================="
log_success "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Release: $RELEASE_TS"
echo "Commit: $COMMIT_SHA"
echo "Frontend: ${DEPLOY_PATH}/current-frontend"
echo "Backend: ${DEPLOY_PATH}/current/backend"
echo ""
echo "Health Check: http://localhost:5000/api/v1/health"
echo "External: https://dumuwaks.co.ke/api/v1/health"
echo ""

# Show PM2 status
pm2 status

exit 0
