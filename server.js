/*  SoroShooter — Node.js Backend
    ────────────────────────────────────────────────────────────
    SECURITY MODEL
    • ADMIN_SECRET lives only in .env — never in source code.
    • The secret is used server-side to sign reward payouts.
    • Buy-life deductions are signed by the PLAYER via Freighter.
      The server only verifies + submits the pre-signed XDR.
    ──────────────────────────────────────────────────────────── */
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const StellarSdk = require('stellar-sdk');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── CONFIG ────────────────────────────────────────────────── */
const ADMIN_PUBLIC   = 'GBKDNS4N5T5MQYEV3LVGLEZ4ZLL3HC3VCR3TAPU5LSVRPQRT3XNR4XEN';
const ADMIN_SECRET   = process.env.ADMIN_SECRET;   // set in .env
const HORIZON_URL    = 'https://horizon-testnet.stellar.org';
const NETWORK_PHRASE = 'Test SDF Network ; September 2015';
const WAVE_REWARD    = 1000;   // XLM per wave cleared
const LIFE_BASE      = 500;    // first extra life cost
const LIFE_STEP      = 1000;   // each subsequent purchase increases by this
const MILESTONE_MAP  = { 1000:500, 5000:2000, 15000:5000 };

app.use(cors());
app.use(express.json());

/* ── HELPERS ──────────────────────────────────────────────── */
const server   = new StellarSdk.Horizon.Server(HORIZON_URL);

function lifeCost(count) {
  return LIFE_BASE + count * LIFE_STEP;
}

async function adminSend(toAddress, amountXLM, memo) {
  if (!ADMIN_SECRET) throw new Error('ADMIN_SECRET not set in .env');
  const keypair  = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
  const account  = await server.loadAccount(ADMIN_PUBLIC);
  const fee      = await server.fetchBaseFee();
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee, networkPassphrase: NETWORK_PHRASE,
  })
  .addOperation(StellarSdk.Operation.payment({
    destination: toAddress,
    asset:       StellarSdk.Asset.native(),
    amount:      String(amountXLM),
  }))
  .addMemo(StellarSdk.Memo.text(String(memo).slice(0, 28)))
  .setTimeout(30)
  .build();
  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return { success:true, hash:result.hash, amount:amountXLM };
}

/* ── ROUTES ───────────────────────────────────────────────── */

/* Health check */
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'SoroShooter API',
    network: 'Stellar Testnet',
    admin:   ADMIN_PUBLIC,
  });
});

/* Get XLM balance */
app.get('/api/balance/:address', async (req, res) => {
  try {
    const acct = await server.loadAccount(req.params.address);
    const xlm  = acct.balances.find(b => b.asset_type === 'native');
    res.json({ success:true, balance: xlm ? parseFloat(xlm.balance) : 0 });
  } catch (e) {
    res.status(400).json({ success:false, error: e.message });
  }
});

/* Wave-clear reward  →  admin pays player */
app.post('/api/reward/wave', async (req, res) => {
  const { playerAddress, wave } = req.body;
  if (!playerAddress || !wave)
    return res.status(400).json({ success:false, error:'Missing params' });
  try {
    const r = await adminSend(playerAddress, WAVE_REWARD, `Wave ${wave} reward`);
    console.log(`[WAVE]  +${WAVE_REWARD} XLM → ${playerAddress.slice(0,8)}… Tx:${r.hash}`);
    res.json(r);
  } catch (e) {
    console.error('[WAVE] error:', e.message);
    res.status(500).json({ success:false, error: e.message });
  }
});

/* Milestone reward  →  admin pays player */
app.post('/api/reward/milestone', async (req, res) => {
  const { playerAddress, milestone } = req.body;
  const amount = MILESTONE_MAP[milestone];
  if (!amount)
    return res.status(400).json({ success:false, error:'Invalid milestone' });
  try {
    const r = await adminSend(playerAddress, amount, `Milestone ${milestone}`);
    console.log(`[MILE]  +${amount} XLM → ${playerAddress.slice(0,8)}… Tx:${r.hash}`);
    res.json(r);
  } catch (e) {
    console.error('[MILE] error:', e.message);
    res.status(500).json({ success:false, error: e.message });
  }
});

/* ── BUY LIFE — 2-step Freighter flow ─────────────────────
   Step 1  POST /api/life/build-tx
           Server loads player's account from Stellar and builds
           an UNSIGNED payment tx  (player → ADMIN, cost XLM).
           Returns the tx as base-64 XDR — no signing here.

   Step 2  POST /api/life/submit-tx
           Receives the XDR that Freighter already signed.
           Server verifies: destination === ADMIN_PUBLIC
                            amount      >= expected cost
           Then submits to Stellar testnet and returns the tx hash.
   ─────────────────────────────────────────────────────────── */
app.post('/api/life/build-tx', async (req, res) => {
  const { playerAddress, lifeBuyCount } = req.body;
  if (!playerAddress)
    return res.status(400).json({ success:false, error:'Missing playerAddress' });
  const cost = lifeCost(lifeBuyCount || 0);
  try {
    const account = await server.loadAccount(playerAddress);
    const fee     = await server.fetchBaseFee();
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee, networkPassphrase: NETWORK_PHRASE,
    })
    .addOperation(StellarSdk.Operation.payment({
      destination: ADMIN_PUBLIC,
      asset:       StellarSdk.Asset.native(),
      amount:      String(cost),
    }))
    .addMemo(StellarSdk.Memo.text('SoroShooter BuyLife'))
    .setTimeout(60)
    .build();
    res.json({
      success:      true,
      unsignedXDR:  tx.toXDR(),
      cost,
      networkPassphrase: NETWORK_PHRASE,
    });
  } catch (e) {
    console.error('[LIFE/build] error:', e.message);
    res.status(500).json({ success:false, error: e.message });
  }
});

app.post('/api/life/submit-tx', async (req, res) => {
  const { signedXDR, playerAddress, lifeBuyCount } = req.body;
  if (!signedXDR || !playerAddress)
    return res.status(400).json({ success:false, error:'Missing params' });
  const expected = lifeCost(lifeBuyCount || 0);
  try {
    /* Parse + verify the signed transaction before submitting */
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PHRASE);
    const op = tx.operations[0];
    if (op.type !== 'payment')
      return res.status(400).json({ success:false, error:'Expected a payment operation' });
    if (op.destination !== ADMIN_PUBLIC)
      return res.status(400).json({ success:false, error:`Destination must be admin wallet` });
    if (parseFloat(op.amount) < expected)
      return res.status(400).json({ success:false, error:`Expected ≥ ${expected} XLM` });

    const result = await server.submitTransaction(tx);
    console.log(`[LIFE]  -${expected} XLM from ${playerAddress.slice(0,8)}… Tx:${result.hash}`);
    res.json({ success:true, hash:result.hash, cost:expected, lifeGranted:true });
  } catch (e) {
    const detail = e?.response?.data?.extras?.result_codes || e.message;
    console.error('[LIFE/submit] error:', detail);
    res.status(500).json({ success:false, error: JSON.stringify(detail) });
  }
});

/* ── START ─────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║   SoroShooter API  —  Port ${PORT}          ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log(`📡  Network : Stellar Testnet`);
  console.log(`💰  Admin   : ${ADMIN_PUBLIC}`);
  console.log(`🔑  Secret  : ${ADMIN_SECRET ? '✅ loaded from .env' : '❌ NOT SET — add ADMIN_SECRET to .env'}`);
  console.log('\nEndpoints:');
  ['GET  /health',
   'GET  /api/balance/:address',
   'POST /api/reward/wave',
   'POST /api/reward/milestone',
   'POST /api/life/build-tx',
   'POST /api/life/submit-tx',
  ].forEach(e => console.log('  ' + e));
  console.log('');
});