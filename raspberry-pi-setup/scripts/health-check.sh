#!/bin/bash

# Health check script for Actual Budget Raspberry Pi setup
# This script monitors system resources and service health

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

# Thresholds
MEMORY_WARNING_THRESHOLD=80
DISK_WARNING_THRESHOLD=85
CPU_WARNING_THRESHOLD=80
TEMPERATURE_WARNING_THRESHOLD=70

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get system information
get_system_info() {
    echo "=== System Information ==="
    echo "Hostname: $(hostname)"
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "Kernel: $(uname -r)"
    echo "Architecture: $(uname -m)"
    echo "Uptime: $(uptime -p)"
    echo "Load Average: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
    echo
}

# Function to check memory usage
check_memory() {
    echo "=== Memory Usage ==="
    local mem_info=$(free -h)
    echo "$mem_info"
    echo
    
    # Get memory usage percentage
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [[ $mem_usage -gt $MEMORY_WARNING_THRESHOLD ]]; then
        warn "Memory usage is high: ${mem_usage}%"
    else
        log "Memory usage is normal: ${mem_usage}%"
    fi
    echo
}

# Function to check disk usage
check_disk() {
    echo "=== Disk Usage ==="
    df -h
    echo
    
    # Check root filesystem usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt $DISK_WARNING_THRESHOLD ]]; then
        warn "Disk usage is high: ${disk_usage}%"
    else
        log "Disk usage is normal: ${disk_usage}%"
    fi
    echo
}

# Function to check CPU temperature
check_temperature() {
    echo "=== CPU Temperature ==="
    
    if [[ -f /sys/class/thermal/thermal_zone0/temp ]]; then
        local temp=$(cat /sys/class/thermal/thermal_zone0/temp)
        local temp_c=$((temp / 1000))
        echo "CPU Temperature: ${temp_c}°C"
        
        if [[ $temp_c -gt $TEMPERATURE_WARNING_THRESHOLD ]]; then
            warn "CPU temperature is high: ${temp_c}°C"
        else
            log "CPU temperature is normal: ${temp_c}°C"
        fi
    else
        info "Temperature sensor not available"
    fi
    echo
}

# Function to check Docker services
check_docker_services() {
    echo "=== Docker Services Status ==="
    
    if ! command_exists docker; then
        error "Docker is not installed"
        return
    fi
    
    cd "$SETUP_DIR"
    
    # Check if docker-compose is running
    if [[ -f docker-compose.yml ]]; then
        echo "Docker Compose Services:"
        docker-compose ps
        echo
        
        # Check service health
        local unhealthy_services=$(docker-compose ps --format "table {{.Name}}\t{{.Status}}" | grep -v "Up" | grep -v "NAME" | wc -l)
        
        if [[ $unhealthy_services -gt 0 ]]; then
            warn "Found $unhealthy_services unhealthy services"
        else
            log "All Docker services are running"
        fi
    else
        warn "docker-compose.yml not found in $SETUP_DIR"
    fi
    echo
}

# Function to check Tailscale status
check_tailscale() {
    echo "=== Tailscale Status ==="
    
    if command_exists tailscale; then
        local status=$(tailscale status 2>/dev/null)
        
        if [[ $? -eq 0 ]]; then
            echo "$status"
            
            # Check if connected
            if echo "$status" | grep -q "Connected"; then
                log "Tailscale is connected"
            else
                warn "Tailscale is not connected"
            fi
        else
            warn "Tailscale is not running"
        fi
    else
        info "Tailscale is not installed"
    fi
    echo
}

# Function to check network connectivity
check_network() {
    echo "=== Network Connectivity ==="
    
    # Check internet connectivity
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log "Internet connectivity: OK"
    else
        error "Internet connectivity: FAILED"
    fi
    
    # Check DNS resolution
    if nslookup google.com >/dev/null 2>&1; then
        log "DNS resolution: OK"
    else
        error "DNS resolution: FAILED"
    fi
    
    # Show network interfaces
    echo "Network Interfaces:"
    ip addr show | grep -E "inet.*scope global" | awk '{print $2, $7}'
    echo
}

# Function to check service logs
check_service_logs() {
    echo "=== Recent Service Logs ==="
    
    cd "$SETUP_DIR"
    
    if [[ -f docker-compose.yml ]]; then
        # Show recent logs for actual-server
        echo "Actual Server logs (last 10 lines):"
        docker-compose logs --tail=10 actual-server 2>/dev/null || echo "No logs available"
        echo
        
        # Show recent logs for traefik
        echo "Traefik logs (last 10 lines):"
        docker-compose logs --tail=10 traefik 2>/dev/null || echo "No logs available"
        echo
    fi
}

# Function to check backup status
check_backup_status() {
    echo "=== Backup Status ==="
    
    local backup_dir="$SETUP_DIR/backups"
    
    if [[ -d "$backup_dir" ]]; then
        local backup_count=$(find "$backup_dir" -name "*.tar.gz" -o -name "*.gpg" | wc -l)
        echo "Total backups: $backup_count"
        
        if [[ $backup_count -gt 0 ]]; then
            echo "Latest backup: $(find "$backup_dir" -name "*.tar.gz" -o -name "*.gpg" -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)"
            
            # Check if backup is recent (within 24 hours)
            local latest_backup_time=$(find "$backup_dir" -name "*.tar.gz" -o -name "*.gpg" -printf '%T@\n' | sort -n | tail -1)
            local current_time=$(date +%s)
            local time_diff=$((current_time - latest_backup_time))
            local hours_diff=$((time_diff / 3600))
            
            if [[ $hours_diff -lt 24 ]]; then
                log "Backup is recent (${hours_diff} hours ago)"
            else
                warn "Backup is old (${hours_diff} hours ago)"
            fi
        else
            warn "No backups found"
        fi
    else
        warn "Backup directory not found"
    fi
    echo
}

# Function to check systemd services
check_systemd_services() {
    echo "=== Systemd Services ==="
    
    # Check actual-budget service
    if systemctl is-active --quiet actual-budget.service; then
        log "actual-budget.service: Active"
    else
        warn "actual-budget.service: Inactive"
    fi
    
    # Check Docker service
    if systemctl is-active --quiet docker.service; then
        log "docker.service: Active"
    else
        error "docker.service: Inactive"
    fi
    
    # Check Tailscale service
    if systemctl is-active --quiet tailscaled.service; then
        log "tailscaled.service: Active"
    else
        warn "tailscaled.service: Inactive"
    fi
    
    echo
}

# Function to check port availability
check_ports() {
    echo "=== Port Availability ==="
    
    local ports=("80" "443" "5006" "8080" "9000")
    
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            log "Port $port: LISTENING"
        else
            warn "Port $port: NOT LISTENING"
        fi
    done
    echo
}

# Function to generate health report
generate_health_report() {
    local report_file="$SETUP_DIR/health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Health Check Report - $(date)"
        echo "=================================="
        echo
        
        get_system_info
        check_memory
        check_disk
        check_temperature
        check_docker_services
        check_tailscale
        check_network
        check_systemd_services
        check_ports
        check_backup_status
        check_service_logs
        
    } > "$report_file"
    
    echo "Health report saved to: $report_file"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  all       Run all health checks (default)"
    echo "  system    Check system resources only"
    echo "  services  Check Docker services only"
    echo "  network   Check network connectivity only"
    echo "  report    Generate detailed health report"
    echo "  help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0              # Run all checks"
    echo "  $0 system       # Check system resources"
    echo "  $0 report       # Generate health report"
}

# Main execution
main() {
    case "${1:-all}" in
        all)
            get_system_info
            check_memory
            check_disk
            check_temperature
            check_docker_services
            check_tailscale
            check_network
            check_systemd_services
            check_ports
            check_backup_status
            check_service_logs
            ;;
        system)
            get_system_info
            check_memory
            check_disk
            check_temperature
            ;;
        services)
            check_docker_services
            check_systemd_services
            check_service_logs
            ;;
        network)
            check_network
            check_tailscale
            check_ports
            ;;
        report)
            generate_health_report
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            ;;
    esac
}

# Run main function
main "$@" 