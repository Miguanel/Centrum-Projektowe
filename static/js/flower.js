document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('circuitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        scrollVelocity = currentScroll - lastScrollY;
        lastScrollY = currentScroll;
    });
    resize();

    const MAX_DEPTH_BRANCH = 7;
    const MAX_DEPTH_ROOT = 8;
    let branchesToAnimate = [];
    let animationId = null;
    let activeCard = null;
    let currentObstacles = [];

    class OrganicLine {
        constructor(x, y, angle, thickness, type, depth) {
            this.points = [{x, y}];
            this.angle = angle;
            this.baseAngle = angle;
            this.thickness = thickness;
            this.type = type;
            this.depth = depth;
            this.grown = false;
            this.leafVisible = false;

            if (this.type === 'root') {
                this.targetSteps = Math.floor(10 + Math.random() * 8);
            } else if (this.type === 'branch') {
                this.targetSteps = Math.floor(5 + Math.random() * 3);
            } else if (this.type === 'vine') {
                this.targetSteps = Math.floor(8 + Math.random() * 6);
            } else { // twig
                this.targetSteps = Math.floor(3 + Math.random() * 2);
            }

            this.currentStep = 0;
            this.leafPhase = Math.random() * Math.PI * 2;
            this.dodgeDir = (Math.random() > 0.5 ? 1 : -1);
        }

        update() {
            if (this.currentStep < this.targetSteps) {
                const lastPoint = this.points[this.points.length - 1];

                let driftFactor = this.type === 'root' ? 0.7 : (this.type === 'vine' ? 1.0 : 0.4);
                this.angle += (Math.random() - 0.5) * driftFactor;

                if (this.type === 'root') {
                    this.angle += 0.08 * Math.cos(this.angle);
                } else if (this.type === 'vine') {
                    this.angle += 0.03 * Math.cos(this.angle);
                } else {
                    this.angle -= 0.02 * Math.cos(this.angle);
                }

                const speed = 2.0;
                let nextX = lastPoint.x + Math.cos(this.angle) * speed;
                let nextY = lastPoint.y + Math.sin(this.angle) * speed;

                const hitObstacle = currentObstacles.some(obs =>
                    nextX >= obs.left && nextX <= obs.right &&
                    nextY >= obs.top && nextY <= obs.bottom
                );

                if (hitObstacle) {
                    this.angle += this.dodgeDir * 0.9;
                    nextX = lastPoint.x + Math.cos(this.angle) * speed;
                    nextY = lastPoint.y + Math.sin(this.angle) * speed;
                }

                this.points.push({x: nextX, y: nextY});
                this.currentStep++;

            } else if (!this.grown) {
                this.grown = true;
                if (this.depth > 1) {
                    this.spawnChildren();
                } else if (this.type === 'twig') {
                    this.leafVisible = true;
                }
            }
        }

        draw() {
            if (this.points.length < 2) return;
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            ctx.beginPath();
            ctx.moveTo(this.points[0].x - scrollX, this.points[0].y - scrollY);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x - scrollX, this.points[i].y - scrollY);
            }

            if (this.type === 'branch' || this.type === 'twig' || this.type === 'vine') {
                const g = Math.floor(140 - (this.depth * 15));
                ctx.strokeStyle = `rgb(60, ${g}, 40)`;
            } else {
                ctx.strokeStyle = `rgb(80, 55, 45)`;
            }

            ctx.lineWidth = this.thickness;
            ctx.lineCap = 'round';
            ctx.stroke();

            if (this.leafVisible) {
                const last = this.points[this.points.length - 1];
                this.drawLeaf(last.x - scrollX, last.y - scrollY);
            }
        }

        drawLeaf(x, y) {
            const time = Date.now() / 1000;
            const pulse = (Math.sin(time + this.leafPhase) + 1) / 2;
            const tilt = scrollVelocity * 0.05;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(this.angle + tilt);

            ctx.beginPath();
            ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);

            ctx.fillStyle = `rgba(50, 255, 50, ${0.8 + pulse * 0.2})`;
            ctx.fill();

            ctx.shadowBlur = 4 + (pulse * 5);
            ctx.shadowColor = `rgba(0, 255, 0, 0.4)`;
            ctx.restore();
        }

        spawnChildren() {
            const last = this.points[this.points.length - 1];
            const isTransitionToTwig = (this.depth <= 2 && (this.type === 'branch' || this.type === 'vine'));
            const nextType = isTransitionToTwig ? 'twig' : this.type;

            const splitChance = this.type === 'root' ? 0.6 : (this.type === 'vine' ? 0.4 : 0.4);
            let numChildren = Math.random() < splitChance ? 2 : 1;

            for (let i = 0; i < numChildren; i++) {
                let spread = this.type === 'vine' ? 1.4 : (this.type === 'twig' ? 1.4 : 1.2);
                let newAngle = this.angle + (Math.random() - 0.5) * spread;

                let newThickness = this.thickness * 0.7;
                newThickness = Math.max(0.6, newThickness);

                branchesToAnimate.push(new OrganicLine(
                    last.x, last.y, newAngle, newThickness, nextType, this.depth - 1
                ));
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        scrollVelocity *= 0.92;
        branchesToAnimate.forEach(branch => {
            branch.update();
            branch.draw();
        });
        animationId = requestAnimationFrame(animate);
    }

    function startGrowth(e) {
        if (window.stopAllCircuits) window.stopAllCircuits();
        if (window.stopCityAnimation) window.stopCityAnimation();

        if (activeCard === e.currentTarget) return;
        activeCard = e.currentTarget;

        branchesToAnimate = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (animationId) cancelAnimationFrame(animationId);

        const rect = activeCard.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        currentObstacles = Array.from(document.querySelectorAll('.project-card, .lab-item'))
            .filter(el => el !== activeCard && !activeCard.contains(el) && !el.closest('#modal-container'))
            .map(el => {
                const r = el.getBoundingClientRect();
                return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY };
            });

        // GÓRA
        for(let i=1; i<=6; i++) {
            let fanOffset = (i - 3.5) * 0.25;
            let startAngle = -Math.PI / 2 + fanOffset + (Math.random() - 0.5) * 0.2;

            branchesToAnimate.push(new OrganicLine(
                rect.left + scrollX + (rect.width/7) * i, rect.top + scrollY, startAngle, 5.5, 'branch', MAX_DEPTH_BRANCH
            ));
        }

        // --- BOKI ASYMETRYCZNE I PRZESUNIĘTE DO ŚRODKA ---

        // Lewy bok: 4 grubsze pnącza, +4px w głąb karty
        for(let i=1; i<=4; i++) {
            branchesToAnimate.push(new OrganicLine(
                rect.left + scrollX + 4,
                rect.top + scrollY + (rect.height/5) * i,
                Math.PI - Math.random() * 0.5, 3.5, 'vine', MAX_DEPTH_BRANCH
            ));
        }

        // Prawy bok: 7 drobniejszych pnączy, -4px w głąb karty
        for(let i=1; i<=7; i++) {
            branchesToAnimate.push(new OrganicLine(
                rect.right + scrollX - 4,
                rect.top + scrollY + (rect.height/8) * i,
                -Math.random() * 0.5, 2.5, 'vine', MAX_DEPTH_BRANCH
            ));
        }

        // DÓŁ
        for(let i=1; i<=8; i++) {
            branchesToAnimate.push(new OrganicLine(
                rect.left + scrollX + (rect.width/9) * i, rect.bottom + scrollY, Math.PI/2, 3.5, 'root', MAX_DEPTH_ROOT
            ));
        }
        animate();
    }

    function stopGrowth() {
        activeCard = null;
        branchesToAnimate = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    }
    window.stopFlowerAnimation = stopGrowth;

    const finderInterval = setInterval(() => {
        const flowerCard = Array.from(document.querySelectorAll('.project-card')).find(card => card.innerText.includes('Kwiatownik'));
        if (flowerCard) {
            clearInterval(finderInterval);
            flowerCard.dataset.organic = "true";

            // Standardowa mysz
            flowerCard.addEventListener('mouseenter', startGrowth);
            flowerCard.addEventListener('mouseleave', stopGrowth);

            // --- NOWOŚĆ: Obsługa dotyku podczas przewijania ---
            flowerCard.addEventListener('touchstart', (e) => {
                startGrowth(e);
            }, { passive: true }); // passive: true pozwala na płynne przewijanie strony
        }
    }, 500);
});