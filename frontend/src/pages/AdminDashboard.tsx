import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Briefcase,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminApi, categoryApi, AdminStats } from '../services/api';
import { ServiceCategory, VerificationStatus } from '../types';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'categories' | 'audit'>('overview');

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // New category modal state
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);
  const [newCatEn, setNewCatEn] = useState<string>('');
  const [newCatAm, setNewCatAm] = useState<string>('');
  const [newCatSlug, setNewCatSlug] = useState<string>('');
  const [newCatDescEn, setNewCatDescEn] = useState<string>('');
  const [newCatDescAm, setNewCatDescAm] = useState<string>('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, verifRes, logsRes, catRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getVerifications(),
        adminApi.getAuditLogs(),
        categoryApi.getAll(),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (verifRes.data.success) setVerifications(verifRes.data.data);
      if (logsRes.data.success) setAuditLogs(logsRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch administrator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/login?redirect=/admin/dashboard');
      return;
    }
    if (isAuthenticated && isAdmin) {
      fetchAdminData();
    }
  }, [isAuthenticated, isAdmin, authLoading]);

  const handleReviewVerification = async (id: string, status: VerificationStatus) => {
    let rejectionReason: string | undefined = undefined;
    if (status === 'REJECTED' || status === 'NEEDS_RECHECK') {
      const reason = prompt(`Enter reason for ${status}:`);
      if (!reason) return;
      rejectionReason = reason;
    }

    setActionLoading(true);
    try {
      const res = await adminApi.reviewVerification(id, status, rejectionReason);
      if (res.data.success) {
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update verification status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatEn.trim() || !newCatAm.trim() || !newCatSlug.trim()) {
      alert('English name, Amharic name, and slug are required.');
      return;
    }

    try {
      const res = await categoryApi.create({
        nameEn: newCatEn.trim(),
        nameAm: newCatAm.trim(),
        slug: newCatSlug.trim(),
        descriptionEn: newCatDescEn.trim(),
        descriptionAm: newCatDescAm.trim(),
      });
      if (res.data.success) {
        setShowAddCategory(false);
        setNewCatEn('');
        setNewCatAm('');
        setNewCatSlug('');
        setNewCatDescEn('');
        setNewCatDescAm('');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-900/50 px-2.5 py-0.5 rounded-full border border-purple-500/30">
            Administrative Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Platform Operations & Moderation
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time verified data for Adama, Bishoftu, and Ethiopian marketplace operations.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="px-4 py-2 bg-purple-700/60 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-purple-500/40 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'verifications'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Verification Queue</span>
          {verifications.length > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {verifications.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Service Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Audit Logs
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
          <p className="text-xs font-semibold">Querying live database metrics...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW METRICS */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Registered Customers
                  </span>
                  <span className="text-3xl font-black text-slate-900 mt-1 block">
                    {stats.totalCustomers}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Service Providers
                  </span>
                  <span className="text-3xl font-black text-slate-900 mt-1 block">
                    {stats.totalProviders}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                    Pending Verifications
                  </span>
                  <span className="text-3xl font-black text-amber-600 mt-1 block">
                    {stats.pendingVerifications}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                    Verified Providers
                  </span>
                  <span className="text-3xl font-black text-emerald-700 mt-1 block">
                    {stats.verifiedProviders}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Active Bookings
                  </span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {stats.activeBookings}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Completed Transactions
                  </span>
                  <span className="text-2xl font-black text-emerald-700 mt-1 block">
                    {stats.completedBookings}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Open Disputes
                  </span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {stats.openDisputes}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VERIFICATION QUEUE */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Provider Identity & License Verification Applications
              </h2>

              {verifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">Queue is Clear</p>
                  <p className="text-slate-500 mt-1">No pending provider applications awaiting verification.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifications.map((item) => {
                    const prov = item.providerId;
                    const u = prov?.userId;
                    return (
                      <div
                        key={item._id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {prov?.businessName || u?.displayName}
                            </span>
                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              ID: {item.nationalIdNumber}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500">
                            Email: {u?.email} • City: {u?.city || 'Adama'} • Submitted on{' '}
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>

                          {/* Document preview links */}
                          <div className="flex items-center gap-4 text-xs pt-1">
                            <a
                              href={item.idCardFrontUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline"
                            >
                              <span>View National ID Photo</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {item.tradeLicenseUrl && (
                              <a
                                href={item.tradeLicenseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline"
                              >
                                <span>View Trade License</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Decision Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReviewVerification(item._id, 'VERIFIED')}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Verify</span>
                          </button>

                          <button
                            onClick={() => handleReviewVerification(item._id, 'NEEDS_RECHECK')}
                            disabled={actionLoading}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Needs Recheck
                          </button>

                          <button
                            onClick={() => handleReviewVerification(item._id, 'REJECTED')}
                            disabled={actionLoading}
                            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Configured Service Trades</h2>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition-colors"
                >
                  + Add New Category
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <div key={cat._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">{cat.nameEn}</h3>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {cat.nameAm}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{cat.descriptionEn}</p>
                    <span className="text-[10px] font-mono text-slate-400 block pt-1">
                      slug: {cat.slug}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Immutable Platform Audit Logs
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/60 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">Target Resource</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">{log.adminId}</td>
                        <td className="py-2.5 px-4 text-slate-600">{log.targetModel} #{log.targetId?.slice(-6)}</td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{log.ipAddress || '—'}</td>
                        <td className="py-2.5 px-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Service Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name (English)</label>
                <input
                  type="text"
                  value={newCatEn}
                  onChange={(e) => setNewCatEn(e.target.value)}
                  placeholder="e.g. Appliance Repair"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name (Amharic)</label>
                <input
                  type="text"
                  value={newCatAm}
                  onChange={(e) => setNewCatAm(e.target.value)}
                  placeholder="e.g. የኤሌክትሮኒክስ ጥገና"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="appliance-repair"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 text-white text-xs font-bold rounded-xl hover:bg-purple-800"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
