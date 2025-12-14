import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mintx } from "../target/types/mintx";
import { 
  Keypair, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  getMint,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { assert } from "chai";

describe("mintx - Fast Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Mintx as Program<Mintx>;
  const payer = provider.wallet as anchor.Wallet;

  let mintKeypair: Keypair;
  let userAta: PublicKey;
  let vestingConfigPda: PublicKey;
  let vaultAta: PublicKey;
  let userVestingPda: PublicKey;

  const decimals = 9;
  const initialSupply = 1_000_000;
  const totalVestingAmount = new anchor.BN(100_000).mul(new anchor.BN(10).pow(new anchor.BN(decimals)));
  const userAllocation = new anchor.BN(50_000).mul(new anchor.BN(10).pow(new anchor.BN(decimals)));

  let startTime: number;
  let cliffTime: number;
  let endTime: number;

  before(async () => {
    mintKeypair = Keypair.generate();

    [vestingConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vesting_config"), mintKeypair.publicKey.toBuffer()],
      program.programId
    );

    userAta = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    vaultAta = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      vestingConfigPda,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    [userVestingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_vesting"),
        vestingConfigPda.toBuffer(),
        payer.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  describe("1. Token Creation", () => {
    it("Creates Token-2022 with initial supply", async () => {
      const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
      
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );

      await provider.sendAndConfirm(transaction, [mintKeypair]);

      await program.methods
        .createToken(decimals, new anchor.BN(initialSupply))
        .accounts({
          user: payer.publicKey,
          mint: mintKeypair.publicKey,
          userAta: userAta,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      const mintInfo = await getMint(
        provider.connection,
        mintKeypair.publicKey,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      assert.equal(mintInfo.decimals, decimals);

      const userTokenAccount = await getAccount(
        provider.connection,
        userAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const expectedAmount = BigInt(initialSupply) * BigInt(Math.pow(10, decimals));
      assert.equal(userTokenAccount.amount.toString(), expectedAmount.toString());
    });
  });

  describe("2. Vesting Setup", () => {
    it("Initializes vesting with past times (already vested)", async () => {
      const now = Math.floor(Date.now() / 1000);
      startTime = now - 100;
      cliffTime = now - 50;
      endTime = now - 10;

      // Create vault ATA first
      const createVaultIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        vaultAta,
        vestingConfigPda,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const tx = new Transaction().add(createVaultIx);
      await provider.sendAndConfirm(tx);

      await program.methods
        .initializeVesting(
          new anchor.BN(startTime),
          new anchor.BN(cliffTime),
          new anchor.BN(endTime),
          totalVestingAmount
        )
        .accounts({
          user: payer.publicKey,
          mint: mintKeypair.publicKey,
          vestingConfig: vestingConfigPda,
          vaultAta: vaultAta,
          userAta: userAta,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      const vestingConfig = await program.account.vestingConfig.fetch(vestingConfigPda);
      assert.equal(vestingConfig.mint.toString(), mintKeypair.publicKey.toString());
      assert.equal(vestingConfig.totalAmount.toString(), totalVestingAmount.toString());

      const vaultAccount = await getAccount(
        provider.connection,
        vaultAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      assert.equal(vaultAccount.amount.toString(), totalVestingAmount.toString());
    });

    it("Initializes user vesting", async () => {
      await program.methods
        .initializeUserVesting(userAllocation)
        .accounts({
          user: payer.publicKey,
          mint: mintKeypair.publicKey,
          vestingConfig: vestingConfigPda,
          userVesting: userVestingPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const userVesting = await program.account.userVesting.fetch(userVestingPda);
      assert.equal(userVesting.totalAllocation.toString(), userAllocation.toString());
      assert.equal(userVesting.claimedAmount.toNumber(), 0);
    });
  });

  describe("3. Claiming (Instant)", () => {
    it("Claims all vested tokens immediately", async () => {
      const balanceBefore = await getAccount(
        provider.connection,
        userAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      await program.methods
        .claim()
        .accounts({
          user: payer.publicKey,
          mint: mintKeypair.publicKey,
          vestingConfig: vestingConfigPda,
          vaultAta: vaultAta,
          userAta: userAta,
          userVesting: userVestingPda,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      const balanceAfter = await getAccount(
        provider.connection,
        userAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const userVesting = await program.account.userVesting.fetch(userVestingPda);

      assert.equal(
        userVesting.claimedAmount.toString(),
        userAllocation.toString()
      );
      assert.ok(balanceAfter.amount > balanceBefore.amount);
    });

    it("Cannot claim more after fully claimed", async () => {
      const balanceBefore = await getAccount(
        provider.connection,
        userAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      await program.methods
        .claim()
        .accounts({
          user: payer.publicKey,
          mint: mintKeypair.publicKey,
          vestingConfig: vestingConfigPda,
          vaultAta: vaultAta,
          userAta: userAta,
          userVesting: userVestingPda,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      const balanceAfter = await getAccount(
        provider.connection,
        userAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      assert.equal(balanceAfter.amount.toString(), balanceBefore.amount.toString());
    });
  });

  describe("4. Progressive Vesting Test", () => {
    let mint2: Keypair;
    let vestingConfig2Pda: PublicKey;
    let vault2Ata: PublicKey;
    let user2Ata: PublicKey;
    let userVesting2Pda: PublicKey;

    it("Creates second token for progressive test", async () => {
      mint2 = Keypair.generate();

      [vestingConfig2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vesting_config"), mint2.publicKey.toBuffer()],
        program.programId
      );

      user2Ata = getAssociatedTokenAddressSync(
        mint2.publicKey,
        payer.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      vault2Ata = getAssociatedTokenAddressSync(
        mint2.publicKey,
        vestingConfig2Pda,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      [userVesting2Pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_vesting"),
          vestingConfig2Pda.toBuffer(),
          payer.publicKey.toBuffer(),
        ],
        program.programId
      );

      const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint2.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );

      await provider.sendAndConfirm(transaction, [mint2]);

      await program.methods
        .createToken(decimals, new anchor.BN(initialSupply))
        .accounts({
          user: payer.publicKey,
          mint: mint2.publicKey,
          userAta: user2Ata,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
    });

    it("Sets up vesting with cliff in future", async () => {
      const now = Math.floor(Date.now() / 1000);
      const start = now - 10;
      const cliff = now + 100;
      const end = now + 200;

      // Create vault ATA
      const createVaultIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        vault2Ata,
        vestingConfig2Pda,
        mint2.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      await provider.sendAndConfirm(new Transaction().add(createVaultIx));

      await program.methods
        .initializeVesting(
          new anchor.BN(start),
          new anchor.BN(cliff),
          new anchor.BN(end),
          totalVestingAmount
        )
        .accounts({
          user: payer.publicKey,
          mint: mint2.publicKey,
          vestingConfig: vestingConfig2Pda,
          vaultAta: vault2Ata,
          userAta: user2Ata,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      await program.methods
        .initializeUserVesting(userAllocation)
        .accounts({
          user: payer.publicKey,
          mint: mint2.publicKey,
          vestingConfig: vestingConfig2Pda,
          userVesting: userVesting2Pda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("Cannot claim before cliff", async () => {
      await program.methods
        .claim()
        .accounts({
          user: payer.publicKey,
          mint: mint2.publicKey,
          vestingConfig: vestingConfig2Pda,
          vaultAta: vault2Ata,
          userAta: user2Ata,
          userVesting: userVesting2Pda,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      const userVesting = await program.account.userVesting.fetch(userVesting2Pda);
      assert.equal(userVesting.claimedAmount.toNumber(), 0);
    });
  });

  describe("5. Partial Vesting Test", () => {
    let mint3: Keypair;
    let vestingConfig3Pda: PublicKey;
    let vault3Ata: PublicKey;
    let user3Ata: PublicKey;
    let userVesting3Pda: PublicKey;

    it("Sets up vesting at 50% completion", async () => {
      mint3 = Keypair.generate();

      [vestingConfig3Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vesting_config"), mint3.publicKey.toBuffer()],
        program.programId
      );

      user3Ata = getAssociatedTokenAddressSync(
        mint3.publicKey,
        payer.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      vault3Ata = getAssociatedTokenAddressSync(
        mint3.publicKey,
        vestingConfig3Pda,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      [userVesting3Pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_vesting"),
          vestingConfig3Pda.toBuffer(),
          payer.publicKey.toBuffer(),
        ],
        program.programId
      );

      const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint3.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );

      await provider.sendAndConfirm(transaction, [mint3]);

      await program.methods
        .createToken(decimals, new anchor.BN(initialSupply))
        .accounts({
          user: payer.publicKey,
          mint: mint3.publicKey,
          userAta: user3Ata,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      const now = Math.floor(Date.now() / 1000);
      const duration = 100;
      const start = now - duration;
      const cliff = now - duration + 10;
      const end = now + duration;

      // Create vault ATA
      const createVaultIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        vault3Ata,
        vestingConfig3Pda,
        mint3.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      await provider.sendAndConfirm(new Transaction().add(createVaultIx));

      await program.methods
        .initializeVesting(
          new anchor.BN(start),
          new anchor.BN(cliff),
          new anchor.BN(end),
          totalVestingAmount
        )
        .accounts({
          user: payer.publicKey,
          mint: mint3.publicKey,
          vestingConfig: vestingConfig3Pda,
          vaultAta: vault3Ata,
          userAta: user3Ata,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      await program.methods
        .initializeUserVesting(userAllocation)
        .accounts({
          user: payer.publicKey,
          mint: mint3.publicKey,
          vestingConfig: vestingConfig3Pda,
          userVesting: userVesting3Pda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("Claims approximately 50% of tokens", async () => {
      await program.methods
        .claim()
        .accounts({
          user: payer.publicKey,
          mint: mint3.publicKey,
          vestingConfig: vestingConfig3Pda,
          vaultAta: vault3Ata,
          userAta: user3Ata,
          userVesting: userVesting3Pda,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      const userVesting = await program.account.userVesting.fetch(userVesting3Pda);
      
      const claimed = userVesting.claimedAmount.toNumber();
      const expected = userAllocation.toNumber() / 2;
      const tolerance = expected * 0.1;

      assert.ok(
        Math.abs(claimed - expected) < tolerance,
        `Claimed ${claimed} should be near 50% (${expected})`
      );
    });
  });

  describe("6. Multiple Users", () => {
    let user2: Keypair;
    let user2VestingPda: PublicKey;
    const user2Allocation = new anchor.BN(30_000).mul(new anchor.BN(10).pow(new anchor.BN(decimals)));

    it("Adds second user to existing vesting", async () => {
      user2 = Keypair.generate();
      
      const sig = await provider.connection.requestAirdrop(
        user2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      [user2VestingPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_vesting"),
          vestingConfigPda.toBuffer(),
          user2.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .initializeUserVesting(user2Allocation)
        .accounts({
          user: user2.publicKey,
          mint: mintKeypair.publicKey,
          vestingConfig: vestingConfigPda,
          userVesting: user2VestingPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const userVesting = await program.account.userVesting.fetch(user2VestingPda);
      assert.equal(userVesting.totalAllocation.toString(), user2Allocation.toString());
    });
  });

  describe("7. Edge Cases", () => {
    it("Handles zero allocation", async () => {
      const user3 = Keypair.generate();
      
      const sig = await provider.connection.requestAirdrop(user3.publicKey, LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig);

      const [user3VestingPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_vesting"),
          vestingConfigPda.toBuffer(),
          user3.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .initializeUserVesting(new anchor.BN(0))
        .accounts({
          user: user3.publicKey,
          mint: mintKeypair.publicKey,
          vestingConfig: vestingConfigPda,
          userVesting: user3VestingPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user3])
        .rpc();

      const user3Ata = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        user3.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      await program.methods
        .claim()
        .accounts({
          user: user3.publicKey,
          mint: mintKeypair.publicKey,
          vestingConfig: vestingConfigPda,
          vaultAta: vaultAta,
          userAta: user3Ata,
          userVesting: user3VestingPda,
          systemProgram: SystemProgram.programId,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user3])
        .rpc();

      const userVesting = await program.account.userVesting.fetch(user3VestingPda);
      assert.equal(userVesting.claimedAmount.toNumber(), 0);
    });

    it("Rejects duplicate initialization", async () => {
      try {
        await program.methods
          .initializeUserVesting(userAllocation)
          .accounts({
            user: payer.publicKey,
            mint: mintKeypair.publicKey,
            vestingConfig: vestingConfigPda,
            userVesting: userVestingPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed");
      } catch (error) {
        assert.ok(error);
      }
    });
  });
});