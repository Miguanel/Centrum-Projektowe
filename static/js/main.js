let cvData = [];
let projectsData = [];
let labsData = [];

document.addEventListener('DOMContentLoaded', () => {

    // --- FAZA 1: ŁADOWANIE DANYCH ---
    loadContent();

    async function loadContent() {
        try {
            const [projectsRes, labsRes, cvRes] = await Promise.all([
                fetch('static/data/projects.json'),
                fetch('static/data/labs.json'),
                fetch('static/data/cv.json')
            ]);

            projectsData = projectsRes.ok ? await projectsRes.json() : [];
            labsData = labsRes.ok ? await labsRes.json() : [];
            cvData = cvRes.ok ? await cvRes.json() : [];

            renderProjects(projectsData);
            renderLabs(labsData);

            initVisualEffects();
            initModalSystem();
            initProjectModalSystem(); // Inicjalizacja po załadowaniu danych

        } catch (error) {
            console.error("Critical System Error:", error);
        }
    }

    function renderProjects(projects) {
        const container = document.getElementById('projects-container');
        if (!container) return;

        container.innerHTML = projects.map(p => `
            <article class="project-card">
                <div class="project-header">
                    <h2>[${p.id}] ${p.title}</h2>
                    <span class="badge">${(p.tags || []).join(' / ')}</span>
                </div>
                <div class="project-content">
                    <p>${p.description}</p>
                    <ul class="tech-stack">${(p.tech || []).map(t => `<li>${t}</li>`).join('')}</ul>

                    <div class="project-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="action-btn btn-cyan open-project-btn" data-id="${p.id}" style="flex: 1;">
                            >> SPECYFIKACJA
                        </button>

                        ${p.linkUrl && p.linkUrl !== "#" ? `
                            <a href="${p.linkUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="flex: 1; text-align: center; text-decoration: none;">
                                >> URUCHOM LIVE
                            </a>
                        ` : ''}
                    </div>
                </div>
            </article>
        `).join('');
    }

    function renderLabs(labs) {
        const container = document.getElementById('labs-container');
        if (!container) return;
        container.innerHTML = labs.map(l => `
            <section class="lab-item project-card">
                <div class="status-indicator"><span class="blinking-dot"></span> Status: ${l.status || 'W przygotowaniu'}</div>
                <h2>[${l.id}] ${l.title}</h2>
                <p>${l.description}</p>
                ${l.tech ? `<div class="future-tech" style="margin-bottom: 20px;">Tech: ${l.tech.join(', ')}</div>` : ''}

                <button class="action-btn btn-cyan open-lab-btn" data-id="${l.id}" style="width: 100%;">
                    >> SPECYFIKACJA R&D
                </button>
            </section>
        `).join('');
    }

    function initModalSystem() {
        const openBtn = document.getElementById('open-cv-modal');
        const modalContainer = document.getElementById('modal-container');

        if (!openBtn || !modalContainer) return;

        if(!document.getElementById('cv-backdrop')) {
             const modalHTML = `
                <div class="modal-backdrop" id="cv-backdrop">
                    <div class="modal-window project-card">
                        <button class="close-modal" id="close-cv">×</button>
                        <h2 style="color: var(--neon-cyan); border-bottom: 1px dashed #333; padding-bottom: 15px;">
                            >> WYBIERZ PROTOKÓŁ
                        </h2>
                        <div class="cv-options-list">
                            ${cvData.map(cv => `
                                <a href="static/docs/${cv.filename}" download class="cv-btn action-btn">
                                    <span><strong>[${cv.id}]</strong> ${cv.lang}</span>
                                    <span style="font-size: 0.8em; color: #aaa;">${cv.description}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            modalContainer.innerHTML += modalHTML;
        }

        const backdrop = document.getElementById('cv-backdrop');
        const closeBtn = document.getElementById('close-cv');

        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            backdrop.classList.add('active');
            window.refreshCircuitListeners();
        });

        if(closeBtn) closeBtn.addEventListener('click', () => backdrop.classList.remove('active'));
        if(backdrop) backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.classList.remove('active');
        });
    }

    function initProjectModalSystem() {
        const projectsContainer = document.getElementById('projects-container');
        const labsContainer = document.getElementById('labs-container');
        const modalContainer = document.getElementById('modal-container');

        if (!modalContainer) return;

        if (!document.getElementById('project-backdrop')) {
            modalContainer.insertAdjacentHTML('beforeend', `
                <div class="modal-backdrop" id="project-backdrop">
                    <div class="modal-window project-card">
                        <button class="close-modal" id="close-project">[ X ] CLOSE_TERMINAL</button>
                        <div id="project-modal-content"></div>
                    </div>
                </div>
            `);
        }

        const backdrop = document.getElementById('project-backdrop');
        const contentDiv = document.getElementById('project-modal-content');
        const closeBtn = document.getElementById('close-project');

        const handleModalTrigger = (e) => {
            // Logika dla projektów
            const projectBtn = e.target.closest('.open-project-btn');
            if (projectBtn) {
                const project = projectsData.find(p => p.id === projectBtn.dataset.id);
                if (project && project.details) {
                    fillProjectModal(project, contentDiv);
                    backdrop.classList.add('active');
                    window.refreshCircuitListeners();
                }
            }

            // Logika dla laboratorium
            const labBtn = e.target.closest('.open-lab-btn');
            if (labBtn) {
                const lab = labsData.find(l => l.id === labBtn.dataset.id);
                if (lab && lab.details) {
                    fillProjectModal(lab, contentDiv);
                    backdrop.classList.add('active');
                    window.refreshCircuitListeners();
                }
            }
        };

        if (projectsContainer) projectsContainer.addEventListener('click', handleModalTrigger);
        if (labsContainer) labsContainer.addEventListener('click', handleModalTrigger);

        closeBtn.onclick = () => backdrop.classList.remove('active');
        backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.classList.remove('active'); };
    }

    function fillProjectModal(p, container) {
        const details = p.details || {};

        container.innerHTML = `
            <h2 style="color: var(--neon-cyan); margin-bottom: 5px;">[${p.id}] ${p.title}</h2>
            <div class="badge" style="margin-bottom: 20px; display: inline-block;">${(p.tags || []).join(' / ')}</div>

            <div class="modal-details-content">
                <p style="font-size: 1.1em; color: #fff; margin-bottom: 20px;">${details.fullDescription || "Brak opisu."}</p>

                <h3>> KLUCZOWE FUNKCJONALNOŚCI:</h3>
                <ul>
                    ${(details.features || ["W opracowaniu..."]).map(f => `<li>${f}</li>`).join('')}
                </ul>

                <h3>> STACK TECHNOLOGICZNY:</h3>
                <div class="detail-row"><span class="detail-label">Backend:</span> <span class="detail-value">${details.backend || '---'}</span></div>
                <div class="detail-row"><span class="detail-label">Frontend:</span> <span class="detail-value">${details.frontend || '---'}</span></div>
                <div class="detail-row"><span class="detail-label">Baza danych:</span> <span class="detail-value">${details.database || '---'}</span></div>
                <div class="detail-row" style="border-bottom: none;"><span class="detail-label">Inne:</span> <span class="detail-value">${details.other || '---'}</span></div>
            </div>
            ${details.screenshots ? `
                <div class="project-gallery" style="display: flex; gap: 10px; overflow-x: auto; padding: 15px 0;">
                    ${details.screenshots.map(src => `<img src="${src}" style="height: 200px; border: 1px solid var(--neon-cyan); border-radius: 4px;">`).join('')}
                </div>
            ` : ''}
            <div class="modal-actions">
                ${p.linkUrl && p.linkUrl !== "#" ? `
                <a href="${p.linkUrl}" target="_blank" class="action-btn btn-cyan" style="display: inline-block; min-width: 200px;">
                    >> URUCHOM PROJEKT (LIVE)
                </a>` : `<p style="color: #666;">[ Link Live niedostępny dla tego modułu R&D ]</p>`}
            </div>

        `;
    }

    function initVisualEffects() {
        const textBlocks = document.querySelectorAll('.section-header h1, .section-header p');
        textBlocks.forEach(block => {
            const words = block.textContent.trim().split(/\s+/);
            block.innerHTML = words.map(word => `<span class="word-obstacle" style="display:inline-block; margin: 2px 8px;">${word}</span>`).join(' ');
        });

        const canvas = document.getElementById('circuitCanvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');

        let animationFrameId;
        const activePaths = new Map();
        const globalOccupied = new Set();
        const GRID_SIZE = 6;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

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

        function drawPulse(x, y, color) {
            const offsetX = window.scrollX;
            const offsetY = window.scrollY;
            const drawX = x - offsetX;
            const drawY = y - offsetY;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); ctx.arc(drawX, drawY, 8, 0, Math.PI * 2); ctx.fillStyle = color; ctx.globalAlpha = 0.1; ctx.fill();
            ctx.beginPath(); ctx.arc(drawX, drawY, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.globalAlpha = 0.6; ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fill();
            ctx.beginPath(); ctx.arc(drawX, drawY, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1; ctx.shadowBlur = 4; ctx.shadowColor = '#ffffff'; ctx.fill();
            ctx.restore();
        }

        function generateBranchingPath(element) {
            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            const isMenu = element.tagName === 'A' && element.closest('nav');
            const cardBox = {
                left: rect.left + scrollX,
                right: rect.right + scrollX,
                top: rect.top + scrollY,
                bottom: rect.bottom + scrollY
            };

            let allSegments = [];
            let elementOccupied = new Set();

            const obstacleElements = document.querySelectorAll(
                '.project-card, .lab-item, .action-btn, nav a, .cv-btn, .bio-card, .nav-card, .log-entry, h1.glitch, h2.section-title, .bio-card h3, .word-obstacle'
            );

            const obstacles = Array.from(obstacleElements)
                .filter(el => {
                    // 1. Ignoruj sam element, od którego zaczynamy
                    if (el === element) return false;

                    // 2. KLUCZOWE: Ignoruj wszystko, co jest wewnątrz kontenera modala
                    if (el.closest('#modal-container') || el.closest('.modal-backdrop')) return false;

                    // 3. Ignoruj elementy ukryte (np. display: none, opacity: 0)
                    // Sprawdzamy czy element zajmuje jakąkolwiek przestrzeń
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return false;

                    return true;
                })
                .map(el => {
                    const r = el.getBoundingClientRect();

                    // Czy to nagłówek?
                    const isHeader = el.matches('h1, h2, h3, .section-title, .glitch');

                    let clearance = 4; // Standardowy odstęp

                    // Dla nagłówków dajemy średni margines (nie za duży, nie za mały)
                    if (isHeader) clearance = 10;

                    return {
                        left: r.left + scrollX - clearance,
                        right: r.right + scrollX + clearance,
                        top: r.top + scrollY - clearance,
                        bottom: r.bottom + scrollY + clearance
                    };
                });

            function isCollisionWithObstacles(x, y) {
                const margin = isMenu ? 2 : 5;
                if (x > cardBox.left + margin && x < cardBox.right - margin && y > cardBox.top + margin && y < cardBox.bottom - margin) return true;
                return obstacles.some(obs => x >= obs.left && x <= obs.right && y >= obs.top && y <= obs.bottom);
            }

            function isPathClear(x1, y1, x2, y2, segLength) {
                const stepCount = Math.max(1, Math.round(segLength / GRID_SIZE));
                for (let i = 1; i <= stepCount; i++) {
                    const px = Math.round(x1 + (x2 - x1) * (i / stepCount));
                    const py = Math.round(y1 + (y2 - y1) * (i / stepCount));

                    if (isCollisionWithObstacles(px, py)) return false;
                    if (globalOccupied.has(`${px},${py}`)) return false;
                }
                return true;
            }

            function growBranch(startX, startY, dirX, dirY, depth, maxDepth, parentIdx = null) {
                if (depth >= maxDepth) return;

                const lengthMultiplier = isMenu ? (1 + Math.floor(Math.random() * 2)) : (2 + Math.floor(Math.random() * 4));
                const length = GRID_SIZE * lengthMultiplier;

                let angles = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
                const baseAngle = Math.atan2(dirY, dirX);

                if (Math.random() > 0.2) angles.sort((a, b) => Math.abs(a) - Math.abs(b));
                else angles.sort(() => Math.random() - 0.5);

                for (let angleOffset of angles) {
                    const angle = baseAngle + angleOffset;
                    const endX = Math.round((startX + Math.cos(angle) * length) / GRID_SIZE) * GRID_SIZE;
                    const endY = Math.round((startY + Math.sin(angle) * length) / GRID_SIZE) * GRID_SIZE;

                    if (isMenu && endY < scrollY + 5) continue;

                    if (isPathClear(startX, startY, endX, endY, length)) {
                        const stepCount = Math.max(1, Math.round(length / GRID_SIZE));
                        for (let i = 1; i <= stepCount; i++) {
                            const px = Math.round(startX + (endX - startX) * (i / stepCount));
                            const py = Math.round(startY + (endY - startY) * (i / stepCount));
                            globalOccupied.add(`${px},${py}`);
                            elementOccupied.add(`${px},${py}`);
                        }

                        const currentIdx = allSegments.length;
                        allSegments.push({
                            startX, startY, endX, endY,
                            progress: 0, depth, parentIdx, children: []
                        });

                        if (parentIdx !== null) allSegments[parentIdx].children.push(currentIdx);

                        const splitChance = isMenu ? 0.25 : 0.35;
                        if (Math.random() < splitChance && depth < maxDepth - 1) {
                            growBranch(endX, endY, Math.cos(angle), Math.sin(angle), depth + 1, maxDepth, currentIdx);
                            const sideAngle = angle + (Math.random() > 0.5 ? Math.PI/4 : -Math.PI/4);
                            growBranch(endX, endY, Math.cos(sideAngle), Math.sin(sideAngle), depth + 1, maxDepth, currentIdx);
                        } else {
                            growBranch(endX, endY, Math.cos(angle), Math.sin(angle), depth + 1, maxDepth, currentIdx);
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
                const density = isMenu ? 40 : 65;
                const count = Math.max(1, Math.floor(edge.len / density));
                for (let i = 0; i < count; i++) {
                    let sX = edge.dx !== 0 ? (edge.side === 'left' ? cardBox.left - 2 : cardBox.right + 2) : cardBox.left + (Math.random() * rect.width);
                    let sY = edge.dy !== 0 ? (edge.side === 'top' ? cardBox.top - 2 : cardBox.bottom + 2) : cardBox.top + (Math.random() * rect.height);
                    growBranch(Math.round(sX / GRID_SIZE) * GRID_SIZE, Math.round(sY / GRID_SIZE) * GRID_SIZE, edge.dx, edge.dy, 0, isMenu ? 4 : 5);
                }
            });

            return { segments: allSegments, occupiedPoints: elementOccupied, pulses: [] };
        }

        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const color = getComputedStyle(document.documentElement).getPropertyValue('--neon-cyan').trim() || '#00f3ff';

            activePaths.forEach((data) => {
                data.segments.forEach((seg, idx) => {
                    const parent = seg.parentIdx !== null ? data.segments[seg.parentIdx] : null;
                    if (!parent || parent.progress >= 1) {
                        if (seg.progress < 1) seg.progress += 0.2;
                    }

                    if (seg.progress > 0) {
                        drawLine(seg.startX, seg.startY, seg.endX, seg.endY, color, Math.max(0.4, 1.4 - seg.depth * 0.2), seg.progress);
                        if (seg.progress >= 1 && seg.depth >= 1 && seg.children.length === 0) {
                             const offsetX = window.scrollX;
                             const offsetY = window.scrollY;
                            ctx.beginPath();
                            ctx.arc(seg.endX - offsetX, seg.endY - offsetY, 1, 0, Math.PI * 2);
                            ctx.fillStyle = color;
                            ctx.fill();
                        }
                    }

                    if (seg.progress >= 1 && seg.depth === 0 && Math.random() < 0.02) {
                        data.pulses.push({ segmentIdx: idx, progress: 0, speed: 0.04 + Math.random() * 0.04 });
                    }
                });

                for (let i = data.pulses.length - 1; i >= 0; i--) {
                    let p = data.pulses[i];
                    let seg = data.segments[p.segmentIdx];
                    p.progress += p.speed;
                    let currentX = seg.startX + (seg.endX - seg.startX) * p.progress;
                    let currentY = seg.startY + (seg.endY - seg.startY) * p.progress;
                    drawPulse(currentX, currentY, color);

                    if (p.progress >= 1) {
                        if (seg.children.length > 0) {
                            p.segmentIdx = seg.children[Math.floor(Math.random() * seg.children.length)];
                            p.progress = 0;
                        } else {
                            data.pulses.splice(i, 1);
                        }
                    }
                }
            });
            animationFrameId = requestAnimationFrame(update);
        }

        function startEffect(e) {
            if (!activePaths.has(e.currentTarget)) {
                const data = generateBranchingPath(e.currentTarget);
                activePaths.set(e.currentTarget, data);
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

        window.refreshCircuitListeners = () => {
            const interactiveElements = document.querySelectorAll('.project-card, .lab-item, .action-btn, nav a, .cv-btn, .open-lab-btn, .open-project-btn');
            interactiveElements.forEach(el => {
                if (el.dataset.listenerAttached) return;
                el.dataset.listenerAttached = "true";

                el.addEventListener('mouseenter', startEffect);
                el.addEventListener('mouseleave', stopEffect);
                el.addEventListener('touchstart', (e) => {
                    activePaths.forEach(v => v.occupiedPoints.forEach(pt => globalOccupied.delete(pt)));
                    activePaths.clear();
                    startEffect(e);
                }, {passive: true});
            });
        };

        window.refreshCircuitListeners();
    }
});