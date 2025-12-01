import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getAccount,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
} from "@solana/spl-token";

import {
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import { Program } from "@coral-xyz/anchor";
import { Mintx } from "../target/types/mintx";

describe("create_token", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.Mintx as Program<Mintx>;

  it("creates mint + ATA + mints supply", async () => {
    // ------------------------------------------------------------
    // 1️⃣ Create a fresh test user
    // ------------------------------------------------------------
    const user = Keypair.generate();

    // Airdrop SOL so user can pay fees
    await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ------------------------------------------------------------
    // 2️⃣ Make a new mint keypair
    // ------------------------------------------------------------
    const mint = Keypair.generate();

    // ------------------------------------------------------------
    // 3️⃣ Derive user's ATA (Token-2022 compatible)
    // ------------------------------------------------------------
    const userAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      user.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // ------------------------------------------------------------
    // 4️⃣ Token setup parameters
    // ------------------------------------------------------------
    const decimals = 9;
    const initialSupply = new BN(1000);

    // ------------------------------------------------------------
    // 4.5️⃣ Calculate rent for mint account
    // ------------------------------------------------------------
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );

    // ------------------------------------------------------------
    // 5️⃣ Call the Anchor program instruction
    // ------------------------------------------------------------
    await program.methods
      .createToken(decimals, initialSupply)
      .accounts({
        user: user.publicKey,
        mint: mint.publicKey,
        userAta: userAta,
        systemProgram: SystemProgram.programId,
        token2022Program: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .preInstructions([
        // Create the mint account before calling our program
        SystemProgram.createAccount({
          fromPubkey: user.publicKey,
          newAccountPubkey: mint.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ])
      .signers([user, mint])
      .rpc();

    // ------------------------------------------------------------
    // 6️⃣ Verify mint account
    // ------------------------------------------------------------
    const mintInfo = await getMint(
      provider.connection,
      mint.publicKey,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );

    console.log("Mint Info:", mintInfo);

    if (mintInfo.decimals !== decimals) {
      throw new Error("❌ DECIMALS MISMATCH");
    }

    // ------------------------------------------------------------
    // 7️⃣ Verify the user's token balance
    // ------------------------------------------------------------
    const ataInfo = await getAccount(
      provider.connection,
      userAta,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );

    console.log("ATA Info:", ataInfo);

    const expectedAmount =
      BigInt(initialSupply.toNumber()) * BigInt(10 ** decimals);

    if (ataInfo.amount !== expectedAmount) {
      throw new Error(
        `❌ Balance mismatch. Expected ${expectedAmount.toString()} but got ${ataInfo.amount.toString()}`
      );
    }

    console.log("✅ SUCCESS — Mint created, ATA created, supply minted!");
  });
});