module aptos_synapse::sbt {
    use std::signer;
    use std::error;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::object::{Self, Object, ConstructorRef, ExtendRef};
    // use aptos_framework::property_map::{Self, PropertyMap};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_TOKEN_NOT_FOUND: u64 = 2;
    const E_ALREADY_MINTED: u64 = 3;
    const E_INVALID_SCORE: u64 = 4;
    const E_NOT_INITIALIZED: u64 = 5;

    // Reputation levels
    const REPUTATION_BRONZE: u64 = 100;
    const REPUTATION_SILVER: u64 = 500;
    const REPUTATION_GOLD: u64 = 1000;
    const REPUTATION_PLATINUM: u64 = 2000;

    // SBT Token struct
    struct ReputationSBT has key {
        extend_ref: ExtendRef,
        owner: address,
        reputation_score: u64,
        level: String,
        mint_timestamp: u64,
        last_updated: u64,
        transaction_count: u64,
        // properties: PropertyMap,
    }

    // Collection and registry
    struct SBTRegistry has key {
        admin: address,
        collection_name: String,
        total_minted: u64,
        user_tokens: Table<address, Object<ReputationSBT>>,
        // Events
        mint_events: EventHandle<MintEvent>,
        update_events: EventHandle<UpdateEvent>,
    }

    // Events
    struct MintEvent has drop, store {
        owner: address,
        token_address: address,
        reputation_score: u64,
        level: String,
        timestamp: u64,
    }

    struct UpdateEvent has drop, store {
        owner: address,
        token_address: address,
        old_score: u64,
        new_score: u64,
        old_level: String,
        new_level: String,
        timestamp: u64,
    }

    // Initialize the SBT system
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<SBTRegistry>(admin_addr), error::already_exists(E_NOT_INITIALIZED));

        let registry = SBTRegistry {
            admin: admin_addr,
            collection_name: string::utf8(b"Aptos Synapse Reputation SBT"),
            total_minted: 0,
            user_tokens: table::new(),
            mint_events: account::new_event_handle<MintEvent>(admin),
            update_events: account::new_event_handle<UpdateEvent>(admin),
        };

        move_to(admin, registry);
    }

    // Mint SBT for a user
    public entry fun mint_reputation_sbt(
        admin: &signer,
        to: address,
        initial_score: u64
    ) acquires SBTRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<SBTRegistry>(@aptos_synapse);
        
        assert!(admin_addr == registry.admin, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(!table::contains(&registry.user_tokens, to), error::already_exists(E_ALREADY_MINTED));
        assert!(initial_score > 0, error::invalid_argument(E_INVALID_SCORE));

        // Create the SBT object
        let constructor_ref = object::create_object(admin_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);
        let token_address = signer::address_of(&object_signer);

        // Determine reputation level
        let level = get_reputation_level(initial_score);

        // Create properties for the SBT (simplified without property_map)
        // let properties = property_map::empty();

        // Create the SBT
        let sbt = ReputationSBT {
            extend_ref,
            owner: to,
            reputation_score: initial_score,
            level,
            mint_timestamp: timestamp::now_seconds(),
            last_updated: timestamp::now_seconds(),
            transaction_count: 0,
            // properties,
        };

        move_to(&object_signer, sbt);

        // Update registry
        let token_object = object::object_from_constructor_ref<ReputationSBT>(&constructor_ref);
        table::add(&mut registry.user_tokens, to, token_object);
        registry.total_minted = registry.total_minted + 1;

        // Emit event
        event::emit_event(&mut registry.mint_events, MintEvent {
            owner: to,
            token_address,
            reputation_score: initial_score,
            level,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Update reputation score
    public entry fun update_reputation(
        admin: &signer,
        user: address,
        new_score: u64
    ) acquires SBTRegistry, ReputationSBT {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<SBTRegistry>(@aptos_synapse);
        
        assert!(admin_addr == registry.admin, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(table::contains(&registry.user_tokens, user), error::not_found(E_TOKEN_NOT_FOUND));
        assert!(new_score > 0, error::invalid_argument(E_INVALID_SCORE));

        let token_object = *table::borrow(&registry.user_tokens, user);
        let token_address = object::object_address(&token_object);
        let sbt = borrow_global_mut<ReputationSBT>(token_address);

        let old_score = sbt.reputation_score;
        let old_level = sbt.level;
        let new_level = get_reputation_level(new_score);

        // Update SBT
        sbt.reputation_score = new_score;
        sbt.level = new_level;
        sbt.last_updated = timestamp::now_seconds();
        sbt.transaction_count = sbt.transaction_count + 1;

        // Update properties (simplified without property_map)
        // property_map::update(&mut sbt.properties, &string::utf8(b"reputation_score"), new_score);

        // Emit event
        event::emit_event(&mut registry.update_events, UpdateEvent {
            owner: user,
            token_address,
            old_score,
            new_score,
            old_level,
            new_level,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Increase reputation based on positive actions
    public entry fun increase_reputation(
        admin: &signer,
        user: address,
        points: u64
    ) acquires SBTRegistry, ReputationSBT {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        assert!(table::contains(&registry.user_tokens, user), error::not_found(E_TOKEN_NOT_FOUND));

        let token_object = *table::borrow(&registry.user_tokens, user);
        let token_address = object::object_address(&token_object);
        let sbt = borrow_global<ReputationSBT>(token_address);
        
        let new_score = sbt.reputation_score + points;
        update_reputation(admin, user, new_score);
    }

    // Decrease reputation based on negative actions
    public entry fun decrease_reputation(
        admin: &signer,
        user: address,
        points: u64
    ) acquires SBTRegistry, ReputationSBT {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        assert!(table::contains(&registry.user_tokens, user), error::not_found(E_TOKEN_NOT_FOUND));

        let token_object = *table::borrow(&registry.user_tokens, user);
        let token_address = object::object_address(&token_object);
        let sbt = borrow_global<ReputationSBT>(token_address);
        
        let new_score = if (sbt.reputation_score > points) {
            sbt.reputation_score - points
        } else {
            1 // Minimum score of 1
        };
        update_reputation(admin, user, new_score);
    }

    // Batch update reputation for multiple users
    public entry fun batch_update_reputation(
        admin: &signer,
        users: vector<address>,
        scores: vector<u64>
    ) acquires SBTRegistry, ReputationSBT {
        let len = vector::length(&users);
        assert!(len == vector::length(&scores), error::invalid_argument(E_INVALID_SCORE));
        
        let i = 0;
        while (i < len) {
            let user = *vector::borrow(&users, i);
            let score = *vector::borrow(&scores, i);
            update_reputation(admin, user, score);
            i = i + 1;
        };
    }

    // Calculate reputation multiplier based on level
    public fun get_reputation_multiplier(user: address): u64 acquires SBTRegistry, ReputationSBT {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        if (table::contains(&registry.user_tokens, user)) {
            let token_object = *table::borrow(&registry.user_tokens, user);
            let token_address = object::object_address(&token_object);
            let sbt = borrow_global<ReputationSBT>(token_address);
            
            if (sbt.reputation_score >= REPUTATION_PLATINUM) {
                150 // 1.5x multiplier
            } else if (sbt.reputation_score >= REPUTATION_GOLD) {
                125 // 1.25x multiplier
            } else if (sbt.reputation_score >= REPUTATION_SILVER) {
                110 // 1.1x multiplier
            } else {
                100 // 1x multiplier
            }
        } else {
            100 // Default multiplier
        }
    }

    // Check if user qualifies for certain actions based on reputation
    public fun can_perform_action(user: address, required_score: u64): bool acquires SBTRegistry, ReputationSBT {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        if (table::contains(&registry.user_tokens, user)) {
            let token_object = *table::borrow(&registry.user_tokens, user);
            let token_address = object::object_address(&token_object);
            let sbt = borrow_global<ReputationSBT>(token_address);
            sbt.reputation_score >= required_score
        } else {
            false
        }
    }

    // Get users by reputation level
    public fun get_users_by_level(level: String): vector<address> acquires SBTRegistry {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        let users = vector::empty<address>();
        
        // Note: This is a simplified implementation
        // In a real scenario, you'd want to maintain separate indexes for efficiency
        users
    }

    // Helper function to determine reputation level
    public fun get_reputation_level(score: u64): String {
        if (score >= REPUTATION_PLATINUM) {
            string::utf8(b"Platinum")
        } else if (score >= REPUTATION_GOLD) {
            string::utf8(b"Gold")
        } else if (score >= REPUTATION_SILVER) {
            string::utf8(b"Silver")
        } else {
            string::utf8(b"Bronze")
        }
    }

    // View functions
    #[view]
    public fun get_user_reputation(user: address): (u64, String, u64, u64) acquires SBTRegistry, ReputationSBT {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        if (table::contains(&registry.user_tokens, user)) {
            let token_object = *table::borrow(&registry.user_tokens, user);
            let token_address = object::object_address(&token_object);
            let sbt = borrow_global<ReputationSBT>(token_address);
            (sbt.reputation_score, sbt.level, sbt.mint_timestamp, sbt.transaction_count)
        } else {
            (0, string::utf8(b"None"), 0, 0)
        }
    }

    #[view]
    public fun has_sbt(user: address): bool acquires SBTRegistry {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        table::contains(&registry.user_tokens, user)
    }

    #[view]
    public fun get_sbt_address(user: address): address acquires SBTRegistry {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        assert!(table::contains(&registry.user_tokens, user), error::not_found(E_TOKEN_NOT_FOUND));
        
        let token_object = *table::borrow(&registry.user_tokens, user);
        object::object_address(&token_object)
    }

    #[view]
    public fun get_registry_stats(): (u64, String) acquires SBTRegistry {
        let registry = borrow_global<SBTRegistry>(@aptos_synapse);
        (registry.total_minted, registry.collection_name)
    }

    #[view]
    public fun get_reputation_thresholds(): (u64, u64, u64, u64) {
        (REPUTATION_BRONZE, REPUTATION_SILVER, REPUTATION_GOLD, REPUTATION_PLATINUM)
    }
}