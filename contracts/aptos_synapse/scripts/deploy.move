script {
    use aptos_synapse::main;
    use aptos_synapse::sbt;

    fun deploy(deployer: &signer) {
        // Initialize the main lending protocol
        main::initialize(deployer);
        
        // Initialize the SBT (Soulbound Token) system
        sbt::initialize(deployer);
    }
}