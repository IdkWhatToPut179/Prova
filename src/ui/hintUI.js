export function showHint(hintEl, text) {
  hintEl.textContent = text;
  hintEl.style.display = "block";
}
export function hideHint(hintEl) {
  hintEl.textContent = "";
  hintEl.style.display = "none";
}
