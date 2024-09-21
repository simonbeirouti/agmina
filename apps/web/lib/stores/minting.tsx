import { create } from "zustand";
import { Client, useClientStore } from "./client";
import { immer } from "zustand/middleware/immer";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { PublicKey, UInt64, CircuitString, Struct, Field, Bool } from "o1js";
import { useCallback, useEffect } from "react";
import { useChainStore } from "./chain";
import { useWalletStore } from "./wallet";

class TokenData extends Struct({
	tokenId: UInt64,
	tokenName: Field,
	userName: Field,
	symbol: Field,
	owner: PublicKey,
	burnt: Bool,
	blockHeight: UInt64
}) { }

export interface MintingState {
  loading: boolean;
  tokenData: TokenData | null;
  loadTokenData: (client: Client, tokenId: string) => Promise<void>;
  mintNFT: (client: Client, tokenId: string, userName: string, tokenName: string, symbol: string, owner: string) => Promise<PendingTransaction>;
  burnNFT: (client: Client, address: string, tokenId: string) => Promise<PendingTransaction>;
}

function isPendingTransaction(
  transaction: PendingTransaction | UnsignedTransaction | undefined,
): asserts transaction is PendingTransaction {
  if (!(transaction instanceof PendingTransaction))
    throw new Error("Transaction is not a PendingTransaction");
}

export const tokenId = UInt64.from(0);

export const useMintingStore = create<
  MintingState,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    loading: false,
    tokenData: null,
    async loadTokenData(client: Client, tokenId: string) {
      set((state) => {
        state.loading = true;
      });

      try {
        const tokenIdField = UInt64.from(tokenId);
        const data = await client.query.runtime.Minting.NFTokendata.get(tokenIdField);
        const stringifiedData = {
          tokenId: data?.tokenId.toString(),
          tokenName: data?.tokenName.toString(),
          userName: data?.userName.toString(),
          symbol: data?.symbol.toString(),
          owner: data?.owner.toBase58(),
          burnt: data?.burnt.toString(),
          blockHeight: data?.blockHeight.toString()
        };
        
        set((state) => {
          state.tokenData = stringifiedData as any;
          state.loading = false;
        });
      } catch (error) {
        console.error("Error fetching token data:", error);
        set((state) => {
          state.tokenData = null;
          state.loading = false;
        });
      }
    },
    async mintNFT(client: Client, tokenId: string, userName: string, tokenName: string, symbol: string, owner: string) {
      set((state) => {
        state.loading = true;
      });

      const minting = client.runtime.resolve("Minting");
      const sender = PublicKey.fromBase58(owner);
      const tokenIdField = UInt64.from(tokenId);
      const userNameCircuit = CircuitString.fromString(userName);
      const tokenNameCircuit = CircuitString.fromString(tokenName);
      const symbolCircuit = CircuitString.fromString(symbol);
      const tx = await client.transaction(sender, async () => {
        return await minting.mintNFT(tokenIdField, userNameCircuit, tokenNameCircuit, symbolCircuit, sender);
      });

      await tx.sign();
      await tx.send();

      set((state) => {
        state.loading = false;
      });

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
    async burnNFT(client: Client, address: string, tokenId: string) {
      set((state) => {
        state.loading = true;
      });

      const minting = client.runtime.resolve("Minting");
      const sender = PublicKey.fromBase58(address);
      const tokenIdField = UInt64.from(tokenId);

      const tx = await client.transaction(sender, async () => {
        await minting.burnNFT(tokenIdField);
      });

      await tx.sign();
      await tx.send();

      set((state) => {
        state.loading = false;
      });

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
  })),
);

export const useObserveTokenData = (tokenId: string) => {
  const client = useClientStore();
  const chain = useChainStore();
  const minting = useMintingStore();

  useEffect(() => {
    if (!client.client || !tokenId) return;

    minting.loadTokenData(client.client, tokenId);
  }, [client.client, chain.block?.height, tokenId]);
};

export const useMintNFT = () => {
  const client = useClientStore();
  const minting = useMintingStore();
  const wallet = useWalletStore();

  return useCallback(async (tokenId: string, userName: string, tokenName: string, symbol: string) => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await minting.mintNFT(
        client.client,
        tokenId,
        userName,
        tokenName,
        symbol,
        wallet.wallet
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};

export const useBurnNFT = () => {
  const client = useClientStore();
  const minting = useMintingStore();
  const wallet = useWalletStore();

  return useCallback(async (tokenId: string) => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await minting.burnNFT(
      client.client,
      wallet.wallet,
      tokenId
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};