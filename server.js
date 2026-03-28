require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const StellarSdk = require('stellar-sdk');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ═══════════════════════════════════
   CONFIG
═══════════════════════════════════ */
const TREASURY_PUBLIC = process.env.TREASURY_PUBLIC || 'GDPASSTOULP5AEO7QJYUQUDPKABHXSSJCJGDVMOBMZ3DYFYUDBJAXAIC';
const TREASURY_SECRET = process.env.TREASURY_SECRET || '';
const HORIZON_URL     = 'https://horizon-testnet.stellar.org';
const NETWORK_PHRASE  = 'Test SDF Network ; September 2015';
const LIFE_BASE_COST  = 500;
const LIFE_COST_STEP  = 1000;
const WAVE_REWARD_XLM = 1000;
const MILESTONE_MAP   = { 1000: 500, 5000: 2000, 15000: 5000 };

app.use(cors());
app.use(express.json());

/* ═══════════════════════════════════
   HELPERS
═══════════════════════════════════ */
function getLifeCost(count) {
  return LIFE_BASE_COST + (count * LIFE_COST_STEP);
}

async function treasurySend(toAddress, amountXLM, memoText) {
  const server  = new StellarSdk.Horizon.Server(HORIZON_URL);
  const keypair = StellarSdk.Keypair.fromSecret(TREASURY_SECRET);
  const account = await server.loadAccount(TREASURY_PUBLIC);
  const fee     = await server.fetchBaseFee();
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee, networkPassphrase: NETWORK_PHRASE,
  })
  .addOperation(StellarSdk.Operation.payment({
    destination: toAddress,
    asset:       StellarSdk.Asset.native(),
    amount:      amountXLM.toString(),
  }))
  .addMemo(StellarSdk.Memo.text(String(memoText).slice(0, 28)))
  .setTimeout(30).build();
  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return { success: true, hash: result.hash, amount: amountXLM };
}

/* ═══════════════════════════════════
   ROUTES
═══════════════════════════════════ */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SoroShooter API', network: 'Stellar Testnet' });
});

app.get('/api/balance/:address', async (req, res) => {
  try {
    const server  = new StellarSdk.Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(req.params.address);
    const xlm     = account.balances.find(b => b.asset_type === 'native');
    res.json({ success: true, balance: xlm ? parseFloat(xlm.balance) : 0 });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/reward/wave', async (req, res) => {
  const { playerAddress, wave } = req.body;
  if (!playerAddress || !wave) return res.status(400).json({ success: false, error: 'Missing params' });
  try {
    const result = await treasurySend(playerAddress, WAVE_REWARD_XLM, `Wave ${wave} reward`);
    console.log(`[REWARD] Wave ${wave} → ${playerAddress.slice(0,8)}… Tx:${result.hash}`);
    res.json(result);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/reward/milestone', async (req, res) => {
  const { playerAddress, milestone } = req.body;
  const amount = MILESTONE_MAP[milestone];
  if (!amount) return res.status(400).json({ success: false, error: 'Invalid milestone' });
  try {
    const result = await treasurySend(playerAddress, amount, `Milestone ${milestone}`);
    console.log(`[REWARD] Milestone ${milestone} → ${playerAddress.slice(0,8)}… Tx:${result.hash}`);
    res.json(result);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

/* ═══════════════════════════════════
   BUY LIFE — 2-STEP FLOW

   Step 1  POST /api/life/build-tx
           Server builds unsigned tx XDR
           Frontend signs via Freighter OR secret key

   Step 2  POST /api/life/submit-tx
           Server verifies + submits signed XDR
           Returns hash + life granted confirmation
═══════════════════════════════════ */
app.post('/api/life/build-tx', async (req, res) => {
  const { playerAddress, lifeBuyCount } = req.body;
  if (!playerAddress) return res.status(400).json({ success: false, error: 'Missing playerAddress' });
  const cost = getLifeCost(lifeBuyCount || 0);
  try {
    const server  = new StellarSdk.Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(playerAddress);
    const fee     = await server.fetchBaseFee();
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee, networkPassphrase: NETWORK_PHRASE,
    })
    .addOperation(StellarSdk.Operation.payment({
      destination: TREASURY_PUBLIC,
      asset:       StellarSdk.Asset.native(),
      amount:      cost.toString(),
    }))
    .addMemo(StellarSdk.Memo.text('SoroShooter BuyLife'))
    .setTimeout(60).build();
    res.json({ success: true, unsignedXDR: tx.toXDR(), cost, networkPassphrase: NETWORK_PHRASE });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/life/submit-tx', async (req, res) => {
  const { signedXDR, playerAddress, lifeBuyCount } = req.body;
  if (!signedXDR || !playerAddress) return res.status(400).json({ success: false, error: 'Missing params' });
  const expectedCost = getLifeCost(lifeBuyCount || 0);
  try {
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const tx     = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PHRASE);
    const op     = tx.operations[0];
    if (op.type !== 'payment' || op.destination !== TREASURY_PUBLIC || parseFloat(op.amount) < expectedCost) {
      return res.status(400).json({ success: false, error: `Expected ${expectedCost} XLM to treasury` });
    }
    const result = await server.submitTransaction(tx);
    console.log(`[LIFE] ${expectedCost} XLM from ${playerAddress.slice(0,8)}… Tx:${result.hash}`);
    res.json({ success: true, hash: result.hash, cost: expectedCost, lifeGranted: true });
  } catch (e) {
    const detail = e.response?.data?.extras?.result_codes || e.message;
    res.status(500).json({ success: false, error: JSON.stringify(detail) });
  }
});

app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║   SoroShooter API  —  Port ${PORT}       ║`);
  console.log(`╚═══════════════════════════════════════╝`);
  console.log(`📡 Stellar Testnet`);
  console.log(`💰 Treasury: ${TREASURY_PUBLIC}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health`);
  console.log(`  GET  /api/balance/:address`);
  console.log(`  POST /api/reward/wave`);
  console.log(`  POST /api/reward/milestone`);
  console.log(`  POST /api/life/build-tx`);
  console.log(`  POST /api/life/submit-tx\n`);
});