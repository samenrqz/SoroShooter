#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short,
    Address, Env, String,
};

// ─── Error Codes ──────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Clone, Copy, PartialEq)]
pub enum Error {
    AlreadyRegistered = 1,
    NotRegistered     = 2,
    QuestNotFound     = 3,
    QuestNotActive    = 4,
    InsufficientFunds = 5,
    InvalidRoyalty    = 6,
    InvalidAmount     = 7,
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Player(Address),
    Creator(Address),
    Quest(u64),
    NextQuestId,
}

// ─── Data Structures ──────────────────────────────────────────────────────────

/// Holds all data for a registered player
#[derive(Clone)]
#[contracttype]
pub struct PlayerData {
    pub address: Address,
    pub total_points: u64,
    pub total_rewards: i128,
    pub quests_completed: u64,
    pub registered: bool,
}

/// Holds all data for a registered creator
#[derive(Clone)]
#[contracttype]
pub struct CreatorData {
    pub address: Address,
    pub total_royalties: i128,
    pub quests_created: u64,
    pub registered: bool,
}

/// Holds all data for a quest
#[derive(Clone)]
#[contracttype]
pub struct QuestData {
    pub id: u64,
    pub creator: Address,
    pub title: String,
    pub reward_points: u64,
    pub reward_amount: i128,
    pub royalty_bps: u32,
    pub active: bool,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct SoroQuestContract;

#[contractimpl]
impl SoroQuestContract {

    // ─── Player Functions ──────────────────────────────────────────────────

    /// Register a new player into the game.
    /// Each player can only register once.
    pub fn register_player(env: Env, player: Address) -> Result<(), Error> {
        player.require_auth();

        if env.storage().persistent().has(&DataKey::Player(player.clone())) {
            return Err(Error::AlreadyRegistered);
        }

        let data = PlayerData {
            address: player.clone(),
            total_points: 0,
            total_rewards: 0,
            quests_completed: 0,
            registered: true,
        };

        env.storage().persistent().set(&DataKey::Player(player.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::Player(player.clone()), 100, 200);
        env.events().publish((symbol_short!("reg_play"),), player);

        Ok(())
    }

    /// Register a new quest creator.
    /// Each creator can only register once.
    pub fn register_creator(env: Env, creator: Address) -> Result<(), Error> {
        creator.require_auth();

        if env.storage().persistent().has(&DataKey::Creator(creator.clone())) {
            return Err(Error::AlreadyRegistered);
        }

        let data = CreatorData {
            address: creator.clone(),
            total_royalties: 0,
            quests_created: 0,
            registered: true,
        };

        env.storage().persistent().set(&DataKey::Creator(creator.clone()), &data);
        env.storage().persistent().extend_ttl(&DataKey::Creator(creator.clone()), 100, 200);
        env.events().publish((symbol_short!("reg_crea"),), creator);

        Ok(())
    }

    // ─── Quest Functions ───────────────────────────────────────────────────

    /// Creator registers a new quest with a reward amount and royalty percentage.
    /// royalty_bps: basis points — 1000 = 10%, 500 = 5%, max 5000 = 50%
    pub fn create_quest(
        env: Env,
        creator: Address,
        title: String,
        reward_points: u64,
        reward_amount: i128,
        royalty_bps: u32,
    ) -> Result<u64, Error> {
        creator.require_auth();

        if !env.storage().persistent().has(&DataKey::Creator(creator.clone())) {
            return Err(Error::NotRegistered);
        }

        if royalty_bps > 5000 {
            return Err(Error::InvalidRoyalty);
        }

        if reward_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let quest_id: u64 = env.storage().instance()
            .get(&DataKey::NextQuestId)
            .unwrap_or(0);

        let next_id = quest_id + 1;
        env.storage().instance().set(&DataKey::NextQuestId, &next_id);
        env.storage().instance().extend_ttl(100, 200);

        let quest = QuestData {
            id: next_id,
            creator: creator.clone(),
            title,
            reward_points,
            reward_amount,
            royalty_bps,
            active: true,
        };

        env.storage().persistent().set(&DataKey::Quest(next_id), &quest);
        env.storage().persistent().extend_ttl(&DataKey::Quest(next_id), 100, 200);

        let mut creator_data: CreatorData = env.storage().persistent()
            .get(&DataKey::Creator(creator.clone()))
            .unwrap();
        creator_data.quests_created += 1;
        env.storage().persistent().set(&DataKey::Creator(creator.clone()), &creator_data);

        env.events().publish((symbol_short!("new_quest"),), next_id);

        Ok(next_id)
    }

    /// Player completes a quest and earns reward points and tokens.
    /// A royalty percentage is automatically credited to the quest creator.
    pub fn complete_quest(
        env: Env,
        player: Address,
        quest_id: u64,
    ) -> Result<i128, Error> {
        player.require_auth();

        let mut player_data: PlayerData = env.storage().persistent()
            .get(&DataKey::Player(player.clone()))
            .ok_or(Error::NotRegistered)?;

        let quest: QuestData = env.storage().persistent()
            .get(&DataKey::Quest(quest_id))
            .ok_or(Error::QuestNotFound)?;

        if !quest.active {
            return Err(Error::QuestNotActive);
        }

        // Calculate royalty for creator
        let royalty_amount = (quest.reward_amount * quest.royalty_bps as i128) / 10_000;

        // Player earns reward minus royalty
        let player_reward = quest.reward_amount - royalty_amount;

        // Update player stats
        player_data.total_points += quest.reward_points;
        player_data.total_rewards += player_reward;
        player_data.quests_completed += 1;
        env.storage().persistent().set(&DataKey::Player(player.clone()), &player_data);

        // Credit royalty to creator
        let mut creator_data: CreatorData = env.storage().persistent()
            .get(&DataKey::Creator(quest.creator.clone()))
            .unwrap();
        creator_data.total_royalties += royalty_amount;
        env.storage().persistent().set(&DataKey::Creator(quest.creator.clone()), &creator_data);

        env.events().publish((symbol_short!("complete"),), (player.clone(), quest_id, player_reward));
        env.events().publish((symbol_short!("royalty"),), (quest.creator.clone(), royalty_amount));

        Ok(player_reward)
    }

    // ─── Query Functions ───────────────────────────────────────────────────

    /// Get a player's current stats
    pub fn get_player(env: Env, player: Address) -> Result<PlayerData, Error> {
        env.storage().persistent()
            .get(&DataKey::Player(player))
            .ok_or(Error::NotRegistered)
    }

    /// Get a creator's current stats
    pub fn get_creator(env: Env, creator: Address) -> Result<CreatorData, Error> {
        env.storage().persistent()
            .get(&DataKey::Creator(creator))
            .ok_or(Error::NotRegistered)
    }

    /// Get a quest's details
    pub fn get_quest(env: Env, quest_id: u64) -> Result<QuestData, Error> {
        env.storage().persistent()
            .get(&DataKey::Quest(quest_id))
            .ok_or(Error::QuestNotFound)
    }

    /// Get total number of quests created
    pub fn get_total_quests(env: Env) -> u64 {
        env.storage().instance()
            .get(&DataKey::NextQuestId)
            .unwrap_or(0)
    }

    /// Get a player's total points
    pub fn get_points(env: Env, player: Address) -> u64 {
        env.storage().persistent()
            .get(&DataKey::Player(player))
            .map(|p: PlayerData| p.total_points)
            .unwrap_or(0)
    }

    /// Get a creator's total accumulated royalties
    pub fn get_royalties(env: Env, creator: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::Creator(creator))
            .map(|c: CreatorData| c.total_royalties)
            .unwrap_or(0)
    }
}

mod test;