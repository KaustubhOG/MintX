# 🔐 MintX

> Token Launchpad and Vesting DApp on Solana

A secure token vesting smart contract built with Anchor framework and SPL Token-2022, enabling cliff-based linear vesting with PDA-secured custody.

## ✨ Features

- 🪙 **SPL Token-2022** - Create and manage tokens
- ⏰ **Cliff + Linear Vesting** - Configurable vesting schedules
- 🔒 **PDA Vault** - Secure token custody
- 👥 **Multi-User** - Allocate to multiple beneficiaries
- 🛡️ **Anti Double-Claim** - Built-in safeguards
- ✅ **Tested** - Full test coverage

## 📂 Structure

```
mintx/
├── programs/mintx/src/
│   ├── instructions/
│   │   ├── create_token.rs
│   │   ├── initialize_vesting.rs
│   │   ├── initialize_user_vesting.rs
│   │   └── claim.rs
│   ├── state/
│   │   ├── vesting_config.rs
│   │   └── user_vesting.rs
│   └── utils/
│       └── time.rs
frontend/                    # Next.js DApp
```

## 🔄 Flow

**1. Create Token** → **2. Initialize Vesting** → **3. Assign Users** → **4. Claim**

### Vesting Model

```
Tokens
  │         ┌─────── Fully Vested
  │    ────/
  │───/  Linear Release
  └─────────────────────► Time
    ↑    ↑           ↑
  Start Cliff      End
```

- **Before Cliff**: No claims
- **After Cliff**: Linear vesting
- **After End**: Full unlock

## 🧪 Testing

```bash
anchor test
```

Covers: token creation, vesting setup, claims (instant/partial/full), cliff enforcement, multi-user, edge cases

## 🛠 Stack

**Contract**: Solana • Anchor • Rust • SPL Token-2022  
**Frontend**: Next.js • TypeScript • Solana Wallet Adapter

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/KaustubhOG/MintX
cd MintX/mintx

# Build & Test
anchor build
anchor test
```

## 🔐 Security

- PDA-based vault authority
- Time-based access control
- Safe math (overflow protection)
- Input validation



**Made by [@KaustubhOG](https://github.com/KaustubhOG) • Star ⭐ if helpful!**
