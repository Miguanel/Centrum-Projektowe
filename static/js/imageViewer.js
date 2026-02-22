document.addEventListener('DOMContentLoaded', () => {
    // 1. Tworzymy strukturę HTML dla Viewera w locie
    const overlay = document.createElement('div');
    overlay.className = 'image-viewer-overlay';

    const closeBtn = document.createElement('div');
    closeBtn.className = 'viewer-close';
    closeBtn.innerHTML = '&times;';

    const imgElement = document.createElement('img');

    overlay.appendChild(closeBtn);
    overlay.appendChild(imgElement);
    document.body.appendChild(overlay);

    // 2. Zmienne do obsługi transformacji (Zoom & Pan)
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    // Zmienne dla myszy / dotyku
    let isDragging = false;
    let startX, startY;
    let initialPinchDistance = null;

    // 3. Funkcja resetująca widok
    const resetTransform = () => {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    };

    const updateTransform = () => {
        imgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    };

    // 4. Otwieranie / Zamykanie
    const openViewer = (imageSrc) => {
        imgElement.src = imageSrc;
        resetTransform();
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Blokuje scrollowanie strony w tle
    };

    const closeViewer = () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => { imgElement.src = ''; }, 300);
    };

    closeBtn.addEventListener('click', closeViewer);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeViewer(); // Zamknij po kliknięciu w tło
    });

    // Podpinamy otwieranie pod wszystkie obrazki w modalach
    // Używamy event delegation na wypadek, gdyby modal ładował się dynamicznie
    document.body.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG' && e.target.closest('#modal-container')) {
            openViewer(e.target.src);
        }
    });

    // 5. OBSŁUGA MYSZY (PC)

    // Zoom kółkiem myszy
    overlay.addEventListener('wheel', (e) => {
        if (!overlay.classList.contains('active')) return;
        e.preventDefault(); // Zapobiega przewijaniu strony

        // Zmiana skali
        const zoomIntensity = 0.1;
        if (e.deltaY < 0) {
            scale += zoomIntensity;
        } else {
            scale -= zoomIntensity;
        }

        // Ograniczenia: od 1x (oryginał) do 5x (max przybliżenie)
        scale = Math.min(Math.max(1, scale), 5);

        // Jeśli wracamy do 1x, centrujemy obrazek
        if (scale === 1) {
            translateX = 0;
            translateY = 0;
        }

        updateTransform();
    }, { passive: false });

    // Przesuwanie myszą (Pan)
    imgElement.addEventListener('mousedown', (e) => {
        if (scale > 1) {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // 6. OBSŁUGA DOTYKU (SMARTFONY)

    // Funkcja pomocnicza: odległość między dwoma palcami
    const getDistance = (touch1, touch2) => {
        return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
    };

    imgElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1 && scale > 1) {
            // Jeden palec - przesuwanie
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        } else if (e.touches.length === 2) {
            // Dwa palce - początek szczypania (Pinch Zoom)
            isDragging = false;
            initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        }
    });

    overlay.addEventListener('touchmove', (e) => {
        if (!overlay.classList.contains('active')) return;
        e.preventDefault(); // Blokuje natywny scroll i zoom przeglądarki na mobile

        if (e.touches.length === 1 && isDragging) {
            // Przesuwanie
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            updateTransform();
        } else if (e.touches.length === 2 && initialPinchDistance) {
            // Zoomowanie dwoma palcami
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            // Obliczamy zmianę odległości
            const distanceRatio = currentDistance / initialPinchDistance;

            // Delikatnie modyfikujemy obecną skalę
            let newScale = scale * distanceRatio;
            newScale = Math.min(Math.max(1, newScale), 5); // Limity 1x - 5x

            scale = newScale;
            initialPinchDistance = currentDistance; // Aktualizujemy bazę do kolejnej klatki

            if (scale === 1) {
                translateX = 0;
                translateY = 0;
            }
            updateTransform();
        }
    }, { passive: false });

    imgElement.addEventListener('touchend', (e) => {
        isDragging = false;
        if (e.touches.length < 2) {
            initialPinchDistance = null;
        }
    });
});