# Raspberry Pi 3 Deployment Guide for Actual Budget

This guide provides step-by-step instructions for deploying Actual Budget on a Raspberry Pi 3 with Docker, Tailscale, and the ability to run other applications.

## Prerequisites

### Hardware Requirements
- **Raspberry Pi 3** (Model B or B+) - 1GB RAM minimum
- **8GB+ SD card** (Class 10 recommended for better performance)
- **Power supply** (5V/2.5A minimum)
- **Network connection** (Ethernet or WiFi)
- **Optional**: USB SSD for better performance

### Software Requirements
- **Raspberry Pi OS Lite** (64-bit recommended)
- **Tailscale account** (free tier available at [tailscale.com](https://tailscale.com))

## Quick Deployment

### Option 1: One-Command Installation (Recommended)

1. **Flash your SD card** with Raspberry Pi OS Lite
2. **Boot your Pi** and connect to the internet
3. **Run the installer**:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/actualbudget/actual/main/raspberry-pi-setup/install.sh | bash
   ```
4. **Follow the prompts** to configure Tailscale and other settings
5. **Access Actual Budget** at `http://your-pi-ip:5006`

### Option 2: Manual Installation

1. **Flash your SD card** with Raspberry Pi OS Lite
2. **Boot your Pi** and connect to the internet
3. **Clone the repository**:
   ```bash
   git clone https://github.com/actualbudget/actual.git
   cd actual/raspberry-pi-setup
   ```
4. **Run the setup script**:
   ```bash
   ./setup.sh
   ```
5. **Follow the prompts** to configure your setup

## Detailed Setup Process

### Step 1: Prepare Your Raspberry Pi

1. **Download Raspberry Pi OS Lite** from [raspberrypi.org](https://www.raspberrypi.org/software/)
2. **Flash the SD card** using Raspberry Pi Imager or similar tool
3. **Enable SSH** (optional but recommended):
   - Create an empty file named `ssh` in the boot partition
4. **Configure WiFi** (if using WiFi):
   - Create a `wpa_supplicant.conf` file in the boot partition
5. **Boot your Pi** and connect via SSH or directly

### Step 2: Get Your Tailscale Auth Key

1. **Sign up** for a free Tailscale account at [tailscale.com](https://tailscale.com)
2. **Go to the admin console** at [login.tailscale.com](https://login.tailscale.com)
3. **Navigate to Settings > Keys**
4. **Generate a new auth key** with appropriate permissions
5. **Copy the key** - you'll need it during setup

### Step 3: Run the Installation

1. **Connect to your Pi** via SSH or directly
2. **Run the installer**:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/actualbudget/actual/main/raspberry-pi-setup/install.sh | bash
   ```
3. **Enter your Tailscale auth key** when prompted
4. **Wait for the installation** to complete (10-15 minutes)

### Step 4: Configure Your Setup

1. **Edit the environment file**:
   ```bash
   nano ~/actual-raspberry-pi/.env
   ```
2. **Customize settings** as needed:
   - Timezone
   - Email for notifications
   - Backup settings
   - Port configurations

### Step 5: Access Your Services

#### Local Network Access
- **Actual Budget**: `http://your-pi-ip:5006`
- **Traefik Dashboard**: `http://your-pi-ip:8080`
- **Portainer**: `http://your-pi-ip:9000`

#### Tailscale Access (Recommended)
- **Actual Budget**: `http://actual-pi-yourhostname:5006`
- **Traefik Dashboard**: `http://actual-pi-yourhostname:8080`
- **Portainer**: `http://actual-pi-yourhostname:9000`

## Adding Other Applications

The setup includes Traefik as a reverse proxy, making it easy to add other applications:

### Example: Adding a Web Application

1. **Edit docker-compose.yml**:
   ```yaml
   services:
     # ... existing services ...
     
     my-app:
       image: my-app-image
       container_name: my-app
       ports:
         - "8081:80"
       volumes:
         - ./data/my-app:/data
       restart: unless-stopped
       networks:
         - actual-network
       labels:
         - "traefik.enable=true"
         - "traefik.http.routers.my-app.rule=Host(`my-app.local`)"
         - "traefik.http.routers.my-app.entrypoints=web"
         - "traefik.http.services.my-app.loadbalancer.server.port=80"
   ```

2. **Restart services**:
   ```bash
   cd ~/actual-raspberry-pi
   docker-compose up -d
   ```

3. **Access your app** at `http://my-app.local` (via Tailscale)

### Popular Applications to Add

- **Nginx** - Web server
- **MariaDB** - Database
- **Redis** - Cache
- **Grafana** - Monitoring
- **Prometheus** - Metrics
- **Jellyfin** - Media server
- **Nextcloud** - File storage

## Management Commands

### System Monitoring
```bash
# Check system health
~/actual-raspberry-pi/scripts/health-check.sh

# Monitor system resources
~/actual-raspberry-pi/scripts/monitor.sh

# View service logs
cd ~/actual-raspberry-pi && docker-compose logs
```

### Backup and Restore
```bash
# Create backup
~/actual-raspberry-pi/scripts/backup.sh

# List backups
~/actual-raspberry-pi/scripts/backup.sh list

# Restore from backup
~/actual-raspberry-pi/scripts/backup.sh restore backup-file.tar.gz
```

### Updates
```bash
# Check for updates
~/actual-raspberry-pi/scripts/update.sh check

# Update everything
~/actual-raspberry-pi/scripts/update.sh

# Update specific components
~/actual-raspberry-pi/scripts/update.sh system    # System packages
~/actual-raspberry-pi/scripts/update.sh docker    # Docker images
~/actual-raspberry-pi/scripts/update.sh tailscale # Tailscale
```

### Service Management
```bash
# Start services
cd ~/actual-raspberry-pi && docker-compose up -d

# Stop services
cd ~/actual-raspberry-pi && docker-compose down

# Restart services
cd ~/actual-raspberry-pi && docker-compose restart

# View service status
cd ~/actual-raspberry-pi && docker-compose ps
```

## Security Considerations

### Firewall Configuration
The setup automatically configures UFW firewall with:
- SSH access allowed
- Tailscale traffic allowed
- Docker ports (80, 443, 5006, 8080, 9000) allowed
- All other incoming traffic denied

### Tailscale Security
- All external access goes through Tailscale VPN
- No port forwarding required
- Encrypted traffic between devices
- Access control through Tailscale admin console

### Docker Security
- All containers run as non-root users
- Network isolation between services
- Regular security updates via Watchtower

### Backup Security
- Optional GPG encryption for backups
- S3 backup support with encryption
- Automatic backup rotation

## Performance Optimization

### For Raspberry Pi 3
1. **Use a high-quality SD card** (Class 10 or better)
2. **Consider USB SSD** for better I/O performance
3. **Add swap space** (automatically configured)
4. **Monitor temperature** (script includes temperature monitoring)
5. **Limit concurrent containers** to avoid memory issues

### Memory Management
- **1GB swap file** automatically created
- **Docker memory limits** can be configured
- **Container restart policies** prevent memory leaks

### Storage Optimization
- **Regular cleanup** of old Docker images
- **Backup rotation** to prevent disk space issues
- **Log rotation** for Docker containers

## Troubleshooting

### Common Issues

#### Docker Permission Errors
```bash
# Log out and back in after installation
exit
# Reconnect via SSH
```

#### Tailscale Not Connecting
```bash
# Check Tailscale status
tailscale status

# Restart Tailscale
sudo systemctl restart tailscaled

# Re-authenticate
sudo tailscale up
```

#### Low Memory Issues
```bash
# Check memory usage
free -h

# Restart services
cd ~/actual-raspberry-pi && docker-compose restart

# Clean up Docker
docker system prune -f
```

#### SD Card Corruption
```bash
# Check filesystem
sudo fsck -f /

# Consider using USB SSD instead
```

### Getting Help

1. **Check logs**:
   ```bash
   cd ~/actual-raspberry-pi && docker-compose logs
   ```

2. **Run health check**:
   ```bash
   ~/actual-raspberry-pi/scripts/health-check.sh
   ```

3. **Check system resources**:
   ```bash
   htop
   df -h
   free -h
   ```

4. **View service status**:
   ```bash
   systemctl status actual-budget.service
   systemctl status docker.service
   systemctl status tailscaled.service
   ```

## Maintenance Schedule

### Daily
- Automatic backups (if configured)
- Health check monitoring

### Weekly
- System package updates
- Docker image updates
- Log rotation

### Monthly
- Full system backup
- Performance review
- Security updates

## Support Resources

- **Actual Budget**: [GitHub Issues](https://github.com/actualbudget/actual/issues)
- **Tailscale**: [Documentation](https://tailscale.com/kb/)
- **Docker**: [Documentation](https://docs.docker.com/)
- **Raspberry Pi**: [Documentation](https://www.raspberrypi.org/documentation/)

## License

This setup is provided under the MIT License. See LICENSE file for details.

---

**Happy budgeting! 🎉** 