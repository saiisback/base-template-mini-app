const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying CatMarketplace contract...");

  // Get the contract factory
  const CatMarketplace = await ethers.getContractFactory("CatMarketplace");

  // Constructor parameters
  const metadataURI = "catnif";
  const price = ethers.parseEther("0.001"); // 0.001 ETH in wei (more reasonable for testnet)

  console.log("📋 Deployment parameters:");
  console.log("- metadataURI:", metadataURI);
  console.log("- price:", ethers.formatEther(price), "ETH");

  // Deploy the contract
  const contract = await CatMarketplace.deploy(metadataURI, price);
  
  console.log("⏳ Waiting for deployment...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ CatMarketplace deployed to:", contractAddress);

  // Get deployer info
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployed by:", deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Verify the deployment by calling getItem
  try {
    const item = await contract.getItem();
    console.log("🎯 Contract verification:");
    console.log("- Item ID:", item.id.toString());
    console.log("- Item name:", item.name);
    console.log("- Item price:", ethers.formatEther(item.price), "ETH");
    console.log("- Item available:", item.available);
    console.log("- Seller:", item.seller);
  } catch (error) {
    console.log("❌ Contract verification failed:", error.message);
  }

  console.log("\n📝 Next steps:");
  console.log("1. Add this to your .env file:");
  console.log(`NEXT_PUBLIC_MARKETPLACE_ADDRESS=${contractAddress}`);
  console.log("NEXT_PUBLIC_MARKETPLACE_CHAIN_ID=84532");
  console.log("\n2. Verify on BaseScan (optional):");
  console.log(`npx hardhat verify --network baseSepolia ${contractAddress} "${metadataURI}" "${price}"`);
  console.log("\n3. View on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });