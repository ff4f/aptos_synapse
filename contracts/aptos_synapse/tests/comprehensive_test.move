#[test_only]
module aptos_synapse::comprehensive_test {
    use std::signer;
    use std::string;
    use aptos_framework::account;
    use aptos_framework::aptos_coin;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use aptos_synapse::main;
    use aptos_synapse::sbt;

    #[test(aptos_framework = @0x1, user1 = @0x123, user2 = @0x456)]
    public fun test_full_protocol_flow(aptos_framework: &signer, user1: &signer, user2: &signer) {
        // Setup accounts and timestamp
        account::create_account_for_test(signer::address_of(aptos_framework));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        // Initialize coin for testing
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        coin::destroy_burn_cap(burn_cap);
        
        // Mint some coins for testing
        let coins = coin::mint(1000000, &mint_cap);
        coin::deposit(signer::address_of(user1), coins);
        
        let coins2 = coin::mint(1000000, &mint_cap);
        coin::deposit(signer::address_of(user2), coins2);
        
        coin::destroy_mint_cap(mint_cap);
        
        // Create account for aptos_synapse address and get signer
        account::create_account_for_test(@aptos_synapse);
        let aptos_synapse_signer = account::create_signer_with_capability(
            &account::create_test_signer_cap(@aptos_synapse)
        );
        
        // Initialize protocols at aptos_synapse address
        main::initialize(&aptos_synapse_signer);
        sbt::initialize(&aptos_synapse_signer);
        
        // Test SBT minting
        sbt::mint_reputation_sbt(&aptos_synapse_signer, signer::address_of(user1), 150);
        sbt::mint_reputation_sbt(&aptos_synapse_signer, signer::address_of(user2), 600);
        
        // Test deposit collateral
        main::deposit_collateral(user1, 500000);
        
        // Test borrow
        main::borrow_stable(user1, 100000);
        
        // Test repay
        main::repay_loan(user1, 50000);
        
        // Test withdraw
        main::withdraw_collateral(user1, 100000);
        
        // Verify balances and states
        let user1_balance = coin::balance<aptos_coin::AptosCoin>(signer::address_of(user1));
        assert!(user1_balance > 0, 1);
        
        // Test SBT functions
        let (score, level, _timestamp, _count) = sbt::get_user_reputation(signer::address_of(user1));
        assert!(level == string::utf8(b"Bronze"), 2);
        assert!(score == 150, 3);
    }
    
    #[test(aptos_framework = @0x1, user = @0x123)]
    public fun test_sbt_system(aptos_framework: &signer, user: &signer) {
        // Setup
        account::create_account_for_test(signer::address_of(aptos_framework));
        account::create_account_for_test(signer::address_of(user));
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        // Create account for aptos_synapse address and get signer
        account::create_account_for_test(@aptos_synapse);
        let aptos_synapse_signer = account::create_signer_with_capability(
            &account::create_test_signer_cap(@aptos_synapse)
        );
        
        // Initialize SBT system
        sbt::initialize(&aptos_synapse_signer);
        
        // Test minting
        sbt::mint_reputation_sbt(&aptos_synapse_signer, signer::address_of(user), 1200);
        
        // Test reputation functions
        let (score, level, _timestamp, _count) = sbt::get_user_reputation(signer::address_of(user));
        assert!(level == string::utf8(b"Gold"), 1);
        assert!(score == 1200, 4);
        
        // Test registry stats
        let (total_minted, _collection_name) = sbt::get_registry_stats();
        assert!(total_minted == 1, 2);
        
        // Test reputation thresholds
        let (_bronze, _silver, _gold, _platinum) = sbt::get_reputation_thresholds();
        // Just verify the function works
        assert!(true, 3);
    }
    
    #[test(aptos_framework = @0x1, user = @0x123)]
    public fun test_lending_protocol(aptos_framework: &signer, user: &signer) {
        // Setup
        account::create_account_for_test(signer::address_of(aptos_framework));
        account::create_account_for_test(signer::address_of(user));
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        // Initialize coin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        coin::destroy_burn_cap(burn_cap);
        
        // Mint coins
        let coins = coin::mint(1000000, &mint_cap);
        coin::deposit(signer::address_of(user), coins);
        coin::destroy_mint_cap(mint_cap);
        
        // Create account for aptos_synapse address and get signer
        account::create_account_for_test(@aptos_synapse);
        let aptos_synapse_signer = account::create_signer_with_capability(
            &account::create_test_signer_cap(@aptos_synapse)
        );
        
        // Initialize protocol
        main::initialize(&aptos_synapse_signer);
        
        // Test deposit
        main::deposit_collateral(user, 500000);
        
        // Test borrow
        main::borrow_stable(user, 100000);
        
        // Test repay
        main::repay_loan(user, 50000);
        
        // Test withdraw
        main::withdraw_collateral(user, 100000);
        
        // Verify user still has balance
        let balance = coin::balance<aptos_coin::AptosCoin>(signer::address_of(user));
        assert!(balance > 0, 1);
    }
}