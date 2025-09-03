import { WalletConnector } from "@/components/WalletConnector";
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Aptos Synapse</h1>
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Testnet
              </span>
            </div>
            <WalletConnector />
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <Dashboard />

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Aptos Synapse. Built for Aptos CtrlMove Hackathon.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
