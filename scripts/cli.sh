#!/bin/bash

# CLI helper for postgres-replica service
# Usage: ./cli.sh [command] [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "🔧 PostgreSQL Replica Service CLI"
    echo "================================="
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  build                 Build the Docker image"
    echo "  test                  Run with test configuration"
    echo "  run [config-file]     Run with specified config file"
    echo "  validate [config-file] Validate configuration file"
    echo "  health               Check health of running service"
    echo "  logs                 Show logs of running service"
    echo "  stop                 Stop running service"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 run ../replication-config.yml"
    echo "  $0 validate config/replication-config.sample.yml"
    echo "  $0 health"
    echo ""
}

build_image() {
    echo -e "${BLUE}🔨 Building postgres-replica Docker image...${NC}"
    cd "$PROJECT_ROOT"
    docker build -t postgres-replica .
    echo -e "${GREEN}✅ Build completed${NC}"
}

run_test() {
    echo -e "${BLUE}🧪 Running test configuration...${NC}"
    cd "$PROJECT_ROOT"
    ./scripts/test.sh
}

run_with_config() {
    local config_file="$1"
    
    if [[ -z "$config_file" ]]; then
        echo -e "${RED}❌ Error: Config file path required${NC}"
        echo "Usage: $0 run <config-file-path>"
        exit 1
    fi
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}❌ Error: Config file not found: $config_file${NC}"
        exit 1
    fi
    
    # Convert to absolute path
    config_file="$(realpath "$config_file")"
    
    echo -e "${BLUE}🚀 Running with config: $config_file${NC}"
    
    cd "$PROJECT_ROOT"
    docker run --rm \
        --name postgres-replica \
        -v "$config_file:/config/replication-config.yml:ro" \
        -p 3001:3000 \
        postgres-replica
}

validate_config() {
    local config_file="$1"
    
    if [[ -z "$config_file" ]]; then
        echo -e "${RED}❌ Error: Config file path required${NC}"
        echo "Usage: $0 validate <config-file-path>"
        exit 1
    fi
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}❌ Error: Config file not found: $config_file${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🔍 Validating config: $config_file${NC}"
    
    # Basic YAML syntax check
    if command -v python3 &> /dev/null; then
        python3 -c "import yaml; yaml.safe_load(open('$config_file'))" 2>/dev/null
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ YAML syntax is valid${NC}"
        else
            echo -e "${RED}❌ Invalid YAML syntax${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Python3 not found, skipping YAML validation${NC}"
    fi
    
    # Check required fields
    if grep -q "publication_name" "$config_file" && \
       grep -q "source:" "$config_file" && \
       grep -q "targets:" "$config_file" && \
       grep -q "tables:" "$config_file"; then
        echo -e "${GREEN}✅ Required fields present${NC}"
    else
        echo -e "${RED}❌ Missing required fields${NC}"
        echo "Required: publication_name, source, targets, tables"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Configuration appears valid${NC}"
}

check_health() {
    echo -e "${BLUE}🏥 Checking service health...${NC}"
    
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${RED}❌ Service not responding or not running${NC}"
        echo "Make sure the service is running on port 3001"
        exit 1
    fi
    
    local health_response=$(curl -s http://localhost:3001/health)
    local status=$(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [[ "$status" == "healthy" ]]; then
        echo -e "${GREEN}✅ Service is healthy${NC}"
    else
        echo -e "${RED}❌ Service is unhealthy${NC}"
    fi
    
    echo ""
    echo "Full health response:"
    echo "$health_response" | python3 -m json.tool 2>/dev/null || echo "$health_response"
}

show_logs() {
    echo -e "${BLUE}📋 Showing service logs...${NC}"
    docker logs postgres-replica 2>/dev/null || echo -e "${RED}❌ Service not running or no logs available${NC}"
}

stop_service() {
    echo -e "${BLUE}🛑 Stopping service...${NC}"
    docker stop postgres-replica 2>/dev/null || echo -e "${YELLOW}⚠️  Service not running${NC}"
    echo -e "${GREEN}✅ Service stopped${NC}"
}

# Main command dispatcher
case "${1:-help}" in
    "build")
        build_image
        ;;
    "test")
        run_test
        ;;
    "run")
        run_with_config "$2"
        ;;
    "validate")
        validate_config "$2"
        ;;
    "health")
        check_health
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        stop_service
        ;;
    "help"|*)
        print_usage
        ;;
esac
