# Aptos Synapse - Cross-chain DeFi Hub

🏆 **DoraHacks Aptos CtrlMove Hackathon Submission**

Aptos Synapse is a comprehensive DeFi platform built on Aptos blockchain, featuring lending protocols, cross-chain bridges, token swaps, and advanced analytics.

## 🌟 Features

### Core DeFi Features
- **Lending & Borrowing**: Secure over-collateralized lending with automated liquidation
- **Cross-chain Bridge**: Seamless asset bridging powered by Kana Labs
- **Token Swaps**: Integrated DEX functionality via Tapp.Exchange
- **Analytics Dashboard**: Real-time insights powered by Hyperion
- **SBT Integration**: Soul Bound Tokens for reputation and governance

### Sponsor Integrations
- **🌉 Kana Labs**: Cross-chain bridge infrastructure
- **📊 Nodit**: Aptos blockchain data and analytics
- **🔄 Tapp.Exchange**: DEX aggregation and optimal swap routes
- **📈 Hyperion**: Advanced DeFi analytics and insights

## 🏗️ Architecture

```
aptos_synapse/
├── contracts/           # Move smart contracts
│   └── aptos_synapse/
│       ├── sources/
│       │   ├── main.move      # Main lending protocol
│       │   └── sbt.move       # Soul Bound Token implementation
│       └── Move.toml
├── frontend/            # Next.js frontend application
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/       # React components
│   │   │   ├── WalletProvider.tsx
│   │   │   ├── WalletButton.tsx
│   │   │   ├── Bridge.tsx
│   │   │   ├── Swap.tsx
│   │   │   ├── Lending.tsx
│   │   │   └── Analytics.tsx
│   │   └── lib/              # API integrations
│   │       ├── kana-labs.ts
│   │       ├── nodit.ts
│   │       ├── tapp-exchange.ts
│   │       └── hyperion.ts
│   └── package.json
├── scripts/             # Deployment and utility scripts
└── vercel.json         # Vercel deployment configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Aptos CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aptos_synapse
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Deploy smart contracts**
   ```bash
   cd ../contracts/aptos_synapse
   aptos move publish --named-addresses aptos_synapse=default
   ```

5. **Start development server**
   ```bash
   cd ../../frontend
   npm run dev
   ```

6. **Open application**
   Navigate to `http://localhost:3000`

## 📱 Usage

### Wallet Connection
1. Click "Connect Wallet" in the top right
2. Select your preferred Aptos wallet
3. Approve the connection

### Lending & Borrowing
1. Navigate to the Lending section
2. Choose "Supply" or "Borrow"
3. Select asset and enter amount
4. Confirm transaction

### Cross-chain Bridge
1. Go to Bridge section
2. Select source and destination chains
3. Enter amount to bridge
4. Confirm bridge transaction

### Token Swaps
1. Access Swap section
2. Select input and output tokens
3. Enter swap amount
4. Execute swap

## 🔧 Configuration

### Environment Variables

```env
# Aptos Network
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
NEXT_PUBLIC_APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com

# Smart Contracts
NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_SBT_CONTRACT_ADDRESS=0x...

# Sponsor APIs
NEXT_PUBLIC_KANA_LABS_API_URL=https://api.kanalabs.io/v1
NEXT_PUBLIC_NODIT_API_URL=https://aptos-testnet.nodit.io
NEXT_PUBLIC_TAPP_EXCHANGE_API_URL=https://api.tapp.exchange/v1
NEXT_PUBLIC_HYPERION_API_URL=https://api.hyperion.xyz/v1
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   - Go to Vercel dashboard
   - Navigate to project settings
   - Add environment variables from `.env.example`

### Manual Deployment

1. **Build the application**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to your hosting provider**
   Upload the `frontend/.next` directory

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run test
```

### Smart Contract Testing
```bash
cd contracts/aptos_synapse
aptos move test
```

## 📊 Sponsor Integration Details

### Kana Labs Integration
- **Purpose**: Cross-chain asset bridging
- **Features**: Multi-chain support, optimal routing
- **Implementation**: `src/lib/kana-labs.ts`, `src/components/Bridge.tsx`

### Nodit Integration
- **Purpose**: Aptos blockchain data access
- **Features**: Account info, transaction history, gas estimation
- **Implementation**: `src/lib/nodit.ts`

### Tapp.Exchange Integration
- **Purpose**: DEX aggregation and token swaps
- **Features**: Best price routing, slippage protection
- **Implementation**: `src/lib/tapp-exchange.ts`, `src/components/Swap.tsx`

### Hyperion Integration
- **Purpose**: DeFi analytics and insights
- **Features**: Protocol metrics, user analytics, token data
- **Implementation**: `src/lib/hyperion.ts`, `src/components/Analytics.tsx`

## 🔐 Security

- Smart contracts use over-collateralization
- Automated liquidation mechanisms
- Secure wallet integration
- Input validation and sanitization
- Rate limiting on API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🏆 Hackathon Submission

**Event**: DoraHacks Aptos CtrlMove Hackathon  
**Category**: DeFi Infrastructure  
**Team**: Aptos Synapse  

### Key Innovations
1. **Unified DeFi Hub**: All-in-one platform for lending, bridging, and swapping
2. **Multi-Sponsor Integration**: Leveraging 4 different sponsor technologies
3. **Cross-chain Compatibility**: Seamless asset movement between chains
4. **Advanced Analytics**: Real-time insights and metrics
5. **Soul Bound Tokens**: Reputation and governance system

### Demo
- **Live Demo**: [Deployed URL]
- **Video Demo**: [Video URL]
- **Presentation**: [Slides URL]

## 📞 Contact

- **GitHub**: [Repository URL]
- **Demo**: [Live Demo URL]
- **Documentation**: [Docs URL]

---

**Built with ❤️ for the Aptos ecosystem**