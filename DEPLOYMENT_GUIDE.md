# 🚀 Smart Contract Deployment Guide

## 📋 Prerequisites

### 1. Get Base Sepolia Testnet ETH
You need testnet ETH to deploy the contract. Here's how to get it:

#### Option A: Base Sepolia Faucet
1. Go to: https://www.coinbase.com/faucets/base-sepolia-faucet
2. Connect your wallet
3. Request testnet ETH (you'll get ~0.05 ETH)

#### Option B: Sepolia ETH Bridge
1. Get Sepolia ETH from: https://sepoliafaucet.com/
2. Bridge to Base Sepolia: https://bridge.base.org/deposit

### 2. Add Base Sepolia to Your Wallet
**Network Details:**
- Network Name: Base Sepolia
- RPC URL: https://sepolia.base.org
- Chain ID: 84532
- Currency Symbol: ETH
- Block Explorer: https://sepolia.basescan.org

## 🔑 Setup Your Private Key

### 1. Export Your Private Key
**⚠️ SECURITY WARNING: Never share your private key or commit it to git!**

**For MetaMask:**
1. Click on your account name → Account Details
2. Click "Show private key"
3. Enter your password
4. Copy the private key

**For Coinbase Wallet:**
1. Settings → Developer Settings
2. Show private key
3. Copy the private key

### 2. Add to Environment File
Create/update your `.env` file:

```bash
# Add your private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: BaseScan API key for contract verification
BASESCAN_API_KEY=your_basescan_api_key
```

## 🚀 Deploy the Contract

### 1. Compile the Contract
```bash
npx hardhat compile
```

### 2. Deploy to Base Sepolia
```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

### 3. Expected Output
```
🚀 Deploying CatMarketplace contract...
📋 Deployment parameters:
- metadataURI: catnif
- price: 0.001 ETH
⏳ Waiting for deployment...
✅ CatMarketplace deployed to: 0x1234567890123456789012345678901234567890
👤 Deployed by: 0xYourWalletAddress
💰 Deployer balance: 0.049 ETH
🎯 Contract verification:
- Item ID: 1
- Item name: Catnip Infinity Fish
- Item price: 0.001 ETH
- Item available: true
- Seller: 0xYourWalletAddress
```

### 4. Update Your App
Add the contract address to your `.env` file:
```bash
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_MARKETPLACE_CHAIN_ID=84532
```

## 🔍 Verify Your Contract (Optional)

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> "catnif" "1000000000000000"
```

## 🎯 Test Your Deployment

1. **Check on BaseScan:** https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
2. **Test in your app:** The marketplace should now load and show the item
3. **Try purchasing:** Connect your wallet and attempt a purchase

## 🛠 Troubleshooting

### "Insufficient funds" error
- Make sure you have enough Base Sepolia ETH
- Gas costs are usually ~0.001-0.002 ETH

### "Network not supported" error
- Ensure your wallet is connected to Base Sepolia (Chain ID: 84532)
- Check the RPC URL is correct

### "Private key not found" error
- Make sure your `.env` file has the `PRIVATE_KEY` variable
- Ensure the private key doesn't have the `0x` prefix
- Restart your terminal after adding the private key

### Contract verification fails
- Wait a few minutes after deployment
- Make sure constructor parameters match exactly
- Get a BaseScan API key from https://basescan.org/apis

## 🎉 Success!

Once deployed, your marketplace will be live on Base Sepolia testnet! Users can:
- View the "Catnip Infinity Fish" item
- Purchase it for 0.001 ETH
- See ownership status
- You (as the deployer) can relist the item after it's sold

The contract address will be permanent on the testnet, so you can use it for testing and development.
