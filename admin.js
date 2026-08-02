import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabase = createClient(
  'https://rsijqviibwpulkkwshit.supabase.co',
  'YOUR_SUPABASE_ANON_KEY'
);

export default function AdminDashboard() {
  const [tablets, setTablets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time listener for incoming Proof of Play logs
    const logSubscription = supabase
      .channel('public:proof_of_play_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proof_of_play_logs' }, (payload) => {
        setLogs((prevLogs) => [payload.new, ...prevLogs]);
      })
      .subscribe();

    return () => { supabase.removeChannel(logSubscription); };
  }, []);

  async function fetchDashboardData() {
    const { data: tabs } = await supabase.from('tablets').select('*');
    const { data: camps } = await supabase.from('campaigns').select('*');
    const { data: popLogs } = await supabase.from('proof_of_play_logs').select('*').order('played_at', { ascending: false }).limit(10);
    
    if (tabs) setTablets(tabs);
    if (camps) setCampaigns(camps);
    if (popLogs) setLogs(popLogs);
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">🚨 CommuteAds Fleet Command</h1>

      {/* SECTION 1: LIVE FLEET TELEMETRY */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">1. Active Tablet Fleet (Ignition & Battery Status)</h2>
        <div className="grid grid-cols-3 gap-4">
          {tablets.map((tab) => (
            <div key={tab.cab_id} className="p-4 bg-gray-800 rounded border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{tab.cab_id}</span>
                <span className={`px-2 py-1 text-xs rounded ${tab.status === 'ONLINE' ? 'bg-green-600' : 'bg-red-600'}`}>
                  {tab.status}
                </span>
              </div>
              <p className="text-sm mt-2">🔋 Battery: {tab.battery_level}% | ⚡ Ignition: {tab.is_charging ? 'ON (Charging)' : 'OFF'}</p>
              <p className="text-xs text-gray-400 mt-1">Free Storage: {tab.storage_free_mb} MB</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: CAMPAIGN CONTROL */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">2. Active Ad Campaigns ("The Sandwich" Pool)</h2>
        <div className="bg-gray-800 p-4 rounded">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="pb-2">Advertiser</th>
                <th className="pb-2">Title</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Interactive QR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-700/50">
                  <td className="py-2">{c.advertiser_name}</td>
                  <td className="py-2">{c.title}</td>
                  <td className="py-2 text-green-400">{c.status}</td>
                  <td className="py-2">{c.is_interactive ? '✅ Yes' : '❌ No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: REAL-TIME PROOF OF PLAY FEED */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-green-400">3. Live Proof of Play (PoP) Feed</h2>
        <div className="bg-black p-4 rounded border border-gray-800 font-mono text-sm max-h-60 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="py-1 border-b border-gray-900 text-gray-300">
              [CAB: {log.cab_id}] played Campaign ID <span className="text-yellow-500">{log.campaign_id}</span> at {new Date(log.played_at).toLocaleTimeString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}