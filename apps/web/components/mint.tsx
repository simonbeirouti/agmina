'use client'

import React, { useState } from "react"
import { Button } from "./ui/button"
import { useMintNFT, useBurnNFT, useMintingStore, useObserveTokenData } from "../lib/stores/minting"
import { Input } from "./ui/input"

export function MintingComponent() {
    const mintNFT = useMintNFT();
    const burnNFT = useBurnNFT();

    const [tokenId, setTokenId] = useState("");
    const [userName, setUserName] = useState("");
    const [tokenName, setTokenName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    useObserveTokenData(tokenId);
    const { tokenData, loading } = useMintingStore();

    const handleMint = async () => {
        setIsProcessing(true);
        await mintNFT(tokenId, userName, tokenName, symbol);
        setIsProcessing(false);
        setUserName("")
        setTokenName("")
        setSymbol("")
    };

    const handleBurn = async () => {
        setIsProcessing(true);
        await burnNFT(tokenId);
        setIsProcessing(false);
    };

    return (
        <div className="flex flex-col mx-auto w-full lg:w-2/3 px-12 justify-center items-center h-full">
            <div className="text-3xl my-24">NFT Minting</div>
            <div className="w-full space-y-4">
                <Input placeholder="Token ID" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
                <Input placeholder="User Name" value={userName} onChange={(e) => setUserName(e.target.value)} />
                <Input placeholder="Token Name" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
                <Input placeholder="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                <Button className="w-full" onClick={handleMint} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Mint NFT'}
                </Button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : tokenData ? (
                <div className="mt-6">
                    <ul className="space-y-2">
                        {Object.entries(tokenData).map(([key, value]) => (
                            <li key={key} className="flex space-x-2">
                                <span className="font-semibold">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</span>
                                <span>{value}</span>
                            </li>
                        ))}
                        </ul>
                        <Button className="w-full mt-4" onClick={handleBurn} disabled={isProcessing || !tokenData}>
                            {isProcessing ? 'Processing...' : 'Burn NFT'}
                        </Button>
                </div>
            ) : null}
        </div>
    )
}