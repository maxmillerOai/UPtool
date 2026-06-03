import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, KeyRound, Save, ShieldAlert } from 'lucide-react';
import type { HostConfig } from '@/types';
import { Card } from '@/components/ui/Card';

interface CredentialsModalProps {
  host: HostConfig;
  initial: Record<string, string>;
  onSave: (creds: Record<string, string>) => void;
  onClose: () => void;
}

/** Common credential fields for the known premium hosts. */
const DEFAULT_FIELDS = ['token', 'username', 'password', 'twoFactorCode', 'folderId'];

const SECRET_FIELDS = /token|password|secret|key|code/i;

const FIELD_LABELS: Record<string, string> = {
  token: 'API Token',
  username: 'Username / Email',
  password: 'Password',
  twoFactorCode: '2FA Code (optional)',
  folderId: 'Folder ID (optional)',
  apiKey: 'API Key',
  accessToken: 'Access Token',
};

export function CredentialsModal({ host, initial, onSave, onClose }: CredentialsModalProps) {
  const fields = host.credentialFields?.length ? host.credentialFields : DEFAULT_FIELDS;
  const [creds, setCreds] = useState<Record<string, string>>(() => ({ ...initial }));

  return (
    <div className="overlay" onMouseDown={onClose}>
      <motion.div
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ width: 'min(520px, 100%)' }}
      >
        <Card className="modal" ring>
          <div className="modal-head">
            <h2 className="grad-text" style={{ fontSize: 20 }}>
              <KeyRound size={18} style={{ verticalAlign: '-3px', marginRight: 8 }} />
              {host.name} · Credentials
            </h2>
            <button className="iconbtn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div
            className="row"
            style={{
              gap: 10,
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius)',
              border: '1px solid hsl(var(--warn) / 0.3)',
              background: 'hsl(var(--warn) / 0.08)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <ShieldAlert size={18} style={{ color: 'hsl(var(--warn))', flex: 'none' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
              Credentials are stored locally in this browser and sent to your own backend
              bridge with each upload. For shared/production use, set them as server
              environment variables instead (see <code className="mono">.env.example</code>).
            </span>
          </div>

          <div className="stack" style={{ gap: 'var(--space-3)' }}>
            {fields.map((field) => (
              <div className="field" key={field}>
                <span className="label">{FIELD_LABELS[field] ?? field}</span>
                <input
                  className="input mono"
                  type={SECRET_FIELDS.test(field) ? 'password' : 'text'}
                  autoComplete="off"
                  value={creds[field] ?? ''}
                  onChange={(e) => setCreds((c) => ({ ...c, [field]: e.target.value }))}
                  placeholder={FIELD_LABELS[field] ?? field}
                />
              </div>
            ))}
          </div>

          <hr className="hr" />
          <div className="row between">
            <button
              className="btn ghost danger"
              onClick={() => {
                setCreds({});
                onSave({});
              }}
            >
              Clear
            </button>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  const clean: Record<string, string> = {};
                  for (const [k, v] of Object.entries(creds)) if (v.trim()) clean[k] = v.trim();
                  onSave(clean);
                }}
              >
                <Save size={16} /> Save Credentials
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
