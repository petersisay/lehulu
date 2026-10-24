import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { Message, User } from '../types';
import { messageApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface BookingChatProps {
  bookingId: string;
  otherPartyName: string;
  otherPartyAvatar?: string;
}

export const BookingChat: React.FC<BookingChatProps> = ({
  bookingId,
  otherPartyName,
  otherPartyAvatar,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { joinBooking, leaveBooking, onNewMessage } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    joinBooking(bookingId);

    const fetchMessages = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const res = await messageApi.getByBooking(bookingId);
        const resData = res.data as any;
        if (resData && resData.success) {
          const list = resData.data || resData.messages || [];
          if (Array.isArray(list)) {
            setMessages((prev) => {
              const safePrev = Array.isArray(prev) ? prev : [];
              if (list.length !== safePrev.length || list.some((m, idx) => m._id !== safePrev[idx]?._id)) {
                setTimeout(scrollToBottom, 50);
                return list;
              }
              return safePrev;
            });
          }
        }
      } catch (err: any) {
        if (!silent) {
          setError(err.response?.data?.message || 'Could not load messages.');
        }
      } finally {
        if (!silent) setLoading(false);
        scrollToBottom();
      }
    };

    fetchMessages();

    // Polling fallback to guarantee instant chat updates across tabs
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchMessages(true);
      }
    }, 5000);

    // Listen to real-time incoming messages via WebSockets
    const unsubscribe = onNewMessage?.((msg: any) => {
      const msgBookingId = typeof msg?.bookingId === 'object' ? msg.bookingId?._id : msg?.bookingId;
      if (msg && String(msgBookingId) === String(bookingId)) {
        setMessages((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          if (safePrev.some((m) => m._id === msg._id)) return safePrev;
          return [...safePrev, msg];
        });
        setTimeout(scrollToBottom, 50);
      }
    });

    return () => {
      clearInterval(interval);
      leaveBooking(bookingId);
      if (unsubscribe) unsubscribe();
    };
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await messageApi.send(bookingId, content.trim());
      if (res.data.success) {
        const newMsg = res.data.data;
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setContent('');
        setTimeout(scrollToBottom, 50);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {otherPartyAvatar ? (
            <img
              src={otherPartyAvatar}
              alt={otherPartyName || 'Specialist'}
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              {(otherPartyName?.charAt(0) || 'P').toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-900">{otherPartyName || 'Specialist'}</h4>
            <span className="text-[10px] text-emerald-600 font-medium">Direct Booking Channel</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted</span>
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
            <span>Loading conversation...</span>
          </div>
        ) : !Array.isArray(messages) || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-4">
            <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No messages exchanged yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Discuss service requirements, confirm arrival details, or ask questions securely.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (!msg) return null;
            const sender = typeof msg.senderId === 'object' ? msg.senderId : null;
            const isMe = sender ? sender._id === user?._id : (msg as any).senderId === user?._id;

            return (
              <div
                key={msg._id || Math.random().toString()}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs ${
                    isMe
                      ? 'bg-emerald-700 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="p-2 bg-red-50 text-red-700 text-[11px] border-t border-red-200 flex items-center gap-1.5 px-4">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Message Input Footer */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message to discuss your service..."
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
