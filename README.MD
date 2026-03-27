# SoroShooter — Full Stack Play-to-Earn on Stellar

![Stellar](https://img.shields.io/badge/Stellar-Testnet-7c3aed?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js)
![Soroban](https://img.shields.io/badge/Soroban_SDK-v21-06b6d4?style=for-the-badge)

> A full-stack Play-to-Earn space shooter on Stellar's Soroban platform.
> Real XLM rewards per wave. Real XLM deducted for extra lives.
> Node.js backend handles all Stellar transactions securely.

---

## Live Demo
🎮 **Play:** https://samenrqz.github.io/SoroShooter/
📡 **API:**  http://localhost:3001 (run locally)

---

## Project Structure

```
SoroShooter/
├── server.js          ← Node.js backend (Stellar transactions)
├── .env               ← Treasury keypair (never commit real keys)
├── package.json
├── frontend/
│   └── index.html     ← Full game frontend
├── src/
│   ├── lib.rs         ← Soroban smart contract
│   └── test.rs
├── Cargo.toml
└── README.md
```

---

## How to Run

### 1 — Install dependencies
```bash
npm install
```

### 2 — Start the backend server
```bash
node server.js
```
You should see:
```
🚀 SoroShooter API running on http://localhost:3001
📡 Network: Stellar Testnet
💰 Treasury: GCYDZO56...
```

### 3 — Open the game
Open `frontend/index.html` with Live Server in VS Code,
or visit https://samenrqz.github.io/SoroShooter/

The login screen shows a **green dot** when the server is online.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/balance/:address` | Get XLM balance |
| POST | `/api/reward/wave` | Send wave reward to player |
| POST | `/api/reward/milestone` | Send milestone reward |
| POST | `/api/life/build-tx` | Build unsigned buy-life transaction |
| POST | `/api/life/submit-tx` | Submit signed buy-life transaction |
| POST | `/api/life/demo-deduct` | Demo mode life grant |

---

## Buy Life — Real XLM Deduction Flow

```
Player dies → 10-second countdown shown
       ↓
Frontend calls POST /api/life/build-tx
       ↓
Server builds unsigned tx: player → treasury (500 XLM)
       ↓
If Freighter available (HTTPS):
  → Freighter popup appears
  → Player approves → signs tx
  → Signed XDR sent to POST /api/life/submit-tx
  → Server verifies + submits to Stellar
  → ✅ 500 XLM ACTUALLY DEDUCTED from player wallet
  → Life granted, wave restarts

If no Freighter (localhost demo):
  → Server calls POST /api/life/demo-deduct
  → Server sends 0.01 XLM confirmation tx
  → Life granted with demo note
```

### Cost Escalation
| Purchase | Cost |
|----------|------|
| 1st life | 500 XLM |
| 2nd life | 1,500 XLM |
| 3rd life | 2,500 XLM |
| nth life | 500 + (n-1) × 1000 XLM |

---

## Reward System

| Trigger | Amount | How |
|---------|--------|-----|
| Wave cleared | +1,000 XLM | Server → POST /api/reward/wave |
| 1,000 pts | +500 XLM | Server → POST /api/reward/milestone |
| 5,000 pts | +2,000 XLM | Server → POST /api/reward/milestone |
| 15,000 pts | +5,000 XLM | Server → POST /api/reward/milestone |
| Wave 5 | NFT Badge 🏆 | Soroban contract |
| Wave 10 | Rare NFT ✨ | Soroban contract |

---

## Smart Contract

- **Network:** Stellar Testnet
- **Contract ID:** `CAXLPNVK4FBCNWMNGNBQUJVGLZKYNDNKCOXZHTRKIFLDGZKDLSFNID4F`
- **Language:** Rust (Soroban SDK v21)
- **Tests:** 3/3 passing

### Contract Functions
| Function | Description |
|----------|-------------|
| `register_player(player)` | Register + issue 2 SQT tokens |
| `reward_wave(player, wave, kills)` | Wave reward |
| `reward_milestone(player, pts, score)` | Milestone reward |
| `mint_nft_badge(player, wave)` | Wave 5/10 NFT |
| `update_score(player, score, wave)` | Update high score |
| `get_player(player)` | Query player data |

---

## Difficulty Scaling

| Waves | Level | Enemy Speed | HP |
|-------|-------|-------------|-----|
| 1–4 | Easy 🟢 | 1.0x | 1 |
| 5–9 | Medium 🟡 | 1.58x | 1–2 |
| 10+ | Hard 🔴 | 2.45x | 2–3 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 Canvas, JavaScript |
| Backend | Node.js, Express |
| Blockchain | Stellar Testnet, Soroban |
| Transactions | Stellar SDK v11 (Node.js) |
| Wallet | Manual entry + Freighter (HTTPS) |
| Hosting | GitHub Pages (frontend) |

---

## Security Notes

- Treasury secret key is in `.env` — **never commit to public repos**
- All transaction signing happens on the backend server
- Player secret keys are never required or exposed
- Buy-life flow uses server-verified transaction validation

---

## Author
**Sam Enriquez** — University of the East Caloocan
GitHub: [@samenrqz](https://github.com/samenrqz)