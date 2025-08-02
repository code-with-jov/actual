# Raspberry Pi 3 Setup for Actual Budget

This setup provides a complete solution for running Actual Budget on a Raspberry Pi 3 with Docker, Tailscale for secure remote access, and the ability to deploy other applications.

## Features

- **Actual Budget Server**: Production-ready Docker deployment
- **Tailscale**: Secure VPN access to your Pi from anywhere
- **Docker Compose**: Easy management of multiple applications
- **Automatic Updates**: System and Docker image updates
- **Monitoring**: Basic health checks and logging
- **Backup**: Automated data backup solution
- **Reverse Proxy**: Traefik for managing multiple services

## Requirements

- Raspberry Pi 3 (Model B or B+)
- 8GB+ SD card (Class 10 recommended)
- Power supply (5V/2.5A minimum)
- Network connection (Ethernet or WiFi)
- Tailscale account (free tier available)

## Quick Start

1. **Flash the SD card** with Raspberry Pi OS Lite (64-bit recommended)
2. **Run the setup script**:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/your-repo/actual-raspberry-pi/main/setup.sh | bash
   ```
3. **Follow the prompts** to configure Tailscale and other settings
4. **Access Actual** at `http://your-pi-ip:5006` or via Tailscale

## Manual Setup

If you prefer manual setup, follow these steps:

### 1. Initial Pi Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2. Clone and Configure

```bash
# Clone this repository
git clone https://github.com/your-repo/actual-raspberry-pi.git
cd actual-raspberry-pi

# Copy configuration files
cp .env.example .env
nano .env  # Edit with your preferences

# Start services
docker-compose up -d
```

## Configuration

### Environment Variables

Edit `.env` file to customize your setup:

```bash
# Actual Budget Configuration
ACTUAL_PORT=5006
ACTUAL_DATA_DIR=./data/actual

# Tailscale Configuration
TAILSCALE_AUTH_KEY=your-auth-key

# System Configuration
TIMEZONE=UTC
BACKUP_RETENTION_DAYS=30
```

### Adding Other Applications

To add other applications, create a new service in `docker-compose.yml`:

```yaml
services:
  your-app:
    image: your-app-image
    ports:
      - "8080:80"
    volumes:
      - ./data/your-app:/data
    restart: unless-stopped
```

## Accessing Your Services

### Via Local Network
- Actual Budget: `http://your-pi-ip:5006`
- Traefik Dashboard: `http://your-pi-ip:8080`

### Via Tailscale
- Actual Budget: `http://your-pi-hostname:5006`
- Traefik Dashboard: `http://your-pi-hostname:8080`

## Maintenance

### Automatic Updates

The setup includes automatic updates for:
- System packages (weekly)
- Docker images (daily)
- Security updates (daily)

### Manual Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d

# Update Tailscale
sudo tailscale update
```

### Backup

Backups are automatically created daily to `./backups/`:

```bash
# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backup-file.tar.gz
```

## Troubleshooting

### Common Issues

1. **Docker permission errors**: Log out and back in after adding user to docker group
2. **Tailscale not connecting**: Check your auth key and network settings
3. **Low memory**: Consider adding swap space or using lighter images
4. **SD card corruption**: Use high-quality SD cards and enable read-only mode

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs actual-server

# Follow logs in real-time
docker-compose logs -f
```

### Health Checks

```bash
# Check service status
docker-compose ps

# Check system resources
./scripts/health-check.sh
```

## Security Considerations

- **Firewall**: UFW is configured to allow only necessary ports
- **Tailscale**: All external access goes through Tailscale VPN
- **Non-root containers**: All services run as non-root users
- **Regular updates**: Automatic security updates enabled
- **Backup encryption**: Backups are encrypted with GPG

## Performance Optimization

For better performance on Raspberry Pi 3:

1. **Use SSD**: Consider using USB SSD instead of SD card
2. **Add swap**: 1GB swap file for memory management
3. **Optimize Docker**: Use Alpine-based images when possible
4. **Monitor resources**: Use `htop` to monitor CPU/memory usage

## Support

- **Actual Budget**: [GitHub Issues](https://github.com/actualbudget/actual/issues)
- **Tailscale**: [Documentation](https://tailscale.com/kb/)
- **Docker**: [Documentation](https://docs.docker.com/)

## License

This setup is provided under the MIT License. See LICENSE file for details. 