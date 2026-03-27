#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, Address, Env, String,
};

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Clone, Copy, PartialEq)]
pub enum Error {
    AlreadyRegistered  = 1,
    NotRegistered      = 2,
    InvalidScore       = 3,
    InvalidWave        = 4,
    BadgeAlreadyMinted = 5,
    InvalidAmount      = 6,
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Player(Address),
    Badge(Address, u32),
    TotalPlayers,
    TotalRewards,
}

// ─── Data Types ───────────────────────────────────────────────────────────────

/// Full player record stored on-chain
#[derive(Clone)]
#[contracttype]
pub struct PlayerData {
    pub address:       Address,
    pub high_score:    u64,
    pub waves_cleared: u32,
    pub total_kills:   u64,
    pub xlm_earned:    i128,
    pub tokens:        i128,
    pub registered:    bool,
}

/// NFT badge record minted per player per wave milestone
#[derive(Clone)]
#[contracttype]
pub struct BadgeData {
    pub owner:    Address,
    pub wave:     u32,
    pub name:     String,
    pub rarity:   String,
    pub minted:   bool,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct SoroShooterContract;

#[contractimpl]
impl SoroShooterContract {

    // ─── Player Registration ───────────────────────────────────────────────

    /// Register a new player.
    /// Awards 2 free SQT welcome tokens on first registration.
    pub fn register_player(env: Env, player: Address) -> Result<PlayerData, Error> {
        player.require_auth();

        // Reject duplicate registrations
        if env.storage().persistent().has(&DataKey::Player(player.clone())) {
            return Err(Error::AlreadyRegistered);
        }

        // Initialize player with 2 free welcome tokens
        let data = PlayerData {
            address:       player.clone(),
            high_score:    0,
            waves_cleared: 0,
            total_kills:   0,
            xlm_earned:    0,
            tokens:        2,  // 2 free SQT tokens on registration
            registered:    true,
        };

        env.storage().persistent().set(&DataKey::Player(player.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::Player(player.clone()), 100, 200);

        // Increment total players counter
        let total: u32 = env.storage().instance()
            .get(&DataKey::TotalPlayers).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalPlayers, &(total + 1));
        env.storage().instance().extend_ttl(100, 200);

        // Emit registration event
        env.events().publish((symbol_short!("reg"),), player.clone());
        // Emit token reward event
        env.events().publish((symbol_short!("tokens"),), (player, 2i128));

        Ok(data)
    }

    // ─── Wave Reward ───────────────────────────────────────────────────────

    /// Called after a player clears a wave.
    /// Reward scales with wave number: wave * 0.05 XLM equivalent in stroops.
    pub fn reward_wave(
        env: Env,
        player: Address,
        wave: u32,
        kills: u64,
    ) -> Result<i128, Error> {
        player.require_auth();

        if wave == 0 { return Err(Error::InvalidWave); }

        let mut data: PlayerData = env.storage().persistent()
            .get(&DataKey::Player(player.clone()))
            .ok_or(Error::NotRegistered)?;

        // Calculate wave reward: wave * 500_000 stroops (0.05 XLM per wave)
        let reward: i128 = (wave as i128) * 500_000;

        // Update player record
        data.waves_cleared += 1;
        data.total_kills   += kills;
        data.xlm_earned    += reward;

        env.storage().persistent().set(&DataKey::Player(player.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::Player(player.clone()), 100, 200);

        // Update global total rewards
        let total: i128 = env.storage().instance()
            .get(&DataKey::TotalRewards).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalRewards, &(total + reward));

        // Emit wave reward event
        env.events().publish((symbol_short!("wave_rew"),), (player, wave, reward));

        Ok(reward)
    }

    // ─── Score Milestone Reward ────────────────────────────────────────────

    /// Called when a player hits a score milestone.
    /// milestone_pts: 1000, 5000, or 15000
    /// Returns the XLM reward amount in stroops.
    pub fn reward_milestone(
        env: Env,
        player: Address,
        milestone_pts: u64,
        current_score: u64,
    ) -> Result<i128, Error> {
        player.require_auth();

        if current_score < milestone_pts {
            return Err(Error::InvalidScore);
        }

        let mut data: PlayerData = env.storage().persistent()
            .get(&DataKey::Player(player.clone()))
            .ok_or(Error::NotRegistered)?;

        // Milestone reward table in stroops
        // 1000 pts  → 0.5 XLM  = 5_000_000 stroops
        // 5000 pts  → 2.0 XLM  = 20_000_000 stroops
        // 15000 pts → 5.0 XLM  = 50_000_000 stroops
        let reward: i128 = match milestone_pts {
            1000  => 5_000_000,
            5000  => 20_000_000,
            15000 => 50_000_000,
            _     => return Err(Error::InvalidScore),
        };

        // Update high score if better
        if current_score > data.high_score {
            data.high_score = current_score;
        }

        data.xlm_earned += reward;

        env.storage().persistent().set(&DataKey::Player(player.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::Player(player.clone()), 100, 200);

        // Emit milestone event
        env.events().publish(
            (symbol_short!("milestone"),),
            (player, milestone_pts, reward),
        );

        Ok(reward)
    }

    // ─── NFT Badge Minting ─────────────────────────────────────────────────

    /// Mint an NFT badge for reaching wave 5 or wave 10.
    /// Each badge can only be minted once per player per wave.
    pub fn mint_nft_badge(
        env: Env,
        player: Address,
        wave: u32,
    ) -> Result<BadgeData, Error> {
        player.require_auth();

        // Only wave 5 and wave 10 have badges
        if wave != 5 && wave != 10 {
            return Err(Error::InvalidWave);
        }

        // Check player is registered
        if !env.storage().persistent().has(&DataKey::Player(player.clone())) {
            return Err(Error::NotRegistered);
        }

        // Prevent duplicate minting
        let badge_key = DataKey::Badge(player.clone(), wave);
        if env.storage().persistent().has(&badge_key) {
            return Err(Error::BadgeAlreadyMinted);
        }

        // Create badge based on wave
        let (name, rarity) = if wave == 5 {
            (
                String::from_str(&env, "Wave 5 Survivor"),
                String::from_str(&env, "Uncommon"),
            )
        } else {
            (
                String::from_str(&env, "Wave 10 Titan"),
                String::from_str(&env, "Rare"),
            )
        };

        let badge = BadgeData {
            owner:  player.clone(),
            wave,
            name:   name.clone(),
            rarity: rarity.clone(),
            minted: true,
        };

        env.storage().persistent().set(&badge_key, &badge);
        env.storage().persistent().extend_ttl(&badge_key, 100, 200);

        // Emit NFT mint event
        env.events().publish(
            (symbol_short!("nft_mint"),),
            (player, wave, name),
        );

        Ok(badge)
    }

    // ─── Update High Score ─────────────────────────────────────────────────

    /// Update a player's high score after a game over.
    pub fn update_score(
        env: Env,
        player: Address,
        score: u64,
        wave: u32,
    ) -> Result<(), Error> {
        player.require_auth();

        let mut data: PlayerData = env.storage().persistent()
            .get(&DataKey::Player(player.clone()))
            .ok_or(Error::NotRegistered)?;

        if score > data.high_score {
            data.high_score = score;
        }

        if wave > data.waves_cleared {
            data.waves_cleared = wave;
        }

        env.storage().persistent().set(&DataKey::Player(player.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::Player(player.clone()), 100, 200);

        env.events().publish((symbol_short!("score_up"),), (player, score));

        Ok(())
    }

    // ─── Query Functions ───────────────────────────────────────────────────

    /// Get a player's full stats
    pub fn get_player(env: Env, player: Address) -> Result<PlayerData, Error> {
        env.storage().persistent()
            .get(&DataKey::Player(player))
            .ok_or(Error::NotRegistered)
    }

    /// Check if a player has a specific NFT badge
    pub fn get_badge(env: Env, player: Address, wave: u32) -> Result<BadgeData, Error> {
        env.storage().persistent()
            .get(&DataKey::Badge(player, wave))
            .ok_or(Error::BadgeAlreadyMinted)
    }

    /// Get total number of registered players
    pub fn get_total_players(env: Env) -> u32 {
        env.storage().instance()
            .get(&DataKey::TotalPlayers)
            .unwrap_or(0)
    }

    /// Get total XLM rewards distributed
    pub fn get_total_rewards(env: Env) -> i128 {
        env.storage().instance()
            .get(&DataKey::TotalRewards)
            .unwrap_or(0)
    }
}

mod test;