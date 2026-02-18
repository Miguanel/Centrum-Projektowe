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
    const GRID_SIZE = 5;
    const globalOccupied = new Set();

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

        const cardBox = {
            left: rect.left + scrollX,
            right: rect.right + scrollX,
            top: rect.top + scrollY,
            bottom: rect.bottom + scrollY
        };

        let allSegments = [];
        let elementOccupied = new Set();

        const obstacleElements = document.querySelectorAll('.project-card, .action-btn, nav, .badge');
        const obstacles = Array.from(obstacleElements)
            .filter(el => el !== element)
            .map(el => {
                const r = el.getBoundingClientRect();
                return {
                    left: r.left + scrollX - 2,
                    right: r.right + scrollX + 2,
                    top: r.top + scrollY - 2,
                    bottom: r.bottom + scrollY + 2
                };
            });

        function isCollision(x, y) {
            if (x > cardBox.left + 3 && x < cardBox.right - 3 &&
                y > cardBox.top + 3 && y < cardBox.bottom - 3) return true;

            const posKey = `${Math.round(x)},${Math.round(y)}`;
            if (globalOccupied.has(posKey)) return true;

            return obstacles.some(obs =>
                x >= obs.left && x <= obs.right && y >= obs.top && y <= obs.bottom
            );
        }

        function isPathClear(x1, y1, x2, y2) {
            const steps = 4;
            for (let i = 1; i <= steps; i++) {
                const px = x1 + (x2 - x1) * (i / steps);
                const py = y1 + (y2 - y1) * (i / steps);
                if (isCollision(px, py)) return false;
            }
            return true;
        }

        function growBranch(startX, startY, dirX, dirY, depth, maxDepth, parentIdx = null) {
            if (depth >= maxDepth) return;

            // --- ZMIANA: Długość segmentu nieco bardziej zróżnicowana ---
            const length = GRID_SIZE * (1 + Math.floor(Math.random() * 3));

            // Preferujemy kąty, które nie zawracają gwałtownie
            const angles = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
            const baseAngle = Math.atan2(dirY, dirX);

            // Sortujemy kąty tak, by najpierw sprawdzać te "na wprost" (mniejsze odchylenie)
            angles.sort((a, b) => Math.abs(a) - Math.abs(b));

            for (let angleOffset of angles) {
                const angle = baseAngle + angleOffset;
                const endX = Math.round((startX + Math.cos(angle) * length) / GRID_SIZE) * GRID_SIZE;
                const endY = Math.round((startY + Math.sin(angle) * length) / GRID_SIZE) * GRID_SIZE;

                if (isPathClear(startX, startY, endX, endY)) {
                    const posKey = `${endX},${endY}`;
                    globalOccupied.add(posKey);
                    elementOccupied.add(posKey);

                    const currentIdx = allSegments.length;
                    allSegments.push({ startX, startY, endX, endY, progress: 0, depth, parentIdx });

                    // --- ZMIANA: Wyższa szansa na rozgałęzienie ---
                    const splitChance = 0.5;
                    if (Math.random() < splitChance && depth < maxDepth - 1) {
                        growBranch(endX, endY, (endX - startX) / length, (endY - startY) / length, depth + 1, maxDepth, currentIdx);
                        growBranch(endX, endY, (endX - startX) / length, (endY - startY) / length, depth + 1, maxDepth, currentIdx);
                    } else {
                        growBranch(endX, endY, (endX - startX) / length, (endY - startY) / length, depth + 1, maxDepth, currentIdx);
                    }
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
            // Więcej punktów startowych
            const count = Math.max(1, Math.floor(edge.len / 45));
            for (let i = 0; i < count; i++) {
                let sX, sY;
                if (edge.dx !== 0) {
                    sX = edge.side === 'left' ? cardBox.left - 1 : cardBox.right + 1;
                    sY = cardBox.top + (Math.random() * rect.height);
                } else {
                    sX = cardBox.left + (Math.random() * rect.width);
                    sY = edge.side === 'top' ? cardBox.top - 1 : cardBox.bottom + 1;
                }

                const gridStartX = Math.round(sX / GRID_SIZE) * GRID_SIZE;
                const gridStartY = Math.round(sY / GRID_SIZE) * GRID_SIZE;

                // --- ZMIANA: Zwiększony maxDepth z 3 na 6 ---
                growBranch(gridStartX, gridStartY, edge.dx, edge.dy, 0, 6);
            }
        });

        return { segments: allSegments, occupiedPoints: elementOccupied };
    }

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--neon-cyan').trim() || '#00f3ff';
        const offsetX = window.scrollX;
        const offsetY = window.scrollY;

        activePaths.forEach((data) => {
            data.segments.forEach((seg) => {
                const parent = seg.parentIdx !== null ? data.segments[seg.parentIdx] : null;
                if (!parent || parent.progress >= 1) {
                    // Nieco szybszy postęp przy większej ilości gałęzi
                    if (seg.progress < 1) seg.progress += 0.2;
                }
                if (seg.progress > 0) {
                    // Subtelniejsza zmiana grubości
                    const thickness = Math.max(0.4, 1.6 - seg.depth * 0.25);
                    drawLine(seg.startX, seg.startY, seg.endX, seg.endY, color, thickness, seg.progress);

                    if (seg.progress >= 1 && seg.depth >= 1) {
                        ctx.beginPath();
                        ctx.arc(seg.endX - offsetX, seg.endY - offsetY, 0.8, 0, Math.PI * 2);
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
            const data = generateBranchingPath(el);
            activePaths.set(el, data);
            if (!animationFrameId) update();
        }
    }

    function stopEffect(e) {
        const data = activePaths.get(e.currentTarget);
        if (data) {
            data.occupiedPoints.forEach(pt => globalOccupied.delete(pt));
            activePaths.delete(e.currentTarget);
        }
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
            activePaths.forEach((v) => v.occupiedPoints.forEach(pt => globalOccupied.delete(pt)));
            activePaths.clear();
            startEffect(e);
        }, {passive: true});
    });
});