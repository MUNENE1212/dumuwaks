#!/bin/bash

# =============================================================================
# Dumuwaks VPS Rollback Script
# =============================================================================
# This script handles rollback to a previous deployment or backup version.
#
# Usage:
#   ./scripts/rollback.sh [options]
#
# Options:
#   -v, --version     Release version to rollback to (e.g., 20240115_120000)
#   -l, --list        List available releases for rollback
#   -f, --force       Force rollback without confirmation
#   -h, --help        Show this help message
#
# Examples:
#   ./scripts/rollback.sh                  # Rollback to backup
#   ./scripts/rollback.sh -v 20240115      # Rollback to specific release
#   ./scripts/rollback.sh -l               # List available releases
#
# Exit codes:
#   0 - Success
#   1 - General error
#   2 - Health check failed
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
TARGET_VERSION=""
FORCE=false
LIST_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--version)
      TARGET_VERSION="$2"
      shift 2
      ;;
    -l|--list)
      LIST_ONLY=true
      shift
      ;;
    -f|--force)
      FORCE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -v, --version     Release version to rollback to"
      echo "  -l, --list        List available releases"
      echo "  -f, --force       Force rollback without confirmation"
      echo "  -h, --help        Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                    # Rollback to backup"
      echo "  $0 -v 20240115_120000 # Rollback to specific release"
      echo "  $0 -l                 # List available releases"
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

# List available releases
list_releases() {
  echo ""
  echo "=========================================="
  echo "Available Releases"
  echo "=========================================="
  echo ""

  if [ -d "${DEPLOY_PATH}/releases" ]; then
    echo "Releases in ${DEPLOY_PATH}/releases:"
    echo ""
    printf "%-20s %-25s %s\n" "VERSION" "DATE" "SIZE"
    echo "------------------------------------------------------------"

    for release in $(ls -1t "${DEPLOY_PATH}/releases"); do
      if [ -d "${DEPLOY_PATH}/releases/${release}" ]; then
        local size=$(du -sh "${DEPLOY_PATH}/releases/${release}" 2>/dev/null | cut -f1)
        local date=$(stat -c %y "${DEPLOY_PATH}/releases/${release}" 2>/dev/null | cut -d. -f1)
        printf "%-20s %-25s %s\n" "$release" "$date" "$size"
      fi
    done
  else
    log_warning "No releases directory found"
  fi

  echo ""

  if [ -d "${DEPLOY_PATH}/backup" ]; then
    echo "Backup: ${DEPLOY_PATH}/backup"
    local backup_size=$(du -sh "${DEPLOY_PATH}/backup" 2>/dev/null | cut -f1)
    local backup_date=$(stat -c %y "${DEPLOY_PATH}/backup" 2>/dev/null | cut -d. -f1)
    echo "  Date: $backup_date"
    echo "  Size: $backup_size"
  else
    echo "Backup: Not available"
  fi

  echo ""

  if [ -L "${DEPLOY_PATH}/current" ]; then
    local current=$(readlink "${DEPLOY_PATH}/current")
    echo "Current: $current"
  fi

  echo ""
}

# List only mode
if [ "$LIST_ONLY" = true ]; then
  list_releases
  exit 0
fi

# Start rollback
echo ""
echo "=========================================="
echo -e "${YELLOW}Dumuwaks VPS Rollback${NC}"
echo "=========================================="
echo ""

# Determine target release
if [ -n "$TARGET_VERSION" ]; then
  TARGET_RELEASE="${DEPLOY_PATH}/releases/${TARGET_VERSION}"

  if [ ! -d "$TARGET_RELEASE" ]; then
    log_error "Target release not found: $TARGET_RELEASE"
    echo ""
    list_releases
    exit 1
  fi
else
  TARGET_RELEASE="${DEPLOY_PATH}/backup"

  if [ ! -d "$TARGET_RELEASE" ]; then
    log_error "No backup available for rollback"
    exit 1
  fi
fi

echo "Target: $TARGET_RELEASE"
echo ""

# Confirmation
if [ "$FORCE" = false ]; then
  read -p "Are you sure you want to rollback? [y/N] " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Rollback cancelled"
    exit 0
  fi
fi

# Step 1: Pre-rollback health check
log_info "Step 1: Pre-rollback health check"

CURRENT_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health 2>/dev/null || echo "000")
log_info "Current health status: $CURRENT_HEALTH"

# Step 2: Stop accepting new connections (optional - uncomment if needed)
# log_info "Step 2: Putting application in maintenance mode"
# echo "Maintenance mode enabled" > "${DEPLOY_PATH}/maintenance.enabled"

# Step 3: Rollback frontend
log_info "Step 2: Rolling back frontend"

if [ -d "${TARGET_RELEASE}/frontend/dist" ]; then
  rm -rf "${DEPLOY_PATH}/current-frontend"
  cp -r "${TARGET_RELEASE}/frontend/dist" "${DEPLOY_PATH}/current-frontend"
  log_success "Frontend rolled back"
else
  log_warning "Frontend not found in target release"
fi

# Step 4: Rollback backend
log_info "Step 3: Rolling back backend"

cd "${TARGET_RELEASE}/backend"

# Copy environment file
if [ -f "${DEPLOY_PATH}/shared/.env" ]; then
  cp "${DEPLOY_PATH}/shared/.env" .env
fi

# Restart PM2
if pm2 list | grep -q "$APP_NAME"; then
  pm2 restart "$APP_NAME" --update-env
  log_info "Backend restarted with PM2"
else
  pm2 start src/server.js --name "$APP_NAME"
  log_info "Backend started with PM2"
fi

pm2 save
log_success "Backend rolled back"

# Step 5: Update current symlink
log_info "Step 4: Updating current symlink"

ln -sfn "$TARGET_RELEASE" "${DEPLOY_PATH}/current-staging"
mv -Tf "${DEPLOY_PATH}/current-staging" "${DEPLOY_PATH}/current"

log_success "Current symlink updated"

# Step 6: Post-rollback health check
log_info "Step 5: Post-rollback health check"

sleep 5

if health_check "http://localhost:5000/api/v1/health" 12; then
  log_success "Health check passed!"
else
  log_error "Health check failed after rollback!"
  exit 2
fi

# Step 7: Reload Nginx
log_info "Step 6: Reloading Nginx"

if command -v nginx &> /dev/null; then
  nginx -t && systemctl reload nginx
  log_success "Nginx reloaded"
fi

# Remove maintenance mode if set
# rm -f "${DEPLOY_PATH}/maintenance.enabled"

# Rollback complete
echo ""
echo "=========================================="
log_success "Rollback completed successfully!"
echo "=========================================="
echo ""
echo "Rolled back to: $TARGET_RELEASE"
echo ""
echo "Health Check: http://localhost:5000/api/v1/health"
echo "External: https://dumuwaks.co.ke/api/v1/health"
echo ""

# Show PM2 status
pm2 status

exit 0
