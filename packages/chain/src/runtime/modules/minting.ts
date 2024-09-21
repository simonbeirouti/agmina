import {
	RuntimeModule,
	runtimeModule,
	state,
	runtimeMethod,
} from "@proto-kit/module";
import {assert, State, StateMap} from "@proto-kit/protocol";
import { PublicKey, ZkProgram, UInt64, Bool, CircuitString, Struct, Field, Provable } from "o1js";

export const canMint = async (amount: Field): Promise<Bool> => {
	return Bool(true);
};

export const canMintProgram = ZkProgram({
	name: "Minting",
	publicOutput: Bool,
	publicInput: Field,
	methods: {
		canMint: {
			privateInputs: [],
			// eslint-disable-next-line putout/putout
			method: canMint,
		},
	},
});

export class CanMintProof extends ZkProgram.Proof(canMintProgram) { }

class TokenData extends Struct({
	tokenId: UInt64,
	tokenName: CircuitString,
	userName: CircuitString,
	symbol: CircuitString,
	owner: PublicKey,
	burnt: Bool,
	blockHeight: UInt64
}) { }

@runtimeModule()
export class Minting extends RuntimeModule<Record<string, never>> {
	@state() public NFTokendata = StateMap.from<UInt64, TokenData>(UInt64, TokenData);

	@runtimeMethod()
	public async mintNFT(
		tokenId: UInt64,
		userName: CircuitString,
		tokenName: CircuitString,
		symbol: CircuitString,
		owner: PublicKey,
	) {
		assert(tokenId.greaterThan(UInt64.from(0)), "TokenId must be greater than 0");
		// const existingToken = await this.NFTokendata.get(tokenId);
		// assert(existingToken.value.tokenId.equals(tokenId), "NFT with this tokenID already exists")

		const tokenData = new TokenData({
			tokenId,
			tokenName,
			userName,
			symbol,
			owner,
			burnt: Bool(false),
        	blockHeight: this.network.block.height
		})

		const existingOwner = await this.NFTokendata.get(tokenId)
		assert(existingOwner.isSome.not(), "NFT already minted");
		
		await this.NFTokendata.set(tokenId, tokenData)
	}

	@runtimeMethod()
	public async getTokenData(tokenId: UInt64): Promise<{
		balance: UInt64,
		tokenId: UInt64,
		userName: CircuitString,
		tokenName: CircuitString,
		symbol: CircuitString,
		owner: PublicKey
	}> {
		const tokenData = await this.NFTokendata.get(tokenId);
		assert(tokenData.isSome, "Token does not exist");
		const token = tokenData.value;
		return {
			balance: UInt64.from(Provable.if(tokenData.value.burnt, UInt64.from(0), UInt64.from(1))),
			tokenId: token.tokenId,
			userName: token.userName,
			tokenName: token.tokenName,
			symbol: token.symbol,
			owner: token.owner
		};
	}

	@runtimeMethod()
	public async burnNFT(tokenId: UInt64) {		
		const status = (await this.NFTokendata.get(tokenId)).value;
		status.burnt = Bool(true);
		status.owner = PublicKey.empty()
		
		await this.NFTokendata.set(tokenId, status)
	}
}
