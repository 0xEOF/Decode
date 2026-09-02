import { useState } from 'react';

type CopyState = 'idle' | 'copied' | 'error';

interface Props {
  text: string;
  idleLabel: string;
}

export default function CopyButton({ text, idleLabel }: Props) {
  const [state, setState] = useState<CopyState>('idle');

  async function handleCopy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('error');
    } finally {
      window.setTimeout(() => setState('idle'), 2200);
    }
  }

  return (
    <div>
      <button type="button" className={`btn btn-copy${state === 'error' ? ' is-error' : ''}`} onClick={handleCopy}>
        {state === 'copied' ? '✓ Copied' : state === 'error' ? 'Copy failed' : idleLabel}
      </button>
      {state === 'error' && <p className="copy-error">Unable to copy automatically. Please select and copy manually.</p>}
    </div>
  );
}
