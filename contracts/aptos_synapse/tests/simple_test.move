#[test_only]
module aptos_synapse::simple_test {
    use std::signer;
    use aptos_framework::account;
    use aptos_synapse::main;
    use aptos_synapse::sbt;

    #[test(aptos_framework = @0x1, user = @0x123)]
    public fun test_simple_initialization(aptos_framework: &signer, user: &signer) {
        // Initialize the protocol
        account::create_account_for_test(signer::address_of(aptos_framework));
        account::create_account_for_test(signer::address_of(user));
        
        // Initialize main protocol
        main::initialize(aptos_framework);
        
        // Initialize SBT system
        sbt::initialize(aptos_framework);
        
        // Simple assertion
        assert!(true, 1);
    }
}