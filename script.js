document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.nav');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = Array.from(document.querySelectorAll('.nav-menu a'));
    const sections = Array.from(document.querySelectorAll('main section[id], header[id]'));

    const closeMenu = () => {
        if (!navToggle || !navMenu) {
            return;
        }

        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('open');
    };

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
            navMenu.classList.toggle('open', !expanded);
        });

        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            if (!nav.contains(target)) {
                closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 820) {
                closeMenu();
            }
        });
    }

    const getOffset = () => {
        return nav ? nav.offsetHeight + 20 : 86;
    };

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') {
                event.preventDefault();
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - getOffset();
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
    });

    const setActiveNav = () => {
        if (!sections.length || !navLinks.length) {
            return;
        }

        const triggerY = window.scrollY + getOffset() + 10;
        let activeId = sections[0].id;

        sections.forEach((section) => {
            const top = section.offsetTop;
            const bottom = top + section.offsetHeight;
            if (triggerY >= top && triggerY < bottom) {
                activeId = section.id;
            }
        });

        navLinks.forEach((link) => {
            const isActive = link.getAttribute('href') === `#${activeId}`;
            link.classList.toggle('active', isActive);
        });
    };

    window.addEventListener('scroll', setActiveNav, { passive: true });
    setActiveNav();

    const revealTargets = document.querySelectorAll('.section-heading, .panel, .hero-copy > *, .hero-media > *');
    revealTargets.forEach((element) => {
        element.classList.add('reveal');
    });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '0px 0px -12% 0px',
                threshold: 0.1
            }
        );

        revealTargets.forEach((element) => observer.observe(element));
    } else {
        revealTargets.forEach((element) => element.classList.add('is-visible'));
    }
});
