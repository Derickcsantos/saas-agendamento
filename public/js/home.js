 // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
        const body = document.body;

        // Check for saved theme preference
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme) {
            body.setAttribute('data-theme', currentTheme);
            updateThemeIcon();
        }

        themeToggle.addEventListener('click', toggleTheme);
        sidebarThemeToggle.addEventListener('click', toggleTheme);

        function toggleTheme() {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }
            updateThemeIcon();
            closeSidebar();
        }

        function updateThemeIcon() {
            const isDark = body.getAttribute('data-theme') === 'dark';
            const icons = document.querySelectorAll('.theme-toggle i');
            icons.forEach(icon => {
                icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
            });
        }

        // Mobile Menu
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const closeBtn = document.getElementById('closeBtn');
        const overlay = document.getElementById('overlay');

        menuToggle.addEventListener('click', openSidebar);
        closeBtn.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        function openSidebar() {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebar() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        // FAQ Accordion
        const faqQuestions = document.querySelectorAll('.faq-question');
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const isActive = answer.classList.contains('active');
                
                // Close all answers
                document.querySelectorAll('.faq-answer').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Toggle icons
                document.querySelectorAll('.faq-question i').forEach(icon => {
                    icon.className = 'fas fa-chevron-down';
                });
                
                // Open current if wasn't active
                if (!isActive) {
                    answer.classList.add('active');
                    question.querySelector('i').className = 'fas fa-chevron-up';
                }
            });
        });

        // Scroll Animation
        const sections = document.querySelectorAll('.section');

        function checkScroll() {
            sections.forEach(section => {
                const sectionTop = section.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;
                
                if (sectionTop < windowHeight - 100) {
                    section.classList.add('active');
                }
            });
        }

        // Initial check
        checkScroll();

        // Check on scroll
        window.addEventListener('scroll', checkScroll);

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 70,
                        behavior: 'smooth'
                    });
                    
                    closeSidebar();
                }
            });
        });


        // Contact form functionality
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const message = document.getElementById('message').value;
            
            // Validação simples
            if (!name || !email || !message) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            
            // Mostrar feedback de carregamento
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, phone, message })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
                    contactForm.reset();
                } else {
                    alert(data.error || 'Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente.');
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente mais tarde.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
});

