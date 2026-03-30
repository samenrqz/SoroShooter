/*  SoroShooter — Node.js Backend
    SECURITY:
    - ADMIN_SECRET lives in .env only — never in source code
    - ADMIN_PUBLIC is hardcoded and IMMUTABLE — cannot be changed via .env
      or any external input. All life-purchase payments MUST go to this address.
      The server rejects any signed XDR that sends to a different destination. */
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const StellarSdk = require('stellar-sdk');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── ADMIN WALLET — LOCKED, DO NOT CHANGE ──────────────────
   This is the only address that receives life-purchase payments.
   It is hardcoded and cannot be overridden by environment variables.
   Any signed transaction that sends to a different address is rejected. */
const ADMIN_PUBLIC   = 'GCYDZO56GUVVMAT6PR3GHKA4XNWCXMCIEJFEZWURDUC5DNWQI5FPNC6F';
Object.freeze({ ADMIN_PUBLIC }); // symbolic freeze — value is a primitive, mutation is impossible

const ADMIN_SECRET   = process.env.ADMIN_SECRET;   // secret key in .env only
const HORIZON_URL    = 'https://horizon-testnet.stellar.org';
const NETWORK_PHRASE = 'Test SDF Network ; September 2015';
const WAVE_REWARD    = 1000;
const LIFE_BASE      = 500;
const LIFE_STEP      = 1000;
const MILESTONE_MAP  = { 1000:500, 5000:2000, 15000:5000 };

app.use(cors());
app.use(express.json());

const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

function lifeCost(count) { return LIFE_BASE + (count||0) * LIFE_STEP; }

function horizonError(e) {
  const codes = e?.response?.data?.extras?.result_codes;
  if (codes) {
    const tx  = codes.transaction || '';
    const ops = (codes.operations||[]).join(', ');
    return `Horizon: tx=${tx}${ops?' ops=['+ops+']':''}`;
  }
  const title  = e?.response?.data?.title;
  const detail = e?.response?.data?.detail;
  if (title) return `Horizon: ${title}${detail?' — '+detail:''}`;
  return e.message || 'Unknown error';
}

async function adminSend(toAddress, amountXLM, memo) {
  if (!ADMIN_SECRET)
    throw new Error('ADMIN_SECRET not set in .env — add it and restart');

  let keypair;
  try { keypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET); }
  catch { throw new Error('ADMIN_SECRET is not a valid Stellar secret key (starts with S)'); }

  if (keypair.publicKey() !== ADMIN_PUBLIC)
    throw new Error(
      `ADMIN_SECRET mismatch. Secret → ${keypair.publicKey()} | Expected → ${ADMIN_PUBLIC}`
    );

  const account = await horizonServer.loadAccount(ADMIN_PUBLIC);
  const fee     = await horizonServer.fetchBaseFee();
  const xlmBal  = account.balances.find(b => b.asset_type === 'native');
  const balance = xlmBal ? parseFloat(xlmBal.balance) : 0;

  if (balance < amountXLM + 1)
    throw new Error(
      `Admin wallet low on XLM. Has ${balance.toFixed(2)}, needs ${amountXLM+1}. ` +
      `Fund: https://friendbot.stellar.org/?addr=${ADMIN_PUBLIC}`
    );

  const tx = new StellarSdk.TransactionBuilder(account, { fee, networkPassphrase: NETWORK_PHRASE })
    .addOperation(StellarSdk.Operation.payment({
      destination: toAddress,
      asset:       StellarSdk.Asset.native(),
      amount:      String(amountXLM),
    }))
    .addMemo(StellarSdk.Memo.text(String(memo).slice(0,28)))
    .setTimeout(30)
    .build();
  tx.sign(keypair);

  try {
    const result = await horizonServer.submitTransaction(tx);
    return { success:true, hash:result.hash, amount:amountXLM };
  } catch(e) { throw new Error(horizonError(e)); }
}

/* ── HEALTH ─────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status:'ok', service:'SoroShooter API', network:'Stellar Testnet',
             admin:ADMIN_PUBLIC, secret_set:!!ADMIN_SECRET, wave_reward:WAVE_REWARD });
});

/* ── DIAGNOSE — open http://localhost:3001/api/diagnose ─── */
app.get('/api/diagnose', async (req, res) => {
  const r = {
    admin_public:   ADMIN_PUBLIC,
    secret_set:     !!ADMIN_SECRET,
    secret_valid:   false,
    secret_matches: false,
    admin_balance:  null,
    admin_funded:   false,
    error:          null,
  };
  if (!ADMIN_SECRET) { r.error='ADMIN_SECRET not set in .env'; return res.json(r); }
  try {
    const kp = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
    r.secret_valid   = true;
    r.secret_matches = kp.publicKey() === ADMIN_PUBLIC;
    if (!r.secret_matches)
      r.error = `Secret resolves to ${kp.publicKey()}, expected ${ADMIN_PUBLIC}`;
  } catch(e) { r.error='Invalid secret key: '+e.message; return res.json(r); }
  try {
    const acct = await horizonServer.loadAccount(ADMIN_PUBLIC);
    const xlm  = acct.balances.find(b=>b.asset_type==='native');
    r.admin_balance = xlm ? parseFloat(xlm.balance) : 0;
    r.admin_funded  = r.admin_balance >= 1001;
    if (!r.admin_funded)
      r.error = `Admin only has ${r.admin_balance} XLM — needs ≥1001. Fund at: https://friendbot.stellar.org/?addr=${ADMIN_PUBLIC}`;
  } catch(e) { r.error='Cannot load admin account: '+e.message; }
  res.json(r);
});

/* ── BALANCE ────────────────────────────────────────────── */
app.get('/api/balance/:address', async (req, res) => {
  try {
    const acct = await horizonServer.loadAccount(req.params.address);
    const xlm  = acct.balances.find(b=>b.asset_type==='native');
    res.json({ success:true, balance: xlm ? parseFloat(xlm.balance) : 0 });
  } catch(e) { res.status(400).json({ success:false, error:e.message }); }
});

/* ── WAVE REWARD ────────────────────────────────────────── */
app.post('/api/reward/wave', async (req, res) => {
  const { playerAddress, wave } = req.body;
  if (!playerAddress || !wave)
    return res.status(400).json({ success:false, error:'Missing params: need playerAddress and wave' });
  console.log(`[WAVE]  Sending ${WAVE_REWARD} XLM → ${playerAddress.slice(0,8)}… (wave ${wave})`);
  try {
    const r = await adminSend(playerAddress, WAVE_REWARD, `Wave ${wave} reward`);
    console.log(`[WAVE]  ✅ +${WAVE_REWARD} XLM sent. Tx: ${r.hash}`);
    res.json(r);
  } catch(e) {
    console.error(`[WAVE]  ❌ ${e.message}`);
    console.error(`[WAVE]  👉 Debug: http://localhost:${PORT}/api/diagnose`);
    res.status(500).json({ success:false, error:e.message });
  }
});

/* ── MILESTONE REWARD ───────────────────────────────────── */
app.post('/api/reward/milestone', async (req, res) => {
  const { playerAddress, milestone } = req.body;
  const amount = MILESTONE_MAP[milestone];
  if (!amount) return res.status(400).json({ success:false, error:'Invalid milestone' });
  try {
    const r = await adminSend(playerAddress, amount, `Milestone ${milestone}`);
    console.log(`[MILE]  +${amount} XLM → ${playerAddress.slice(0,8)}… Tx:${r.hash}`);
    res.json(r);
  } catch(e) {
    console.error('[MILE] ❌', e.message);
    res.status(500).json({ success:false, error:e.message });
  }
});

/* ── BUY LIFE: STEP 1 — build unsigned XDR ─────────────── */
app.post('/api/life/build-tx', async (req, res) => {
  const { playerAddress, lifeBuyCount } = req.body;
  if (!playerAddress)
    return res.status(400).json({ success:false, error:'Missing playerAddress' });
  const cost = lifeCost(lifeBuyCount);
  try {
    const account = await horizonServer.loadAccount(playerAddress);
    const fee     = await horizonServer.fetchBaseFee();
    const tx = new StellarSdk.TransactionBuilder(account, { fee, networkPassphrase:NETWORK_PHRASE })
      .addOperation(StellarSdk.Operation.payment({
        destination: ADMIN_PUBLIC,
        asset:       StellarSdk.Asset.native(),
        amount:      String(cost),
      }))
      .addMemo(StellarSdk.Memo.text('SoroShooter BuyLife'))
      .setTimeout(60)
      .build();
    res.json({ success:true, unsignedXDR:tx.toXDR(), cost, networkPassphrase:NETWORK_PHRASE });
  } catch(e) {
    console.error('[LIFE/build] ❌', e.message);
    res.status(500).json({ success:false, error:e.message });
  }
});

/* ── BUY LIFE: STEP 2 — verify + submit signed XDR ──────── */
app.post('/api/life/submit-tx', async (req, res) => {
  const { signedXDR, playerAddress, lifeBuyCount } = req.body;
  if (!signedXDR || !playerAddress)
    return res.status(400).json({ success:false, error:'Missing params' });
  const expected = lifeCost(lifeBuyCount);
  try {
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PHRASE);
    const op = tx.operations[0];
    if (op.type !== 'payment')
      return res.status(400).json({ success:false, error:'Expected a payment operation' });
    if (op.destination !== ADMIN_PUBLIC)
      return res.status(400).json({ success:false, error:'Destination must be admin wallet' });
    if (parseFloat(op.amount) < expected)
      return res.status(400).json({ success:false, error:`Expected ≥ ${expected} XLM` });
    const result = await horizonServer.submitTransaction(tx);
    console.log(`[LIFE]  -${expected} XLM from ${playerAddress.slice(0,8)}… Tx:${result.hash}`);
    res.json({ success:true, hash:result.hash, cost:expected, lifeGranted:true });
  } catch(e) {
    const detail = horizonError(e);
    console.error('[LIFE/submit] ❌', detail);
    res.status(500).json({ success:false, error:detail });
  }
});

/* ── START ──────────────────────────────────────────────── */

/* Startup integrity check — refuse to run if admin wallet is tampered */
const EXPECTED_ADMIN = 'GCYDZO56GUVVMAT6PR3GHKA4XNWCXMCIEJFEZWURDUC5DNWQI5FPNC6F';
if (ADMIN_PUBLIC !== EXPECTED_ADMIN) {
  console.error('\n🚨 INTEGRITY ERROR: ADMIN_PUBLIC has been modified.');
  console.error(`   Expected : ${EXPECTED_ADMIN}`);
  console.error(`   Found    : ${ADMIN_PUBLIC}`);
  console.error('   Server will not start with a tampered admin wallet address.\n');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║   SoroShooter API  —  Port ${PORT}          ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log(`📡  Network  : Stellar Testnet`);
  console.log(`💰  Admin    : ${ADMIN_PUBLIC}  🔒 LOCKED`);
  console.log(`🔑  Secret   : ${ADMIN_SECRET ? '✅ loaded from .env' : '❌ NOT SET — add ADMIN_SECRET to .env'}`);
  console.log('\nEndpoints:');
  ['GET  /health',
   'GET  /api/diagnose    ← open this in browser to debug reward errors',
   'GET  /api/balance/:address',
   'POST /api/reward/wave',
   'POST /api/reward/milestone',
   'POST /api/life/build-tx',
   'POST /api/life/submit-tx',
  ].forEach(e => console.log('  ' + e));
  if (!ADMIN_SECRET) {
    console.log('\n⚠️  ADMIN_SECRET missing! Create .env with:');
    console.log('   ADMIN_SECRET=S...your_secret_here\n');
  } else {
    console.log('\n✅ Ready! Open http://localhost:3001/api/diagnose to verify config\n');
  }
});