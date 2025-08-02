#!/bin/bash

# One-command installer for Actual Budget on Raspberry Pi 3
# This script downloads and runs the complete setup

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

# Configuration
REPO_URL="https://github.com/actualbudget/actual.git"
SETUP_DIR="$HOME/actual-raspberry-pi"
TEMP_DIR="/tmp/actual-setup"

# Function to check if running on Raspberry Pi
check_raspberry_pi() {
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        warn "This script is designed for Raspberry Pi. Running on other systems may cause issues."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
    
    # Check if curl is available
    if ! command -v curl >/dev/null 2>&1; then
        log "Installing curl..."
        sudo apt update && sudo apt install -y curl
    fi
    
    # Check if git is available
    if ! command -v git >/dev/null 2>&1; then
        log "Installing git..."
        sudo apt install -y git
    fi
}

# Function to download setup files
download_setup() {
    log "Downloading setup files..."
    
    # Create temporary directory
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    # Clone the repository or download files
    if command -v git >/dev/null 2>&1; then
        log "Cloning repository..."
        git clone "$REPO_URL" .
    else
        log "Downloading files..."
        # Download individual files if git is not available
        curl -fsSL -o setup.sh https://raw.githubusercontent.com/actualbudget/actual/main/raspberry-pi-setup/setup.sh
        curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/actualbudget/actual/main/raspberry-pi-setup/docker-compose.yml
        curl -fsSL -o env.example https://raw.githubusercontent.com/actualbudget/actual/main/raspberry-pi-setup/env.example
        curl -fsSL -o README.md https://raw.githubusercontent.com/actualbudget/actual/main/raspberry-pi-setup/README.md
    fi
    
    log "Setup files downloaded successfully"
}

# Function to run setup
run_setup() {
    log "Running setup..."
    
    # Make setup script executable
    chmod +x setup.sh
    
    # Run the setup script
    ./setup.sh
}

# Function to cleanup
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
}

# Function to show final instructions
show_final_instructions() {
    echo
    echo "=========================================="
    echo "🎉 Actual Budget Setup Completed! 🎉"
    echo "=========================================="
    echo
    echo "Your Actual Budget server is now running on your Raspberry Pi!"
    echo
    echo "📱 Access your services:"
    echo "   • Actual Budget: http://$(hostname -I | awk '{print $1}'):5006"
    echo "   • Traefik Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
    echo "   • Portainer: http://$(hostname -I | awk '{print $1}'):9000"
    echo
    echo "🌐 Via Tailscale (if configured):"
    echo "   • Actual Budget: http://actual-pi-$(hostname):5006"
    echo "   • Traefik Dashboard: http://actual-pi-$(hostname):8080"
    echo "   • Portainer: http://actual-pi-$(hostname):9000"
    echo
    echo "📁 Installation directory: $SETUP_DIR"
    echo
    echo "🔧 Useful commands:"
    echo "   • Monitor system: $SETUP_DIR/scripts/monitor.sh"
    echo "   • Create backup: $SETUP_DIR/scripts/backup.sh"
    echo "   • Update system: $SETUP_DIR/scripts/update.sh"
    echo "   • View logs: cd $SETUP_DIR && docker-compose logs"
    echo
    echo "📚 Documentation: $SETUP_DIR/README.md"
    echo
    echo "⚠️  Important:"
    echo "   • Log out and back in for Docker group changes to take effect"
    echo "   • Configure backup settings in $SETUP_DIR/.env"
    echo "   • Set up email notifications for updates (optional)"
    echo
    echo "🚀 Happy budgeting!"
    echo
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  install   Install Actual Budget (default)"
    echo "  help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0              # Install Actual Budget"
    echo "  $0 install      # Install Actual Budget"
    echo "  $0 help         # Show help"
    echo
    echo "This script will:"
    echo "  1. Check system requirements"
    echo "  2. Download setup files"
    echo "  3. Install Docker and dependencies"
    echo "  4. Configure Tailscale"
    echo "  5. Start Actual Budget services"
    echo
    echo "Requirements:"
    echo "  • Raspberry Pi 3 (recommended)"
    echo "  • 8GB+ SD card"
    echo "  • Internet connection"
    echo "  • Tailscale account (free)"
}

# Main execution
main() {
    case "${1:-install}" in
        install)
            log "Starting Actual Budget installation..."
            
            check_raspberry_pi
            check_prerequisites
            download_setup
            run_setup
            cleanup
            show_final_instructions
            
            log "Installation completed successfully!"
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