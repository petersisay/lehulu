import React, { useState } from 'react';
import { FileText, CheckCircle2, XCircle, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Quote } from '../types';
import { quoteApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface QuotationViewProps {
  quote: Quote;
  isCustomer: boolean;
  onQuoteUpdated?: (updatedQuote: Quote) => void;
}

export const QuotationView: React.FC<QuotationViewProps> = ({
  quote,
  isCustomer,
  onQuoteUpdated,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!window.confirm('Do you accept this itemized quotation of ' + Number(quote.totalAmount || 0).toLocaleString() + ' ETB?')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await quoteApi.accept(quote._id);
      if (res.data.success && onQuoteUpdated) {
        onQuoteUpdated(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept quotation.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await quoteApi.reject(quote._id, rejectReason);
      if (res.data.success && onQuoteUpdated) {
        setRejecting(false);
        onQuoteUpdated(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to decline quotation.');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    PROPOSED: 'bg-amber-50 text-amber-800 border-amber-200',
    ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-800 border-red-200',
    SUPERSEDED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden my-4">
      {/* Quotation Header */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Quotation #{quote.quoteNumber}
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[quote.status] || 'bg-slate-100 text-slate-700'}`}>
                {quote.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'Recently'}
            </p>
          </div>
        </div>

        {quote.estimatedDurationHours && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Est. {quote.estimatedDurationHours} hours</span>
          </div>
        )}
      </div>

      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Itemized Table */}
      <div className="p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Unit Price ({t('currency.etb') === 'currency.etb' ? 'ETB' : (t('currency.etb') || 'ETB')})</th>
                <th className="pb-2 text-right">Total ({t('currency.etb') === 'currency.etb' ? 'ETB' : (t('currency.etb') || 'ETB')})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Array.isArray(quote.items) ? quote.items : []).map((item, idx) => (
                <tr key={idx} className="text-slate-700">
                  <td className="py-2.5 font-medium pr-4">{item.description || 'Service item'}</td>
                  <td className="py-2.5 text-center">{item.quantity || 1}</td>
                  <td className="py-2.5 text-right font-mono">
                    {Number(item.unitPrice || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                    {Number(item.total || (item.quantity || 1) * (item.unitPrice || 0)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 text-sm font-bold text-slate-900">
                <td colSpan={3} className="pt-3 text-right">
                  Agreed Total Amount:
                </td>
                <td className="pt-3 text-right font-mono text-blue-700 text-base">
                  {Number(quote.totalAmount || 0).toLocaleString()} {t('currency.etb') === 'currency.etb' ? 'ETB' : (t('currency.etb') || 'ETB')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes & Inclusions */}
        {quote.notes && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
            <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
            {quote.notes}
          </div>
        )}

        {quote.inspectionIncluded && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Inspection fee is fully included in this quotation.</span>
          </div>
        )}
      </div>

      {/* Customer Action Buttons if PROPOSED */}
      {isCustomer && quote.status === 'PROPOSED' && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
          {rejecting ? (
            <form onSubmit={handleReject} className="w-full flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Reason for declining (e.g. Price too high, found other schedule)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer"
                >
                  Confirm Decline
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Decline Quote</span>
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Accept & Confirm Booking</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
