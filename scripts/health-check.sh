#!/bin/bash

# =============================================================================
# Dumuwaks Health Check Script
# =============================================================================
# This script performs comprehensive health checks on the Dumuwaks application.
# It can be used for monitoring, alerting, or as part of deployment verification.
#
# Usage:
#   ./scripts/health-check.sh [options]
#
# Options:
#   -e, --external    Check external URLs (via domain)
#   -v, --verbose     Show detailed output
#   -j, --json        Output in JSON format
#   -q, --quiet       Only output errors
#   -h, --help        Show this help message
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_PORT="${API_PORT:-5000}"
API_HOST="${API_HOST:-localhost}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"
EXTERNAL_API="${EXTERNAL_API:-https://dumuwaks.co.ke}"
EXTERNAL_FRONTEND="${EXTERNAL_FRONTEND:-https://dumuwaks.co.ke}"

# Options
CHECK_EXTERNAL=false
VERBOSE=false
JSON_OUTPUT=false
QUIET=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--external)
      CHECK_EXTERNAL=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -j|--json)
      JSON_OUTPUT=true
      shift
      ;;
    -q|--quiet)
      QUIET=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -e, --external    Check external URLs"
      echo "  -v, --verbose     Show detailed output"
      echo "  -j, --json        Output in JSON format"
      echo "  -q, --quiet       Only output errors"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Results storage
declare -A RESULTS
OVERALL_STATUS="healthy"

# Helper functions
check_http() {
  local name=$1
  local url=$2
  local expected_status=${3:-200}
  local timeout=${4:-10}

  local start_time=$(date +%s%3N)
  local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
  local end_time=$(date +%s%3N)
  local response_time=$((end_time - start_time))

  if [ "$status" = "$expected_status" ]; then
    RESULTS["$name"]="pass:$status:${response_time}ms"
    if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
      echo -e "${GREEN}[PASS]${NC} $name - HTTP $status (${response_time}ms)"
    fi
    return 0
  else
    RESULTS["$name"]="fail:$status:${response_time}ms"
    OVERALL_STATUS="unhealthy"
    if [ "$JSON_OUTPUT" = false ]; then
      echo -e "${RED}[FAIL]${NC} $name - HTTP $status (expected $expected_status) (${response_time}ms)"
    fi
    return 1
  fi
}

check_port() {
  local name=$1
  local host=$2
  local port=$3

  if timeout 5 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
    RESULTS["$name"]="pass:open"
    if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
      echo -e "${GREEN}[PASS]${NC} $name - Port $port is open"
    fi
    return 0
  else
    RESULTS["$name"]="fail:closed"
    OVERALL_STATUS="unhealthy"
    if [ "$JSON_OUTPUT" = false ]; then
      echo -e "${RED}[FAIL]${NC} $name - Port $port is closed"
    fi
    return 1
  fi
}

check_process() {
  local name=$1
  local process_name=$2

  if pgrep -f "$process_name" > /dev/null 2>&1; then
    RESULTS["$name"]="pass:running"
    if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
      echo -e "${GREEN}[PASS]${NC} $name - Process is running"
    fi
    return 0
  else
    RESULTS["$name"]="fail:not_running"
    OVERALL_STATUS="unhealthy"
    if [ "$JSON_OUTPUT" = false ]; then
      echo -e "${RED}[FAIL]${NC} $name - Process is not running"
    fi
    return 1
  fi
}

check_disk_space() {
  local name=$1
  local path=$2
  local threshold=${3:-90}

  local usage=$(df "$path" 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')

  if [ -n "$usage" ] && [ "$usage" -lt "$threshold" ]; then
    RESULTS["$name"]="pass:${usage}%"
    if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
      echo -e "${GREEN}[PASS]${NC} $name - Disk usage at ${usage}%"
    fi
    return 0
  else
    RESULTS["$name"]="fail:${usage}%"
    OVERALL_STATUS="unhealthy"
    if [ "$JSON_OUTPUT" = false ]; then
      echo -e "${RED}[FAIL]${NC} $name - Disk usage at ${usage}% (threshold: ${threshold}%)"
    fi
    return 1
  fi
}

check_memory() {
  local name=$1
  local threshold=${2:-90}

  local usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

  if [ "$usage" -lt "$threshold" ]; then
    RESULTS["$name"]="pass:${usage}%"
    if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
      echo -e "${GREEN}[PASS]${NC} $name - Memory usage at ${usage}%"
    fi
    return 0
  else
    RESULTS["$name"]="fail:${usage}%"
    OVERALL_STATUS="warning"
    if [ "$JSON_OUTPUT" = false ]; then
      echo -e "${YELLOW}[WARN]${NC} $name - Memory usage at ${usage}% (threshold: ${threshold}%)"
    fi
    return 1
  fi
}

# Start health check
if [ "$JSON_OUTPUT" = false ]; then
  echo ""
  echo "=========================================="
  echo "Dumuwaks Health Check"
  echo "Time: $(date -Iseconds)"
  echo "=========================================="
  echo ""
fi

# ========================================
# Local Service Checks
# ========================================
if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
  echo "--- Local Service Checks ---"
fi

# Check API health endpoint
check_http "api_health_local" "http://${API_HOST}:${API_PORT}/api/v1/health" 200 10

# Check API root endpoint
check_http "api_root_local" "http://${API_HOST}:${API_PORT}/" 200 10

# Check port
check_port "api_port" "$API_HOST" "$API_PORT"

# Check Node.js process
check_process "node_process" "node.*server.js"

# ========================================
# System Resource Checks
# ========================================
if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
  echo ""
  echo "--- System Resource Checks ---"
fi

check_disk_space "disk_root" "/" 90
check_disk_space "disk_deploy" "/var/www/dumuwaks" 85
check_memory "memory" 90

# ========================================
# PM2 Checks
# ========================================
if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
  echo ""
  echo "--- PM2 Checks ---"
fi

if command -v pm2 &> /dev/null; then
  # Check if PM2 is running
  if pm2 ping &> /dev/null; then
    RESULTS["pm2_daemon"]="pass:running"
    if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
      echo -e "${GREEN}[PASS]${NC} pm2_daemon - PM2 daemon is running"
    fi

    # Check dumuwaks-backend process
    if pm2 list 2>/dev/null | grep -q "dumuwaks-backend.*online"; then
      RESULTS["pm2_app"]="pass:online"
      if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
        echo -e "${GREEN}[PASS]${NC} pm2_app - dumuwaks-backend is online"
      fi
    else
      RESULTS["pm2_app"]="fail:offline"
      OVERALL_STATUS="unhealthy"
      if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[FAIL]${NC} pm2_app - dumuwaks-backend is not online"
      fi
    fi
  else
    RESULTS["pm2_daemon"]="fail:not_running"
    OVERALL_STATUS="unhealthy"
    if [ "$JSON_OUTPUT" = false ]; then
      echo -e "${RED}[FAIL]${NC} pm2_daemon - PM2 daemon is not running"
    fi
  fi
fi

# ========================================
# Nginx Checks
# ========================================
if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
  echo ""
  echo "--- Nginx Checks ---"
fi

if command -v nginx &> /dev/null; then
  if systemctl is-active --quiet nginx; then
    RESULTS["nginx"]="pass:active"
    if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
      echo -e "${GREEN}[PASS]${NC} nginx - Nginx is active"
    fi
  else
    RESULTS["nginx"]="fail:inactive"
    OVERALL_STATUS="unhealthy"
    if [ "$JSON_OUTPUT" = false ]; then
      echo -e "${RED}[FAIL]${NC} nginx - Nginx is not active"
    fi
  fi
fi

# ========================================
# External Checks (optional)
# ========================================
if [ "$CHECK_EXTERNAL" = true ]; then
  if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
    echo ""
    echo "--- External Checks ---"
  fi

  check_http "api_health_external" "${EXTERNAL_API}/api/v1/health" 200 30
  check_http "frontend_external" "${EXTERNAL_FRONTEND}" 200 30
fi

# ========================================
# Database Connectivity Check (via API)
# ========================================
if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
  echo ""
  echo "--- Database Connectivity (via API) ---"
fi

DB_HEALTH=$(curl -s "http://${API_HOST}:${API_PORT}/api/v1/health" 2>/dev/null || echo "{}")

if echo "$DB_HEALTH" | grep -q '"isHealthy":true'; then
  RESULTS["database"]="pass:connected"
  if [ "$JSON_OUTPUT" = false ] && [ "$QUIET" = false ]; then
    echo -e "${GREEN}[PASS]${NC} database - Database is connected"
  fi
else
  RESULTS["database"]="fail:disconnected"
  OVERALL_STATUS="unhealthy"
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${RED}[FAIL]${NC} database - Database connection issue"
  fi
fi

# ========================================
# Output Results
# ========================================
if [ "$JSON_OUTPUT" = true ]; then
  echo "{"
  echo "  \"status\": \"$OVERALL_STATUS\","
  echo "  \"timestamp\": \"$(date -Iseconds)\","
  echo "  \"checks\": {"
  first=true
  for key in "${!RESULTS[@]}"; do
    if [ "$first" = true ]; then
      first=false
    else
      echo ","
    fi
    echo -n "    \"$key\": \"${RESULTS[$key]}\""
  done
  echo ""
  echo "  }"
  echo "}"
else
  echo ""
  echo "=========================================="
  if [ "$OVERALL_STATUS" = "healthy" ]; then
    echo -e "Overall Status: ${GREEN}HEALTHY${NC}"
  elif [ "$OVERALL_STATUS" = "warning" ]; then
    echo -e "Overall Status: ${YELLOW}WARNING${NC}"
  else
    echo -e "Overall Status: ${RED}UNHEALTHY${NC}"
  fi
  echo "=========================================="
  echo ""
fi

# Exit with appropriate code
if [ "$OVERALL_STATUS" = "healthy" ]; then
  exit 0
else
  exit 1
fi
