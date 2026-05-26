import { getToken, login } from '/admin/admin.js';

export function initLogin() {
  if (getToken()) return Promise.resolve();

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
      <div class="login-card">
        <img src="/assets/logo-blue.svg" alt="Ímpar" class="login-logo" />
        <div class="login-eyebrow">/ ADMIN · ACESSO</div>
        <h1 class="login-title">Entrar</h1>
        <form id="login-form" class="login-form">
          <label>
            SENHA
            <input type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password" />
          </label>
          <div class="login-error" id="login-error" hidden></div>
          <button type="submit" class="btn" id="login-btn">
            <span class="dot"></span>Entrar
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector('#login-form');
    const passInput = overlay.querySelector('#login-pass');
    const btn = overlay.querySelector('#login-btn');
    const errEl = overlay.querySelector('#login-error');

    passInput.focus();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      errEl.hidden = true;
      btn.disabled = true;
      btn.innerHTML = 'Entrando…';
      try {
        await login(passInput.value);
        overlay.remove();
        resolve();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
        btn.disabled = false;
        btn.innerHTML = '<span class="dot"></span>Entrar';
        passInput.select();
      }
    });
  });
}
