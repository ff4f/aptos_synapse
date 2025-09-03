module aptos_synapse::main {
    use std::signer;
    use std::error;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    use aptos_std::table::{Self, Table};

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_COLLATERAL: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_LOAN_NOT_FOUND: u64 = 5;
    const E_UNAUTHORIZED: u64 = 6;
    const E_INVALID_AMOUNT: u64 = 7;

    // Constants
    const COLLATERAL_RATIO: u64 = 150; // 150% collateralization ratio
    const INTEREST_RATE: u64 = 5; // 5% annual interest rate
    const LIQUIDATION_THRESHOLD: u64 = 120; // 120% liquidation threshold

    // Structs
    struct LoanInfo has store, copy, drop {
        borrower: address,
        collateral_amount: u64,
        borrowed_amount: u64,
        interest_rate: u64,
        timestamp: u64,
        is_active: bool,
    }

    struct UserProfile has store, copy, drop {
        total_collateral: u64,
        total_borrowed: u64,
        loan_count: u64,
        reputation_score: u64,
    }

    struct LendingPool has key {
        total_deposits: u64,
        total_borrowed: u64,
        loans: Table<address, LoanInfo>,
        user_profiles: Table<address, UserProfile>,
        admin: address,
        // Events
        deposit_events: EventHandle<DepositEvent>,
        borrow_events: EventHandle<BorrowEvent>,
        repay_events: EventHandle<RepayEvent>,
        liquidation_events: EventHandle<LiquidationEvent>,
    }

    // Events
    struct DepositEvent has drop, store {
        user: address,
        amount: u64,
        timestamp: u64,
    }

    struct BorrowEvent has drop, store {
        user: address,
        collateral_amount: u64,
        borrowed_amount: u64,
        timestamp: u64,
    }

    struct RepayEvent has drop, store {
        user: address,
        amount: u64,
        timestamp: u64,
    }

    struct LiquidationEvent has drop, store {
        borrower: address,
        liquidator: address,
        amount: u64,
        collateral_amount: u64,
        debt_amount: u64,
        timestamp: u64,
    }

    // Initialize the lending pool
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<LendingPool>(admin_addr), error::already_exists(E_ALREADY_INITIALIZED));

        let lending_pool = LendingPool {
            total_deposits: 0,
            total_borrowed: 0,
            loans: table::new(),
            user_profiles: table::new(),
            admin: admin_addr,
            deposit_events: account::new_event_handle<DepositEvent>(admin),
            borrow_events: account::new_event_handle<BorrowEvent>(admin),
            repay_events: account::new_event_handle<RepayEvent>(admin),
            liquidation_events: account::new_event_handle<LiquidationEvent>(admin),
        };

        move_to(admin, lending_pool);
    }

    // Deposit collateral and borrow stablecoins
    public entry fun deposit_collateral(
        user: &signer,
        amount: u64
    ) acquires LendingPool {
        let user_addr = signer::address_of(user);
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        
        // Transfer collateral from user to contract
        let collateral = coin::withdraw<AptosCoin>(user, amount);
        coin::deposit(@aptos_synapse, collateral);
        
        // Update or create user profile
        if (!table::contains(&pool.user_profiles, user_addr)) {
            let profile = UserProfile {
                total_collateral: amount,
                total_borrowed: 0,
                loan_count: 0,
                reputation_score: 100, // Base reputation
            };
            table::add(&mut pool.user_profiles, user_addr, profile);
        } else {
            let profile = table::borrow_mut(&mut pool.user_profiles, user_addr);
            profile.total_collateral = profile.total_collateral + amount;
        };
        
        pool.total_deposits = pool.total_deposits + amount;
        
        // Emit deposit event
        event::emit_event(&mut pool.deposit_events, DepositEvent {
            user: user_addr,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Borrow stablecoins against collateral
    public entry fun borrow_stable(
        user: &signer,
        amount: u64
    ) acquires LendingPool {
        let user_addr = signer::address_of(user);
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        assert!(table::contains(&pool.user_profiles, user_addr), error::not_found(E_LOAN_NOT_FOUND));
        
        let profile = table::borrow_mut(&mut pool.user_profiles, user_addr);
        
        // Calculate maximum borrowable amount (collateral / collateral_ratio * 100)
        let max_borrow = (profile.total_collateral * 100) / COLLATERAL_RATIO;
        let new_total_borrowed = profile.total_borrowed + amount;
        assert!(new_total_borrowed <= max_borrow, error::invalid_state(E_INSUFFICIENT_COLLATERAL));
        
        // Create or update loan info
        if (!table::contains(&pool.loans, user_addr)) {
            let loan = LoanInfo {
                borrower: user_addr,
                collateral_amount: profile.total_collateral,
                borrowed_amount: amount,
                interest_rate: INTEREST_RATE,
                timestamp: timestamp::now_seconds(),
                is_active: true,
            };
            table::add(&mut pool.loans, user_addr, loan);
            profile.loan_count = profile.loan_count + 1;
        } else {
            let loan = table::borrow_mut(&mut pool.loans, user_addr);
            loan.borrowed_amount = loan.borrowed_amount + amount;
        };
        
        profile.total_borrowed = new_total_borrowed;
        pool.total_borrowed = pool.total_borrowed + amount;
        
        // Transfer borrowed amount to user (simulated with APT for now)
        let borrowed_coins = coin::withdraw<AptosCoin>(user, amount);
        coin::deposit(user_addr, borrowed_coins);
        
        // Emit borrow event
        event::emit_event(&mut pool.borrow_events, BorrowEvent {
            user: user_addr,
            collateral_amount: profile.total_collateral,
            borrowed_amount: amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Repay loan
    public entry fun repay_loan(
        user: &signer,
        amount: u64
    ) acquires LendingPool {
        let user_addr = signer::address_of(user);
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        assert!(table::contains(&pool.loans, user_addr), error::not_found(E_LOAN_NOT_FOUND));
        
        let loan = table::borrow_mut(&mut pool.loans, user_addr);
        assert!(loan.is_active, error::invalid_state(E_LOAN_NOT_FOUND));
        
        // Calculate interest (simplified)
        let time_elapsed = timestamp::now_seconds() - loan.timestamp;
        let interest = (loan.borrowed_amount * INTEREST_RATE * time_elapsed) / (100 * 365 * 24 * 3600);
        let total_owed = loan.borrowed_amount + interest;
        
        assert!(amount <= total_owed, error::invalid_argument(E_INVALID_AMOUNT));
        
        // Transfer repayment from user
        let repayment = coin::withdraw<AptosCoin>(user, amount);
        coin::deposit(@aptos_synapse, repayment);
        
        // Update loan and profile
        loan.borrowed_amount = if (amount >= total_owed) { 0 } else { total_owed - amount };
        if (loan.borrowed_amount == 0) {
            loan.is_active = false;
        };
        
        let profile = table::borrow_mut(&mut pool.user_profiles, user_addr);
        profile.total_borrowed = loan.borrowed_amount;
        profile.reputation_score = profile.reputation_score + 10; // Reward for repayment
        
        pool.total_borrowed = pool.total_borrowed - (amount - interest);
        
        // Emit repay event
        event::emit_event(&mut pool.repay_events, RepayEvent {
            user: user_addr,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Withdraw collateral
    public entry fun withdraw_collateral(
        user: &signer,
        amount: u64
    ) acquires LendingPool {
        let user_addr = signer::address_of(user);
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        assert!(table::contains(&pool.user_profiles, user_addr), error::not_found(E_LOAN_NOT_FOUND));
        
        let profile = table::borrow_mut(&mut pool.user_profiles, user_addr);
        assert!(profile.total_collateral >= amount, error::invalid_state(E_INSUFFICIENT_BALANCE));
        
        // Check if withdrawal maintains collateral ratio
        let remaining_collateral = profile.total_collateral - amount;
        if (profile.total_borrowed > 0) {
            let min_collateral = (profile.total_borrowed * COLLATERAL_RATIO) / 100;
            assert!(remaining_collateral >= min_collateral, error::invalid_state(E_INSUFFICIENT_COLLATERAL));
        };
        
        // Update profile
        profile.total_collateral = remaining_collateral;
        pool.total_deposits = pool.total_deposits - amount;
        
        // Transfer collateral back to user
        let withdrawal = coin::withdraw<AptosCoin>(user, amount);
        coin::deposit(user_addr, withdrawal);
    }

    // Liquidate undercollateralized position


    // View functions for getting protocol data
    #[view]
    public fun get_user_profile(user: address): (u64, u64, u64, u64) acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&pool.user_profiles, user)) {
            let profile = table::borrow(&pool.user_profiles, user);
            (profile.total_collateral, profile.total_borrowed, profile.loan_count, profile.reputation_score)
        } else {
            (0, 0, 0, 0)
        }
    }

    #[view]
    public fun get_loan_info(user: address): (u64, u64, u64, u64, bool) acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&pool.loans, user)) {
            let loan = table::borrow(&pool.loans, user);
            (loan.collateral_amount, loan.borrowed_amount, loan.interest_rate, loan.timestamp, loan.is_active)
        } else {
            (0, 0, 0, 0, false)
        }
    }

    #[view]
    public fun get_protocol_stats(): (u64, u64) acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        (pool.total_deposits, pool.total_borrowed)
    }

    #[view]
    public fun calculate_health_factor(user: address): u64 acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&pool.user_profiles, user)) {
            let profile = table::borrow(&pool.user_profiles, user);
            if (profile.total_borrowed == 0) {
                return 10000 // Max health factor if no debt
            };
            (profile.total_collateral * 100) / profile.total_borrowed
        } else {
            0
        }
    }

    #[view]
    public fun get_max_borrowable(user: address): u64 acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&pool.user_profiles, user)) {
            let profile = table::borrow(&pool.user_profiles, user);
            let max_borrow = (profile.total_collateral * 100) / COLLATERAL_RATIO;
            if (max_borrow > profile.total_borrowed) {
                max_borrow - profile.total_borrowed
            } else {
                0
            }
        } else {
            0
        }
    }



    // Liquidate undercollateralized loan
    public entry fun liquidate(liquidator: &signer, borrower_addr: address) acquires LendingPool {
        let liquidator_addr = signer::address_of(liquidator);
        let lending_pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        
        assert!(table::contains(&lending_pool.loans, borrower_addr), error::not_found(E_LOAN_NOT_FOUND));
        
        let loan = table::borrow_mut(&mut lending_pool.loans, borrower_addr);
        assert!(loan.is_active, error::invalid_state(E_LOAN_NOT_FOUND));
        
        // Check if loan is undercollateralized
        let health_factor = (loan.collateral_amount * 100) / (loan.borrowed_amount * COLLATERAL_RATIO);
        assert!(health_factor < 100, error::invalid_state(E_INSUFFICIENT_COLLATERAL));
        
        // Liquidator pays the debt
        let repay_amount = loan.borrowed_amount;
        let coins = coin::withdraw<AptosCoin>(liquidator, repay_amount);
        coin::deposit(@aptos_synapse, coins);
        
        // Liquidator gets collateral with bonus
        let liquidation_bonus = (loan.collateral_amount * 5) / 100; // 5% bonus
        let liquidator_reward = loan.collateral_amount + liquidation_bonus;
        
        let reward_coins = coin::withdraw<AptosCoin>(liquidator, liquidator_reward);
        coin::deposit(liquidator_addr, reward_coins);
        
        // Update borrower profile
        let profile = table::borrow_mut(&mut lending_pool.user_profiles, borrower_addr);
        profile.total_collateral = 0;
        profile.total_borrowed = 0;
        profile.reputation_score = if (profile.reputation_score > 10) { profile.reputation_score - 10 } else { 0 };
        
        // Mark loan as inactive
        loan.is_active = false;
        loan.collateral_amount = 0;
        loan.borrowed_amount = 0;
        
        // Update pool stats
        lending_pool.total_deposits = lending_pool.total_deposits - liquidator_reward;
        lending_pool.total_borrowed = lending_pool.total_borrowed - repay_amount;
        
        // Emit event
        event::emit_event(&mut lending_pool.liquidation_events, LiquidationEvent {
            liquidator: liquidator_addr,
            borrower: borrower_addr,
            amount: repay_amount,
            collateral_amount: loan.collateral_amount,
            debt_amount: repay_amount,
            timestamp: timestamp::now_seconds(),
        });
    }





    #[view]
    public fun get_borrowed_amount(user: address): u64 acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&pool.user_profiles, user)) {
            let profile = table::borrow(&pool.user_profiles, user);
            profile.total_borrowed
        } else {
            0
        }
    }

    #[view]
    public fun get_total_collateral(): u64 acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        pool.total_deposits
    }

    #[view]
    public fun get_total_borrowed(): u64 acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        pool.total_borrowed
    }

    #[view]
    public fun get_utilization_rate(): u64 acquires LendingPool {
        let pool = borrow_global<LendingPool>(@aptos_synapse);
        if (pool.total_deposits > 0) {
            (pool.total_borrowed * 100) / pool.total_deposits
        } else {
            0
        }
    }
}