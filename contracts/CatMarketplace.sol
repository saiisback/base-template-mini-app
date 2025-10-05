// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CatMarketplace
 * @notice Minimal marketplace contract that lists a single collectible item for sale.
 *         The item behaves like a token in the app – once it is purchased, it is
 *         marked as unavailable until the seller manually relists it.
 */
contract CatMarketplace {
    struct Item {
        uint256 id;
        string name;
        string metadataURI;
        uint256 price; // price denominated in wei
        address seller;
        bool available;
    }

    Item public catItem;
    address public immutable treasury;

    event ItemPurchased(address indexed buyer, uint256 price);
    event ItemRelisted(uint256 price);

    /**
     * @param metadataURI URI that describes the item (can point to IPFS/Arweave/etc.).
     * @param price Price in wei that the item should be sold for.
     */
    constructor(string memory metadataURI, uint256 price) {
        require(price > 0, "Price must be greater than zero");

        treasury = msg.sender;
        catItem = Item({
            id: 1,
            name: "Catnip Infinity Fish",
            metadataURI: metadataURI,
            price: price,
            seller: msg.sender,
            available: true
        });
    }

    /**
     * @notice Purchase the single marketplace item.
     *         Buyer must send exactly the listed price in ETH.
     */
    function purchase() external payable {
        require(catItem.available, "Item unavailable");
        require(msg.value == catItem.price, "Incorrect payment amount");

        // mark item as sold
        _setAvailability(false);

        // forward funds to seller/treasury
        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Payment transfer failed");

        emit ItemPurchased(msg.sender, msg.value);
    }

    /**
     * @notice Relist the item for sale after it has been purchased. Only the seller can relist.
     * @param newPrice New price in wei for the item.
     */
    function relist(uint256 newPrice) external {
        require(msg.sender == treasury, "Only seller");
        require(newPrice > 0, "Invalid price");

        catItem.price = newPrice;
        _setAvailability(true);

        emit ItemRelisted(newPrice);
    }

    /**
     * @return snapshot of the marketplace item, to be consumed by off-chain clients.
     */
    function getItem() external view returns (Item memory) {
        return catItem;
    }

    function _setAvailability(bool available) internal {
        catItem.available = available;
    }
}

