import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MapPin, Image as ImageIcon } from 'lucide-react';
import { timeAgo, compressImage } from '@/lib/format';
import { toast } from 'sonner';

export default function Messages() {
  const { user } = useAuth();
  const [convs, setConvs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [attach, setAttach] = useState(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // Keep the currently-selected conversation id in a ref so the poller can
  // read it WITHOUT causing the effect to re-subscribe on every click.
  const currentIdRef = useRef(null);
  useEffect(() => { currentIdRef.current = current?.conversation_id || null; }, [current]);

  const loadConvs = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations');
      const items = data?.items || [];
      setConvs(items);
      // Auto-select the first conversation only if nothing selected yet.
      setCurrent((prev) => prev || items[0] || null);
    } catch (e) {
      console.error('[messages] loadConvs failed:', e?.response?.data || e?.message);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const loadMsgs = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const { data } = await api.get(`/conversations/${convId}/messages`);
      setMessages(data?.messages || []);
    } catch (e) {
      console.error('[messages] loadMsgs failed:', e?.response?.data || e?.message);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Poll the conversation list every 15s. This effect runs ONCE.
  useEffect(() => {
    loadConvs();
    const t = setInterval(loadConvs, 15000);
    return () => clearInterval(t);
  }, [loadConvs]);

  // Poll active-conversation messages every 5s while it is open. This is a
  // separate effect keyed on the conversation id so switching conversations
  // cleanly tears down the old poller and starts a new one.
  useEffect(() => {
    const cid = current?.conversation_id;
    if (!cid) return undefined;
    setLoadingMsgs(true);
    loadMsgs(cid);
    const t = setInterval(() => {
      if (currentIdRef.current === cid) loadMsgs(cid);
    }, 5000);
    return () => clearInterval(t);
  }, [current?.conversation_id, loadMsgs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (sending) return;
    if (!msg.trim() && !attach) return;
    setSending(true);
    try {
      await api.post('/messages', {
        conversation_id: current?.conversation_id,
        to_user_id: current?.other?.user_id,
        case_id: current?.case_id,
        text: msg || '(attachment)',
        attachment: attach,
      });
      setMsg('');
      setAttach(null);
      await Promise.all([loadMsgs(current?.conversation_id), loadConvs()]);
    } catch (e) {
      console.error('[messages] send failed:', e?.response?.data || e?.message);
      toast.error('Failed to send message', { description: e?.response?.data?.detail || e?.message });
    } finally {
      setSending(false);
    }
  };

  const shareLoc = () => {
    navigator.geolocation?.getCurrentPosition(async (p) => {
      try {
        await api.post('/messages', {
          conversation_id: current?.conversation_id,
          to_user_id: current?.other?.user_id,
          case_id: current?.case_id,
          text: 'Shared my location',
          shared_location: { lat: p.coords.latitude, lng: p.coords.longitude },
        });
        loadMsgs(current?.conversation_id);
      } catch (e) {
        console.error('[messages] shareLoc failed:', e?.message);
        toast.error('Could not share location');
      }
    });
  };

  const attachImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await compressImage(f, 900, 0.75);
      setAttach(url);
    } catch (err) {
      console.error('[messages] compress failed:', err?.message);
      toast.error('Could not attach image');
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-64px)]">
      <div className="grid md:grid-cols-3 gap-4 h-full">
        <Card className="md:col-span-1 overflow-hidden flex flex-col" data-testid="messages-conversation-list">
          <div className="p-3 border-b font-medium">Conversations</div>
          <ScrollArea className="flex-1">
            {loadingConvs && convs.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Loading conversations…</div>
            )}
            {!loadingConvs && convs.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No conversations yet. Open a case and send a private message.
              </div>
            )}
            {convs.map((c) => (
              <button
                key={c.conversation_id}
                onClick={() => setCurrent(c)}
                className={`w-full text-left px-3 py-3 border-b hover:bg-muted ${current?.conversation_id === c.conversation_id ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.other?.picture} />
                    <AvatarFallback>{(c.other?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.other?.name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.last?.text || 'Start a conversation'}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(c.updated_at)}</div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </Card>
        <Card className="md:col-span-2 flex flex-col overflow-hidden" data-testid="messages-chat-pane">
          {!current ? (
            <div className="m-auto text-center text-muted-foreground p-8">
              Select a conversation to start chatting.
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={current.other?.picture} />
                  <AvatarFallback>{(current.other?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{current.other?.name}</div>
                  {current.case_id && (
                    <div className="text-xs text-muted-foreground">Case <span className="case-id">{current.case_id}</span></div>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1 p-4 space-y-3">
                {loadingMsgs && messages.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">Loading messages…</div>
                )}
                {messages.map((m) => {
                  const mine = m.from_user_id === user?.user_id;
                  return (
                    <div key={m.message_id} className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {m.attachment && <img src={m.attachment} alt="" className="rounded-lg mb-1 max-h-56" />}
                        {m.shared_location && (
                          <div className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Location: {m.shared_location.lat.toFixed(4)}, {m.shared_location.lng.toFixed(4)}
                          </div>
                        )}
                        {m.text && <div className="text-sm whitespace-pre-wrap">{m.text}</div>}
                        <div className="text-[10px] opacity-70 mt-1">{timeAgo(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </ScrollArea>
              <div className="p-3 border-t flex items-end gap-2">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={attachImage} data-testid="messages-attach-image-button" />
                  <Button asChild variant="outline" size="icon"><span><ImageIcon className="h-4 w-4" /></span></Button>
                </label>
                <Button variant="outline" size="icon" onClick={shareLoc} data-testid="messages-share-location-button">
                  <MapPin className="h-4 w-4" />
                </Button>
                <Textarea
                  rows={1}
                  className="resize-none min-h-[40px]"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Type a message…"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  data-testid="messages-input"
                />
                <Button onClick={send} disabled={sending} data-testid="messages-send-button"><Send className="h-4 w-4" /></Button>
              </div>
              {attach && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <img src={attach} alt="" className="h-14 w-14 object-cover rounded" />
                  <Button variant="ghost" size="sm" onClick={() => setAttach(null)}>Remove</Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
