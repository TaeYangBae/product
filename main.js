import * as THREE from 'three';

// --- Three.js Hero Background ---
class HeroScene {
    constructor() {
        this.container = document.getElementById('hero-canvas-container');
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.particles = null;
        this.mouse = new THREE.Vector2(0, 0);
        this.targetMouse = new THREE.Vector2(0, 0);

        this.init();
        this.animate();
        this.handleResize();
        this.handleMouseMove();
    }

    init() {
        // Create a grid of points to represent a "sensing field"
        const geometry = new THREE.BufferGeometry();
        const count = 3000;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Random points in a wide area
            positions[i * 3] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
            sizes[i] = Math.random() * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0x3b82f6, // Secondary color oklch(60% 0.2 250) roughly
            size: 0.05,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        this.camera.position.z = 10;
    }

    handleMouseMove() {
        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
            this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
        });
    }

    handleResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Smooth mouse movement
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        if (this.particles) {
            this.particles.rotation.y += 0.001;
            this.particles.rotation.x = this.mouse.y * 0.2;
            this.particles.rotation.y = this.mouse.x * 0.2;
            
            // Subtle pulse
            const time = Date.now() * 0.0005;
            this.particles.position.y = Math.sin(time) * 0.2;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// --- UI Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Hero Animation
    new HeroScene();

    // Scroll Reveal
    const revealElements = document.querySelectorAll('.reveal, .fade-in');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => revealObserver.observe(el));

    // Sticky Header
    const header = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Contact Form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;
            
            btn.innerText = '전송 중...';
            btn.disabled = true;

            // Simulate API call
            setTimeout(() => {
                alert('문의가 성공적으로 전송되었습니다. 곧 연락드리겠습니다.');
                contactForm.reset();
                btn.innerText = originalText;
                btn.disabled = false;
            }, 1500);
        });
    }

    // Mobile Navigation
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.querySelector('.main-nav');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            icon.classList.toggle('bi-list');
            icon.classList.toggle('bi-x');
        });
    }
});
