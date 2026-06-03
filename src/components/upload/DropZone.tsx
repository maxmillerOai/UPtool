import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FolderOpen, Zap } from 'lucide-react';
import { useStore, useHosts } from '@/store/useStore';
import { enabledHosts } from '@/lib/hostRegistry';
import { sfx } from '@/lib/sound';

export function DropZone() {
  const addFiles = useStore((s) => s.addFiles);
  const defaultHostId = useStore((s) => s.settings.defaultHostId);
  const updateSettings = useStore((s) => s.updateSettings);
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
  const hosts = enabledHosts(useHosts());

  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      addFiles(Array.from(files), defaultHostId);
    },
    [addFiles, defaultHostId],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onClick={() => {
          inputRef.current?.click();
          if (soundEnabled) sfx.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current++;
          setDrag(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          depth.current--;
          if (depth.current <= 0) setDrag(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <div className="scan-beam" />
        <div className="rings">
          <span className="erg e1" />
          <span className="erg e2" />
          <span className="erg e3" />
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="core-icon">
            <UploadCloud size={42} />
          </div>
          <div className="dz-title grad-text">
            {drag ? 'Release to Initiate Uplink' : 'Drop Payload Into Uplink Field'}
          </div>
          <p className="dz-sub">
            Drag &amp; drop any number of files, or engage manual selection. Files are routed
            through the selected host node with full telemetry and auto-retry.
          </p>

          <div className="dz-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn primary"
              onClick={() => inputRef.current?.click()}
            >
              <FolderOpen size={17} /> Select Files
            </button>
            <div className="host-select-row">
              <span className="label">
                <Zap size={11} style={{ verticalAlign: '-1px' }} /> Route
              </span>
              <select
                className="select"
                value={defaultHostId}
                onChange={(e) => updateSettings({ defaultHostId: e.target.value })}
                style={{ minWidth: 180 }}
              >
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} · {h.region}
                  </option>
                ))}
                {hosts.length === 0 && <option value="">No hosts enabled</option>}
              </select>
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </motion.div>
  );
}
