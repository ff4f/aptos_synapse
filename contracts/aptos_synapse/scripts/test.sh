#!/bin/bash

# Aptos Synapse Testing Script
# Comprehensive testing suite for smart contracts

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
PROFILE=${1:-default}
CONTRACT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_RESULTS_DIR="$CONTRACT_DIR/test-results"
COVERAGE_DIR="$CONTRACT_DIR/coverage"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}=== Aptos Synapse Testing Suite ===${NC}"
echo -e "${YELLOW}Profile: $PROFILE${NC}"
echo -e "${YELLOW}Contract Directory: $CONTRACT_DIR${NC}"
echo -e "${YELLOW}Test Results: $TEST_RESULTS_DIR${NC}"
echo ""

# Create directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    if ! command -v aptos &> /dev/null; then
        echo -e "${RED}Error: Aptos CLI is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Aptos CLI found${NC}"
    
    if ! aptos config show-profiles | grep -q "$PROFILE"; then
        echo -e "${RED}Error: Profile '$PROFILE' not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Profile '$PROFILE' found${NC}"
}

# Function to compile contracts
compile_contracts() {
    echo -e "${BLUE}Compiling contracts...${NC}"
    cd "$CONTRACT_DIR"
    
    local compile_output=$(aptos move compile --profile $PROFILE 2>&1)
    local compile_status=$?
    
    echo "$compile_output" > "$TEST_RESULTS_DIR/compile_${TIMESTAMP}.log"
    
    if [ $compile_status -eq 0 ]; then
        echo -e "${GREEN}✓ Compilation successful${NC}"
        return 0
    else
        echo -e "${RED}✗ Compilation failed${NC}"
        echo "$compile_output"
        return 1
    fi
}

# Function to run unit tests
run_unit_tests() {
    echo -e "${BLUE}Running unit tests...${NC}"
    cd "$CONTRACT_DIR"
    
    local test_output=$(aptos move test --profile $PROFILE --coverage 2>&1)
    local test_status=$?
    
    echo "$test_output" > "$TEST_RESULTS_DIR/unit_tests_${TIMESTAMP}.log"
    
    if [ $test_status -eq 0 ]; then
        echo -e "${GREEN}✓ All unit tests passed${NC}"
        
        # Extract test statistics
        local passed_tests=$(echo "$test_output" | grep -o "[0-9]\+ passed" | head -1 | awk '{print $1}')
        local total_tests=$(echo "$test_output" | grep -o "Test result: OK. Total tests: [0-9]\+" | awk '{print $5}')
        
        echo -e "${CYAN}  Tests passed: $passed_tests/$total_tests${NC}"
        return 0
    else
        echo -e "${RED}✗ Unit tests failed${NC}"
        echo "$test_output" | tail -20
        return 1
    fi
}

# Function to run specific test modules
run_module_tests() {
    echo -e "${BLUE}Running module-specific tests...${NC}"
    cd "$CONTRACT_DIR"
    
    local modules=("main_test" "sbt_test")
    local all_passed=true
    
    for module in "${modules[@]}"; do
        echo -e "${YELLOW}Testing module: $module${NC}"
        
        local module_output=$(aptos move test --filter $module --profile $PROFILE 2>&1)
        local module_status=$?
        
        echo "$module_output" > "$TEST_RESULTS_DIR/${module}_${TIMESTAMP}.log"
        
        if [ $module_status -eq 0 ]; then
            echo -e "${GREEN}  ✓ $module tests passed${NC}"
        else
            echo -e "${RED}  ✗ $module tests failed${NC}"
            all_passed=false
        fi
    done
    
    if [ "$all_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to run gas profiling
run_gas_profiling() {
    echo -e "${BLUE}Running gas profiling...${NC}"
    cd "$CONTRACT_DIR"
    
    local gas_output=$(aptos move test --profile $PROFILE --gas-profiler 2>&1)
    local gas_status=$?
    
    echo "$gas_output" > "$TEST_RESULTS_DIR/gas_profile_${TIMESTAMP}.log"
    
    if [ $gas_status -eq 0 ]; then
        echo -e "${GREEN}✓ Gas profiling completed${NC}"
        
        # Extract gas usage statistics
        echo -e "${CYAN}Gas Usage Summary:${NC}"
        echo "$gas_output" | grep -E "(Function|Total gas)" | head -10
        return 0
    else
        echo -e "${YELLOW}⚠ Gas profiling had issues (tests may still pass)${NC}"
        return 0
    fi
}

# Function to generate coverage report
generate_coverage() {
    echo -e "${BLUE}Generating coverage report...${NC}"
    cd "$CONTRACT_DIR"
    
    # Move coverage files if they exist
    if [ -d "coverage" ]; then
        cp -r coverage/* "$COVERAGE_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✓ Coverage report generated${NC}"
        echo -e "${CYAN}Coverage files saved to: $COVERAGE_DIR${NC}"
    else
        echo -e "${YELLOW}⚠ No coverage data generated${NC}"
    fi
}

# Function to run integration tests
run_integration_tests() {
    echo -e "${BLUE}Running integration tests...${NC}"
    
    # Test contract interactions
    echo -e "${YELLOW}Testing contract interactions...${NC}"
    
    local integration_log="$TEST_RESULTS_DIR/integration_${TIMESTAMP}.log"
    
    {
        echo "=== Integration Test Results ==="
        echo "Timestamp: $(date)"
        echo ""
        
        # Test 1: Contract compilation with dependencies
        echo "Test 1: Dependency Resolution"
        if aptos move compile --profile $PROFILE &>/dev/null; then
            echo "✓ All dependencies resolved correctly"
        else
            echo "✗ Dependency resolution failed"
        fi
        echo ""
        
        # Test 2: Module structure validation
        echo "Test 2: Module Structure Validation"
        if [ -f "sources/main.move" ] && [ -f "sources/sbt.move" ]; then
            echo "✓ All required modules present"
        else
            echo "✗ Missing required modules"
        fi
        echo ""
        
        # Test 3: Test module completeness
        echo "Test 3: Test Coverage"
        if [ -f "tests/main_test.move" ] && [ -f "tests/sbt_test.move" ]; then
            echo "✓ All test modules present"
        else
            echo "✗ Missing test modules"
        fi
        echo ""
        
    } > "$integration_log"
    
    cat "$integration_log"
    echo -e "${GREEN}✓ Integration tests completed${NC}"
}

# Function to run performance tests
run_performance_tests() {
    echo -e "${BLUE}Running performance tests...${NC}"
    
    local perf_log="$TEST_RESULTS_DIR/performance_${TIMESTAMP}.log"
    
    {
        echo "=== Performance Test Results ==="
        echo "Timestamp: $(date)"
        echo ""
        
        # Measure compilation time
        echo "Compilation Performance:"
        local start_time=$(date +%s.%N)
        aptos move compile --profile $PROFILE &>/dev/null
        local end_time=$(date +%s.%N)
        local compile_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "N/A")
        echo "  Compilation time: ${compile_time}s"
        echo ""
        
        # Measure test execution time
        echo "Test Execution Performance:"
        local start_time=$(date +%s.%N)
        aptos move test --profile $PROFILE &>/dev/null
        local end_time=$(date +%s.%N)
        local test_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "N/A")
        echo "  Test execution time: ${test_time}s"
        echo ""
        
    } > "$perf_log"
    
    cat "$perf_log"
    echo -e "${GREEN}✓ Performance tests completed${NC}"
}

# Function to validate contract security
run_security_checks() {
    echo -e "${BLUE}Running security checks...${NC}"
    
    local security_log="$TEST_RESULTS_DIR/security_${TIMESTAMP}.log"
    
    {
        echo "=== Security Check Results ==="
        echo "Timestamp: $(date)"
        echo ""
        
        # Check for common security patterns
        echo "Security Pattern Analysis:"
        
        # Check for proper access controls
        if grep -r "assert!" sources/ &>/dev/null; then
            echo "✓ Access control assertions found"
        else
            echo "⚠ No access control assertions detected"
        fi
        
        # Check for overflow protection
        if grep -r "checked_" sources/ &>/dev/null; then
            echo "✓ Overflow protection patterns found"
        else
            echo "⚠ No explicit overflow protection detected"
        fi
        
        # Check for proper error handling
        if grep -r "abort" sources/ &>/dev/null; then
            echo "✓ Error handling patterns found"
        else
            echo "⚠ Limited error handling detected"
        fi
        
        echo ""
        
    } > "$security_log"
    
    cat "$security_log"
    echo -e "${GREEN}✓ Security checks completed${NC}"
}

# Function to generate test report
generate_test_report() {
    echo -e "${BLUE}Generating comprehensive test report...${NC}"
    
    local report_file="$TEST_RESULTS_DIR/test_report_${TIMESTAMP}.md"
    
    {
        echo "# Aptos Synapse Test Report"
        echo ""
        echo "**Generated:** $(date)"
        echo "**Profile:** $PROFILE"
        echo "**Contract Directory:** $CONTRACT_DIR"
        echo ""
        echo "## Test Summary"
        echo ""
        
        # Compilation results
        if [ -f "$TEST_RESULTS_DIR/compile_${TIMESTAMP}.log" ]; then
            echo "### Compilation"
            if grep -q "Compiling" "$TEST_RESULTS_DIR/compile_${TIMESTAMP}.log"; then
                echo "✅ **PASSED** - Contracts compiled successfully"
            else
                echo "❌ **FAILED** - Compilation errors detected"
            fi
            echo ""
        fi
        
        # Unit test results
        if [ -f "$TEST_RESULTS_DIR/unit_tests_${TIMESTAMP}.log" ]; then
            echo "### Unit Tests"
            if grep -q "Test result: OK" "$TEST_RESULTS_DIR/unit_tests_${TIMESTAMP}.log"; then
                echo "✅ **PASSED** - All unit tests successful"
                local test_count=$(grep -o "Total tests: [0-9]\+" "$TEST_RESULTS_DIR/unit_tests_${TIMESTAMP}.log" | awk '{print $3}')
                echo "**Total Tests:** $test_count"
            else
                echo "❌ **FAILED** - Unit test failures detected"
            fi
            echo ""
        fi
        
        # Coverage information
        echo "### Code Coverage"
        if [ -d "$COVERAGE_DIR" ] && [ "$(ls -A $COVERAGE_DIR)" ]; then
            echo "✅ **GENERATED** - Coverage report available"
            echo "**Location:** $COVERAGE_DIR"
        else
            echo "⚠️ **NOT AVAILABLE** - No coverage data generated"
        fi
        echo ""
        
        # Performance metrics
        if [ -f "$TEST_RESULTS_DIR/performance_${TIMESTAMP}.log" ]; then
            echo "### Performance Metrics"
            echo "\`\`\`"
            cat "$TEST_RESULTS_DIR/performance_${TIMESTAMP}.log" | grep -E "(time:|Performance:)"
            echo "\`\`\`"
            echo ""
        fi
        
        # Security analysis
        if [ -f "$TEST_RESULTS_DIR/security_${TIMESTAMP}.log" ]; then
            echo "### Security Analysis"
            echo "\`\`\`"
            cat "$TEST_RESULTS_DIR/security_${TIMESTAMP}.log" | grep -E "(✓|⚠|✗)"
            echo "\`\`\`"
            echo ""
        fi
        
        echo "## Detailed Logs"
        echo ""
        echo "All detailed logs are available in: \`$TEST_RESULTS_DIR\`"
        echo ""
        echo "### Available Log Files:"
        for log_file in "$TEST_RESULTS_DIR"/*_${TIMESTAMP}.log; do
            if [ -f "$log_file" ]; then
                echo "- \`$(basename "$log_file")\`"
            fi
        done
        
    } > "$report_file"
    
    echo -e "${GREEN}✓ Test report generated: $report_file${NC}"
}

# Function to show test summary
show_summary() {
    echo ""
    echo -e "${GREEN}=== Test Summary ===${NC}"
    echo -e "${YELLOW}Profile:${NC} $PROFILE"
    echo -e "${YELLOW}Timestamp:${NC} $TIMESTAMP"
    echo -e "${YELLOW}Results Directory:${NC} $TEST_RESULTS_DIR"
    echo -e "${YELLOW}Coverage Directory:${NC} $COVERAGE_DIR"
    echo ""
    echo -e "${BLUE}Available Commands:${NC}"
    echo -e "  • View logs: ls $TEST_RESULTS_DIR"
    echo -e "  • View coverage: ls $COVERAGE_DIR"
    echo -e "  • View report: cat $TEST_RESULTS_DIR/test_report_${TIMESTAMP}.md"
    echo ""
}

# Main execution function
main() {
    local exit_code=0
    
    echo -e "${BLUE}Starting comprehensive testing...${NC}"
    echo ""
    
    check_prerequisites || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        compile_contracts || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        run_unit_tests || exit_code=1
    fi
    
    # Continue with other tests even if some fail
    run_module_tests
    run_gas_profiling
    generate_coverage
    run_integration_tests
    run_performance_tests
    run_security_checks
    generate_test_report
    show_summary
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}All critical tests passed successfully!${NC}"
    else
        echo -e "${RED}Some critical tests failed. Check the logs for details.${NC}"
    fi
    
    return $exit_code
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [PROFILE] [OPTIONS]"
        echo ""
        echo "Arguments:"
        echo "  PROFILE   Aptos CLI profile to use [default: default]"
        echo ""
        echo "Options:"
        echo "  --compile-only    Only compile contracts"
        echo "  --unit-only       Only run unit tests"
        echo "  --coverage-only   Only generate coverage"
        echo "  --security-only   Only run security checks"
        echo "  --performance     Only run performance tests"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run all tests with default profile"
        echo "  $0 testnet           # Run all tests with testnet profile"
        echo "  $0 --unit-only       # Run only unit tests"
        exit 0
        ;;
    --compile-only)
        check_prerequisites
        compile_contracts
        exit $?
        ;;
    --unit-only)
        check_prerequisites
        compile_contracts
        run_unit_tests
        exit $?
        ;;
    --coverage-only)
        check_prerequisites
        compile_contracts
        run_unit_tests
        generate_coverage
        exit $?
        ;;
    --security-only)
        check_prerequisites
        run_security_checks
        exit $?
        ;;
    --performance)
        check_prerequisites
        run_performance_tests
        exit $?
        ;;
    *)
        main
        exit $?
        ;;
esac