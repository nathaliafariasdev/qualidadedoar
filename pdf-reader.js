(() => {
  const dialog = document.getElementById('pdf-reader');
  const openButton = document.querySelector('[data-pdf-open]');
  const closeButton = document.querySelector('[data-pdf-close]');

  if (!(dialog instanceof HTMLDialogElement) ||
      !(openButton instanceof HTMLButtonElement) ||
      !(closeButton instanceof HTMLButtonElement)) {
    throw new Error('The PDF reader is missing its required dialog or controls.');
  }

  openButton.addEventListener('click', () => dialog.showModal());
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
})();
