let _pct = 0;

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
