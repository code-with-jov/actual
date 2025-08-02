#!/bin/bash

# Backup script for Actual Budget Raspberry Pi setup
# This script creates encrypted backups of all data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$SETUP_DIR/backups"
DATA_DIR="$SETUP_DIR/data"
ENV_FILE="$SETUP_DIR/.env"

# Load environment variables
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
fi

# Default values
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-""}

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create backup
create_backup() {
    local timestamp=$(date +'%Y%m%d_%H%M%S')
    local backup_name="actual-backup-${timestamp}.tar.gz"
    local backup_path="$BACKUP_DIR/$backup_name"
    local temp_backup="/tmp/$backup_name"
    
    log "Creating backup: $backup_name"
    
    # Stop services to ensure data consistency
    log "Stopping services for backup..."
    cd "$SETUP_DIR"
    docker-compose stop actual-server
    
    # Create backup
    log "Creating backup archive..."
    tar -czf "$temp_backup" \
        --exclude='*.log' \
        --exclude='*.tmp' \
        --exclude='node_modules' \
        -C "$SETUP_DIR" \
        data/ \
        .env \
        docker-compose.yml
    
    # Restart services
    log "Restarting services..."
    docker-compose start actual-server
    
    # Encrypt backup if encryption key is provided
    if [[ -n "$BACKUP_ENCRYPTION_KEY" ]]; then
        log "Encrypting backup..."
        echo "$BACKUP_ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 \
            --symmetric --cipher-algo AES256 "$temp_backup"
        mv "$temp_backup.gpg" "$backup_path.gpg"
        log "Backup encrypted and saved: $backup_path.gpg"
    else
        mv "$temp_backup" "$backup_path"
        log "Backup saved: $backup_path"
    fi
    
    # Upload to S3 if configured
    if [[ -n "$BACKUP_S3_BUCKET" && -n "$BACKUP_S3_ACCESS_KEY" && -n "$BACKUP_S3_SECRET_KEY" ]]; then
        upload_to_s3 "$backup_path"
    fi
    
    log "Backup completed successfully"
}

# Function to upload to S3
upload_to_s3() {
    local backup_path="$1"
    local s3_path="s3://$BACKUP_S3_BUCKET/$(basename "$backup_path")"
    
    log "Uploading backup to S3..."
    
    if command_exists aws; then
        export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY"
        export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"
        
        aws s3 cp "$backup_path" "$s3_path"
        log "Backup uploaded to S3: $s3_path"
    else
        warn "AWS CLI not installed. Skipping S3 upload."
    fi
}

# Function to clean old backups
clean_old_backups() {
    log "Cleaning backups older than $BACKUP_RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old local backups
    if [[ -n "$BACKUP_ENCRYPTION_KEY" ]]; then
        # Encrypted backups
        while IFS= read -r -d '' file; do
            if [[ $(find "$file" -mtime +$BACKUP_RETENTION_DAYS) ]]; then
                rm "$file"
                ((deleted_count++))
                log "Deleted old backup: $(basename "$file")"
            fi
        done < <(find "$BACKUP_DIR" -name "*.gpg" -print0)
    else
        # Unencrypted backups
        while IFS= read -r -d '' file; do
            if [[ $(find "$file" -mtime +$BACKUP_RETENTION_DAYS) ]]; then
                rm "$file"
                ((deleted_count++))
                log "Deleted old backup: $(basename "$file")"
            fi
        done < <(find "$BACKUP_DIR" -name "*.tar.gz" -print0)
    fi
    
    # Clean S3 backups if configured
    if [[ -n "$BACKUP_S3_BUCKET" && -n "$BACKUP_S3_ACCESS_KEY" && -n "$BACKUP_S3_SECRET_KEY" ]]; then
        clean_s3_backups
    fi
    
    log "Cleaned $deleted_count old backups"
}

# Function to clean S3 backups
clean_s3_backups() {
    if command_exists aws; then
        export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY"
        export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"
        
        # List old files and delete them
        aws s3 ls "s3://$BACKUP_S3_BUCKET/" | while read -r line; do
            createDate=$(echo "$line" | awk {'print $1'})
            createDate=$(date -d "$createDate" +%s)
            olderThan=$(date -d "-$BACKUP_RETENTION_DAYS days" +%s)
            if [[ $createDate -lt $olderThan ]]; then
                fileName=$(echo "$line" | awk {'print $4'})
                if [[ $fileName != "" ]]; then
                    aws s3 rm "s3://$BACKUP_S3_BUCKET/$fileName"
                    log "Deleted old S3 backup: $fileName"
                fi
            fi
        done
    fi
}

# Function to list backups
list_backups() {
    log "Available backups:"
    echo
    
    if [[ -n "$BACKUP_ENCRYPTION_KEY" ]]; then
        # List encrypted backups
        find "$BACKUP_DIR" -name "*.gpg" -type f -exec ls -lh {} \; | \
            awk '{print $5, $6, $7, $8, $9}' | sort -k4
    else
        # List unencrypted backups
        find "$BACKUP_DIR" -name "*.tar.gz" -type f -exec ls -lh {} \; | \
            awk '{print $5, $6, $7, $8, $9}' | sort -k4
    fi
    
    echo
    echo "Backup directory: $BACKUP_DIR"
    echo "Total backups: $(find "$BACKUP_DIR" -name "*.tar.gz" -o -name "*.gpg" | wc -l)"
}

# Function to restore backup
restore_backup() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        error "Please specify a backup file to restore"
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Stop services
    log "Stopping services..."
    cd "$SETUP_DIR"
    docker-compose down
    
    # Create backup of current data before restore
    log "Creating backup of current data..."
    ./scripts/backup.sh
    
    # Extract backup
    local temp_dir="/tmp/backup-restore-$$"
    mkdir -p "$temp_dir"
    
    if [[ "$backup_file" == *.gpg ]]; then
        # Decrypt and extract
        log "Decrypting backup..."
        echo "$BACKUP_ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 \
            --decrypt "$backup_file" | tar -xzf - -C "$temp_dir"
    else
        # Extract directly
        tar -xzf "$backup_file" -C "$temp_dir"
    fi
    
    # Restore data
    log "Restoring data..."
    if [[ -d "$temp_dir/data" ]]; then
        rm -rf "$DATA_DIR"
        mv "$temp_dir/data" "$DATA_DIR"
    fi
    
    if [[ -f "$temp_dir/.env" ]]; then
        cp "$temp_dir/.env" "$SETUP_DIR/.env"
    fi
    
    # Clean up
    rm -rf "$temp_dir"
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    log "Restore completed successfully"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  create    Create a new backup (default)"
    echo "  list      List available backups"
    echo "  restore FILE  Restore from backup file"
    echo "  clean     Clean old backups"
    echo "  help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0                    # Create backup"
    echo "  $0 list              # List backups"
    echo "  $0 restore backup.tar.gz  # Restore from backup"
    echo "  $0 clean             # Clean old backups"
}

# Main execution
main() {
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Parse command line arguments
    case "${1:-create}" in
        create)
            create_backup
            clean_old_backups
            ;;
        list)
            list_backups
            ;;
        restore)
            restore_backup "$2"
            ;;
        clean)
            clean_old_backups
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