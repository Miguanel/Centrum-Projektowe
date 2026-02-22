document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('circuitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let buildingsToAnimate = [];
    let animationId = null;
    let activeCard = null;
    let currentObstacles = []; // Przechowuje inne karty jako przeszkody

    class Building2D {
        constructor(x, y, side, angle) {
            this.x = x;
            this.y = y;
            this.side = side;
            this.angle = angle;

            // --- ZMIANA 1: Zróżnicowana skala dla boków i góry/dołu ---
            if (this.side === 'left' || this.side === 'right') {
                this.targetWidth = 10 + Math.random() * 12;  // Cieńsze na bokach (10-22px)
                this.targetHeight = 15 + Math.random() * 20; // Znacznie niższe (15-35px)
                this.hasDoor = false; // Usuwamy drzwi z bocznych, bo są za małe
            } else {
                this.targetWidth = 15 + Math.random() * 25;  // Szersze na górze/dole (15-40px)
                this.targetHeight = 30 + Math.random() * 50; // Wyższe (30-80px)
                this.hasDoor = Math.random() > 0.2;
            }

            this.currentHeight = 0;
            this.growthSpeed = 1.0 + Math.random() * 1.5;
            this.isFinished = false;

            const roofTypes = ['flat', 'triangle', 'stepped', 'antenna', 'slant'];
            this.roofType = roofTypes[Math.floor(Math.random() * roofTypes.length)];

            this.winCols = Math.max(1, Math.floor(this.targetWidth / 8));
            this.winRows = Math.floor(this.targetHeight / 10);

            const hue = 190 + Math.random() * 20;
            this.color = `hsla(${hue}, 100%, 65%, 0.9)`;
            this.glow = `hsla(${hue}, 100%, 50%, 0.5)`;
        }

        update() {
            if (this.currentHeight < this.targetHeight) {
                let nextH = this.currentHeight + this.growthSpeed;

                // --- ZMIANA 2: RADAR KOLIZYJNY ---
                // Obliczamy fizyczną pozycję czubka budynku na ekranie
                let tipX = this.x;
                let tipY = this.y;

                if (this.side === 'top') tipY -= nextH;
                else if (this.side === 'bottom') tipY += nextH;
                else if (this.side === 'left') tipX -= nextH;
                else if (this.side === 'right') tipX += nextH;

                // Sprawdzamy, czy czubek nie uderzył w inną kartę (z marginesem 5px)
                const hit = currentObstacles.some(obs =>
                    tipX >= obs.left - 5 && tipX <= obs.right + 5 &&
                    tipY >= obs.top - 5 && tipY <= obs.bottom + 5
                );

                if (hit) {
                    // Jeśli dotknął innej karty, zatrzymujemy wzrost na obecnym poziomie!
                    this.targetHeight = this.currentHeight;
                    this.isFinished = true;
                } else {
                    // Jeśli droga wolna, rośnie dalej
                    this.currentHeight = nextH;
                    if (this.currentHeight >= this.targetHeight) {
                        this.currentHeight = this.targetHeight;
                        this.isFinished = true;
                    }
                }
            }
        }

        draw() {
            if (this.currentHeight < 1) return; // Nie rysujemy zerowych budynków
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            ctx.save();
            ctx.translate(this.x - scrollX, this.y - scrollY);
            ctx.rotate(this.angle);

            ctx.strokeStyle = this.color;
            ctx.fillStyle = `rgba(5, 15, 20, 0.95)`;
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 5;
            ctx.shadowColor = this.glow;

            let w = this.targetWidth;
            let h = this.currentHeight;

            // Główna bryła
            ctx.beginPath();
            ctx.rect(-w/2, -h, w, h);
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 2;
            ctx.lineWidth = 0.8;

            // Drzwi
            if (this.hasDoor && h > 10) {
                let doorW = w * 0.4;
                if (doorW > 12) doorW = 12;
                let doorH = 10;

                ctx.beginPath();
                ctx.rect(-doorW/2, -doorH, doorW, doorH);
                if (doorW >= 8) {
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, -doorH);
                }
                ctx.stroke();
            }

            // Okna (maskowane do wysokości)
            ctx.save();
            ctx.beginPath();
            ctx.rect(-w/2, -h, w, h);
            ctx.clip();

            if (this.winCols > 0 && this.winRows > 0) {
                let winW = (w / this.winCols) * 0.4;
                let winH = (this.targetHeight / this.winRows) * 0.4;

                ctx.beginPath();
                for (let r = 0; r < this.winRows; r++) {
                    if (this.hasDoor && r === 0) continue;

                    let wy = -12 - (r * (this.targetHeight / this.winRows));

                    for (let c = 0; c < this.winCols; c++) {
                        let wx = -w/2 + (w / this.winCols) * c + (w / this.winCols - winW)/2;
                        if (wy < -h) continue;
                        ctx.rect(wx, wy, winW, winH);
                    }
                }
                ctx.stroke();
            }
            ctx.restore();

            // Dach
            ctx.shadowBlur = 4;
            ctx.lineWidth = 1.2;
            ctx.fillStyle = `rgba(10, 25, 35, 0.95)`;

            ctx.beginPath();
            if (this.roofType === 'flat') {
                ctx.rect(-w/2 - 2, -h - 2, w + 4, 2);
            }
            else if (this.roofType === 'triangle') {
                ctx.moveTo(-w/2 - 2, -h);
                ctx.lineTo(0, -h - w/2);
                ctx.lineTo(w/2 + 2, -h);
                ctx.closePath();
            }
            else if (this.roofType === 'stepped') {
                ctx.rect(-w/2.5, -h - 4, w*0.8, 4);
                ctx.rect(-w/4, -h - 8, w*0.5, 4);
                ctx.rect(-w/8, -h - 12, w*0.25, 4);
            }
            else if (this.roofType === 'antenna') {
                ctx.moveTo(-w/2, -h);
                ctx.lineTo(w/2, -h);
                ctx.moveTo(0, -h);
                ctx.lineTo(0, -h - 15);
                ctx.arc(0, -h - 15, 1.5, 0, Math.PI * 2);
            }
            else if (this.roofType === 'slant') {
                ctx.moveTo(-w/2, -h);
                ctx.lineTo(w/2, -h - w/2.5);
                ctx.lineTo(w/2, -h);
                ctx.closePath();
            }
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allFinished = true;
        buildingsToAnimate.forEach(building => {
            building.update();
            building.draw();
            if (!building.isFinished) allFinished = false;
        });

        if (!allFinished && buildingsToAnimate.length > 0) {
             animationId = requestAnimationFrame(animate);
        }
    }

    function startConstruction(e) {
        if (activeCard === e.currentTarget) return;
        activeCard = e.currentTarget;

        buildingsToAnimate = [];
        if (animationId) cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const rect = activeCard.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // --- SKANOWANIE PRZESZKÓD ---
        // Zbiera pozycje innych kart, żeby budynki w nie nie wjechały
        currentObstacles = Array.from(document.querySelectorAll('.project-card, .lab-item'))
            .filter(el => el !== activeCard && !activeCard.contains(el))
            .map(el => {
                const r = el.getBoundingClientRect();
                return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY };
            });

        const margin = 15;
        const usableWidth = rect.width - margin * 2;
        const usableHeight = rect.height - margin * 2;
        const density = 35;

        // GÓRA
        const numTop = Math.floor(usableWidth / density);
        for(let i=0; i <= numTop; i++) {
            let bx = rect.left + scrollX + margin + (i * (usableWidth/numTop));
            bx += (Math.random() * 10 - 5);
            buildingsToAnimate.push(new Building2D(bx, rect.top + scrollY, 'top', 0));
        }

        // DÓŁ
        for(let i=0; i <= numTop; i++) {
            let bx = rect.left + scrollX + margin + (i * (usableWidth/numTop));
            bx += (Math.random() * 10 - 5);
            buildingsToAnimate.push(new Building2D(bx, rect.bottom + scrollY, 'bottom', Math.PI));
        }

        // LEWO
        const numLeft = Math.floor(usableHeight / density);
        for(let i=0; i <= numLeft; i++) {
            let by = rect.top + scrollY + margin + (i * (usableHeight/numLeft));
            by += (Math.random() * 10 - 5);
            buildingsToAnimate.push(new Building2D(rect.left + scrollX, by, 'left', -Math.PI/2));
        }

        // PRAWO
        for(let i=0; i <= numLeft; i++) {
            let by = rect.top + scrollY + margin + (i * (usableHeight/numLeft));
            by += (Math.random() * 10 - 5);
            buildingsToAnimate.push(new Building2D(rect.right + scrollX, by, 'right', Math.PI/2));
        }

        animate();
    }

    function stopConstruction() {
        activeCard = null;
        buildingsToAnimate = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    }

    const finderInterval = setInterval(() => {
        const headers = document.querySelectorAll('.project-card h2');
        let targetCard = null;

        headers.forEach(h => {
            if (h.innerText.includes('GeoCommunity')) {
                targetCard = h.closest('.project-card');
            }
        });

        if (targetCard) {
            clearInterval(finderInterval);
            targetCard.dataset.type = "city";

            targetCard.style.transition = "box-shadow 0.3s ease, border-color 0.3s ease";

            targetCard.addEventListener('mouseenter', (e) => {
                targetCard.style.borderColor = "#00f3ff";
                targetCard.style.boxShadow = "0 0 25px rgba(0, 243, 255, 0.3)";
                startConstruction(e);
            });

            targetCard.addEventListener('mouseleave', (e) => {
                targetCard.style.borderColor = "";
                targetCard.style.boxShadow = "";
                stopConstruction();
            });
        }
    }, 500);
});