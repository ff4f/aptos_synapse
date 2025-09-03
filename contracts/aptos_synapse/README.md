# Aptos Synapse Protocol - Smart Contracts

Aptos Synapse is a revolutionary DeFi protocol that combines lending/borrowing with a reputation-based Soulbound Token (SBT) system on the Aptos blockchain.

## 🚀 Features

### Lending Protocol (`main.move`)
- **Collateralized Lending**: Users can deposit APT as collateral
- **Stablecoin Borrowing**: Borrow stablecoins against collateral
- **Dynamic Interest Rates**: Interest rates adjust based on utilization
- **Liquidation System**: Automated liquidation for undercollateralized positions
- **Reputation Integration**: Better rates for users with higher reputation

### Soulbound Token System (`sbt.move`)
- **Reputation Tracking**: Non-transferable tokens that track user reputation
- **Tiered System**: Bronze, Silver, Gold, Platinum reputation levels
- **Dynamic Scoring**: Reputation increases with protocol usage
- **Multiplier Benefits**: Higher reputation = better borrowing rates
- **Analytics**: Comprehensive reputation analytics and tracking

## 📋 Contract Overview

### Main Protocol Functions

```move
// Initialize the lending protocol
public fun initialize(admin: &signer)

// Deposit APT as collateral
public fun deposit_collateral(user: &signer, amount: u64)

// Borrow stablecoins against collateral
public fun borrow_stable(user: &signer, amount: u64)

// Repay borrowed amount
public fun repay_loan(user: &signer, amount: u64)

// Withdraw collateral (if not over-borrowed)
public fun withdraw_collateral(user: &signer, amount: u64)

// Liquidate undercollateralized position
public fun liquidate(liquidator: &signer, borrower: address)
```

### SBT System Functions

```move
// Initialize SBT system
public fun initialize(admin: &signer)

// Mint reputation SBT for user
public fun mint_reputation_sbt(admin: &signer, user: address, initial_score: u64)

// Update user reputation
public fun update_reputation(admin: &signer, user: address, new_score: u64)

// Get user reputation details
public fun get_user_reputation(user: address): (u64, String, u64, u64)

// Get reputation multiplier for better rates
public fun get_reputation_multiplier(user: address): u64
```

## 🛠 Deployment

### Prerequisites
- Aptos CLI installed
- Aptos account with sufficient APT for gas
- Move compiler

### Steps

1. **Compile the contracts**:
```bash
aptos move compile
```

2. **Run tests**:
```bash
aptos move test --skip-fetch-latest-git-deps
```

3. **Deploy to testnet**:
```bash
aptos move publish --named-addresses aptos_synapse=<YOUR_ADDRESS>
```

4. **Initialize the protocol**:
```bash
aptos move run-script --script-path scripts/deploy_production.move
```

## 🧪 Testing

The project includes comprehensive tests:

- `simple_test.move`: Basic initialization test
- `comprehensive_test.move`: Full protocol flow testing
  - SBT system functionality
  - Lending protocol operations
  - Integration between systems

Run tests with:
```bash
aptos move test --skip-fetch-latest-git-deps
```

## 📊 Reputation System

### Reputation Levels
- **Bronze**: 0-499 points
- **Silver**: 500-999 points  
- **Gold**: 1000-1999 points
- **Platinum**: 2000+ points

### Reputation Benefits
- **Bronze**: 100% base interest rate
- **Silver**: 95% interest rate (5% discount)
- **Gold**: 90% interest rate (10% discount)
- **Platinum**: 85% interest rate (15% discount)

### Earning Reputation
- Successful loan repayments
- Long-term protocol usage
- Maintaining healthy collateral ratios
- Community participation

## 🔒 Security Features

- **Collateral Requirements**: Minimum 150% collateralization ratio
- **Liquidation Protection**: Automatic liquidation at 120% ratio
- **Access Controls**: Admin-only functions for critical operations
- **Overflow Protection**: Safe math operations throughout
- **Reentrancy Guards**: Protection against reentrancy attacks

## 🌐 Integration

This smart contract is designed to integrate with:
- **Frontend Dashboard**: React-based user interface
- **Cross-chain Bridges**: Kana Labs integration
- **Multi-wallet Support**: Petra, Martian, MetaMask
- **Analytics**: Hyperion client for reputation tracking

## 📈 Protocol Metrics

The protocol tracks:
- Total Value Locked (TVL)
- Total Borrowed Amount
- Number of Active Users
- Average Reputation Score
- Liquidation Events
- Interest Rate History

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Aptos Documentation](https://aptos.dev/)
- [Move Language Guide](https://move-language.github.io/move/)
- [Hackathon Details](https://dorahacks.io/hackathon/aptos-ctrlmove-hackathon/detail)

---

**Built for Aptos CTRL+MOVE Hackathon** 🚀