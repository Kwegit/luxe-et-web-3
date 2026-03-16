// script/Mint.s.sol

pragma solidity ^0.8.24;
import { Script } from "forge-std/Script.sol";
import { NFCBrandRegistry } from "./contract.sol";

contract MintScript is Script {
    function run() external {
        vm.startBroadcast();
        NFCBrandRegistry nft = NFCBrandRegistry(
            0xC469e7aE4aD962c30c7111dc580B4adbc7E914DD  // Adresse du contrat déployé en local
        );
        // Note: Le contrat utilise registerInitialPurchase au lieu de safeMint
        // Adaptez selon vos besoins : exemple de premier achat
        nft.registerInitialPurchase(
            msg.sender,                                   // clientWallet
            1,                                            // nfcTokenId
            "Buyer Name",                                 // buyerName
            "Object Name",                                // objectName
            1000000000000000000,                         // salePrice (en wei)
            "ipfs://QmfDXT7G5vPihiijqcbT4rjPu8p5gszj2fszMgxBZc4YWB" // tokenURI
        );
        vm.stopBroadcast();
    }
}
