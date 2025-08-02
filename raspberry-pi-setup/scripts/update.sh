#!/bin/bash

# Update script for Actual Budget Raspberry Pi setup
# This script handles system updates and Docker image updates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SETUP_DIR/.env"

# Load environment variables
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
fi

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create backup before update
create_backup() {
    log "Creating backup before update..."
    
    if [[ -f "$SETUP_DIR/scripts/backup.sh" ]]; then
        cd "$SETUP_DIR"
        ./scripts/backup.sh create
    else
        warn "Backup script not found, skipping backup"
    fi
}

# Function to update system packages
update_system() {
    log "Updating system packages..."
    
    # Update package lists
    sudo apt update
    
    # Upgrade packages
    sudo apt upgrade -y
    
    # Remove unnecessary packages
    sudo apt autoremove -y
    
    # Clean package cache
    sudo apt autoclean
    
    log "System packages updated successfully"
}

# Function to update Docker images
update_docker_images() {
    log "Updating Docker images..."
    
    if ! command_exists docker; then
        error "Docker is not installed"
    fi
    
    cd "$SETUP_DIR"
    
    if [[ ! -f docker-compose.yml ]]; then
        error "docker-compose.yml not found in $SETUP_DIR"
    fi
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose pull
    
    # Restart services with new images
    log "Restarting services with updated images..."
    docker-compose up -d
    
    # Clean up old images
    log "Cleaning up old Docker images..."
    docker image prune -f
    
    log "Docker images updated successfully"
}

# Function to update Tailscale
update_tailscale() {
    log "Updating Tailscale..."
    
    if command_exists tailscale; then
        sudo tailscale update
        log "Tailscale updated successfully"
    else
        info "Tailscale is not installed"
    fi
}

# Function to update configuration files
update_config() {
    log "Checking for configuration updates..."
    
    # Check if there are new configuration files
    if [[ -f "$SCRIPT_DIR/docker-compose.yml" ]]; then
        local current_hash=$(md5sum "$SETUP_DIR/docker-compose.yml" 2>/dev/null | awk '{print $1}' || echo "")
        local new_hash=$(md5sum "$SCRIPT_DIR/docker-compose.yml" | awk '{print $1}')
        
        if [[ "$current_hash" != "$new_hash" ]]; then
            log "Updating docker-compose.yml..."
            cp "$SCRIPT_DIR/docker-compose.yml" "$SETUP_DIR/"
        fi
    fi
    
    # Check for new scripts
    if [[ -d "$SCRIPT_DIR/scripts" ]]; then
        log "Updating scripts..."
        cp -r "$SCRIPT_DIR/scripts/"* "$SETUP_DIR/scripts/" 2>/dev/null || true
        chmod +x "$SETUP_DIR/scripts/"*.sh 2>/dev/null || true
    fi
    
    log "Configuration files updated"
}

# Function to check for updates
check_updates() {
    log "Checking for available updates..."
    
    # Check system updates
    sudo apt update >/dev/null 2>&1
    local system_updates=$(apt list --upgradable 2>/dev/null | grep -v "WARNING" | wc -l)
    
    if [[ $system_updates -gt 0 ]]; then
        info "System updates available: $system_updates packages"
    else
        log "System is up to date"
    fi
    
    # Check Docker image updates
    cd "$SETUP_DIR"
    if [[ -f docker-compose.yml ]]; then
        local outdated_images=$(docker-compose pull --dry-run 2>&1 | grep -c "Image is up to date" || echo "0")
        local total_images=$(docker-compose images | grep -c "actual\|traefik\|watchtower\|portainer" || echo "0")
        
        if [[ $outdated_images -lt $total_images ]]; then
            info "Docker image updates available"
        else
            log "Docker images are up to date"
        fi
    fi
    
    # Check Tailscale updates
    if command_exists tailscale; then
        local tailscale_update=$(sudo tailscale update --check 2>&1 | grep -c "update available" || echo "0")
        
        if [[ $tailscale_update -gt 0 ]]; then
            info "Tailscale update available"
        else
            log "Tailscale is up to date"
        fi
    fi
}

# Function to restart services
restart_services() {
    log "Restarting services..."
    
    cd "$SETUP_DIR"
    
    if [[ -f docker-compose.yml ]]; then
        docker-compose restart
        log "Services restarted successfully"
    else
        warn "docker-compose.yml not found"
    fi
}

# Function to show service status
show_status() {
    log "Service status after update:"
    
    cd "$SETUP_DIR"
    
    if [[ -f docker-compose.yml ]]; then
        docker-compose ps
    fi
    
    echo
    log "System information:"
    echo "Uptime: $(uptime -p)"
    echo "Load: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
    echo "Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $3"/"$2}')"
}

# Function to rollback update
rollback_update() {
    warn "Rolling back update..."
    
    cd "$SETUP_DIR"
    
    if [[ -f docker-compose.yml ]]; then
        # Stop services
        docker-compose down
        
        # Restore from backup if available
        local latest_backup=$(find "$SETUP_DIR/backups" -name "*.tar.gz" -o -name "*.gpg" 2>/dev/null | sort | tail -1)
        
        if [[ -n "$latest_backup" ]]; then
            log "Restoring from backup: $latest_backup"
            ./scripts/backup.sh restore "$latest_backup"
        else
            warn "No backup found for rollback"
            # Just restart services
            docker-compose up -d
        fi
    fi
    
    log "Rollback completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  all       Update everything (default)"
    echo "  system    Update system packages only"
    echo "  docker    Update Docker images only"
    echo "  tailscale Update Tailscale only"
    echo "  config    Update configuration files only"
    echo "  check     Check for available updates"
    echo "  restart   Restart services"
    echo "  rollback  Rollback to previous state"
    echo "  status    Show service status"
    echo "  help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0              # Update everything"
    echo "  $0 system       # Update system packages"
    echo "  $0 docker       # Update Docker images"
    echo "  $0 check        # Check for updates"
}

# Main execution
main() {
    case "${1:-all}" in
        all)
            create_backup
            update_system
            update_docker_images
            update_tailscale
            update_config
            restart_services
            show_status
            ;;
        system)
            create_backup
            update_system
            ;;
        docker)
            create_backup
            update_docker_images
            restart_services
            ;;
        tailscale)
            update_tailscale
            ;;
        config)
            update_config
            restart_services
            ;;
        check)
            check_updates
            ;;
        restart)
            restart_services
            show_status
            ;;
        rollback)
            rollback_update
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            ;;
    esac
    
    log "Update process completed"
}

# Run main function
main "$@" 