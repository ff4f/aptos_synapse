module aptos_synapse::main {
    use std::signer;
    use std::error;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::table::{Self, Table};

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

    // Deposit collateral
    public entry fun deposit_collateral(user: &signer, amount: u64) acquires LendingPool {
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let user_addr = signer::address_of(user);
        let lending_pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        
        // Transfer coins from user to contract
        let coins = coin::withdraw<AptosCoin>(user, amount);
        coin::deposit(@aptos_synapse, coins);
        
        // Update user profile
        if (!table::contains(&lending_pool.user_profiles, user_addr)) {
            let new_profile = UserProfile {
                total_collateral: amount,
                total_borrowed: 0,
                loan_count: 0,
                reputation_score: 100, // Starting reputation score
            };
            table::add(&mut lending_pool.user_profiles, user_addr, new_profile);
        } else {
            let profile = table::borrow_mut(&mut lending_pool.user_profiles, user_addr);
            profile.total_collateral = profile.total_collateral + amount;
        };
        
        lending_pool.total_deposits = lending_pool.total_deposits + amount;
        
        // Emit event
        event::emit_event(&mut lending_pool.deposit_events, DepositEvent {
            user: user_addr,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Borrow stable coins against collateral
    public entry fun borrow_stable(user: &signer, amount: u64) acquires LendingPool {
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let user_addr = signer::address_of(user);
        let lending_pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        
        assert!(table::contains(&lending_pool.user_profiles, user_addr), error::not_found(E_LOAN_NOT_FOUND));
        
        // Get profile data first
        let (total_collateral, current_borrowed) = {
            let profile = table::borrow(&lending_pool.user_profiles, user_addr);
            (profile.total_collateral, profile.total_borrowed)
        };
        
        let max_borrow = (total_collateral * 100) / COLLATERAL_RATIO;
        assert!(current_borrowed + amount <= max_borrow, error::invalid_state(E_INSUFFICIENT_COLLATERAL));
        
        // Create or update loan
        let loan_info = LoanInfo {
            borrower: user_addr,
            collateral_amount: total_collateral,
            borrowed_amount: amount,
            interest_rate: INTEREST_RATE,
            timestamp: timestamp::now_seconds(),
            is_active: true,
        };
        
        if (table::contains(&lending_pool.loans, user_addr)) {
            let existing_loan = table::borrow_mut(&mut lending_pool.loans, user_addr);
            existing_loan.borrowed_amount = existing_loan.borrowed_amount + amount;
        } else {
            table::add(&mut lending_pool.loans, user_addr, loan_info);
        };
        
        // Update user profile
        let profile_mut = table::borrow_mut(&mut lending_pool.user_profiles, user_addr);
        profile_mut.total_borrowed = profile_mut.total_borrowed + amount;
        profile_mut.loan_count = profile_mut.loan_count + 1;
        
        lending_pool.total_borrowed = lending_pool.total_borrowed + amount;
        
        // Note: In production, this would require proper treasury management
        // For now, we'll assume the contract has sufficient balance
        // let coins = coin::withdraw<AptosCoin>(&treasury_signer, amount);
        // coin::deposit(user_addr, coins);
        
        // Emit event
        event::emit_event(&mut lending_pool.borrow_events, BorrowEvent {
            user: user_addr,
            collateral_amount: total_collateral,
            borrowed_amount: amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Repay loan
    public entry fun repay_loan(user: &signer, amount: u64) acquires LendingPool {
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let user_addr = signer::address_of(user);
        let lending_pool = borrow_global_mut<LendingPool>(@aptos_synapse);
        
        assert!(table::contains(&lending_pool.loans, user_addr), error::not_found(E_LOAN_NOT_FOUND));
        
        let loan = table::borrow_mut(&mut lending_pool.loans, user_addr);
        assert!(loan.is_active, error::invalid_state(E_LOAN_NOT_FOUND));
        assert!(amount <= loan.borrowed_amount, error::invalid_argument(E_INVALID_AMOUNT));
        
        // Transfer repayment from user to contract
        let coins = coin::withdraw<AptosCoin>(user, amount);
        coin::deposit(@aptos_synapse, coins);
        
        // Update loan
        loan.borrowed_amount = loan.borrowed_amount - amount;
        if (loan.borrowed_amount == 0) {
            loan.is_active = false;
        };
        
        // Update user profile
        let profile = table::borrow_mut(&mut lending_pool.user_profiles, user_addr);
        profile.total_borrowed = profile.total_borrowed - amount;
        profile.reputation_score = profile.reputation_score + 1; // Increase reputation for repayment
        
        lending_pool.total_borrowed = lending_pool.total_borrowed - amount;
        
        // Emit event
        event::emit_event(&mut lending_pool.repay_events, RepayEvent {
            user: user_addr,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // View functions
    #[view]
    public fun get_user_profile(user_addr: address): (u64, u64, u64, u64) acquires LendingPool {
        let lending_pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&lending_pool.user_profiles, user_addr)) {
            let profile = table::borrow(&lending_pool.user_profiles, user_addr);
            (profile.total_collateral, profile.total_borrowed, profile.loan_count, profile.reputation_score)
        } else {
            (0, 0, 0, 0)
        }
    }

    #[view]
    public fun get_loan_info(user_addr: address): (u64, u64, u64, u64, bool) acquires LendingPool {
        let lending_pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&lending_pool.loans, user_addr)) {
            let loan = table::borrow(&lending_pool.loans, user_addr);
            (loan.collateral_amount, loan.borrowed_amount, loan.interest_rate, loan.timestamp, loan.is_active)
        } else {
            (0, 0, 0, 0, false)
        }
    }

    #[view]
    public fun get_pool_stats(): (u64, u64) acquires LendingPool {
        let lending_pool = borrow_global<LendingPool>(@aptos_synapse);
        (lending_pool.total_deposits, lending_pool.total_borrowed)
    }

    #[view]
    public fun calculate_max_borrow(user_addr: address): u64 acquires LendingPool {
        let lending_pool = borrow_global<LendingPool>(@aptos_synapse);
        if (table::contains(&lending_pool.user_profiles, user_addr)) {
            let profile = table::borrow(&lending_pool.user_profiles, user_addr);
            (profile.total_collateral * 100) / COLLATERAL_RATIO
        } else {
            0
        }
    }
}