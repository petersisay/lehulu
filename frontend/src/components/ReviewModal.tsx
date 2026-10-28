import React, { useState } from 'react';
import { X, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { reviewApi } from '../services/api';
import { Review } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ReviewModalProps {
  bookingId: string;
  providerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (review: Review) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  bookingId,
  providerName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please write a short comment about your experience.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await reviewApi.create(bookingId, rating, comment.trim());
      if (res.data.success) {
        const reviewData = res.data.data || (res.data as any).review;
        if (onSuccess && reviewData) onSuccess(reviewData);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: 'Poor Service',
    2: 'Fair / Below Expectation',
    3: 'Average / Acceptable',
    4: 'Very Good Quality',
    5: 'Excellent Professionalism',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {t('reviews.leaveReview')}
            </h3>
            <p className="text-xs text-slate-500">
              For completed job with {providerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        active
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {ratingLabels[hoverRating || rating]}
            </span>
          </div>

          {/* Comment Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Your Review / አስተያየት *
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe punctuality, quality of work, cleanliness, and fair pricing..."
              className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Reviews are authenticated and linked directly to this completed booking record.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-xs"
            >
              {loading ? 'Submitting...' : 'Post Genuine Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
