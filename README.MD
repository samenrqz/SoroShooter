# SoroCount — Decentralized Counter dApp

![Stellar](https://img.shields.io/badge/Stellar-Testnet-7c3aed?style=for-the-badge&logo=stellar&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![Soroban](https://img.shields.io/badge/Soroban_SDK-v21-06b6d4?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)

A decentralized counter smart contract built on the **Stellar blockchain** using the **Soroban SDK**,
complete with on-chain event emission and an animated web frontend.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Smart Contract](#smart-contract)
- [Contract Details](#contract-details)
- [Frontend](#frontend)
- [Built With](#built-with)
- [Author](#author)

---

## Features

- On-chain smart contract deployed to Stellar Testnet
- Initialize, Increment, Decrement, and Refresh counter values
- On-chain event emission on every transaction
- Two-column animated frontend UI with live event log and stats
- Fully tested with unit tests via Soroban testutils

---

## Project Structure
```
soroban-counter-contract/
├── src/
│   └── lib.rs              # Smart contract logic
├── frontend/
│   └── index.html          # Web frontend UI
├── Cargo.toml              # Rust dependencies
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Stellar CLI](https://github.com/stellar/stellar-cli)

### Setup
```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/soroban-counter-contract.git
cd soroban-counter-contract

# 2. Add WASM target
rustup target add wasm32-unknown-unknown

# 3. Run tests
cargo test

# 4. Build
cargo build --release --target wasm32-unknown-unknown

# 5. Deploy
stellar keys fund alice --network testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_counter_contract.wasm \
  --source alice \
  --network testnet
```

After deploying, copy your Contract ID and paste it into the frontend to start interacting.

---

## Smart Contract

The contract is written in Rust using the Soroban SDK and exposes four public functions:

| Function | Description | Returns |
|---|---|---|
| `init()` | Initializes the counter to 0 | void |
| `increment()` | Increments the counter by 1 | i32 |
| `decrement()` | Decrements the counter by 1 | i32 |
| `value()` | Returns the current counter value | i32 |

Each function emits an on-chain event that can be tracked via the Stellar explorer.

---

## Contract Details

| Property | Value |
|---|---|
| Network | Stellar Testnet |
| Contract ID | `YOUR_CONTRACT_ID_HERE` |
| Language | Rust |
| SDK Version | Soroban SDK v21 |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/YOUR_CONTRACT_ID_HERE) |

---

## Frontend

No build tools required. Open the file directly in any browser:
```bash
frontend/index.html
```

Or use VS Code Live Server for live reload during development.

**UI Features:**
- Two-column layout — counter controls on the left, stats and event log on the right
- Live event log with color-coded badges per action
- Stats tracking for increments, decrements, and total actions
- Animated starfield background with glassmorphism cards
- Toast notifications on every contract interaction

---

## Built With

- [Soroban SDK v21](https://soroban.stellar.org) — Smart contract framework
- [Stellar CLI](https://github.com/stellar/stellar-cli) — Deployment and invocation
- [Stellar Testnet](https://stellar.org) — Blockchain network
- HTML / CSS / JavaScript — Frontend UI

---

## Author

**Your Name**
University of the East — Caloocan
GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)

---

## License

This project is licensed under the MIT License.

---

> Built as part of a Stellar / Soroban blockchain development workshop.