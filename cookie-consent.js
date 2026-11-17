(() => {
  const STORAGE_KEY = 'aerognss-cookie-consent-v1';
  const CONSENT_VERSION = 1;
  const pageLinks = `
    <a href="cookies.html">Política de cookies</a>
    <a href="privacidade.html">Aviso de privacidade</a>
    <a href="termos.html">Termos de uso</a>
  `;

  const banner = document.createElement('section');
  banner.className = 'cookie-consent';
  banner.setAttribute('aria-labelledby', 'cookie-consent-title');
  banner.hidden = true;
  banner.innerHTML = `
    <div class="cookie-consent-copy">
      <h2 id="cookie-consent-title">Sua privacidade importa</h2>
      <p>Usamos armazenamento local para lembrar sua escolha. Recursos opcionais de análise ou publicidade não estão ativos. Você pode aceitar, recusar ou personalizar as opções.</p>
      <nav class="cookie-consent-links" aria-label="Informações legais">${pageLinks}</nav>
      <p class="cookie-storage-error" role="status" aria-live="polite"></p>
    </div>
    <div class="cookie-consent-actions">
      <button type="button" data-cookie-customize>Personalizar</button>
      <button type="button" data-cookie-reject>Recusar</button>
      <button type="button" class="cookie-accept" data-cookie-accept>Aceitar todos</button>
    </div>
  `;

  const preferences = document.createElement('div');
  preferences.className = 'cookie-preferences';
  preferences.hidden = true;
  preferences.innerHTML = `
    <section class="cookie-preferences-panel" role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title" tabindex="-1">
      <h2 id="cookie-preferences-title">Preferências de cookies</h2>
      <p class="cookie-preferences-intro">Escolha quais categorias opcionais autoriza. A escolha fica salva neste navegador e pode ser alterada depois por este painel.</p>
      <label class="cookie-option">
        <span><strong>Necessários</strong><small>Armazenam sua decisão de consentimento e são indispensáveis para lembrar suas preferências. Sempre ativos.</small></span>
        <input type="checkbox" checked disabled aria-label="Cookies necessários sempre ativos">
      </label>
      <label class="cookie-option">
        <span><strong>Preferências</strong><small>Permitem guardar escolhas de personalização. No momento, o site não usa armazenamento opcional para essa finalidade.</small></span>
        <input type="checkbox" id="cookie-preference-choice">
      </label>
      <label class="cookie-option">
        <span><strong>Medição de uso</strong><small>Autoriza métricas de audiência, caso sejam adicionadas no futuro. Nenhuma ferramenta de análise está ativa atualmente.</small></span>
        <input type="checkbox" id="cookie-analytics-choice">
      </label>
      <p class="cookie-storage-error" role="status" aria-live="polite"></p>
      <div class="cookie-preferences-actions">
        <button type="button" data-cookie-cancel>Cancelar</button>
        <button type="button" data-cookie-reject>Recusar opcionais</button>
        <button type="button" class="cookie-save" data-cookie-save>Salvar escolhas</button>
      </div>
    </section>
  `;

  document.body.append(banner, preferences);

  const panel = preferences.querySelector('.cookie-preferences-panel');
  const preferenceChoice = preferences.querySelector('#cookie-preference-choice');
  const analyticsChoice = preferences.querySelector('#cookie-analytics-choice');
  let previousFocus = null;

  const readConsent = () => {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('Não foi possível ler as preferências de cookies:', error);
      return null;
    }

    if (!raw) return null;

    try {
      const saved = JSON.parse(raw);
      if (
        saved.version === CONSENT_VERSION &&
        typeof saved.preferences === 'boolean' &&
        typeof saved.analytics === 'boolean'
      ) {
        return saved;
      }
    } catch (error) {
      console.warn('As preferências de cookies salvas são inválidas:', error);
    }
    return null;
  };

  const currentConsent = readConsent();

  const setError = message => {
    banner.querySelector('.cookie-storage-error').textContent = message;
    preferences.querySelector('.cookie-storage-error').textContent = message;
  };

  const closePreferences = () => {
    preferences.hidden = true;
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  };

  const openPreferences = () => {
    const saved = readConsent();
    preferenceChoice.checked = Boolean(saved && saved.preferences);
    analyticsChoice.checked = Boolean(saved && saved.analytics);
    previousFocus = document.activeElement;
    preferences.hidden = false;
    setError('');
    panel.focus();
  };

  const saveConsent = (preferencesAllowed, analyticsAllowed) => {
    const consent = {
      version: CONSENT_VERSION,
      savedAt: new Date().toISOString(),
      necessary: true,
      preferences: preferencesAllowed,
      analytics: analyticsAllowed
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (error) {
      console.error('Não foi possível salvar as preferências de cookies:', error);
      setError('Não foi possível guardar sua escolha neste navegador. Verifique as configurações de armazenamento e tente novamente.');
      return;
    }

    banner.hidden = true;
    preferences.hidden = true;
    setError('');
  };

  banner.querySelector('[data-cookie-customize]').addEventListener('click', openPreferences);
  banner.querySelector('[data-cookie-accept]').addEventListener('click', () => saveConsent(true, true));
  banner.querySelector('[data-cookie-reject]').addEventListener('click', () => saveConsent(false, false));
  preferences.querySelector('[data-cookie-save]').addEventListener('click', () => {
    saveConsent(preferenceChoice.checked, analyticsChoice.checked);
  });
  preferences.querySelector('[data-cookie-reject]').addEventListener('click', () => saveConsent(false, false));
  preferences.querySelector('[data-cookie-cancel]').addEventListener('click', closePreferences);
  preferences.addEventListener('click', event => {
    if (event.target === preferences) closePreferences();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !preferences.hidden) closePreferences();
  });

  document.querySelectorAll('[data-cookie-settings]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();
      openPreferences();
    });
  });

  banner.hidden = Boolean(currentConsent);
})();
