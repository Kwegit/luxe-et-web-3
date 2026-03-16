// script/Mint.s.sol

pragma solidity ^0.8.24;
import { Script } from "forge-std/Script.sol";
import { NFCBrandRegistry } from "./contract.sol";

contract MintScript is Script {
    function run() external {
        vm.startBroadcast();
        NFCBrandRegistry nft = NFCBrandRegistry(
            0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f  // Adresse du contrat déployé en local
        );
        // Note: Le contrat utilise registerInitialPurchase au lieu de safeMint
        // Adaptez selon vos besoins : exemple de premier achat
        nft.registerInitialPurchase(
            msg.sender,                                   // clientWallet
            1,                                            // nfcTokenId
            "Buyer Name",                                 // buyerName
            "Object Name",                                // objectName
            1000000000000000000                          // salePrice (en wei)
        );
        vm.stopBroadcast();
    }
}
