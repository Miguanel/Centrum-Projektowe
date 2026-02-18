document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('circuitCanvas');
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const activePaths = new Map();
    // Stała określająca rozmiar siatki (grid) - im mniejsza, tym gęstsze połączenia
    const GRID_SIZE = 8;

    function drawLine(startX, startY, endX, endY, color, width, progress) {
        const offsetX = window.scrollX;
        const offsetY = window.scrollY;

        ctx.beginPath();
        ctx.moveTo(startX - offsetX, startY - offsetY);
        ctx.lineTo(
            (startX + (endX - startX) * progress) - offsetX,
            (startY + (endY - startY) * progress) - offsetY
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    function generateBranchingPath(element) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        let allSegments = [];

        // Zbiór przechowujący zajęte współrzędne w formacie "x,y"
        const occupied = new Set();

        function growBranch(startX, startY, dirX, dirY, depth, maxDepth, parentIdx = null) {
            if (depth >= maxDepth) return;

            // Długość musi być wielokrotnością siatki dla idealnego dopasowania
            const length = GRID_SIZE * (1 + Math.floor(Math.random() * 2));

            // Definiujemy możliwe kąty (PCB: 0, 45, -45 stopni)
            const angles = [0, Math.PI / 4, -Math.PI / 4];
            const baseAngle = Math.atan2(dirY, dirX);

            // Mieszamy kąty, aby algorytm próbował różnych dróg
            angles.sort(() => Math.random() - 0.5);

            for (let angleOffset of angles) {
                const angle = baseAngle + angleOffset;
                const endX = Math.round((startX + Math.cos(angle) * length) / GRID_SIZE) * GRID_SIZE;
                const endY = Math.round((startY + Math.sin(angle) * length) / GRID_SIZE) * GRID_SIZE;

                const posKey = `${endX},${endY}`;

                // SPRAWDZENIE KOLIZJI: Czy punkt docelowy jest wolny?
                if (!occupied.has(posKey)) {
                    occupied.add(posKey); // Rezerwujemy miejsce

                    const currentIdx = allSegments.length;
                    allSegments.push({
                        startX, startY, endX, endY,
                        progress: 0,
                        depth,
                        parentIdx
                    });

                    const splitChance = 0.4;
                    if (Math.random() < splitChance && depth < maxDepth - 1) {
                        growBranch(endX, endY, (endX - startX) / length, (endY - startY) / length, depth + 1, maxDepth, currentIdx);
                        growBranch(endX, endY, (endX - startX) / length, (endY - startY) / length, depth + 1, maxDepth, currentIdx);
                    } else {
                        growBranch(endX, endY, (endX - startX) / length, (endY - startY) / length, depth + 1, maxDepth, currentIdx);
                    }

                    // Jeśli udało się postawić gałąź, przerywamy pętlę kątów dla tego poziomu
                    break;
                }
            }
        }

        const edges = [
            { side: 'top', dx: 0, dy: -1, len: rect.width },
            { side: 'bottom', dx: 0, dy: 1, len: rect.width },
            { side: 'left', dx: -1, dy: 0, len: rect.height },
            { side: 'right', dx: 1, dy: 0, len: rect.height }
        ];

        edges.forEach(edge => {
            const count = Math.max(1, Math.floor(edge.len / 50));
            for (let i = 0; i < count; i++) {
                let sX, sY;
                if (edge.dx !== 0) {
                    sX = Math.round((edge.side === 'left' ? rect.left + scrollX : rect.right + scrollX) / GRID_SIZE) * GRID_SIZE;
                    sY = Math.round((rect.top + (Math.random() * rect.height) + scrollY) / GRID_SIZE) * GRID_SIZE;
                } else {
                    sX = Math.round((rect.left + (Math.random() * rect.width) + scrollX) / GRID_SIZE) * GRID_SIZE;
                    sY = Math.round((edge.side === 'top' ? rect.top + scrollY : rect.bottom + scrollY) / GRID_SIZE) * GRID_SIZE;
                }
                growBranch(sX, sY, edge.dx, edge.dy, 0, 4);
            }
        });
        return allSegments;
    }

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--neon-cyan').trim() || '#00f3ff';
        const offsetX = window.scrollX;
        const offsetY = window.scrollY;

        activePaths.forEach((segments) => {
            segments.forEach((seg) => {
                const parent = seg.parentIdx !== null ? segments[seg.parentIdx] : null;
                if (!parent || parent.progress >= 1) {
                    if (seg.progress < 1) seg.progress += 0.1;
                }

                if (seg.progress > 0) {
                    const thickness = Math.max(0.5, 1.8 - seg.depth * 0.3);
                    drawLine(seg.startX, seg.startY, seg.endX, seg.endY, color, thickness, seg.progress);

                    if (seg.progress >= 1 && seg.depth > 1) {
                        ctx.beginPath();
                        ctx.arc(seg.endX - offsetX, seg.endY - offsetY, 1, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                    }
                }
            });
        });
        animationFrameId = requestAnimationFrame(update);
    }

    const interactiveElements = document.querySelectorAll('.project-card, .action-btn, nav a');

    function startEffect(e) {
        const el = e.currentTarget;
        if (!activePaths.has(el)) {
            const paths = generateBranchingPath(el);
            activePaths.set(el, paths);
            if (!animationFrameId) update();
        }
    }

    function stopEffect(e) {
        activePaths.delete(e.currentTarget);
        if (activePaths.size === 0) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', startEffect);
        element.addEventListener('mouseleave', stopEffect);
        element.addEventListener('touchstart', (e) => {
            activePaths.clear();
            startEffect(e);
        }, {passive: true});
    });

    window.addEventListener('scroll', () => {
        if (window.innerWidth < 768) activePaths.clear();
    });
});