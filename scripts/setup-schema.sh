#!/bin/bash

# Schema Setup Script for PostgreSQL Replication
# This script helps set up target databases with the correct schema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "🔧 PostgreSQL Schema Setup for Replication"
    echo "========================================"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  copy-schema     Copy schema from source to target database"
    echo "  validate        Validate that target has required tables"
    echo "  dump-schema     Export schema from source database"
    echo "  help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SOURCE_HOST     Source database host (default: localhost)"
    echo "  SOURCE_PORT     Source database port (default: 5432)"
    echo "  SOURCE_USER     Source database user (required)"
    echo "  SOURCE_PASS     Source database password (required)"
    echo "  SOURCE_DB       Source database name (required)"
    echo "  TARGET_HOST     Target database host (default: localhost)"
    echo "  TARGET_PORT     Target database port (default: 5433)"
    echo "  TARGET_USER     Target database user (required)"
    echo "  TARGET_PASS     Target database password (required)"
    echo "  TARGET_DB       Target database name (required)"
    echo ""
    echo "Examples:"
    echo "  # Copy schema from source to target"
    echo "  SOURCE_USER=sourceuser SOURCE_PASS=sourcepass SOURCE_DB=sourcedb \\"
    echo "  TARGET_USER=targetuser TARGET_PASS=targetpass TARGET_DB=targetdb \\"
    echo "  $0 copy-schema"
    echo ""
    echo "  # Validate target database has required tables"
    echo "  TARGET_USER=targetuser TARGET_PASS=targetpass TARGET_DB=targetdb \\"
    echo "  $0 validate users,posts"
    echo ""
}

# Set defaults
SOURCE_HOST=${SOURCE_HOST:-localhost}
SOURCE_PORT=${SOURCE_PORT:-5432}
TARGET_HOST=${TARGET_HOST:-localhost}
TARGET_PORT=${TARGET_PORT:-5433}

check_requirements() {
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${RED}❌ Error: pg_dump not found. Please install PostgreSQL client tools.${NC}"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ Error: psql not found. Please install PostgreSQL client tools.${NC}"
        exit 1
    fi
}

check_source_vars() {
    if [[ -z "$SOURCE_USER" || -z "$SOURCE_PASS" || -z "$SOURCE_DB" ]]; then
        echo -e "${RED}❌ Error: SOURCE_USER, SOURCE_PASS, and SOURCE_DB are required${NC}"
        exit 1
    fi
}

check_target_vars() {
    if [[ -z "$TARGET_USER" || -z "$TARGET_PASS" || -z "$TARGET_DB" ]]; then
        echo -e "${RED}❌ Error: TARGET_USER, TARGET_PASS, and TARGET_DB are required${NC}"
        exit 1
    fi
}

test_connection() {
    local host=$1
    local port=$2
    local user=$3
    local pass=$4
    local db=$5
    local name=$6
    
    echo -e "${BLUE}🔍 Testing connection to $name database...${NC}"
    
    PGPASSWORD="$pass" psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1;" > /dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Successfully connected to $name database${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to connect to $name database${NC}"
        return 1
    fi
}

copy_schema() {
    echo -e "${BLUE}📋 Copying schema from source to target database...${NC}"
    
    check_source_vars
    check_target_vars
    
    # Test connections
    test_connection "$SOURCE_HOST" "$SOURCE_PORT" "$SOURCE_USER" "$SOURCE_PASS" "$SOURCE_DB" "source" || exit 1
    test_connection "$TARGET_HOST" "$TARGET_PORT" "$TARGET_USER" "$TARGET_PASS" "$TARGET_DB" "target" || exit 1
    
    # Create temporary schema file
    local schema_file="/tmp/schema_dump_$(date +%s).sql"
    
    echo -e "${BLUE}📤 Dumping schema from source database...${NC}"
    PGPASSWORD="$SOURCE_PASS" pg_dump \
        -h "$SOURCE_HOST" \
        -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" \
        -d "$SOURCE_DB" \
        --schema-only \
        --no-owner \
        --no-privileges \
        -f "$schema_file"
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Failed to dump schema from source database${NC}"
        rm -f "$schema_file"
        exit 1
    fi
    
    echo -e "${BLUE}📥 Applying schema to target database...${NC}"
    PGPASSWORD="$TARGET_PASS" psql \
        -h "$TARGET_HOST" \
        -p "$TARGET_PORT" \
        -U "$TARGET_USER" \
        -d "$TARGET_DB" \
        -f "$schema_file"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Schema successfully copied to target database${NC}"
    else
        echo -e "${RED}❌ Failed to apply schema to target database${NC}"
        rm -f "$schema_file"
        exit 1
    fi
    
    # Cleanup
    rm -f "$schema_file"
    echo -e "${GREEN}🎉 Schema copy completed successfully!${NC}"
}

validate_tables() {
    local tables=$1
    
    if [[ -z "$tables" ]]; then
        echo -e "${RED}❌ Error: Please specify tables to validate (comma-separated)${NC}"
        echo "Example: $0 validate users,posts,comments"
        exit 1
    fi
    
    check_target_vars
    
    echo -e "${BLUE}🔍 Validating tables in target database: $tables${NC}"
    
    # Test connection
    test_connection "$TARGET_HOST" "$TARGET_PORT" "$TARGET_USER" "$TARGET_PASS" "$TARGET_DB" "target" || exit 1
    
    # Convert comma-separated list to array
    IFS=',' read -ra TABLE_ARRAY <<< "$tables"
    
    local missing_tables=()
    
    for table in "${TABLE_ARRAY[@]}"; do
        table=$(echo "$table" | xargs) # trim whitespace
        
        echo -e "${BLUE}  Checking table: $table${NC}"
        
        local exists=$(PGPASSWORD="$TARGET_PASS" psql \
            -h "$TARGET_HOST" \
            -p "$TARGET_PORT" \
            -U "$TARGET_USER" \
            -d "$TARGET_DB" \
            -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | xargs)
        
        if [[ "$exists" == "t" ]]; then
            echo -e "${GREEN}    ✅ Table '$table' exists${NC}"
        else
            echo -e "${RED}    ❌ Table '$table' missing${NC}"
            missing_tables+=("$table")
        fi
    done
    
    if [[ ${#missing_tables[@]} -eq 0 ]]; then
        echo -e "${GREEN}🎉 All required tables exist in target database!${NC}"
    else
        echo -e "${RED}❌ Missing tables: ${missing_tables[*]}${NC}"
        echo -e "${YELLOW}💡 Run '$0 copy-schema' to copy schema from source database${NC}"
        exit 1
    fi
}

dump_schema() {
    echo -e "${BLUE}📤 Dumping schema from source database...${NC}"
    
    check_source_vars
    
    # Test connection
    test_connection "$SOURCE_HOST" "$SOURCE_PORT" "$SOURCE_USER" "$SOURCE_PASS" "$SOURCE_DB" "source" || exit 1
    
    local schema_file="schema_$(date +%Y%m%d_%H%M%S).sql"
    
    PGPASSWORD="$SOURCE_PASS" pg_dump \
        -h "$SOURCE_HOST" \
        -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" \
        -d "$SOURCE_DB" \
        --schema-only \
        --no-owner \
        --no-privileges \
        -f "$schema_file"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Schema dumped to: $schema_file${NC}"
        echo -e "${BLUE}💡 You can apply this schema to target databases using:${NC}"
        echo -e "  PGPASSWORD=targetpass psql -h targethost -p targetport -U targetuser -d targetdb -f $schema_file"
    else
        echo -e "${RED}❌ Failed to dump schema${NC}"
        exit 1
    fi
}

# Check requirements
check_requirements

# Main command dispatcher
case "${1:-help}" in
    "copy-schema")
        copy_schema
        ;;
    "validate")
        validate_tables "$2"
        ;;
    "dump-schema")
        dump_schema
        ;;
    "help"|*)
        print_usage
        ;;
esac
