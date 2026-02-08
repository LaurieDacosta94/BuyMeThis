import React, { useState, useMemo } from 'react';
import { User, RequestItem, RequestStatus } from '../types';
import { Shield, Users, Package, Activity, AlertTriangle, Search, Trash2, Ban, CheckCircle, Database, Server, Terminal, Lock } from 'lucide-react';
import { Button } from './Button';

interface AdminPanelProps {
  users: User[];
  requests: RequestItem[];
  onDeleteRequest: (req: RequestItem) => void;
  onUpdateUser: (user: User) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ users, requests, onDeleteRequest, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'requests' | 'system' | 'logs'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // --- MOCK SYSTEM DATA ---
  const systemMetrics = {
    cpu: '12%',
    memory: '43%',
    dbLatency: '24ms',
    uptime: '99.98%'
  };

  const auditLogs = [
      { id: 1, action: 'ADMIN_LOGIN', user: 'admin', timestamp: new Date().toISOString() },
      { id: 2, action: 'DB_BACKUP', user: 'system', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 3, action: 'USER_REPORT', user: 'user_123', target: 'req_888', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: 4, action: 'REQUEST_DELETE', user: 'mod_2', target: 'req_999', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ];

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      totalRequests: requests.length,
      activeRequests: requests.filter(r => r.status === RequestStatus.OPEN).length,
      fulfilledRequests: requests.filter(r => r.status === RequestStatus.FULFILLED || r.status === RequestStatus.RECEIVED).length,
      totalValue: requests.length * 45 // Estimated $45 per item avg
    };
  }, [users, requests]);

  // --- RENDERERS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Total Users</span>
                    <Users className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Requests</span>
                    <Package className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalRequests}</div>
                <div className="text-xs text-emerald-400 mt-1">{stats.fulfilledRequests} fulfilled</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Volume Est.</span>
                    <Activity className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white">${stats.totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">System Status</span>
                    <Server className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-green-400">Healthy</div>
                <div className="text-xs text-slate-500 mt-1">Latency: {systemMetrics.dbLatency}</div>
            </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Traffic Overview</h3>
            <div className="h-48 flex items-end justify-between gap-2">
                {[40, 65, 34, 78, 56, 90, 80, 45, 67, 88, 50, 70].map((h, i) => (
                    <div key={i} className="w-full bg-indigo-500/20 hover:bg-indigo-500/40 rounded-t transition-all relative group">
                        <div style={{ height: `${h}%` }} className="bg-indigo-500 rounded-t w-full bottom-0 absolute"></div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4 animate-in fade-in">
        <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Search users by name, handle, or ID..." 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900/50 text-slate-200 font-medium uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Trust Score</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || u.handle.includes(searchTerm)).map(user => (
                        <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <img src={user.avatarUrl} className="w-8 h-8 rounded-full bg-slate-700" alt="" />
                                    <div>
                                        <div className="font-medium text-white">{user.displayName}</div>
                                        <div className="text-xs">@{user.handle}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.trustScore > 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {user.trustScore}%
                                </span>
                            </td>
                            <td className="px-4 py-3">{user.location}</td>
                            <td className="px-4 py-3">
                                {user.isAdmin ? (
                                    <span className="text-purple-400 font-bold flex items-center gap-1"><Shield className="h-3 w-3" /> Admin</span>
                                ) : (
                                    <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Active</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button className="text-slate-400 hover:text-white p-1" title="View Details">
                                    <Database className="h-4 w-4" />
                                </button>
                                {!user.isAdmin && (
                                    <button className="text-red-400 hover:text-red-300 p-1 ml-2" title="Ban User" onClick={() => alert("Ban functionality simulated.")}>
                                        <Ban className="h-4 w-4" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-4 animate-in fade-in">
        <div className="flex gap-4 mb-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Search requests..." 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
             <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900/50 text-slate-200 font-medium uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3">Request</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Requester</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {requests.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase())).map(req => (
                        <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-white max-w-xs truncate" title={req.title}>
                                {req.title}
                            </td>
                            <td className="px-4 py-3">
                                <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">{req.category}</span>
                            </td>
                            <td className="px-4 py-3 text-xs">{req.requesterId.substring(0,8)}...</td>
                            <td className="px-4 py-3">
                                <span className={`text-xs font-bold ${req.status === 'OPEN' ? 'text-blue-400' : 'text-green-400'}`}>
                                    {req.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button 
                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-400/10 rounded transition-colors" 
                                    title="Delete Request"
                                    onClick={() => {
                                        if(confirm("Admin Override: Delete this request?")) onDeleteRequest(req);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderSystem = () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-green-400" /> Database Config
              </h3>
              <div className="space-y-4">
                  <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400 border border-slate-700">
                      <div>Status: CONNECTED</div>
                      <div>Driver: @neondatabase/serverless</div>
                      <div>Pool Size: 10</div>
                      <div>SSL: True</div>
                  </div>
                  <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Flush Cache</Button>
                      <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Re-Index</Button>
                  </div>
              </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-400" /> Security Status
              </h3>
              <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Admin Session</span>
                      <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Encryption</span>
                      <span className="text-green-400">AES-256</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Failed Logins (24h)</span>
                      <span className="text-white">0</span>
                  </div>
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-200 text-xs">
                      <AlertTriangle className="h-3 w-3 inline mr-2" />
                      Root access is restricted to environment variables.
                  </div>
              </div>
          </div>
      </div>
  );

  const renderLogs = () => (
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-in fade-in">
          <table className="w-full text-left text-sm text-slate-400 font-mono">
                <thead className="bg-slate-900/50 text-slate-200 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Timestamp</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3 text-slate-500">#{log.id}</td>
                            <td className="px-4 py-3 text-indigo-400">{log.action}</td>
                            <td className="px-4 py-3 text-white">{log.user}</td>
                            <td className="px-4 py-3">{log.timestamp}</td>
                        </tr>
                    ))}
                </tbody>
          </table>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="h-6 w-6 text-indigo-500" />
                Admin Panel
            </h1>
            <p className="text-xs text-slate-500 mt-1">v1.0.0-beta</p>
        </div>
        <nav className="p-4 space-y-2 flex-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Activity className="h-4 w-4" /> Dashboard
            </button>
            <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Users className="h-4 w-4" /> User Management
            </button>
            <button onClick={() => setActiveTab('requests')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'requests' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Package className="h-4 w-4" /> Request Manager
            </button>
            <button onClick={() => setActiveTab('system')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'system' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Server className="h-4 w-4" /> System Health
            </button>
            <button onClick={() => setActiveTab('logs')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Database className="h-4 w-4" /> Audit Logs
            </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-xs">AD</div>
                 <div className="text-xs">
                     <div className="font-bold text-white">Administrator</div>
                     <div className="text-slate-500">Root Access</div>
                 </div>
             </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-slate-900 border-b border-slate-800 p-6 md:hidden">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" /> Admin
            </h1>
        </header>

        <main className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
                <p className="text-slate-400 text-sm">Overview of system performance and data.</p>
            </div>

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'requests' && renderRequests()}
            {activeTab === 'system' && renderSystem()}
            {activeTab === 'logs' && renderLogs()}
        </main>
      </div>
    </div>
  );
};