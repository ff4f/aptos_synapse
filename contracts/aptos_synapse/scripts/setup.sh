#!/bin/bash

# Aptos Synapse Setup Script
# Sets up development environment and dependencies

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
PROJECT_NAME="aptos_synapse"
CONTRACT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APTOS_CLI_VERSION="latest"
NODE_VERSION="18"

echo -e "${BLUE}=== Aptos Synapse Setup Script ===${NC}"
echo -e "${YELLOW}Project: $PROJECT_NAME${NC}"
echo -e "${YELLOW}Contract Directory: $CONTRACT_DIR${NC}"
echo ""

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Homebrew (macOS)
install_homebrew() {
    if [[ $(detect_os) == "macos" ]] && ! command_exists brew; then
        echo -e "${BLUE}Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        echo -e "${GREEN}✓ Homebrew installed${NC}"
    fi
}

# Function to install Rust
install_rust() {
    if ! command_exists rustc; then
        echo -e "${BLUE}Installing Rust...${NC}"
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        echo -e "${GREEN}✓ Rust installed${NC}"
    else
        echo -e "${GREEN}✓ Rust already installed${NC}"
        rustc --version
    fi
}

# Function to install Node.js
install_nodejs() {
    if ! command_exists node; then
        echo -e "${BLUE}Installing Node.js...${NC}"
        
        case $(detect_os) in
            "macos")
                if command_exists brew; then
                    brew install node@$NODE_VERSION
                else
                    echo -e "${YELLOW}Please install Node.js manually from https://nodejs.org${NC}"
                fi
                ;;
            "linux")
                # Install Node.js via NodeSource
                curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
                sudo apt-get install -y nodejs
                ;;
            *)
                echo -e "${YELLOW}Please install Node.js manually from https://nodejs.org${NC}"
                ;;
        esac
        
        if command_exists node; then
            echo -e "${GREEN}✓ Node.js installed${NC}"
            node --version
        fi
    else
        echo -e "${GREEN}✓ Node.js already installed${NC}"
        node --version
    fi
}

# Function to install Aptos CLI
install_aptos_cli() {
    if ! command_exists aptos; then
        echo -e "${BLUE}Installing Aptos CLI...${NC}"
        
        case $(detect_os) in
            "macos")
                if command_exists brew; then
                    brew install aptos
                else
                    # Download precompiled binary
                    curl -fLs "https://github.com/aptos-labs/aptos-core/releases/latest/download/aptos-cli-$(uname -s)-$(uname -m).zip" -o aptos-cli.zip
                    unzip aptos-cli.zip
                    chmod +x aptos
                    sudo mv aptos /usr/local/bin/
                    rm aptos-cli.zip
                fi
                ;;
            "linux")
                # Download precompiled binary
                curl -fLs "https://github.com/aptos-labs/aptos-core/releases/latest/download/aptos-cli-$(uname -s)-$(uname -m).zip" -o aptos-cli.zip
                unzip aptos-cli.zip
                chmod +x aptos
                sudo mv aptos /usr/local/bin/
                rm aptos-cli.zip
                ;;
            *)
                echo -e "${YELLOW}Please install Aptos CLI manually from https://aptos.dev/tools/aptos-cli/install-cli/${NC}"
                ;;
        esac
        
        if command_exists aptos; then
            echo -e "${GREEN}✓ Aptos CLI installed${NC}"
            aptos --version
        fi
    else
        echo -e "${GREEN}✓ Aptos CLI already installed${NC}"
        aptos --version
    fi
}

# Function to install additional tools
install_additional_tools() {
    echo -e "${BLUE}Installing additional development tools...${NC}"
    
    # Install jq for JSON processing
    if ! command_exists jq; then
        case $(detect_os) in
            "macos")
                if command_exists brew; then
                    brew install jq
                fi
                ;;
            "linux")
                sudo apt-get update && sudo apt-get install -y jq
                ;;
        esac
        
        if command_exists jq; then
            echo -e "${GREEN}✓ jq installed${NC}"
        fi
    else
        echo -e "${GREEN}✓ jq already installed${NC}"
    fi
    
    # Install bc for calculations
    if ! command_exists bc; then
        case $(detect_os) in
            "macos")
                if command_exists brew; then
                    brew install bc
                fi
                ;;
            "linux")
                sudo apt-get install -y bc
                ;;
        esac
        
        if command_exists bc; then
            echo -e "${GREEN}✓ bc installed${NC}"
        fi
    else
        echo -e "${GREEN}✓ bc already installed${NC}"
    fi
}

# Function to setup Aptos profiles
setup_aptos_profiles() {
    echo -e "${BLUE}Setting up Aptos profiles...${NC}"
    
    # Check if default profile exists
    if ! aptos config show-profiles | grep -q "default"; then
        echo -e "${YELLOW}Creating default profile...${NC}"
        echo -e "${CYAN}Please follow the prompts to create your default profile:${NC}"
        aptos init --profile default
        echo -e "${GREEN}✓ Default profile created${NC}"
    else
        echo -e "${GREEN}✓ Default profile already exists${NC}"
    fi
    
    # Optionally create testnet profile
    echo -e "${YELLOW}Do you want to create a testnet profile? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if ! aptos config show-profiles | grep -q "testnet"; then
            echo -e "${YELLOW}Creating testnet profile...${NC}"
            aptos init --profile testnet --network testnet
            echo -e "${GREEN}✓ Testnet profile created${NC}"
        else
            echo -e "${GREEN}✓ Testnet profile already exists${NC}"
        fi
    fi
    
    # Show available profiles
    echo -e "${CYAN}Available profiles:${NC}"
    aptos config show-profiles
}

# Function to setup project structure
setup_project_structure() {
    echo -e "${BLUE}Setting up project structure...${NC}"
    cd "$CONTRACT_DIR"
    
    # Create necessary directories
    mkdir -p tests
    mkdir -p scripts
    mkdir -p docs
    mkdir -p deployments
    mkdir -p test-results
    mkdir -p coverage
    
    echo -e "${GREEN}✓ Project directories created${NC}"
    
    # Make scripts executable
    if [ -f "scripts/deploy.sh" ]; then
        chmod +x scripts/deploy.sh
        echo -e "${GREEN}✓ deploy.sh made executable${NC}"
    fi
    
    if [ -f "scripts/test.sh" ]; then
        chmod +x scripts/test.sh
        echo -e "${GREEN}✓ test.sh made executable${NC}"
    fi
    
    if [ -f "scripts/setup.sh" ]; then
        chmod +x scripts/setup.sh
        echo -e "${GREEN}✓ setup.sh made executable${NC}"
    fi
}

# Function to create environment configuration
create_env_config() {
    echo -e "${BLUE}Creating environment configuration...${NC}"
    cd "$CONTRACT_DIR"
    
    # Create .env.example file
    cat > .env.example << EOF
# Aptos Synapse Environment Configuration

# Network Configuration
APTOS_NETWORK=devnet
APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com/v1
APTOS_FAUCET_URL=https://faucet.devnet.aptoslabs.com

# Contract Configuration
CONTRACT_ADDRESS=
PACKAGE_NAME=aptos_synapse

# API Keys (Optional)
NODIT_API_KEY=
TAPP_EXCHANGE_API_KEY=
HYPERION_API_KEY=

# Development Settings
DEBUG=true
LOG_LEVEL=info
TEST_TIMEOUT=30000

# Frontend Configuration
NEXT_PUBLIC_APTOS_NETWORK=devnet
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_NODIT_API_KEY=
NEXT_PUBLIC_TAPP_EXCHANGE_API_KEY=
NEXT_PUBLIC_HYPERION_API_KEY=
EOF
    
    echo -e "${GREEN}✓ Environment configuration created${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and configure your settings${NC}"
}

# Function to create development documentation
create_dev_docs() {
    echo -e "${BLUE}Creating development documentation...${NC}"
    cd "$CONTRACT_DIR"
    
    # Create README for contracts
    cat > docs/README.md << EOF
# Aptos Synapse Smart Contracts

This directory contains the smart contracts for the Aptos Synapse protocol.

## Structure

- \`sources/\` - Smart contract source code
  - \`main.move\` - Main protocol contract
  - \`sbt.move\` - Soulbound Token contract
- \`tests/\` - Test files
  - \`main_test.move\` - Tests for main contract
  - \`sbt_test.move\` - Tests for SBT contract
- \`scripts/\` - Deployment and utility scripts
- \`docs/\` - Documentation

## Quick Start

1. **Setup Environment**
   \`\`\`bash
   ./scripts/setup.sh
   \`\`\`

2. **Run Tests**
   \`\`\`bash
   ./scripts/test.sh
   \`\`\`

3. **Deploy Contracts**
   \`\`\`bash
   ./scripts/deploy.sh devnet
   \`\`\`

## Development Workflow

1. Make changes to smart contracts
2. Run tests to ensure functionality
3. Deploy to devnet for testing
4. Deploy to testnet for staging
5. Deploy to mainnet for production

## Available Scripts

- \`setup.sh\` - Setup development environment
- \`test.sh\` - Run comprehensive tests
- \`deploy.sh\` - Deploy contracts to network

## Testing

The project includes comprehensive tests covering:
- Unit tests for individual functions
- Integration tests for contract interactions
- Gas profiling and performance tests
- Security analysis

## Deployment

Contracts can be deployed to:
- **Devnet** - For development and testing
- **Testnet** - For staging and final testing
- **Mainnet** - For production

## Configuration

Copy \`.env.example\` to \`.env\` and configure:
- Network settings
- API keys
- Contract addresses

## Support

For questions and support, please refer to the main project documentation.
EOF
    
    # Create deployment guide
    cat > docs/DEPLOYMENT.md << EOF
# Deployment Guide

This guide covers deploying Aptos Synapse smart contracts.

## Prerequisites

- Aptos CLI installed
- Configured Aptos profile
- Sufficient APT balance for gas fees

## Networks

### Devnet
- **Purpose**: Development and testing
- **Faucet**: Available for free APT
- **Reset**: Periodic resets may occur

### Testnet
- **Purpose**: Staging and final testing
- **Faucet**: Available for free APT
- **Stability**: More stable than devnet

### Mainnet
- **Purpose**: Production deployment
- **Cost**: Real APT required for gas
- **Permanence**: Permanent deployment

## Deployment Steps

1. **Prepare Environment**
   \`\`\`bash
   ./scripts/setup.sh
   \`\`\`

2. **Run Tests**
   \`\`\`bash
   ./scripts/test.sh
   \`\`\`

3. **Deploy to Devnet**
   \`\`\`bash
   ./scripts/deploy.sh devnet
   \`\`\`

4. **Test Deployment**
   \`\`\`bash
   aptos move run --function-id "ADDRESS::main::is_initialized" --profile default
   \`\`\`

5. **Deploy to Testnet**
   \`\`\`bash
   ./scripts/deploy.sh testnet testnet-profile
   \`\`\`

6. **Deploy to Mainnet**
   \`\`\`bash
   ./scripts/deploy.sh mainnet production-profile
   \`\`\`

## Post-Deployment

1. **Update Frontend Configuration**
   - Update contract addresses in frontend
   - Test frontend integration

2. **Verify Deployment**
   - Test contract functions
   - Monitor for errors

3. **Documentation**
   - Update deployment records
   - Share contract addresses with team

## Troubleshooting

### Common Issues

1. **Insufficient Balance**
   - Solution: Fund account from faucet (devnet/testnet) or add APT (mainnet)

2. **Compilation Errors**
   - Solution: Check Move.toml dependencies and syntax

3. **Profile Not Found**
   - Solution: Create profile with \`aptos init --profile PROFILE_NAME\`

4. **Network Connection Issues**
   - Solution: Check network connectivity and node URLs

### Getting Help

- Check Aptos documentation
- Review error messages carefully
- Test on devnet first
- Consult team members
EOF
    
    echo -e "${GREEN}✓ Development documentation created${NC}"
}

# Function to verify installation
verify_installation() {
    echo -e "${BLUE}Verifying installation...${NC}"
    
    local all_good=true
    
    # Check Rust
    if command_exists rustc; then
        echo -e "${GREEN}✓ Rust: $(rustc --version)${NC}"
    else
        echo -e "${RED}✗ Rust not found${NC}"
        all_good=false
    fi
    
    # Check Node.js
    if command_exists node; then
        echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"
    else
        echo -e "${YELLOW}⚠ Node.js not found (optional)${NC}"
    fi
    
    # Check Aptos CLI
    if command_exists aptos; then
        echo -e "${GREEN}✓ Aptos CLI: $(aptos --version)${NC}"
    else
        echo -e "${RED}✗ Aptos CLI not found${NC}"
        all_good=false
    fi
    
    # Check additional tools
    if command_exists jq; then
        echo -e "${GREEN}✓ jq: $(jq --version)${NC}"
    else
        echo -e "${YELLOW}⚠ jq not found (recommended)${NC}"
    fi
    
    if command_exists bc; then
        echo -e "${GREEN}✓ bc: available${NC}"
    else
        echo -e "${YELLOW}⚠ bc not found (recommended)${NC}"
    fi
    
    # Test compilation
    echo -e "${BLUE}Testing contract compilation...${NC}"
    cd "$CONTRACT_DIR"
    if aptos move compile --profile default &>/dev/null; then
        echo -e "${GREEN}✓ Contract compilation successful${NC}"
    else
        echo -e "${RED}✗ Contract compilation failed${NC}"
        all_good=false
    fi
    
    if [ "$all_good" = true ]; then
        echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
        return 0
    else
        echo -e "${RED}⚠ Setup completed with some issues${NC}"
        return 1
    fi
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo -e "${GREEN}=== Next Steps ===${NC}"
    echo -e "${YELLOW}1. Configure Environment:${NC}"
    echo -e "   cp .env.example .env"
    echo -e "   # Edit .env with your settings"
    echo ""
    echo -e "${YELLOW}2. Run Tests:${NC}"
    echo -e "   ./scripts/test.sh"
    echo ""
    echo -e "${YELLOW}3. Deploy to Devnet:${NC}"
    echo -e "   ./scripts/deploy.sh devnet"
    echo ""
    echo -e "${YELLOW}4. Setup Frontend:${NC}"
    echo -e "   cd ../../frontend"
    echo -e "   npm install"
    echo -e "   npm run dev"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo -e "   • Contract docs: docs/README.md"
    echo -e "   • Deployment guide: docs/DEPLOYMENT.md"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution function
main() {
    echo -e "${BLUE}Starting setup process...${NC}"
    echo ""
    
    # Detect OS
    local os=$(detect_os)
    echo -e "${CYAN}Detected OS: $os${NC}"
    echo ""
    
    # Install dependencies
    install_homebrew
    install_rust
    install_nodejs
    install_aptos_cli
    install_additional_tools
    
    # Setup Aptos
    setup_aptos_profiles
    
    # Setup project
    setup_project_structure
    create_env_config
    create_dev_docs
    
    # Verify everything
    verify_installation
    
    # Show next steps
    show_next_steps
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --deps-only       Only install dependencies"
        echo "  --project-only    Only setup project structure"
        echo "  --verify-only     Only verify installation"
        echo "  --help, -h        Show this help message"
        echo ""
        echo "This script sets up the complete development environment for Aptos Synapse."
        exit 0
        ;;
    --deps-only)
        install_homebrew
        install_rust
        install_nodejs
        install_aptos_cli
        install_additional_tools
        verify_installation
        exit $?
        ;;
    --project-only)
        setup_project_structure
        create_env_config
        create_dev_docs
        exit 0
        ;;
    --verify-only)
        verify_installation
        exit $?
        ;;
    *)
        main
        exit $?
        ;;
esac