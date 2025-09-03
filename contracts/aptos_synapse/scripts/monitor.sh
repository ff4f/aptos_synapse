#!/bin/bash

# Aptos Synapse Monitoring Script
# Monitors deployed contracts and provides maintenance utilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NETWORK=${1:-devnet}
PROFILE=${2:-default}
CONTRACT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MONITOR_INTERVAL=${3:-30}  # seconds
LOG_DIR="$CONTRACT_DIR/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}=== Aptos Synapse Contract Monitor ===${NC}"
echo -e "${YELLOW}Network: $NETWORK${NC}"
echo -e "${YELLOW}Profile: $PROFILE${NC}"
echo -e "${YELLOW}Monitor Interval: ${MONITOR_INTERVAL}s${NC}"
echo -e "${YELLOW}Log Directory: $LOG_DIR${NC}"
echo ""

# Create log directory
mkdir -p "$LOG_DIR"

# Function to get contract address
get_contract_address() {
    local address=$(aptos config show-profiles --profile $PROFILE 2>/dev/null | grep account | awk '{print $2}' | tr -d '"')
    echo "$address"
}

# Function to check if contract is deployed
check_contract_deployed() {
    local address=$(get_contract_address)
    if [ -z "$address" ]; then
        echo -e "${RED}Error: Could not get contract address${NC}"
        return 1
    fi
    
    # Try to call a view function to check if contract exists
    if aptos move view --function-id "${address}::main::is_initialized" --profile $PROFILE &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to get contract status
get_contract_status() {
    local address=$(get_contract_address)
    local status_file="$LOG_DIR/status_${TIMESTAMP}.json"
    
    echo -e "${BLUE}Checking contract status...${NC}"
    
    {
        echo "{"
        echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ\")\","
        echo "  \"network\": \"$NETWORK\","
        echo "  \"profile\": \"$PROFILE\","
        echo "  \"contract_address\": \"$address\","
        
        # Check if contract is initialized
        if aptos move view --function-id "${address}::main::is_initialized" --profile $PROFILE &>/dev/null; then
            local is_init=$(aptos move view --function-id "${address}::main::is_initialized" --profile $PROFILE 2>/dev/null | grep -o 'true\|false' || echo 'false')
            echo "  \"main_contract_initialized\": $is_init,"
        else
            echo "  \"main_contract_initialized\": false,"
        fi
        
        # Check SBT contract
        if aptos move view --function-id "${address}::sbt::is_initialized" --profile $PROFILE &>/dev/null; then
            local sbt_init=$(aptos move view --function-id "${address}::sbt::is_initialized" --profile $PROFILE 2>/dev/null | grep -o 'true\|false' || echo 'false')
            echo "  \"sbt_contract_initialized\": $sbt_init,"
        else
            echo "  \"sbt_contract_initialized\": false,"
        fi
        
        # Get account balance
        local balance=$(aptos account list --profile $PROFILE --query balance 2>/dev/null || echo "0")
        echo "  \"account_balance\": \"$balance\","
        
        # Get account sequence number
        local sequence=$(aptos account list --profile $PROFILE --query sequence_number 2>/dev/null || echo "0")
        echo "  \"sequence_number\": \"$sequence\","
        
        echo "  \"status\": \"active\""
        echo "}"
        
    } > "$status_file"
    
    cat "$status_file"
    echo -e "${GREEN}✓ Status saved to: $status_file${NC}"
}

# Function to monitor contract events
monitor_events() {
    local address=$(get_contract_address)
    local events_file="$LOG_DIR/events_${TIMESTAMP}.log"
    
    echo -e "${BLUE}Monitoring contract events...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
    echo ""
    
    # Monitor events in background
    {
        echo "=== Event Monitor Started at $(date) ==="
        echo "Contract Address: $address"
        echo "Network: $NETWORK"
        echo "Profile: $PROFILE"
        echo ""
        
        while true; do
            local current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
            echo "[$current_time] Checking for new events..."
            
            # Get recent transactions for the account
            local tx_data=$(aptos account list --profile $PROFILE --query transactions 2>/dev/null || echo "[]")
            
            if [ "$tx_data" != "[]" ] && [ -n "$tx_data" ]; then
                echo "[$current_time] Recent transaction activity detected"
                echo "$tx_data" | head -5
            else
                echo "[$current_time] No recent activity"
            fi
            
            echo ""
            sleep $MONITOR_INTERVAL
        done
        
    } | tee "$events_file"
}

# Function to get protocol metrics
get_protocol_metrics() {
    local address=$(get_contract_address)
    local metrics_file="$LOG_DIR/metrics_${TIMESTAMP}.json"
    
    echo -e "${BLUE}Collecting protocol metrics...${NC}"
    
    {
        echo "{"
        echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ\")\","
        echo "  \"contract_address\": \"$address\","
        echo "  \"network\": \"$NETWORK\","
        
        # Try to get protocol statistics if available
        echo "  \"metrics\": {"
        
        # Account balance
        local balance=$(aptos account list --profile $PROFILE --query balance 2>/dev/null || echo "0")
        echo "    \"account_balance\": \"$balance\","
        
        # Transaction count (sequence number)
        local tx_count=$(aptos account list --profile $PROFILE --query sequence_number 2>/dev/null || echo "0")
        echo "    \"transaction_count\": \"$tx_count\","
        
        # Contract deployment status
        if check_contract_deployed; then
            echo "    \"deployment_status\": \"deployed\","
        else
            echo "    \"deployment_status\": \"not_deployed\","
        fi
        
        # Network info
        local node_info=$(curl -s "https://fullnode.$NETWORK.aptoslabs.com/v1" 2>/dev/null || echo '{}')
        if [ "$node_info" != "{}" ]; then
            local chain_id=$(echo "$node_info" | grep -o '"chain_id":[0-9]*' | cut -d':' -f2 || echo "unknown")
            echo "    \"chain_id\": \"$chain_id\","
        fi
        
        echo "    \"last_updated\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ\")\""
        echo "  }"
        echo "}"
        
    } > "$metrics_file"
    
    cat "$metrics_file"
    echo -e "${GREEN}✓ Metrics saved to: $metrics_file${NC}"
}

# Function to check contract health
check_contract_health() {
    echo -e "${BLUE}Performing contract health check...${NC}"
    
    local health_score=0
    local max_score=100
    local issues=()
    
    # Check 1: Contract deployment (25 points)
    if check_contract_deployed; then
        echo -e "${GREEN}✓ Contract is deployed${NC}"
        health_score=$((health_score + 25))
    else
        echo -e "${RED}✗ Contract not deployed${NC}"
        issues+=("Contract not deployed")
    fi
    
    # Check 2: Account balance (20 points)
    local balance=$(aptos account list --profile $PROFILE --query balance 2>/dev/null || echo "0")
    if [ "$balance" -gt 1000000 ]; then  # > 0.01 APT
        echo -e "${GREEN}✓ Sufficient account balance: $balance${NC}"
        health_score=$((health_score + 20))
    else
        echo -e "${YELLOW}⚠ Low account balance: $balance${NC}"
        issues+=("Low account balance")
        health_score=$((health_score + 10))
    fi
    
    # Check 3: Network connectivity (20 points)
    if curl -s "https://fullnode.$NETWORK.aptoslabs.com/v1" &>/dev/null; then
        echo -e "${GREEN}✓ Network connectivity OK${NC}"
        health_score=$((health_score + 20))
    else
        echo -e "${RED}✗ Network connectivity issues${NC}"
        issues+=("Network connectivity problems")
    fi
    
    # Check 4: Profile configuration (15 points)
    if aptos config show-profiles --profile $PROFILE &>/dev/null; then
        echo -e "${GREEN}✓ Profile configuration valid${NC}"
        health_score=$((health_score + 15))
    else
        echo -e "${RED}✗ Profile configuration invalid${NC}"
        issues+=("Invalid profile configuration")
    fi
    
    # Check 5: Contract compilation (20 points)
    cd "$CONTRACT_DIR"
    if aptos move compile --profile $PROFILE &>/dev/null; then
        echo -e "${GREEN}✓ Contract compiles successfully${NC}"
        health_score=$((health_score + 20))
    else
        echo -e "${RED}✗ Contract compilation failed${NC}"
        issues+=("Contract compilation errors")
    fi
    
    # Health summary
    echo ""
    echo -e "${CYAN}=== Health Summary ===${NC}"
    echo -e "${YELLOW}Health Score: $health_score/$max_score${NC}"
    
    if [ $health_score -ge 80 ]; then
        echo -e "${GREEN}Status: HEALTHY 🟢${NC}"
    elif [ $health_score -ge 60 ]; then
        echo -e "${YELLOW}Status: WARNING 🟡${NC}"
    else
        echo -e "${RED}Status: CRITICAL 🔴${NC}"
    fi
    
    if [ ${#issues[@]} -gt 0 ]; then
        echo -e "${YELLOW}Issues found:${NC}"
        for issue in "${issues[@]}"; do
            echo -e "  • $issue"
        done
    fi
    
    echo ""
}

# Function to backup contract state
backup_contract_state() {
    local address=$(get_contract_address)
    local backup_dir="$CONTRACT_DIR/backups"
    local backup_file="$backup_dir/state_backup_${TIMESTAMP}.json"
    
    mkdir -p "$backup_dir"
    
    echo -e "${BLUE}Creating contract state backup...${NC}"
    
    {
        echo "{"
        echo "  \"backup_timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ\")\","
        echo "  \"network\": \"$NETWORK\","
        echo "  \"contract_address\": \"$address\","
        echo "  \"profile\": \"$PROFILE\","
        
        # Account information
        echo "  \"account_info\": {"
        local balance=$(aptos account list --profile $PROFILE --query balance 2>/dev/null || echo "0")
        local sequence=$(aptos account list --profile $PROFILE --query sequence_number 2>/dev/null || echo "0")
        echo "    \"balance\": \"$balance\","
        echo "    \"sequence_number\": \"$sequence\""
        echo "  },"
        
        # Contract state (if accessible)
        echo "  \"contract_state\": {"
        if check_contract_deployed; then
            echo "    \"deployed\": true,"
            
            # Try to get contract initialization status
            if aptos move view --function-id "${address}::main::is_initialized" --profile $PROFILE &>/dev/null; then
                local is_init=$(aptos move view --function-id "${address}::main::is_initialized" --profile $PROFILE 2>/dev/null | grep -o 'true\|false' || echo 'false')
                echo "    \"main_initialized\": $is_init,"
            fi
            
            if aptos move view --function-id "${address}::sbt::is_initialized" --profile $PROFILE &>/dev/null; then
                local sbt_init=$(aptos move view --function-id "${address}::sbt::is_initialized" --profile $PROFILE 2>/dev/null | grep -o 'true\|false' || echo 'false')
                echo "    \"sbt_initialized\": $sbt_init"
            fi
        else
            echo "    \"deployed\": false"
        fi
        echo "  }"
        echo "}"
        
    } > "$backup_file"
    
    echo -e "${GREEN}✓ Backup created: $backup_file${NC}"
}

# Function to show dashboard
show_dashboard() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Aptos Synapse Monitor                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    local address=$(get_contract_address)
    echo -e "${CYAN}Contract Address:${NC} $address"
    echo -e "${CYAN}Network:${NC} $NETWORK"
    echo -e "${CYAN}Profile:${NC} $PROFILE"
    echo -e "${CYAN}Last Updated:${NC} $(date)"
    echo ""
    
    # Quick status check
    if check_contract_deployed; then
        echo -e "${GREEN}Status: DEPLOYED ✓${NC}"
    else
        echo -e "${RED}Status: NOT DEPLOYED ✗${NC}"
    fi
    
    # Account balance
    local balance=$(aptos account list --profile $PROFILE --query balance 2>/dev/null || echo "0")
    echo -e "${CYAN}Balance:${NC} $balance APT"
    
    # Transaction count
    local tx_count=$(aptos account list --profile $PROFILE --query sequence_number 2>/dev/null || echo "0")
    echo -e "${CYAN}Transactions:${NC} $tx_count"
    
    echo ""
    echo -e "${YELLOW}Available Commands:${NC}"
    echo -e "  ${BLUE}1.${NC} Health Check"
    echo -e "  ${BLUE}2.${NC} Get Status"
    echo -e "  ${BLUE}3.${NC} Get Metrics"
    echo -e "  ${BLUE}4.${NC} Monitor Events"
    echo -e "  ${BLUE}5.${NC} Backup State"
    echo -e "  ${BLUE}6.${NC} View Logs"
    echo -e "  ${BLUE}q.${NC} Quit"
    echo ""
}

# Function to run interactive dashboard
run_dashboard() {
    while true; do
        show_dashboard
        echo -n "Enter command: "
        read -r cmd
        
        case $cmd in
            1)
                check_contract_health
                echo ""
                echo "Press Enter to continue..."
                read -r
                ;;
            2)
                get_contract_status
                echo ""
                echo "Press Enter to continue..."
                read -r
                ;;
            3)
                get_protocol_metrics
                echo ""
                echo "Press Enter to continue..."
                read -r
                ;;
            4)
                monitor_events
                ;;
            5)
                backup_contract_state
                echo ""
                echo "Press Enter to continue..."
                read -r
                ;;
            6)
                echo -e "${BLUE}Available log files:${NC}"
                ls -la "$LOG_DIR" 2>/dev/null || echo "No logs found"
                echo ""
                echo "Press Enter to continue..."
                read -r
                ;;
            q|Q)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid command${NC}"
                sleep 1
                ;;
        esac
    done
}

# Main execution
main() {
    # Check prerequisites
    if ! command -v aptos &> /dev/null; then
        echo -e "${RED}Error: Aptos CLI not found${NC}"
        exit 1
    fi
    
    if ! aptos config show-profiles | grep -q "$PROFILE"; then
        echo -e "${RED}Error: Profile '$PROFILE' not found${NC}"
        exit 1
    fi
    
    # Run based on arguments
    case "$1" in
        --dashboard)
            run_dashboard
            ;;
        --health)
            check_contract_health
            ;;
        --status)
            get_contract_status
            ;;
        --metrics)
            get_protocol_metrics
            ;;
        --events)
            monitor_events
            ;;
        --backup)
            backup_contract_state
            ;;
        --help|-h)
            echo "Usage: $0 [NETWORK] [PROFILE] [INTERVAL] [COMMAND]"
            echo ""
            echo "Arguments:"
            echo "  NETWORK   Target network (devnet, testnet, mainnet) [default: devnet]"
            echo "  PROFILE   Aptos CLI profile to use [default: default]"
            echo "  INTERVAL  Monitor interval in seconds [default: 30]"
            echo ""
            echo "Commands:"
            echo "  --dashboard   Interactive dashboard"
            echo "  --health      Run health check"
            echo "  --status      Get contract status"
            echo "  --metrics     Get protocol metrics"
            echo "  --events      Monitor events"
            echo "  --backup      Backup contract state"
            echo "  --help, -h    Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                          # Interactive dashboard"
            echo "  $0 --health                 # Quick health check"
            echo "  $0 testnet prod --metrics   # Get metrics for testnet"
            exit 0
            ;;
        *)
            run_dashboard
            ;;
    esac
}

# Execute main function
main "$@"