import { useState, useEffect } from 'react';
import { noditClient, AptosTransaction, EthereumTransaction } from '@/lib/nodit';

export const useTransactionMonitor = (txHash: string, network: 'aptos' | 'ethereum' = 'aptos') => {
  const [status, setStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [confirmations, setConfirmations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    if (!txHash) return;

    let interval: NodeJS.Timeout;
    let isActive = true;

    const monitorTransaction = async () => {
      try {
        const checkStatus = async () => {
          if (!isActive) return;

          try {
            let txStatus;
            
            if (network === 'aptos') {
              txStatus = await noditClient.getAptosTransaction(txHash);
            } else {
              txStatus = await noditClient.getEthereumTransaction(txHash);
            }

            if (txStatus) {
              setTransactionData(txStatus);
              
              if (network === 'aptos') {
                const aptosTransaction = txStatus as AptosTransaction;
                if (aptosTransaction.success === true) {
                  setStatus('completed');
                  setConfirmations(1); // Aptos transactions are final when included
                } else if (aptosTransaction.success === false) {
                  setStatus('failed');
                  setError('Transaction failed on-chain');
                }
              } else {
                // Ethereum transaction handling
                const ethTransaction = txStatus as EthereumTransaction;
                if (ethTransaction.status === '1' || ethTransaction.status === 'success') {
                  setStatus('completed');
                  // Calculate confirmations based on current block vs transaction block
                  const currentBlock = parseInt(ethTransaction.blockNumber);
                  const confirmationCount = Math.max(1, currentBlock - parseInt(ethTransaction.blockNumber) + 1);
                  setConfirmations(confirmationCount);
                } else if (ethTransaction.status === '0' || ethTransaction.status === 'failed') {
                  setStatus('failed');
                  setError('Transaction failed on-chain');
                }
              }
            } else {
              // Transaction not found yet, keep as pending
              setStatus('pending');
            }
          } catch (err: any) {
            console.error('Error checking transaction status:', err);
            if (err.message.includes('not found') || err.message.includes('404')) {
              // Transaction not found yet, keep as pending
              setStatus('pending');
            } else {
              setError(err.message);
              setStatus('failed');
            }
          }
        };

        // Initial check
        await checkStatus();

        // Only continue polling if transaction is still pending
        if (status === 'pending') {
          // Poll every 3 seconds for updates
          interval = setInterval(checkStatus, 3000);
        }
        
      } catch (err: any) {
        if (isActive) {
          setError(err.message);
          setStatus('failed');
        }
      }
    };

    monitorTransaction();

    // Cleanup function
    return () => {
      isActive = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [txHash, network, status]);

  // Stop polling when transaction is completed or failed
  useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      // Transaction monitoring complete
    }
  }, [status]);

  return { 
    status, 
    confirmations, 
    error, 
    transactionData,
    isLoading: status === 'pending',
    isCompleted: status === 'completed',
    isFailed: status === 'failed'
  };
};

export default useTransactionMonitor;