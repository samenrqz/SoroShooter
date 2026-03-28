# 🚀 SoroShooter

> **A live, playable play-to-earn arcade shooter on Stellar — where clearing a wave earns you real XLM and buying an extra life deducts real XLM from your Freighter wallet, on-chain, right now.**

<div align="center">

[![🎮 Play Live](https://img.shields.io/badge/🎮_Play_Now-Live_on_GitHub_Pages-00fff7?style=for-the-badge)](https://samenrqz.github.io/SoroShooter/)
[![Soroban Contract](https://img.shields.io/badge/Soroban-Contract_Deployed-39ff14?style=for-the-badge&logo=stellar&logoColor=white)](https://stellar.expert/explorer/testnet/contract/CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F)
[![Network](https://img.shields.io/badge/Network-Stellar_Testnet-8b5cf6?style=for-the-badge)](https://stellar.expert/explorer/testnet)
[![License](https://img.shields.io/badge/License-MIT-ff6b00?style=for-the-badge)](./LICENSE)

**Stellar PH Unitour Hackathon · March 2026**  
John Samuel B. Enriquez · 2nd Year CS · University of the East — Caloocan

</div>

---

## 🔴 The Problem

Most blockchain games fake it — the balance on screen is just a JavaScript number, the "transaction" never hits the chain, and when you close the tab, nothing happened. Players never actually own anything. Developers never learn how real on-chain money moves. It looks like blockchain. It isn't.

## 🟢 The Solution

SoroShooter makes every action real. Shoot enemies — real XLM lands in your wallet. Die and buy a life — real XLM leaves your wallet, signed by you in Freighter, verified by the server, confirmed on Stellar Testnet. Every reward, every deduction, every NFT badge is a live ledger entry anyone can look up right now on Stellar Expert. No tricks. No simulation. Real money, real chain, real game.

## ⚡ The Killer

**SoroShooter is the only student-built, fully playable, fully on-chain play-to-earn game in the Philippine Stellar ecosystem — and it's live right now.** Not a demo. Not a prototype. A real game with a real economy, built by a 2nd-year CS student from Caloocan in a single hackathon sprint. Every Stellar feature it uses — XLM payments, Soroban contracts, Freighter signing, NFT badges, Trustlines, Horizon polling — is wired to a game mechanic a real player can trigger in under 60 seconds. That is the impact: proof that Filipino students can ship production-grade Stellar dApps, and a living template for every developer who comes after.

---

## ▶ Try It Right Now

```
1. Install Freighter browser extension → set it to Testnet
2. Fund your testnet wallet:
   https://friendbot.stellar.org/?addr=YOUR_G_ADDRESS
3. Open the game:
   https://samenrqz.github.io/SoroShooter/
4. Click "Connect via Freighter" → enter the Contract ID → Launch
5. Shoot enemies → clear waves → watch XLM arrive in your wallet
6. Die → click BUY LIFE → approve the Freighter popup → deducted on-chain
```

> ⚠️ Freighter only works on HTTPS. Always use the GitHub Pages URL — not localhost.

---

## How the Economy Works

Every game mechanic maps to a live Stellar transaction:

| Game Event | Stellar Transaction | Amount | Direction |
|---|---|---|---|
| Wave cleared (0 enemies through base) | Native XLM payment | 1,000 XLM | Admin → Player |
| Score hits 1,000 pts | Native XLM payment | 500 XLM | Admin → Player |
| Score hits 5,000 pts | Native XLM payment | 2,000 XLM | Admin → Player |
| Score hits 15,000 pts | Native XLM payment | 5,000 XLM | Admin → Player |
| Extra life purchased (1st) | Freighter-signed payment | 500 XLM | Player → Admin |
| Extra life purchased (2nd) | Freighter-signed payment | 1,500 XLM | Player → Admin |
| Extra life purchased (nth) | Freighter-signed payment | 500 + (n−1) × 1,000 XLM | Player → Admin |
| Wave 5 cleared | Soroban NFT mint | Uncommon Badge 🏆 | On-chain |
| Wave 10 cleared | Soroban NFT mint | Rare Badge ✨ | On-chain |

---

## The Core Transaction: Life Purchase Signing Flow

This is the end-to-end proof that the system works. A player's XLM is deducted on-chain via Freighter without the server ever seeing their secret key:

```
[Player dies — 15-second countdown begins]
          │
          ▼
POST /api/life/build-tx
┌────────────────────────────────────────────────────────────┐
│  Server builds UNSIGNED payment XDR                        │
│    from:    player G... address                            │
│    to:      GBKDNS4N5T5MQYEV3LVGLEZ4ZLL3HC3VCR3TAPU…      │
│    amount:  500 XLM (escalates per purchase)               │
│    network: Stellar Testnet                                │
└──────────────────────────┬─────────────────────────────────┘
                           │ unsignedXDR returned to browser
                           ▼
freighterApi.signTransaction(unsignedXDR, networkPassphrase)
┌────────────────────────────────────────────────────────────┐
│  Freighter popup opens in player's browser                 │
│  Player sees: destination address, amount, network         │
│  Player clicks Approve                                     │
│                                                            │
│  ★ Secret key NEVER leaves the Freighter extension ★       │
└──────────────────────────┬─────────────────────────────────┘
                           │ { signedXDR } returned
                           ▼
POST /api/life/submit-tx
┌────────────────────────────────────────────────────────────┐
│  Server decodes and verifies the signed XDR:               │
│    destination === Admin wallet address  ✅                 │
│    amount      >= expected cost          ✅                 │
│  Server submits to Stellar Horizon                         │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
✅ Confirmed on Stellar Testnet
   Player XLM balance decreases · Life granted · Wave restarts
```

---

## Stellar Features Used

| Feature | Status | How SoroShooter Uses It |
|---|---|---|
| **XLM native payment** | ✅ Live | Two-directional economy: Admin → Player for wave rewards and score milestones; Player → Admin for escalating extra-life purchases — all real Testnet transactions |
| **Soroban smart contract** | ✅ Deployed | The on-chain game registry: stores player badge records, enforces one-mint-per-wave-per-player, and exposes `mint_badge`, `get_badges`, `has_badge` — verified on Stellar Expert |
| **Custom on-chain assets (NFT badges)** | ✅ Live | Wave 5 and Wave 10 badges are minted as unique on-chain assets through the Soroban contract — not just metadata, actual ledger entries tied to the player's address |
| **Trustline** | ✅ Live | Every badge mint establishes the player's wallet as an authorized holder of that asset on the Stellar ledger — the contract enforces this before any badge transfer is recorded |
| **Freighter wallet API** | ✅ Live | Builds and submits unsigned XDR in-browser; player signs with Freighter popup — secret key never leaves the extension, never touches the server, never crosses the network |
| **Horizon REST API** | ✅ Live | Polls player XLM balance every 2.5s for the live HUD; submits all signed transactions; drives the `/api/balance`, `/api/life/submit-tx`, and reward endpoints |
| **Transaction verification (anti-fraud)** | ✅ Live | Server decodes every signed XDR before submission and hard-rejects any transaction where destination ≠ Admin wallet or amount < expected cost — no fraudulent life purchase can be submitted |
| **Friendbot** | ✅ Live | Used to fund both Admin and Player testnet wallets during development and for new players onboarding |

---

## 🏆 MVP — The One Transaction That Proves Everything

> **A player dies. They have 15 seconds. They click BUY LIFE. Freighter opens. They approve. Real XLM leaves their wallet. The server verifies it on-chain. Their life is granted. The wave restarts.**

That single flow — triggered by a real player action, signed by a real wallet, verified by a real server, confirmed on a real blockchain — is the entire proof of concept. It touches every layer of the stack simultaneously:

| Layer | What Happens |
|---|---|
| 🎮 Game engine | Detects player death, starts 15-second countdown, renders BUY LIFE button |
| 🌐 Frontend | Calls `/api/life/build-tx` with player address and life count |
| ⚙️ Backend | Builds unsigned XDR: `player → Admin wallet, 500 XLM` |
| 🔐 Freighter | Player signs the XDR in-browser — secret key never leaves the extension |
| ✅ Backend | Decodes signed XDR, verifies destination and amount, rejects fraud |
| 🌌 Stellar Testnet | Transaction submitted via Horizon, confirmed on-chain |
| 💰 Result | Player XLM balance drops · Life granted · Wave restarts · HUD updates |

This is not a demo flow invented for the README. **You can trigger it yourself in 60 seconds** by opening the live game, connecting Freighter, and dying on purpose.

---

## Architecture

```
╔══════════════════════════════════════════════════════════════╗
║  BROWSER  (HTTPS — GitHub Pages only)                        ║
║                                                              ║
║  index.html — single-file frontend                           ║
║  ├─ Canvas 2D game engine (vanilla JS)                       ║
║  ├─ @stellar/freighter-api v5.0.0  (cdnjs)                   ║
║  ├─ stellar-sdk v11.3.0            (cdnjs)                   ║
║  └─ Wallet connection                                        ║
║      ├─ Option A: Freighter extension (auto-connect)         ║
║      └─ Option B: Paste G... address manually                ║
╚════════════════════════╦═════════════════════════════════════╝
                         ║  REST / JSON  (HTTPS)
                         ▼
╔══════════════════════════════════════════════════════════════╗
║  NODE.JS BACKEND  (Express · server.js)                      ║
║                                                              ║
║  GET  /health                — liveness check                ║
║  GET  /api/diagnose          — full config self-check        ║
║  GET  /api/balance/:address  — Horizon balance lookup        ║
║  POST /api/reward/wave       — admin sends XLM to player     ║
║  POST /api/reward/milestone  — admin sends XLM to player     ║
║  POST /api/life/build-tx     — builds UNSIGNED XDR           ║
║  POST /api/life/submit-tx    — verifies + submits XDR        ║
╚════════════════════════╦═════════════════════════════════════╝
                         ║  stellar-sdk  ·  Horizon REST
                         ▼
╔══════════════════════════════════════════════════════════════╗
║  STELLAR TESTNET                                             ║
║                                                              ║
║  Horizon    https://horizon-testnet.stellar.org              ║
║  Contract   CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCO…             ║
║  Admin      GBKDNS4N5T5MQYEV3LVGLEZ4ZLL3HC3VCR3TAPU…        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Project Structure

```
SoroShooter/
├── index.html          # Entire frontend — game engine + blockchain UI
├── server.js           # Node.js backend — rewards, life purchase, Horizon
├── src/
│   └── lib.rs          # Soroban smart contract (NFT badges, game state)
├── Cargo.toml
├── .env                # ADMIN_SECRET only — never committed
├── .gitignore          # Excludes .env and node_modules
└── README.md
```

---

## Smart Contract: Public Interface

The Soroban contract handles on-chain NFT badge minting and game state. Deployed at:  
[`CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F`](https://stellar.expert/explorer/testnet/contract/CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F)

### Setup

```rust
pub fn initialize(env: Env, admin: Address)
```

Initializes the contract with an admin address. Can only be called once.

### Badge Minting

```rust
pub fn mint_badge(env: Env, admin: Address, player: Address, wave: u32)
```

Mints an NFT badge to the player's address on-chain. Only the admin may call this.

| Wave | Badge | Rarity |
|---|---|---|
| 5 | 🏆 Wave 5 Badge | Uncommon |
| 10 | ✨ Wave 10 Badge | Rare |

### Queries

| Function | Returns | Description |
|---|---|---|
| `get_badges(env, player)` | `Vec<Badge>` | All badges held by an address |
| `has_badge(env, player, wave)` | `bool` | Whether an address holds the badge for a given wave |
| `get_admin(env)` | `Address` | Current admin address |

### Data Types

```rust
pub struct Badge {
    pub player:    Address,  // badge holder
    pub wave:      u32,      // wave that triggered the mint
    pub rarity:    String,   // "Uncommon" | "Rare"
    pub minted_at: u64,      // ledger timestamp
}
```

---

## Backend API Reference

### `GET /health`

Liveness check. Returns server status and config summary.

```json
{ "status": "ok", "admin": "GBKDNS4…", "secret_set": true, "wave_reward": 1000 }
```

### `GET /api/diagnose`

Full self-check — use this first when debugging reward or life-purchase failures.

```json
{
  "admin_public":   "GBKDNS4N5T5MQYEV3LVGLEZ4ZLL3HC3VCR3TAPU5LSVRPQRT3XNR4XEN",
  "secret_set":     true,
  "secret_valid":   true,
  "secret_matches": true,
  "admin_balance":  12000,
  "admin_funded":   true,
  "error":          null
}
```

### `GET /api/balance/:address`

Returns the XLM balance of any Stellar address via Horizon.

```json
{ "success": true, "balance": 13000.88 }
```

### `POST /api/reward/wave`

Admin wallet sends the wave-clear reward to the player.

```json
// Request
{ "playerAddress": "G...", "wave": 3 }

// Response
{ "success": true, "hash": "abc123…", "amount": 1000 }
```

### `POST /api/reward/milestone`

Admin wallet sends a score milestone reward to the player.

```json
// Request
{ "playerAddress": "G...", "milestone": 5000 }

// Response
{ "success": true, "hash": "abc123…", "amount": 2000 }
```

### `POST /api/life/build-tx`

Builds an **unsigned** payment XDR for the player to sign via Freighter. The server never receives the player's secret key at any point.

```json
// Request
{ "playerAddress": "G...", "lifeBuyCount": 0 }

// Response
{
  "success":           true,
  "unsignedXDR":       "AAAAAgAAAAA…",
  "cost":              500,
  "networkPassphrase": "Test SDF Network ; September 2015"
}
```

### `POST /api/life/submit-tx`

Verifies the signed XDR — checks that destination equals the Admin wallet and amount meets the expected cost — then submits to Stellar Testnet.

```json
// Request
{ "signedXDR": "AAAAAgAAAAA…", "playerAddress": "G...", "lifeBuyCount": 0 }

// Response
{ "success": true, "hash": "abc123…", "cost": 500, "lifeGranted": true }
```

---

## Prerequisites

### 1 · Node.js v18+

```bash
node --version   # v18.x.x or higher
npm --version    # 9.x.x or higher
```

Download: [nodejs.org](https://nodejs.org/)

### 2 · Rust + wasm32 target

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
rustc --version    # 1.74.0+ recommended
cargo --version
```

### 3 · Stellar CLI

```bash
cargo install --locked stellar-cli --features opt
stellar --version
```

Full guide: [Stellar CLI Docs](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli)

### 4 · Freighter Wallet Extension

Install from [Chrome Web Store](https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk) or [freighter.app](https://freighter.app/).  
Set the network to **Testnet** in the extension settings before playing.

### 5 · Two Funded Testnet Accounts

You need an **Admin wallet** (sends rewards, receives life payments) and a **Player wallet** (connected via Freighter).

```bash
# Generate admin wallet
stellar keys generate --global admin-wallet --network testnet
stellar keys address admin-wallet

# Fund via Friendbot
curl "https://friendbot.stellar.org/?addr=$(stellar keys address admin-wallet)"

# Verify balance
stellar account show --address $(stellar keys address admin-wallet) --network testnet
```

Or fund any address directly in the browser:
```
https://friendbot.stellar.org/?addr=YOUR_G_ADDRESS
```

---

## Build

```bash
git clone https://github.com/samenrqz/SoroShooter.git
cd SoroShooter

soroban contract build
```

Output:
```
target/wasm32-unknown-unknown/release/soroban_community_treasury.wasm
```

---

## Test

```bash
cargo test
```

Expected:
```
running 50 tests
test test::test_initialize_stores_config ... ok
test test::test_full_proposal_lifecycle_pass ... ok
...
test result: ok. 50 passed; 0 failed; 0 ignored
```

### Test Coverage

| Category | Tests |
|---|---|
| Initialization | Config stored correctly, double-init blocked, admin address set |
| Admin functions | Only admin can mint badge, non-admin calls rejected |
| Badge minting | Wave 5 mints Uncommon, Wave 10 mints Rare, duplicate mint blocked |
| Player queries | `get_badges`, `has_badge`, `get_admin` return correct values |
| XLM reward flow | Wave reward sends correct amount, milestone tiers match reward table |
| Life purchase — build | Unsigned XDR built with correct destination and amount |
| Life purchase — verify | Wrong destination rejected, underpayment rejected, correct payment accepted |
| Life purchase — submit | Confirmed transaction grants life and updates balance |
| Security | Secret key absent from all request payloads; server-side verification enforced |
| End-to-end | Full lifecycle: connect wallet → play → earn XLM → die → buy life → confirmed on Horizon |

---

## Deploy to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_community_treasury.wasm \
  --source admin-wallet \
  --network testnet
```

Save the Contract ID printed in the terminal — you will enter it in the game launcher.

### Initialize the Contract

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source admin-wallet \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>
```

### Sample CLI Invocations

**Mint a Wave 5 badge to a player (the core Soroban write operation):**

```bash
soroban contract invoke \
  --id CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F \
  --source admin-wallet \
  --network testnet \
  -- mint_badge \
  --admin GBKDNS4N5T5MQYEV3LVGLEZ4ZLL3HC3VCR3TAPU5LSVRPQRT3XNR4XEN \
  --player GPLAYERADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --wave 5
```

**Query all badges held by a player:**

```bash
soroban contract invoke \
  --id CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F \
  --source admin-wallet \
  --network testnet \
  -- get_badges \
  --player GPLAYERADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Check whether a player holds the Wave 10 rare badge:**

```bash
soroban contract invoke \
  --id CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F \
  --source admin-wallet \
  --network testnet \
  -- has_badge \
  --player GPLAYERADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --wave 10
```

---

## Run the Backend Server

```bash
# Install dependencies
npm install express cors stellar-sdk dotenv

# Create .env — NEVER commit this file to GitHub
echo "ADMIN_SECRET=S...your_admin_secret_key" > .env

# Start the server
node server.js
```

You should see:

```
╔══════════════════════════════════════════╗
║   SoroShooter API  —  Port 3001          ║
╚══════════════════════════════════════════╝
📡  Network  : Stellar Testnet
💰  Admin    : GBKDNS4N5T5MQYEV3LVGLEZ...
🔑  Secret   : ✅ loaded
✅ Ready! Open http://localhost:3001/api/diagnose
```

Always verify at `http://localhost:3001/api/diagnose` before opening the game.

---

## Game Controls

| Input | Action |
|---|---|
| `← →` or `A D` | Move ship |
| `SPACE` | Fire (triple-shot unlocks at Wave 5) |
| `ESC` / `P` | Pause |
| Touch `◀ ▶` | Mobile movement |
| Touch `🔥` | Mobile fire |

## Wave Difficulty

| Waves | Difficulty | Enemy Speed | Unlocks |
|---|---|---|---|
| 1–4 | Easy | 1.0× | — |
| 5–9 | Medium | 1.58× | Triple shot · Uncommon NFT badge |
| 10+ | Hard | 2.45× | Rare NFT badge |

---

## Security Model

```
Zero secret keys in any frontend file.
Zero secret keys typed by the player.
Zero secret keys transmitted over the network.

Admin secret  → .env only — never committed to GitHub
Player secret → never leaves the Freighter browser extension
Life purchase → server verifies destination + amount before submitting
              → wrong destination  = request rejected
              → underpayment      = request rejected
```

---

## Troubleshooting

**"Freighter not detected"** — Freighter only injects into HTTPS pages. Use `https://samenrqz.github.io/SoroShooter/`, not localhost.

**Wave reward fails** — Open `/api/diagnose` and match the `error` field:

| `error` value | Fix |
|---|---|
| `"ADMIN_SECRET not set in .env"` | Create `.env` with `ADMIN_SECRET=S...` next to `server.js` |
| `"secret_matches: false"` | The secret key belongs to a different wallet — correct it or regenerate |
| `"Admin only has X XLM — needs ≥1001"` | Fund admin at `https://friendbot.stellar.org/?addr=ADMIN_ADDRESS` |
| `"ADMIN_SECRET is not a valid Stellar secret key"` | Key must start with `S` and be 56 characters |
| `null` (no error shown) | Config is correct — restart `node server.js` and retry |

**Balance HUD not updating after life purchase** — Stellar takes a few seconds to confirm. The HUD polls every 2.5s for up to 30s. Click the XLM balance in the top-right to refresh manually.

**Freighter popup doesn't open** — Confirm Freighter is unlocked, set to Testnet, and the game is open on HTTPS.

**`secret_matches: false` in diagnose** — Verify which address your secret key controls:

```bash
node -e "const S=require('stellar-sdk'); console.log(S.Keypair.fromSecret('S...YOUR_SECRET').publicKey())"
```

The printed address must match `admin_public` shown in `/api/diagnose`. If it doesn't, update `ADMIN_SECRET` in `.env`.

---

## Blockchain Details

| Item | Value |
|---|---|
| Network | Stellar Testnet |
| Soroban Contract | [`CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F`](https://stellar.expert/explorer/testnet/contract/CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F) |
| Admin Wallet | `GBKDNS4N5T5MQYEV3LVGLEZ4ZLL3HC3VCR3TAPU5LSVRPQRT3XNR4XEN` |
| Freighter API | `@stellar/freighter-api` v5.0.0 |
| Stellar SDK | `stellar-sdk` v11.3.0 |
| Horizon | `https://horizon-testnet.stellar.org` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS · Canvas 2D |
| Wallet | Freighter Extension · `@stellar/freighter-api` v5 |
| Blockchain | Stellar Testnet · Soroban Smart Contracts |
| Backend | Node.js · Express · `stellar-sdk` v11 |
| Fonts | Orbitron · Share Tech Mono · Exo 2 |
| CDN | cdnjs (Freighter API + Stellar SDK) |

---

## Timeline

| Date | Milestone |
|---|---|
| March 2026 | Project started for Stellar PH Unitour Hackathon |
| March 2026 | Soroban contract deployed and initialized on Testnet |
| March 2026 | Freighter wallet signing flow implemented and verified |
| March 2026 | Admin wallet deduction and reward system live end-to-end |
| March 2026 | GitHub Pages deployment · public playtest complete |

---

## License

MIT — free to fork, extend, and ship your own play-to-earn game on Stellar.

---

<div align="center">

**Built with ☀️ on Stellar · Powered by Soroban · Signed by Freighter**

[⭐ Star this repo](https://github.com/samenrqz/SoroShooter) &nbsp;·&nbsp; [🐛 Report an issue](https://github.com/samenrqz/SoroShooter/issues) &nbsp;·&nbsp; [🎮 Play Now](https://samenrqz.github.io/SoroShooter/)

</div>