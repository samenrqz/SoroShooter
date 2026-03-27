#[cfg(test)]
mod tests {
    use crate::{SoroShooterContract, SoroShooterContractClient};
    use soroban_sdk::{Env};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Address;

    fn setup() -> (Env, SoroShooterContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, SoroShooterContract);
        let client = SoroShooterContractClient::new(&env, &contract_id);
        (env, client)
    }

    /// Test 1 (Happy Path):
    /// A player registers successfully and receives 2 free SQT tokens.
    /// Then clears wave 1 and receives the correct XLM reward.
    #[test]
    fn test_register_and_wave_reward() {
        let (env, client) = setup();
        let player = Address::generate(&env);

        // Register player
        let data = client.register_player(&player);
        assert_eq!(data.tokens, 2);
        assert_eq!(data.high_score, 0);
        assert_eq!(data.registered, true);

        // Clear wave 1 with 5 kills
        let reward = client.reward_wave(&player, &1u32, &5u64);

        // Wave 1 reward = 1 * 500_000 stroops
        assert_eq!(reward, 500_000i128);

        // Verify player stats updated
        let updated = client.get_player(&player);
        assert_eq!(updated.waves_cleared, 1);
        assert_eq!(updated.total_kills, 5);
        assert_eq!(updated.xlm_earned, 500_000);
    }

    /// Test 2 (Edge Case):
    /// A duplicate player registration is rejected with AlreadyRegistered error.
    /// A milestone reward is correctly calculated for 1000 pts.
    #[test]
    fn test_duplicate_registration_and_milestone() {
        let (env, client) = setup();
        let player = Address::generate(&env);

        // First registration succeeds
        let result = client.try_register_player(&player);
        assert!(result.is_ok());

        // Second registration fails
        let result = client.try_register_player(&player);
        assert!(result.is_err());

        // Milestone reward for 1000 pts
        let reward = client.reward_milestone(&player, &1000u64, &1500u64);
        assert_eq!(reward, 5_000_000i128);
    }

    /// Test 3 (State Verification):
    /// NFT badge is correctly minted at wave 5 and stored on-chain.
    /// Duplicate badge minting is rejected.
    #[test]
    fn test_nft_badge_minting() {
        let (env, client) = setup();
        let player = Address::generate(&env);

        client.register_player(&player);

        // Mint wave 5 badge
        let badge = client.mint_nft_badge(&player, &5u32);
        assert_eq!(badge.wave, 5);
        assert_eq!(badge.minted, true);

        // Verify badge stored correctly
        let stored = client.get_badge(&player, &5u32);
        assert_eq!(stored.wave, 5);
        assert_eq!(stored.owner, player);

        // Duplicate mint rejected
        let result = client.try_mint_nft_badge(&player, &5u32);
        assert!(result.is_err());
    }
}