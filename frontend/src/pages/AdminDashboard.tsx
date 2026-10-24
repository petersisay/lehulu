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
  Building,
  MapPin,
  Phone,
  Globe,
  Send,
  Check,
  Info,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminApi, categoryApi, AdminStats } from '../services/api';
import { ServiceCategory, VerificationStatus, ProviderLead, ProviderLeadStatus } from '../types';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [leads, setLeads] = useState<ProviderLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'categories' | 'audit' | 'leads'>('overview');

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [leadActionLoading, setLeadActionLoading] = useState<string | null>(null);

  // Leads filters
  const [leadsCategoryFilter, setLeadsCategoryFilter] = useState<string>('all');
  const [leadsCityFilter, setLeadsCityFilter] = useState<string>('all');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<string>('all');
  const [leadsSearch, setLeadsSearch] = useState<string>('');

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
      const [statsRes, verifRes, logsRes, catRes, leadsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getVerifications(),
        adminApi.getAuditLogs(),
        categoryApi.getAll(),
        adminApi.getLeads(),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (verifRes.data.success) setVerifications(verifRes.data.data);
      if (logsRes.data.success) setAuditLogs(logsRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (leadsRes.data.success) setLeads(leadsRes.data.data);
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

  const handleUpdateLeadStatus = async (id: string, newStatus: ProviderLeadStatus) => {
    let notes: string | undefined = undefined;
    if (newStatus === 'INVITED') {
      notes = prompt('Optional outreach/invitation notes (e.g. Phone call date, contact person):') || undefined;
    } else if (newStatus === 'REJECTED' || newStatus === 'SUSPENDED') {
      notes = prompt(`Reason for setting status to ${newStatus}:`) || undefined;
      if (!notes) return;
    }

    setLeadActionLoading(id);
    try {
      const res = await adminApi.updateLeadStatus(id, { status: newStatus, notes });
      if (res.data.success) {
        setLeads((prev) => prev.map((l) => (l._id === id ? res.data.data : l)));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update provider lead status.');
    } finally {
      setLeadActionLoading(null);
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
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leads'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Provider Leads ({leads.length})</span>
          <span className="bg-emerald-400 text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            Adama & Bishoftu
          </span>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {prov?.businessName || u?.displayName}
                            </span>
                            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                              National ID: {item.nationalIdNumber}
                            </span>
                            {item.status && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                {item.status}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                            <span>Email: {u?.email}</span>
                            <span>•</span>
                            <span>Phone: {u?.phone || prov?.contactPhone || '—'}</span>
                            <span>•</span>
                            <span>Area: {prov?.serviceCities?.join(', ') || u?.city || 'Adama'}</span>
                            {prov?.trades && prov.trades.length > 0 && (
                              <>
                                <span>•</span>
                                <span>Trades: <strong className="text-slate-900">{prov.trades.join(', ')}</strong></span>
                              </>
                            )}
                          </div>

                          {/* Document preview links */}
                          <div className="flex items-center gap-4 text-xs pt-1">
                            {(item.idCardFrontUrl || item.idCardImageUrl) ? (
                              <a
                                href={item.idCardFrontUrl || item.idCardImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline"
                              >
                                <span>View National ID Photo</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">No ID photo attached (ID number provided)</span>
                            )}

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

          {/* TAB 5: RESEARCHED LEADS PIPELINE */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              {/* Authenticity Policy Alert */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-xs text-purple-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-purple-950">
                    Authentic Research Pipeline — Zero-Fabrication Guarantee
                  </p>
                  <p className="text-purple-800 leading-relaxed">
                    All records below represent verified public business entities and trade specialists operating in Adama and Bishoftu across all 5 service categories. 
                    These leads remain in this private administrative onboarding pipeline and are <strong>NEVER bookable</strong> or displayed as registered accounts until the owner officially joins Lehulu, provides identity documents, and passes administrator verification.
                  </p>
                </div>
              </div>

              {/* Filter controls */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative w-full max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search business, services or notes..."
                      value={leadsSearch}
                      onChange={(e) => setLeadsSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={leadsCategoryFilter}
                    onChange={(e) => setLeadsCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
                  >
                    <option value="all">All Categories</option>
                    <option value="home-maintenance">Home Maintenance</option>
                    <option value="automotive">Automotive Care</option>
                    <option value="cleaning">Cleaning Services</option>
                    <option value="technology">Technology & IT</option>
                    <option value="personal-business">Personal & Business</option>
                  </select>

                  <select
                    value={leadsCityFilter}
                    onChange={(e) => setLeadsCityFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
                  >
                    <option value="all">All Cities</option>
                    <option value="Adama">Adama (አዳማ)</option>
                    <option value="Bishoftu">Bishoftu (ቢሾፍቱ)</option>
                  </select>

                  <select
                    value={leadsStatusFilter}
                    onChange={(e) => setLeadsStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
                  >
                    <option value="all">All Statuses</option>
                    <option value="RESEARCHED_LEAD">Researched Lead</option>
                    <option value="INVITED">Invited</option>
                    <option value="PENDING_VERIFICATION">Pending Verification</option>
                    <option value="VERIFIED">Verified Onboarded</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Leads Cards Grid */}
              {(() => {
                const filteredLeads = leads.filter((item) => {
                  if (leadsCategoryFilter !== 'all' && item.categorySlug !== leadsCategoryFilter) return false;
                  if (leadsCityFilter !== 'all' && item.city !== leadsCityFilter) return false;
                  if (leadsStatusFilter !== 'all' && item.status !== leadsStatusFilter) return false;
                  if (leadsSearch.trim()) {
                    const q = leadsSearch.toLowerCase();
                    const matchName = item.businessName.toLowerCase().includes(q);
                    const matchServ = item.services?.some((s) => s.toLowerCase().includes(q));
                    const matchNotes = item.notes?.toLowerCase().includes(q);
                    if (!matchName && !matchServ && !matchNotes) return false;
                  }
                  return true;
                });

                if (filteredLeads.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                      <p className="text-sm font-bold text-slate-700 mb-1">No Leads Match Criteria</p>
                      <p className="text-xs text-slate-400">
                        Adjust category, city, or status filters to view cataloged business leads.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLeads.map((item) => {
                      const statusColor =
                        item.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : item.status === 'INVITED'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : item.status === 'PENDING_VERIFICATION'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : item.status === 'REJECTED' || item.status === 'SUSPENDED'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300';

                      return (
                        <div
                          key={item._id}
                          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-purple-300 transition-colors"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{item.businessName}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                                    {item.categorySlug}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {item.city}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusColor}`}
                              >
                                {item.status.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Services pills */}
                            <div className="flex flex-wrap gap-1.5">
                              {item.services?.map((svc, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                                >
                                  {svc}
                                </span>
                              ))}
                            </div>

                            {/* Public details */}
                            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl">
                              {item.publicAddress && (
                                <p className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-500 w-16 shrink-0">Address:</span>
                                  <span>{item.publicAddress}</span>
                                </p>
                              )}
                              {item.contactPhone && (
                                <p className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-500 w-16 shrink-0">Contact:</span>
                                  <span className="font-mono text-[11px]">{item.contactPhone}</span>
                                </p>
                              )}
                              <p className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 w-16 shrink-0">Source:</span>
                                <a
                                  href={item.publicSourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 underline truncate max-w-[260px]"
                                >
                                  <span className="truncate">{item.publicSourceUrl}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              </p>
                              {item.notes && (
                                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60 mt-1">
                                  Notes: {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400">
                              Verified: {new Date(item.sourceVerificationDate).toLocaleDateString()}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {item.status === 'RESEARCHED_LEAD' && (
                                <button
                                  onClick={() => handleUpdateLeadStatus(item._id, 'INVITED')}
                                  disabled={leadActionLoading === item._id}
                                  className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  {leadActionLoading === item._id ? 'Saving...' : 'Mark Invited'}
                                </button>
                              )}

                              {item.status === 'INVITED' && (
                                <button
                                  onClick={() => handleUpdateLeadStatus(item._id, 'PENDING_VERIFICATION')}
                                  disabled={leadActionLoading === item._id}
                                  className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  {leadActionLoading === item._id ? 'Saving...' : 'Mark Applied'}
                                </button>
                              )}

                              <select
                                value={item.status}
                                onChange={(e) =>
                                  handleUpdateLeadStatus(item._id, e.target.value as ProviderLeadStatus)
                                }
                                disabled={leadActionLoading === item._id}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                              >
                                <option value="RESEARCHED_LEAD">Status: Researched</option>
                                <option value="INVITED">Status: Invited</option>
                                <option value="PENDING_VERIFICATION">Status: Pending Verification</option>
                                <option value="VERIFIED">Status: Verified</option>
                                <option value="REJECTED">Status: Rejected</option>
                                <option value="SUSPENDED">Status: Suspended</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
