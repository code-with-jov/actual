#!/bin/bash

# Raspberry Pi 3 Setup Script for Actual Budget
# This script automates the complete setup process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Please run as a regular user with sudo privileges."
fi

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    warn "This script is designed for Raspberry Pi. Running on other systems may cause issues."
fi

# Configuration variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_DIR="$HOME/actual-raspberry-pi"
BACKUP_DIR="$SETUP_DIR/backups"
DATA_DIR="$SETUP_DIR/data"

log "Starting Raspberry Pi 3 setup for Actual Budget..."

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [[ -n "$default" ]]; then
        read -p "$prompt [$default]: " input
        eval "$var_name=\${input:-$default}"
    else
        read -p "$prompt: " input
        eval "$var_name=\$input"
    fi
}

# Function to update system
update_system() {
    log "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    sudo apt autoremove -y
    sudo apt autoclean
}

# Function to install Docker
install_docker() {
    log "Installing Docker..."
    
    if command_exists docker; then
        log "Docker is already installed"
        return
    fi
    
    # Install Docker using official script
    curl -fsSL https://get.docker.com | sh
    
    # Add user to docker group
    sudo usermod -aG docker "$USER"
    
    # Install Docker Compose plugin
    sudo apt install -y docker-compose-plugin
    
    log "Docker installed successfully. Please log out and back in for group changes to take effect."
}

# Function to install Tailscale
install_tailscale() {
    log "Installing Tailscale..."
    
    if command_exists tailscale; then
        log "Tailscale is already installed"
        return
    fi
    
    # Install Tailscale
    curl -fsSL https://tailscale.com/install.sh | sh
    
    log "Tailscale installed successfully"
}

# Function to configure Tailscale
configure_tailscale() {
    log "Configuring Tailscale..."
    
    if [[ -z "$TAILSCALE_AUTH_KEY" ]]; then
        echo
        echo "To get your Tailscale auth key:"
        echo "1. Go to https://login.tailscale.com/admin/settings/keys"
        echo "2. Generate a new auth key"
        echo "3. Copy the key and paste it below"
        echo
        prompt_with_default "Enter your Tailscale auth key" "" TAILSCALE_AUTH_KEY
    fi
    
    # Start Tailscale with auth key
    sudo tailscale up --authkey="$TAILSCALE_AUTH_KEY" --hostname="actual-pi-$(hostname)"
    
    log "Tailscale configured successfully"
}

# Function to setup firewall
setup_firewall() {
    log "Setting up firewall..."
    
    # Install UFW if not present
    if ! command_exists ufw; then
        sudo apt install -y ufw
    fi
    
    # Configure UFW
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow Tailscale
    sudo ufw allow in on tailscale0
    sudo ufw allow out on tailscale0
    
    # Allow Docker ports
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 5006/tcp  # Actual Budget
    sudo ufw allow 8080/tcp  # Traefik Dashboard
    sudo ufw allow 9000/tcp  # Portainer
    
    # Enable firewall
    sudo ufw --force enable
    
    log "Firewall configured successfully"
}

# Function to create directories
create_directories() {
    log "Creating directories..."
    
    mkdir -p "$SETUP_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$SETUP_DIR/config"
    mkdir -p "$SETUP_DIR/scripts"
    
    # Create data subdirectories
    mkdir -p "$DATA_DIR/actual"
    mkdir -p "$DATA_DIR/traefik"
    mkdir -p "$DATA_DIR/portainer"
    
    log "Directories created successfully"
}

# Function to copy configuration files
copy_config_files() {
    log "Copying configuration files..."
    
    # Copy Docker Compose file
    cp "$SCRIPT_DIR/docker-compose.yml" "$SETUP_DIR/"
    
    # Copy environment file
    if [[ -f "$SCRIPT_DIR/env.example" ]]; then
        cp "$SCRIPT_DIR/env.example" "$SETUP_DIR/.env"
    fi
    
    # Copy scripts
    cp "$SCRIPT_DIR/scripts/"* "$SETUP_DIR/scripts/" 2>/dev/null || true
    
    # Make scripts executable
    chmod +x "$SETUP_DIR/scripts/"*.sh 2>/dev/null || true
    
    log "Configuration files copied successfully"
}

# Function to configure environment
configure_environment() {
    log "Configuring environment..."
    
    local env_file="$SETUP_DIR/.env"
    
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi
    
    # Prompt for configuration
    echo
    echo "=== Configuration Setup ==="
    
    # Get Tailscale auth key if not already set
    if [[ -z "$TAILSCALE_AUTH_KEY" ]]; then
        prompt_with_default "Enter your Tailscale auth key" "" TAILSCALE_AUTH_KEY
    fi
    
    # Update .env file with Tailscale key
    sed -i "s/TAILSCALE_AUTH_KEY=.*/TAILSCALE_AUTH_KEY=$TAILSCALE_AUTH_KEY/" "$env_file"
    
    # Prompt for other settings
    prompt_with_default "Enter your timezone" "UTC" TIMEZONE
    prompt_with_default "Enter your email for ACME certificates" "admin@example.com" ACME_EMAIL
    
    # Update .env file
    sed -i "s/TIMEZONE=.*/TIMEZONE=$TIMEZONE/" "$env_file"
    sed -i "s/ACME_EMAIL=.*/ACME_EMAIL=$ACME_EMAIL/" "$env_file"
    
    # Set timezone
    sudo timedatectl set-timezone "$TIMEZONE"
    
    log "Environment configured successfully"
}

# Function to setup automatic updates
setup_automatic_updates() {
    log "Setting up automatic updates..."
    
    # Install unattended-upgrades
    sudo apt install -y unattended-upgrades
    
    # Configure unattended-upgrades
    sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
EOF
    
    # Enable automatic updates
    sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF
    
    log "Automatic updates configured successfully"
}

# Function to setup swap file
setup_swap() {
    log "Setting up swap file..."
    
    # Check if swap already exists
    if swapon --show | grep -q "/swapfile"; then
        log "Swap file already exists"
        return
    fi
    
    # Create 1GB swap file
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    
    # Make swap permanent
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    
    log "Swap file created successfully"
}

# Function to start services
start_services() {
    log "Starting services..."
    
    cd "$SETUP_DIR"
    
    # Pull latest images
    docker-compose pull
    
    # Start services
    docker-compose up -d
    
    log "Services started successfully"
}

# Function to setup monitoring
setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Install htop for system monitoring
    sudo apt install -y htop
    
    # Create monitoring script
    cat > "$SETUP_DIR/scripts/monitor.sh" <<'EOF'
#!/bin/bash
echo "=== System Status ==="
echo "Uptime: $(uptime)"
echo "Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3"/"$2}')"
echo "CPU Load: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
echo
echo "=== Docker Services ==="
docker-compose ps
echo
echo "=== Tailscale Status ==="
tailscale status
EOF
    
    chmod +x "$SETUP_DIR/scripts/monitor.sh"
    
    log "Monitoring setup completed"
}

# Function to create systemd service
create_systemd_service() {
    log "Creating systemd service for automatic startup..."
    
    sudo tee /etc/systemd/system/actual-budget.service > /dev/null <<EOF
[Unit]
Description=Actual Budget Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$SETUP_DIR
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    sudo systemctl enable actual-budget.service
    sudo systemctl start actual-budget.service
    
    log "Systemd service created and enabled"
}

# Function to display final information
display_final_info() {
    log "Setup completed successfully!"
    
    echo
    echo "=== Setup Summary ==="
    echo "Installation directory: $SETUP_DIR"
    echo "Data directory: $DATA_DIR"
    echo "Backup directory: $BACKUP_DIR"
    echo
    
    echo "=== Access Information ==="
    echo "Actual Budget: http://$(hostname -I | awk '{print $1}'):5006"
    echo "Traefik Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
    echo "Portainer: http://$(hostname -I | awk '{print $1}'):9000"
    echo
    
    echo "=== Tailscale Access ==="
    echo "Actual Budget: http://actual-pi-$(hostname):5006"
    echo "Traefik Dashboard: http://actual-pi-$(hostname):8080"
    echo "Portainer: http://actual-pi-$(hostname):9000"
    echo
    
    echo "=== Useful Commands ==="
    echo "Monitor system: $SETUP_DIR/scripts/monitor.sh"
    echo "View logs: cd $SETUP_DIR && docker-compose logs"
    echo "Restart services: cd $SETUP_DIR && docker-compose restart"
    echo "Update services: cd $SETUP_DIR && docker-compose pull && docker-compose up -d"
    echo
    
    echo "=== Next Steps ==="
    echo "1. Log out and back in for Docker group changes to take effect"
    echo "2. Access Actual Budget and create your first budget"
    echo "3. Configure backup settings in $SETUP_DIR/.env"
    echo "4. Set up email notifications for updates (optional)"
    echo
    
    echo "For support, check the README.md file in $SETUP_DIR"
}

# Main execution
main() {
    log "Starting Raspberry Pi 3 setup for Actual Budget..."
    
    # Check prerequisites
    if ! command_exists curl; then
        sudo apt update && sudo apt install -y curl
    fi
    
    # Run setup steps
    update_system
    install_docker
    install_tailscale
    configure_tailscale
    setup_firewall
    create_directories
    copy_config_files
    configure_environment
    setup_automatic_updates
    setup_swap
    start_services
    setup_monitoring
    create_systemd_service
    
    # Display final information
    display_final_info
    
    log "Setup completed successfully!"
}

# Run main function
main "$@" 