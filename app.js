try {
  await import('/runtime.js?v=20260904b');
} catch (error) {
  console.error('Al.Kim.ia runtime failed to load.', error);
  const fallback = document.querySelector('#fallback');
  const enter = document.querySelector('#enter');
  if (enter) enter.disabled = true;
  if (fallback) {
    fallback.textContent = 'No hemos podido abrir esta memoria. Recarga la página para intentarlo de nuevo.';
    fallback.classList.remove('hidden');
  }
}
