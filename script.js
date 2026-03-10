// Interactive behavior for navigation, scrolling, animations, and contact form.
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const navbar = document.querySelector('.navbar');
    const sections = document.querySelectorAll('section[id]');

    // Mobile navigation toggle
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for in-page anchors
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
            const navOffset = navbar ? navbar.offsetHeight : 0;
            const targetTop = target.getBoundingClientRect().top + window.scrollY - navOffset + 1;

            window.scrollTo({
                top: Math.max(targetTop, 0),
                behavior: 'smooth'
            });
        });
    });

    // Navbar background on scroll
    const updateNavbarStyle = () => {
        if (!navbar) {
            return;
        }

        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    };

    // Active navigation link highlighting
    const updateActiveNavLink = () => {
        if (!navLinks.length || !sections.length) {
            return;
        }

        let current = '';

        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const activationPoint = sectionTop - 200;

            if (window.scrollY >= activationPoint && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id') || current;
            }
        });

        // Keep the last section active at the bottom of the page.
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2) {
            const lastSection = sections[sections.length - 1];
            current = lastSection.getAttribute('id') || current;
        }

        navLinks.forEach((link) => {
            const isActive = link.getAttribute('href') === `#${current}`;
            link.classList.toggle('active', isActive);
        });
    };

    const onScroll = () => {
        updateNavbarStyle();
        updateActiveNavLink();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Reveal animations
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            });
        }, observerOptions);

        const animateElements = document.querySelectorAll(
            'section:not(#home):not(#contact) .container > *:not(.section-title), .timeline-item, .research-card, .project-card, .hobby-card, .blog-post-card'
        );

        animateElements.forEach((element) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });
    }

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function handleSubmit(event) {
            event.preventDefault();

            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');

            if (!name || !email || !subject || !message) {
                alert('Please fill in all fields.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(email))) {
                alert('Please enter a valid email address.');
                return;
            }

            const mailtoLink = `mailto:kamrul28890@gmail.com?subject=${encodeURIComponent(
                String(subject)
            )}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;

            window.location.href = mailtoLink;
            alert('Thank you for your message! Your email client should open with the message pre-filled.');
            this.reset();
        });
    }

    // Typing effect for hero tagline
    const heroTagline = document.querySelector('.hero-tagline');
    if (heroTagline) {
        const originalText = heroTagline.textContent || '';
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!prefersReducedMotion && originalText.trim()) {
            let index = 0;
            heroTagline.textContent = '';

            const typeNextCharacter = () => {
                if (index >= originalText.length) {
                    return;
                }

                heroTagline.textContent += originalText.charAt(index);
                index += 1;
                window.setTimeout(typeNextCharacter, 50);
            };

            window.setTimeout(typeNextCharacter, 1000);
        }
    }
});
