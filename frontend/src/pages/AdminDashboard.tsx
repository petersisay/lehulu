import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = (searchParams.get('tab') as 'overview' | 'verifications' | 'verified-providers' | 'categories' | 'audit' | 'leads') || null;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [verifiedList, setVerifiedList] = useState<any[]>([]);
  const [verifiedSearch, setVerifiedSearch] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [leads, setLeads] = useState<ProviderLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'verified-providers' | 'categories' | 'audit' | 'leads'>(
    urlTab || 'verifications'
  );

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [leadActionLoading, setLeadActionLoading] = useState<string | null>(null);

  // Sync tab with URL
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const switchTab = (tab: 'overview' | 'verifications' | 'verified-providers' | 'categories' | 'audit' | 'leads') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

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

  // Verification filter state
  const [verificationFilter, setVerificationFilter] = useState<'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ALL'>('PENDING_REVIEW');

  const filteredVerified = verifiedList.filter((item) => {
    if (!verifiedSearch.trim()) return true;
    const q = verifiedSearch.trim().toLowerCase();
    const prov = item.providerProfileId || item.providerId;
    const u = item.userId || prov?.userId;
    const name = (prov?.businessName || u?.displayName || '').toLowerCase();
    const email = (u?.email || '').toLowerCase();
    const phone = (u?.phoneNumber || u?.phone || prov?.contactPhone || '').toLowerCase();
    const city = (prov?.publicAddress || prov?.serviceCities?.join(' ') || u?.city || '').toLowerCase();
    const trades = (prov?.skills || prov?.trades || []).join(' ').toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || city.includes(q) || trades.includes(q);
  });

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, verifRes, verifiedRes, logsRes, catRes, leadsRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.getVerifications('PENDING_REVIEW'),
        adminApi.getVerifications('VERIFIED'),
        adminApi.getAuditLogs(),
        categoryApi.getAll(),
        adminApi.getLeads(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        const d = statsRes.value.data as any;
        setStats(d.stats || d.data || null);
      }
      if (verifRes.status === 'fulfilled' && verifRes.value?.data?.success) {
        const d = verifRes.value.data as any;
        const list = d.verifications || d.data || [];
        setVerifications(Array.isArray(list) ? list : []);
      }
      if (verifiedRes.status === 'fulfilled' && verifiedRes.value?.data?.success) {
        const d = verifiedRes.value.data as any;
        const list = d.verifications || d.data || [];
        setVerifiedList(Array.isArray(list) ? list : []);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value?.data?.success) {
        const d = logsRes.value.data as any;
        const list = d.logs || d.data || [];
        setAuditLogs(Array.isArray(list) ? list : []);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.data?.success) {
        const d = catRes.value.data as any;
        const list = d.categories || d.data || [];
        setCategories(Array.isArray(list) ? list : []);
      }
      if (leadsRes.status === 'fulfilled' && leadsRes.value?.data?.success) {
        const d = leadsRes.value.data as any;
        const list = d.leads || d.data || [];
        setLeads(Array.isArray(list) ? list : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch administrator data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterVerifications = async (filter: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ALL') => {
    setVerificationFilter(filter);
    try {
      setActionLoading(true);
      const res = await adminApi.getVerifications(filter);
      if (res.data.success) {
        const d = res.data as any;
        const list = d.verifications || d.data || [];
        setVerifications(Array.isArray(list) ? list : []);
      }
    } catch (err: any) {
      console.error('Failed to load verifications for filter', filter, err);
    } finally {
      setActionLoading(false);
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
      const reason = prompt(
        status === 'REJECTED'
          ? 'Enter administrative reason for rejecting / revoking provider verification:'
          : 'Enter details for recheck request:'
      );
      if (!reason) return;
      rejectionReason = reason;
    }

    setActionLoading(true);
    try {
      const res = await adminApi.reviewVerification(id, status, rejectionReason);
      if (res.data.success) {
        await fetchAdminData();
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
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 rounded-xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-900/50 px-2.5 py-0.5 rounded-md border border-purple-500/30">
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 border border-blue-500/40 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => switchTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => switchTab('verifications')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'verifications'
              ? 'bg-blue-600 text-white shadow-xs'
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
          onClick={() => switchTab('verified-providers')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'verified-providers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
          <span>Verified Providers</span>
          {(stats?.verifiedProviders || verifiedList.length > 0) && (
            <span className="bg-blue-200 text-blue-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {stats?.verifiedProviders ?? verifiedList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => switchTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Service Categories ({categories.length})
        </button>
        <button
          onClick={() => switchTab('leads')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leads'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Provider Leads ({leads.length})</span>
          <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-amber-300">
            Adama & Bishoftu
          </span>
        </button>
        <button
          onClick={() => switchTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                      Verified Providers
                    </span>
                    <button
                      onClick={() => switchTab('verified-providers')}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Manage & Revoke
                    </button>
                  </div>
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
                    {stats.completedTransactions ?? stats.completedBookings ?? 0}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">
                  Provider Identity & License Verification Applications
                </h2>

                {/* Sub-filter tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
                  <button
                    onClick={() => handleFilterVerifications('PENDING_REVIEW')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      verificationFilter === 'PENDING_REVIEW'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pending Review ({stats?.pendingVerifications ?? 0})
                  </button>
                  <button
                    onClick={() => handleFilterVerifications('VERIFIED')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      verificationFilter === 'VERIFIED'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Verified Providers ({stats?.verifiedProviders ?? 0})
                  </button>
                  <button
                    onClick={() => handleFilterVerifications('REJECTED')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      verificationFilter === 'REJECTED'
                        ? 'bg-white text-red-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rejected / Revoked
                  </button>
                  <button
                    onClick={() => handleFilterVerifications('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      verificationFilter === 'ALL'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Records
                  </button>
                </div>
              </div>

              {verifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No Records in this View</p>
                  <p className="text-slate-500 mt-1">
                    {verificationFilter === 'PENDING_REVIEW'
                      ? 'Queue is clear. No pending applications.'
                      : `No provider applications found under ${verificationFilter}.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifications.map((item) => {
                    const prov = item.providerProfileId || item.providerId;
                    const u = item.userId || prov?.userId;
                    const catNames = prov?.categoryIds?.map((c: any) => c?.nameEn || c?.nameAm || c).filter(Boolean).join(', ');
                    const skillsList = (prov?.skills && prov.skills.length > 0) ? prov.skills : (prov?.trades || []);
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
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                  item.status === 'VERIFIED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : item.status === 'REJECTED'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {item.status}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                            <span>Email: {u?.email || '—'}</span>
                            <span>•</span>
                            <span>Phone: {u?.phoneNumber || u?.phone || prov?.contactPhone || '—'}</span>
                            <span>•</span>
                            <span>Area: {prov?.publicAddress || prov?.serviceCities?.join(', ') || u?.city || 'Adama'}</span>
                            {catNames && (
                              <>
                                <span>•</span>
                                <span>Category: <strong className="text-emerald-800">{catNames}</strong></span>
                              </>
                            )}
                            {skillsList.length > 0 && (
                              <>
                                <span>•</span>
                                <span>Trades: <strong className="text-slate-900">{skillsList.join(', ')}</strong></span>
                              </>
                            )}
                          </div>

                          {/* Rejection reason banner if rejected */}
                          {item.rejectionReason && (
                            <div className="p-2.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                              <span><strong>Administrative Rejection Reason:</strong> {item.rejectionReason}</span>
                            </div>
                          )}

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
                          {item.status === 'VERIFIED' ? (
                            <button
                              onClick={() => handleReviewVerification(item._id, 'REJECTED')}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title="Reject or revoke this verified provider if any error occurs"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject / Revoke Verification</span>
                            </button>
                          ) : item.status === 'REJECTED' ? (
                            <button
                              onClick={() => handleReviewVerification(item._id, 'VERIFIED')}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Re-Approve & Verify</span>
                            </button>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: VERIFIED PROVIDERS (THE DEDICATED VERIFIED PLACE) */}
          {activeTab === 'verified-providers' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-xl p-6 sm:p-7 text-white border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">
                      Verified Providers Directory (Visible to Customers)
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      All service specialists listed here are authenticated and active in the public customer directory for Adama and Bishoftu. 
                      If any error, complaint, or dispute occurs, you can reject / revoke their verification status immediately below.
                    </p>
                  </div>
                </div>

                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter verified providers..."
                    value={verifiedSearch}
                    onChange={(e) => setVerifiedSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {filteredVerified.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No Verified Providers Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {verifiedSearch
                      ? 'No verified providers match your search filter.'
                      : 'No providers have been verified yet. Check the Verification Queue to approve pending applications.'}
                  </p>
                  <button
                    onClick={() => switchTab('verifications')}
                    className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold hover:bg-purple-800 cursor-pointer"
                  >
                    Go to Verification Queue
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVerified.map((item) => {
                    const prov = item.providerProfileId || item.providerId;
                    const u = item.userId || prov?.userId;
                    const provId = prov?._id || item.providerProfileId;
                    const catNames = prov?.categoryIds?.map((c: any) => c?.nameEn || c?.nameAm || c).filter(Boolean).join(', ');
                    const skillsList = (prov?.skills && prov.skills.length > 0) ? prov.skills : (prov?.trades || []);

                    return (
                      <div
                        key={item._id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-emerald-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-extrabold text-slate-900">
                              {prov?.businessName || u?.displayName || 'Service Specialist'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              100% ID Verified
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                              Visible to Customers in Directory
                            </span>
                            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                              ID: {item.nationalIdNumber || 'ET-VERIFIED'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                            <span>Owner: <strong className="text-slate-800">{u?.displayName || '—'}</strong></span>
                            <span>•</span>
                            <span>Email: {u?.email || '—'}</span>
                            <span>•</span>
                            <span>Phone: <strong className="text-slate-800">{u?.phoneNumber || u?.phone || prov?.contactPhone || '—'}</strong></span>
                            <span>•</span>
                            <span>City: {prov?.publicAddress || prov?.serviceCities?.join(', ') || u?.city || 'Adama'}</span>
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                            {catNames && (
                              <span>Category: <strong className="text-emerald-800">{catNames}</strong></span>
                            )}
                            {skillsList.length > 0 && (
                              <>
                                <span>•</span>
                                <span>Trades: <strong className="text-slate-900">{skillsList.join(', ')}</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span>Completed Jobs: <strong className="text-emerald-700">{prov?.completedBookingsCount ?? 0}</strong></span>
                            <span>•</span>
                            <span>Rating: <strong className="text-amber-600">{prov?.rating ? prov.rating.toFixed(1) : '5.0'} ★ ({prov?.reviewCount ?? 0})</strong></span>
                          </div>

                          {/* Customer Profile Link & ID photo */}
                          <div className="flex items-center gap-4 text-xs pt-1">
                            {provId && (
                              <a
                                href={`/providers/${provId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 underline"
                              >
                                <span>View Public Profile as Customer</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {(item.idCardFrontUrl || item.idCardImageUrl) && (
                              <a
                                href={item.idCardFrontUrl || item.idCardImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline"
                              >
                                <span>View National ID Photo</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Action: Reject / Revoke Verification */}
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => handleReviewVerification(item._id, 'REJECTED')}
                            disabled={actionLoading}
                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                            title="Reject or revoke this verified provider for any reason"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject / Revoke Verification</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CATEGORIES */}
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
                    {auditLogs.map((log) => {
                      const adminLabel =
                        (typeof log.actorId === 'object' && log.actorId)
                          ? (log.actorId.displayName || log.actorId.email)
                          : log.actorEmail || (typeof log.actorId === 'string' ? log.actorId : 'Administrator');
                      const targetLabel = log.entityType || log.targetModel || 'Record';
                      const targetIdStr = log.entityId || log.targetId || '';
                      const dateVal = log.timestamp || log.createdAt;
                      const formattedDate = dateVal ? new Date(dateVal).toLocaleString() : 'Just now';

                      return (
                        <tr key={log._id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{log.action}</td>
                          <td className="py-2.5 px-4 text-slate-700 font-medium text-[11px]">{adminLabel}</td>
                          <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                            {targetLabel} #{targetIdStr ? String(targetIdStr).slice(-6) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{log.ipAddress || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{formattedDate}</td>
                        </tr>
                      );
                    })}
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
