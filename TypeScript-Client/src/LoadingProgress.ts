let _pct = 0;
let _transitionOverlay: HTMLDivElement | null = null;

export function setLoadingProgress(percent: number, label: string) {
  _pct = Math.max(_pct, Math.min(100, percent));
  const bar  = document.getElementById('loading-bar');
  const text = document.getElementById('loading-text');
  if (bar)  bar.style.width  = `${_pct}%`;
  if (text) text.textContent = label;
}

export function resetLoadingProgress() {
  _pct = 0;
}

export function showTransitionOverlay() {
  if (_transitionOverlay) return;
  if (document.getElementById('loading-overlay')) return; // startup overlay still present

  const overlay = document.createElement('div');
  overlay.id = 'map-transition-overlay';
  overlay.innerHTML = `
    <div class="loading-inner">
      <div class="loading-bar-track"><div class="loading-bar-fill" id="loading-bar"></div></div>
      <div class="loading-text" id="loading-text">Changing map…</div>
    </div>`;
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '9999',
    background: '#07070f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: '0', transition: 'opacity 0.25s ease',
  });
  document.body.appendChild(overlay);
  _transitionOverlay = overlay;
  void overlay.offsetWidth; // flush reflow so transition fires
  overlay.style.opacity = '1';
}

export function hideTransitionOverlay(delayMs = 500) {
  const overlay = _transitionOverlay;
  if (!overlay) return;
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.opacity = '0';
    overlay.addEventListener('transitionend', () => {
      overlay.remove();
      if (_transitionOverlay === overlay) _transitionOverlay = null;
    }, { once: true });
  }, delayMs);
}
