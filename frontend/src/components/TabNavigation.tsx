'use client';

interface TabNavigationProps {
  activeTab: 'overview' | 'bridge' | 'swap' | 'lending' | 'analytics' | 'wallet';
  onTabChange: (tab: 'overview' | 'bridge' | 'swap' | 'lending' | 'analytics' | 'wallet') => void;
}

export const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const tabs = [
    { id: 'overview', label: 'Overview', provider: null },
    { id: 'bridge', label: 'Bridge', provider: 'Kana Labs' },
    { id: 'swap', label: 'Swap', provider: 'Tapp.Exchange' },
    { id: 'lending', label: 'Lending', provider: 'Aptos Synapse' },
    { id: 'analytics', label: 'Analytics', provider: 'Hyperion' },
    { id: 'wallet', label: 'Wallet', provider: 'Nodit' },
  ];

  return (
    <nav className="flex space-x-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as 'overview' | 'bridge' | 'swap' | 'lending' | 'analytics' | 'wallet')}
          className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-all duration-200 text-sm ${
            activeTab === tab.id 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white hover:bg-blue-50 text-gray-700 border border-gray-200 hover:border-blue-300'
          }`}
        >
          <span className="font-medium">{tab.label}</span>
          {tab.provider && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              activeTab === tab.id 
                ? 'bg-blue-500 text-blue-100' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tab.provider}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default TabNavigation;