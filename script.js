/* ═══ THEME TOGGLE ═══ */
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;
const setTheme = (theme) => {
  html.setAttribute('data-theme', theme);
  if (themeToggle) themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
};

const saved = localStorage.getItem('theme');
if (saved) setTheme(saved);
else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
else setTheme('light');

themeToggle && themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(next);
  localStorage.setItem('theme', next);
});

/* ═══ MOBILE NAV ═══ */
const burger = document.getElementById('nav-burger');
const navLinks = document.getElementById('nav-links');
const closeNav = () => {
  if (!burger || !navLinks) return;
  burger.setAttribute('aria-expanded', 'false');
  navLinks.classList.remove('open');
};

burger && burger.addEventListener('click', () => {
  if (!navLinks) return;
  const expanded = burger.getAttribute('aria-expanded') === 'true';
  burger.setAttribute('aria-expanded', String(!expanded));
  navLinks.classList.toggle('open', !expanded);
});

// Close on link click
navLinks && navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', closeNav);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNav();
});

document.addEventListener('click', (e) => {
  if (!burger || !navLinks) return;
  if (!navLinks.classList.contains('open')) return;
  if (navLinks.contains(e.target) || burger.contains(e.target)) return;
  closeNav();
});

/* ═══ NAV SCROLL SHADOW ═══ */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav && nav.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

/* ═══ ACTIVE NAV LINK ═══ */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
navLinks && navLinks.querySelectorAll('a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
    a.setAttribute('aria-current', 'page');
  } else {
    a.classList.remove('active');
    a.removeAttribute('aria-current');
  }
});

/* ═══ SCROLL REVEAL ═══ */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
}

/* ═══ CONTACT FORM ═══ */
function handleContactForm(e) {
  e.preventDefault();
  const status = document.getElementById('form-status');
  const name = document.getElementById('cf-name');
  const email = document.getElementById('cf-email');
  const msg = document.getElementById('cf-msg');
  const subject = document.getElementById('cf-subject');
  if (!name || !email || !msg) return;

  const mailto = `mailto:kamrul28890@gmail.com?subject=${encodeURIComponent((subject?.value || 'Website Inquiry') + ' - from ' + name.value)}&body=${encodeURIComponent(msg.value + '\n\nFrom: ' + name.value + '\nEmail: ' + email.value)}`;
  window.location.href = mailto;

  if (status) {
    status.textContent = '✓ Opening your email client...';
    status.style.color = 'var(--brand)';
    setTimeout(() => { if (status) status.textContent = ''; }, 4000);
  }
}
document.getElementById('contact-form')?.addEventListener('submit', handleContactForm);

/* ═══ SMOOTH ANCHOR SCROLL ═══ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  });
});
