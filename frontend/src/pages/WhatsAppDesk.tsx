import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { ExternalLink, MapPin, RefreshCw, Send, Smartphone, X } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import socketService from '@/services/socket';
import whatsappService, {
  WhatsAppLinkState,
  WhatsAppRequest,
  WhatsAppRequestStatus,
  WhatsAppStatus,
} from '@/services/whatsapp.service';
import { WhatsAppGlyph } from '@/components/common/WhatsAppButton';

const TABS: { key: WhatsAppRequestStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'converted', label: 'Booked' },
  { key: 'closed', label: 'Closed' },
];

const KIND_LABEL = { booking: 'Booking', join: 'Technician', human: 'Wants a person' } as const;

const CATEGORY_LABEL: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  carpentry: 'Carpentry',
  masonry: 'Masonry',
  painting: 'Painting',
  hvac: 'AC & fridges',
  welding: 'Welding',
  other: 'Other',
};

const URGENCY: Record<string, { label: string; cls: string }> = {
  emergency: { label: 'Urgent', cls: 'bg-fault/10 text-fault-ink' },
  high: { label: 'Today', cls: 'bg-warn/10 text-warn-ink' },
  medium: { label: 'This week', cls: 'bg-surface-300 text-ink-muted' },
  low: { label: 'Flexible', cls: 'bg-surface-300 text-ink-muted' },
};

const LINK_STATE: Record<WhatsAppLinkState, { label: string; cls: string; dot: string }> = {
  open: { label: 'Linked', cls: 'bg-ok/10 text-ok-ink', dot: 'bg-ok' },
  connecting: { label: 'Waiting for scan', cls: 'bg-warn/10 text-warn-ink', dot: 'bg-warn' },
  close: { label: 'Unlinked', cls: 'bg-fault/10 text-fault-ink', dot: 'bg-fault' },
  no_instance: { label: 'Not set up', cls: 'bg-surface-300 text-ink-muted', dot: 'bg-ink-faint' },
  not_configured: { label: 'Off on server', cls: 'bg-surface-300 text-ink-muted', dot: 'bg-ink-faint' },
  unreachable: { label: 'Gateway down', cls: 'bg-fault/10 text-fault-ink', dot: 'bg-fault' },
  unknown: { label: 'Unknown', cls: 'bg-surface-300 text-ink-muted', dot: 'bg-ink-faint' },
};

const formatPhone = (p: string) => p.replace(/^254(\d{3})(\d{3})(\d{3})$/, '+254 $1 $2 $3');

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
};

const WhatsAppDesk: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';

  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [tab, setTab] = useState<WhatsAppRequestStatus>('open');
  const [items, setItems] = useState<WhatsAppRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const selected = useMemo(() => items.find((r) => r._id === selectedId) ?? null, [items, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, page] = await Promise.all([whatsappService.status(), whatsappService.requests({ status: tab })]);
      setStatus(s);
      setItems(page.data);
    } catch {
      toast.error('Could not load the WhatsApp desk');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  // Live: new requests, link state and fresh QR codes
  useEffect(() => {
    const onRequest = (r: { reference: string; kind: string }) => {
      toast(`New WhatsApp ${r.kind === 'booking' ? 'booking request' : 'message'} · ${r.reference}`);
      if (tab === 'open') load();
    };
    const onConnection = ({ state }: { state: WhatsAppLinkState }) => {
      setStatus((s) => (s ? { ...s, state } : s));
      if (state === 'open') setQr(null);
    };
    const onQr = ({ base64 }: { base64?: string }) => base64 && setQr(base64);
    socketService.on('whatsapp:request', onRequest);
    socketService.on('whatsapp:connection', onConnection);
    socketService.on('whatsapp:qr', onQr);
    return () => {
      socketService.off('whatsapp:request', onRequest);
      socketService.off('whatsapp:connection', onConnection);
      socketService.off('whatsapp:qr', onQr);
    };
  }, [tab, load]);

  const linkPhone = async () => {
    setLinking(true);
    try {
      const res = await whatsappService.connect();
      if (res.base64) setQr(res.base64);
      else toast('Already linked');
      setStatus((s) => (s ? { ...s, state: res.base64 ? 'connecting' : s.state } : s));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reach the WhatsApp gateway');
    } finally {
      setLinking(false);
    }
  };

  const update = async (id: string, changes: Parameters<typeof whatsappService.update>[1], okText: string) => {
    try {
      const updated = await whatsappService.update(id, changes);
      setItems((list) => (updated.status === tab ? list.map((r) => (r._id === id ? updated : r)) : list.filter((r) => r._id !== id)));
      if (updated.status !== tab) setSelectedId(null);
      toast.success(okText);
    } catch {
      toast.error('Update failed');
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await whatsappService.send(selected.phone, reply.trim(), selected._id);
      setItems((list) =>
        list.map((r) =>
          r._id === selected._id
            ? { ...r, status: 'in_progress', notes: [...r.notes, { text: `→ ${reply.trim()}`, at: new Date().toISOString() }] }
            : r
        )
      );
      setReply('');
      toast.success('Sent on WhatsApp');
    } catch {
      toast.error('Not sent — is the phone linked?');
    } finally {
      setSending(false);
    }
  };

  const link = LINK_STATE[status?.state ?? 'unknown'];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">Support desk</p>
          <h1 className="mt-2 flex items-center gap-3 text-title">
            <WhatsAppGlyph className="h-7 w-7 text-whatsapp" />
            WhatsApp
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={clsx('chip', link.cls)}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', link.dot)} />
            {link.label}
          </span>
          {status?.requests && (
            <span className="font-mono text-spec text-ink-muted">
              {status.requests.open} open · {status.requests.inProgress} in progress
            </span>
          )}
          <button onClick={load} className="btn btn-ghost btn-sm" aria-label="Refresh">
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          {isAdmin && status?.state !== 'open' && status?.configured && (
            <button onClick={linkPhone} disabled={linking} className="btn btn-primary btn-sm">
              <Smartphone className="h-4 w-4" />
              {linking ? 'Starting…' : 'Link phone'}
            </button>
          )}
        </div>
      </div>

      {status && !status.configured && (
        <div className="mt-6 rounded-md border border-line bg-surface-200 p-5 text-body-sm text-ink-muted">
          WhatsApp is switched off on the server. Set <code className="text-ink">WHATSAPP_ENABLED</code>,{' '}
          <code className="text-ink">EVOLUTION_API_KEY</code> and <code className="text-ink">WHATSAPP_WEBHOOK_SECRET</code>{' '}
          in the backend environment — see <span className="font-mono">docs/WHATSAPP.md</span>.
        </div>
      )}

      {qr && (
        <div className="mt-6 flex flex-col gap-6 rounded-md border border-line-strong bg-surface-200 p-6 sm:flex-row sm:items-center">
          <img src={qr} alt="WhatsApp link QR code" className="h-56 w-56 bg-white p-2" />
          <div className="max-w-md">
            <p className="eyebrow">Link the Dumuwaks phone</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-body-sm text-ink">
              <li>Open WhatsApp on the Dumuwaks phone.</li>
              <li>Settings → Linked devices → Link a device.</li>
              <li>Scan this code. It refreshes on its own; this page updates when linked.</li>
            </ol>
            <button onClick={() => setQr(null)} className="btn btn-ghost btn-sm mt-4">
              <X className="h-4 w-4" /> Hide
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" className="mt-6 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setSelectedId(null);
            }}
            className={clsx(
              'relative h-11 text-body-sm font-medium',
              tab === t.key
                ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lumen'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* List */}
        <div className="overflow-hidden rounded-md border border-line">
          {!loading && items.length === 0 && (
            <p className="bg-surface-200 p-8 text-center text-body-sm text-ink-muted">Nothing here.</p>
          )}
          <ul>
            {items.map((r) => (
              <li key={r._id} className="border-b border-line last:border-b-0">
                <button
                  onClick={() => setSelectedId(r._id)}
                  className={clsx(
                    'grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3.5 text-left transition-colors',
                    selectedId === r._id ? 'bg-lumen/10' : 'bg-surface-100 hover:bg-surface-200'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-spec text-ink">{r.reference}</span>
                    <span className="chip bg-surface-300 text-ink-muted">{KIND_LABEL[r.kind]}</span>
                    {r.urgency && r.kind === 'booking' && (
                      <span className={clsx('chip', URGENCY[r.urgency].cls)}>{URGENCY[r.urgency].label}</span>
                    )}
                  </span>
                  <span className="font-mono text-caption text-ink-faint">{timeAgo(r.createdAt)}</span>
                  <span className="col-span-2 truncate text-body-sm text-ink-muted">
                    {r.name || 'Unknown'} · {formatPhone(r.phone)}
                    {r.serviceCategory ? ` · ${CATEGORY_LABEL[r.serviceCategory]}` : ''}
                    {r.location?.text ? ` · ${r.location.text}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Detail */}
        <div className="rounded-md border border-line bg-surface-200">
          {!selected ? (
            <p className="p-8 text-center text-body-sm text-ink-muted">Pick a request to see it and reply.</p>
          ) : (
            <div>
              <div className="border-b border-line p-5">
                <p className="font-mono text-spec text-lumen-ink">{selected.reference}</p>
                <h2 className="mt-1 text-heading">
                  {selected.name || 'Unknown'}{' '}
                  <span className="font-mono text-spec font-normal text-ink-muted">{formatPhone(selected.phone)}</span>
                </h2>
                {selected.user ? (
                  <p className="mt-1 text-body-sm text-ink-muted">
                    Registered {selected.user.role}:{' '}
                    <Link to={`/profile/${selected.user._id}`} className="text-lumen-ink hover:underline">
                      {selected.user.firstName} {selected.user.lastName}
                    </Link>
                  </p>
                ) : (
                  <p className="mt-1 text-body-sm text-ink-muted">No account on this number yet.</p>
                )}
              </div>

              <dl className="grid grid-cols-2 border-b border-line text-body-sm">
                <div className="border-r border-line p-4">
                  <dt className="eyebrow">Job</dt>
                  <dd className="mt-1 text-ink">
                    {selected.serviceCategory ? CATEGORY_LABEL[selected.serviceCategory] : KIND_LABEL[selected.kind]}
                  </dd>
                </div>
                <div className="p-4">
                  <dt className="eyebrow">When</dt>
                  <dd className="mt-1 text-ink">{selected.urgency ? URGENCY[selected.urgency].label : '—'}</dd>
                </div>
                <div className="col-span-2 border-t border-line p-4">
                  <dt className="eyebrow">Where</dt>
                  <dd className="mt-1 flex items-center gap-2 text-ink">
                    {selected.location?.text || (selected.location?.lat ? 'Location pin' : '—')}
                    {selected.location?.lat && (
                      <a
                        href={`https://maps.google.com/?q=${selected.location.lat},${selected.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-lumen-ink hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" /> Map
                      </a>
                    )}
                  </dd>
                </div>
                {selected.description && (
                  <div className="col-span-2 border-t border-line p-4">
                    <dt className="eyebrow">What they said{selected.hasPhoto ? ' · photo on the phone' : ''}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-ink">{selected.description}</dd>
                  </div>
                )}
              </dl>

              {selected.notes.length > 0 && (
                <ol className="max-h-56 space-y-2 overflow-y-auto border-b border-line p-4">
                  {selected.notes.map((n, i) => (
                    <li
                      key={i}
                      className={clsx(
                        'w-fit max-w-[85%] rounded-md px-3 py-2 text-body-sm',
                        n.text.startsWith('→') ? 'ml-auto bg-ok-900 text-ink' : 'bg-surface-300 text-ink'
                      )}
                    >
                      {n.text.replace(/^→ /, '')}
                    </li>
                  ))}
                </ol>
              )}

              <div className="p-4">
                <label htmlFor="wa-reply" className="eyebrow">
                  Reply on WhatsApp
                </label>
                <textarea
                  id="wa-reply"
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="e.g. Hi, Brian (verified electrician) can come today at 3pm. Quote KES 1,800. Shall I confirm?"
                  className="input mt-2 h-auto py-2.5"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="btn btn-primary btn-sm">
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                  {selected.status === 'open' && (
                    <button
                      onClick={() => update(selected._id, { status: 'in_progress', assignToMe: true }, 'Assigned to you')}
                      className="btn btn-outline btn-sm"
                    >
                      Take it
                    </button>
                  )}
                  {selected.status !== 'closed' && (
                    <button
                      onClick={() => update(selected._id, { status: 'closed' }, 'Closed')}
                      className="btn btn-ghost btn-sm"
                    >
                      Close
                    </button>
                  )}
                  <a
                    href={`https://wa.me/${selected.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm ml-auto"
                  >
                    Open chat <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {selected.kind === 'booking' && selected.status !== 'converted' && (
                  <p className="mt-4 text-caption text-ink-muted">
                    To turn this into a booking, create the customer and match a technician from the{' '}
                    <Link to="/support-dashboard" className="text-lumen-ink hover:underline">
                      support dashboard
                    </Link>
                    . Once the booking exists, its updates reach the customer on WhatsApp.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppDesk;
