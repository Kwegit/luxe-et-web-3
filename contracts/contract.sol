// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract NFCBrandRegistry is ERC721, Ownable {

    // Structure des informations pour une transaction (achat ou revente)
    struct SaleInfo {
        string buyerName;
        uint256 salePrice;
        uint256 date;
    }

    // Nom de l'objet physique (immuable)
    mapping(uint256 => string) public objectNames;

    // Historique complet des ventes pour chaque puce NFC
    mapping(uint256 => SaleInfo[]) private tokenSalesHistory;

    // Événement pour tracer facilement les transactions sur la blockchain
    event ItemSold(uint256 indexed tokenId, address toWallet, string buyerName, uint256 price, bool isResale);

    /**
     * @dev Initialisation du contrat. (Plus besoin du wallet de la marque ici)
     */
    constructor() ERC721("NFC Brand Registry", "NFCB") Ownable(msg.sender) {}

    /**
     * @dev 1. PREMIER ACHAT : Création du NFT et envoi DIRECTEMENT SUR LE WALLET DU CLIENT.
     */
    function registerInitialPurchase(
        address clientWallet, // NOUVEAU : Le wallet de l'acheteur
        uint256 nfcTokenId, 
        string memory _buyerName, 
        string memory _objectName, 
        uint256 _salePrice
    ) public onlyOwner {
        // Vérifie que le token n'a pas déjà été créé
        require(_ownerOf(nfcTokenId) == address(0), "Ce NFC a deja ete enregistre");

        // Mint (création) du NFT directement sur le wallet du client
        _safeMint(clientWallet, nfcTokenId);

        // Enregistre le nom de l'objet de manière permanente
        objectNames[nfcTokenId] = _objectName;

        // Ajoute la première vente à l'historique
        tokenSalesHistory[nfcTokenId].push(SaleInfo({
            buyerName: _buyerName,
            salePrice: _salePrice,
            date: block.timestamp
        }));

        emit ItemSold(nfcTokenId, clientWallet, _buyerName, _salePrice, false);
    }

    /**
     * @dev 2. REVENTE : Met à jour l'historique ET déplace le NFT vers le nouvel acheteur.
     */
    function registerResale(
        address newClientWallet, // NOUVEAU : Le wallet du nouvel acheteur
        uint256 nfcTokenId, 
        string memory _newBuyerName, 
        uint256 _resalePrice
    ) public onlyOwner {
        // Récupère l'adresse de l'actuel propriétaire de l'objet
        address currentOwner = _ownerOf(nfcTokenId);
        require(currentOwner != address(0), "Objet inexistant");

        // Force le transfert du NFT de l'ancien propriétaire vers le nouveau
        // (Seule la marque, via onlyOwner, a le droit de faire ça pour certifier la revente)
        _transfer(currentOwner, newClientWallet, nfcTokenId);

        // Ajoute la nouvelle transaction à l'historique
        tokenSalesHistory[nfcTokenId].push(SaleInfo({
            buyerName: _newBuyerName,
            salePrice: _resalePrice,
            date: block.timestamp
        }));

        emit ItemSold(nfcTokenId, newClientWallet, _newBuyerName, _resalePrice, true);
    }

    /**
     * @dev Récupère l'historique COMPLET des ventes d'un objet.
     */
    function getFullHistory(uint256 nfcTokenId) public view returns (SaleInfo[] memory) {
        require(_ownerOf(nfcTokenId) != address(0), "Objet inexistant");
        return tokenSalesHistory[nfcTokenId];
    }

    /**
     * @dev Récupère UNIQUEMENT le propriétaire actuel (le dernier de l'historique).
     */
    function getCurrentOwner(uint256 nfcTokenId) public view returns (string memory buyerName, uint256 purchasePrice, uint256 date) {
        require(_ownerOf(nfcTokenId) != address(0), "Objet inexistant");
        
        uint256 historyLength = tokenSalesHistory[nfcTokenId].length;
        SaleInfo memory currentInfo = tokenSalesHistory[nfcTokenId][historyLength - 1];
        
        return (currentInfo.buyerName, currentInfo.salePrice, currentInfo.date);
    }
}