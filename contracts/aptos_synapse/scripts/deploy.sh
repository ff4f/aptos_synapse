#!/bin/bash

# Aptos Synapse Deployment Script
# This script deploys the smart contracts to Aptos blockchain

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK=${1:-devnet}  # Default to devnet, can be overridden
PROFILE=${2:-default} # Default profile
CONTRACT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE_NAME="aptos_synapse"

echo -e "${BLUE}=== Aptos Synapse Deployment Script ===${NC}"
echo -e "${YELLOW}Network: $NETWORK${NC}"
echo -e "${YELLOW}Profile: $PROFILE${NC}"
echo -e "${YELLOW}Contract Directory: $CONTRACT_DIR${NC}"
echo ""

# Function to check if aptos CLI is installed
check_aptos_cli() {
    if ! command -v aptos &> /dev/null; then
        echo -e "${RED}Error: Aptos CLI is not installed${NC}"
        echo "Please install it from: https://aptos.dev/tools/aptos-cli/install-cli/"
        exit 1
    fi
    echo -e "${GREEN}✓ Aptos CLI found${NC}"
}

# Function to check if profile exists
check_profile() {
    if ! aptos config show-profiles | grep -q "$PROFILE"; then
        echo -e "${RED}Error: Profile '$PROFILE' not found${NC}"
        echo "Available profiles:"
        aptos config show-profiles
        echo ""
        echo "Create a new profile with: aptos init --profile $PROFILE"
        exit 1
    fi
    echo -e "${GREEN}✓ Profile '$PROFILE' found${NC}"
}

# Function to check account balance
check_balance() {
    echo -e "${BLUE}Checking account balance...${NC}"
    local balance=$(aptos account list --profile $PROFILE --query balance 2>/dev/null || echo "0")
    echo -e "${YELLOW}Account balance: $balance APT${NC}"
    
    if [ "$balance" = "0" ] || [ -z "$balance" ]; then
        echo -e "${YELLOW}Warning: Low or zero balance detected${NC}"
        if [ "$NETWORK" = "devnet" ] || [ "$NETWORK" = "testnet" ]; then
            echo -e "${BLUE}Funding account from faucet...${NC}"
            aptos account fund-with-faucet --profile $PROFILE --amount 100000000
            echo -e "${GREEN}✓ Account funded${NC}"
        else
            echo -e "${RED}Error: Insufficient balance for mainnet deployment${NC}"
            exit 1
        fi
    fi
}

# Function to compile contracts
compile_contracts() {
    echo -e "${BLUE}Compiling smart contracts...${NC}"
    cd "$CONTRACT_DIR"
    
    if aptos move compile --profile $PROFILE; then
        echo -e "${GREEN}✓ Contracts compiled successfully${NC}"
    else
        echo -e "${RED}Error: Contract compilation failed${NC}"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}Running tests...${NC}"
    cd "$CONTRACT_DIR"
    
    if aptos move test --profile $PROFILE; then
        echo -e "${GREEN}✓ All tests passed${NC}"
    else
        echo -e "${RED}Error: Tests failed${NC}"
        echo -e "${YELLOW}Do you want to continue with deployment anyway? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to deploy contracts
deploy_contracts() {
    echo -e "${BLUE}Deploying contracts to $NETWORK...${NC}"
    cd "$CONTRACT_DIR"
    
    # Deploy with named addresses
    if aptos move publish --profile $PROFILE --named-addresses $PACKAGE_NAME=$(aptos config show-profiles --profile $PROFILE | grep account | awk '{print $2}'); then
        echo -e "${GREEN}✓ Contracts deployed successfully${NC}"
        
        # Get the deployed address
        local deployed_address=$(aptos config show-profiles --profile $PROFILE | grep account | awk '{print $2}')
        echo -e "${YELLOW}Deployed to address: $deployed_address${NC}"
        
        # Save deployment info
        save_deployment_info "$deployed_address"
    else
        echo -e "${RED}Error: Contract deployment failed${NC}"
        exit 1
    fi
}

# Function to save deployment information
save_deployment_info() {
    local address=$1
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local deployment_file="$CONTRACT_DIR/deployments.json"
    
    echo -e "${BLUE}Saving deployment information...${NC}"
    
    # Create deployments.json if it doesn't exist
    if [ ! -f "$deployment_file" ]; then
        echo '{}' > "$deployment_file"
    fi
    
    # Update deployment info using jq if available, otherwise use simple append
    if command -v jq &> /dev/null; then
        local temp_file=$(mktemp)
        jq --arg network "$NETWORK" --arg address "$address" --arg timestamp "$timestamp" \
           '.[$network] = {"address": $address, "timestamp": $timestamp, "profile": "'$PROFILE'"}' \
           "$deployment_file" > "$temp_file" && mv "$temp_file" "$deployment_file"
    else
        echo "Deployment: $NETWORK -> $address at $timestamp" >> "$deployment_file.log"
    fi
    
    echo -e "${GREEN}✓ Deployment info saved${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}Verifying deployment...${NC}"
    local deployed_address=$(aptos config show-profiles --profile $PROFILE | grep account | awk '{print $2}')
    
    # Check if the module exists on-chain
    if aptos move view --function-id "${deployed_address}::main::is_initialized" --profile $PROFILE &>/dev/null; then
        echo -e "${GREEN}✓ Deployment verified - contracts are accessible${NC}"
    else
        echo -e "${YELLOW}Warning: Could not verify deployment (this might be normal for fresh deployments)${NC}"
    fi
}

# Function to initialize contracts
initialize_contracts() {
    echo -e "${BLUE}Initializing contracts...${NC}"
    local deployed_address=$(aptos config show-profiles --profile $PROFILE | grep account | awk '{print $2}')
    
    # Initialize main contract
    echo -e "${YELLOW}Initializing main contract...${NC}"
    if aptos move run --function-id "${deployed_address}::main::initialize" --profile $PROFILE; then
        echo -e "${GREEN}✓ Main contract initialized${NC}"
    else
        echo -e "${YELLOW}Warning: Main contract initialization failed or already initialized${NC}"
    fi
    
    # Initialize SBT contract
    echo -e "${YELLOW}Initializing SBT contract...${NC}"
    if aptos move run --function-id "${deployed_address}::sbt::initialize" --profile $PROFILE; then
        echo -e "${GREEN}✓ SBT contract initialized${NC}"
    else
        echo -e "${YELLOW}Warning: SBT contract initialization failed or already initialized${NC}"
    fi
}

# Function to show deployment summary
show_summary() {
    local deployed_address=$(aptos config show-profiles --profile $PROFILE | grep account | awk '{print $2}')
    
    echo ""
    echo -e "${GREEN}=== Deployment Summary ===${NC}"
    echo -e "${YELLOW}Network:${NC} $NETWORK"
    echo -e "${YELLOW}Profile:${NC} $PROFILE"
    echo -e "${YELLOW}Contract Address:${NC} $deployed_address"
    echo -e "${YELLOW}Package Name:${NC} $PACKAGE_NAME"
    echo ""
    echo -e "${BLUE}Contract Functions:${NC}"
    echo -e "  • Main Contract: ${deployed_address}::main"
    echo -e "  • SBT Contract: ${deployed_address}::sbt"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Update frontend configuration with contract address"
    echo -e "  2. Test contract functions using Aptos CLI or frontend"
    echo -e "  3. Monitor contract performance and usage"
    echo ""
    echo -e "${GREEN}Deployment completed successfully!${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    echo ""
    
    check_aptos_cli
    check_profile
    check_balance
    compile_contracts
    run_tests
    deploy_contracts
    verify_deployment
    initialize_contracts
    show_summary
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [NETWORK] [PROFILE]"
        echo ""
        echo "Arguments:"
        echo "  NETWORK   Target network (devnet, testnet, mainnet) [default: devnet]"
        echo "  PROFILE   Aptos CLI profile to use [default: default]"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy to devnet using default profile"
        echo "  $0 testnet           # Deploy to testnet using default profile"
        echo "  $0 mainnet prod      # Deploy to mainnet using prod profile"
        exit 0
        ;;
    --compile-only)
        check_aptos_cli
        compile_contracts
        exit 0
        ;;
    --test-only)
        check_aptos_cli
        compile_contracts
        run_tests
        exit 0
        ;;
    *)
        main
        ;;
esac