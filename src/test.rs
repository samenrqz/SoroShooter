#[cfg(test)]
mod tests {
    use crate::{SoroQuestContract, SoroQuestContractClient};
    use soroban_sdk::{Env, String};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Address;

    fn setup() -> (Env, SoroQuestContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, SoroQuestContract);
        let client = SoroQuestContractClient::new(&env, &contract_id);
        (env, client)
    }

    /// Test 1 (Happy Path):
    /// A player registers, a creator registers and creates a quest,
    /// the player completes the quest and earns a reward,
    /// the creator automatically receives their royalty cut.
    #[test]
    fn test_complete_quest_happy_path() {
        let (env, client) = setup();

        let player  = Address::generate(&env);
        let creator = Address::generate(&env);

        client.register_player(&player);
        client.register_creator(&creator);

        // reward = 1000, royalty = 10% (1000 bps), points = 100
        let quest_id = client.create_quest(
            &creator,
            &String::from_str(&env, "Defeat the Dragon"),
            &100u64,
            &1000i128,
            &1000u32,
        );

        // Player completes quest — should receive 900 (1000 - 10%)
        let player_reward = client.complete_quest(&player, &quest_id);
        assert_eq!(player_reward, 900i128);

        // Verify player stats
        let player_data = client.get_player(&player);
        assert_eq!(player_data.total_points, 100);
        assert_eq!(player_data.total_rewards, 900);
        assert_eq!(player_data.quests_completed, 1);

        // Verify creator received royalty
        let creator_data = client.get_creator(&creator);
        assert_eq!(creator_data.total_royalties, 100);
    }

    /// Test 2 (Edge Case):
    /// A player attempting to register twice is rejected
    /// with the AlreadyRegistered error.
    #[test]
    fn test_duplicate_player_registration_rejected() {
        let (env, client) = setup();

        let player = Address::generate(&env);

        // First registration succeeds
        let result = client.try_register_player(&player);
        assert!(result.is_ok());

        // Second registration fails
        let result = client.try_register_player(&player);
        assert!(result.is_err());
    }

    /// Test 3 (State Verification):
    /// After a quest is created, contract storage correctly
    /// reflects all quest details including creator, reward, and royalty.
    #[test]
    fn test_quest_state_stored_correctly() {
        let (env, client) = setup();

        let creator = Address::generate(&env);
        client.register_creator(&creator);

        let quest_id = client.create_quest(
            &creator,
            &String::from_str(&env, "Explore the Dungeon"),
            &200u64,
            &5000i128,
            &500u32,
        );

        // Fetch and verify all quest fields from storage
        let quest = client.get_quest(&quest_id);
        assert_eq!(quest.id, quest_id);
        assert_eq!(quest.creator, creator);
        assert_eq!(quest.reward_points, 200);
        assert_eq!(quest.reward_amount, 5000);
        assert_eq!(quest.royalty_bps, 500);
        assert_eq!(quest.active, true);

        // Verify quest counter
        assert_eq!(client.get_total_quests(), 1);
    }
}