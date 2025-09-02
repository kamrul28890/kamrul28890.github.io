// Mobile Navigation Toggle
const hamburger = document.querySelector(\".hamburger\");
const navMenu = document.querySelector(\".nav-menu\");

hamburger.addEventListener(\'click\', () => {
    hamburger.classList.toggle(\'active\');
    navMenu.classList.toggle(\'active\');
});

// Close mobile menu when clicking on a link
document.querySelectorAll(\'a.nav-link\').forEach(n => n.addEventListener(\'click\', () => {
    hamburger.classList.remove(\'active\');
    navMenu.classList.remove(\'active\');
}));

// Smooth scrolling for navigation links
document.querySelectorAll(\'a[href^="#"]\').forEach(anchor => {
    anchor.addEventListener(\'click\', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute(\'href\'));
        if (target) {
            target.scrollIntoView({
                behavior: \'smooth\',
                block: \'start\'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener(\'scroll\', () => {
    const navbar = document.querySelector(\".navbar\");
    if (window.scrollY > 100) {
        navbar.style.background = \'rgba(255, 255, 255, 0.98)\';
        navbar.style.boxShadow = \'0 2px 20px rgba(0, 0, 0, 0.1)\';
    } else {
        navbar.style.background = \'rgba(255, 255, 255, 0.95)\';
        navbar.style.boxShadow = \'none\';
    }
});

// Active navigation link highlighting
window.addEventListener(\'scroll\', () => {
    const sections = document.querySelectorAll(\'section[id]\');
    const navLinks = document.querySelectorAll(\".nav-link\");
    
    let current = \'\';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= (sectionTop - 200)) {
            current = section.getAttribute(\'id\');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove(\'active\');
        if (link.getAttribute(\'href\') === `#${current}`) {
            link.classList.add(\'active\');
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: \'0px 0px -50px 0px\'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = \'1\';
            entry.target.style.transform = \'translateY(0)\';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener(\'DOMContentLoaded\', () => {
    const animateElements = document.querySelectorAll(\'section:not(#home):not(#contact) .container > *:not(.section-title), .timeline-item, .research-card, .project-card, .hobby-card, .blog-post-card\');
    
    animateElements.forEach(el => {
        el.style.opacity = \'0\';
        el.style.transform = \'translateY(30px)\';
        el.style.transition = \'opacity 0.6s ease, transform 0.6s ease\';
        observer.observe(el);
    });
});

// Contact form handling
document.getElementById(\'contactForm\').addEventListener(\'submit\', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(this);
    const name = formData.get(\'name\');
    const email = formData.get(\'email\');
    const subject = formData.get(\'subject\');
    const message = formData.get(\'message\');
    
    // Simple validation
    if (!name || !email || !subject || !message) {
        alert(\'Please fill in all fields.\');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert(\'Please enter a valid email address.\');
        return;
    }
    
    // Create mailto link (since this is a static site)
    const mailtoLink = \`mailto:kamrul28890@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(\`Name: ${name}\\nEmail: ${email}\\n\\nMessage:\\n${message}\`)}\`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    // Show success message
    alert(\'Thank you for your message! Your email client should open with the message pre-filled.\');
    
    // Reset form
    this.reset();
});

// Typing effect for hero subtitle (optional enhancement)
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = \'\';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect on page load
document.addEventListener(\'DOMContentLoaded\', () => {
    const heroTagline = document.querySelector(\".hero-tagline\");
    if (heroTagline) {
        const originalText = heroTagline.textContent;
        setTimeout(() => {
            typeWriter(heroTagline, originalText, 50);
        }, 1000);
    }
});

// Parallax effect for hero section
window.addEventListener(\'scroll\', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector(\".hero\");
    if (hero) {
        hero.style.transform = \`translateY(${scrolled * 0.5}px)\`;
    }
});

// Add CSS for active nav link
const style = document.createElement(\'style\');
style.textContent = \`
    .nav-link.active {
        color: #2563eb !important;
    }
    .nav-link.active::after {
        width: 100% !important;
    }
\`;
document.head.appendChild(style);


