const omniConfig = {
    // Ustawienia Główne
    checkIntervalMs: {{CHECK_INTERVAL}},      // Suwak w formularzu (np. 100ms - 2000ms)
    debugMode: {{DEBUG_MODE}},          // Checkbox: Pokaż logi w konsoli
    isActive: {{IS_ACTIVE}},           // Checkbox: Główny włącznik/wyłącznik (Killswitch)

    // Moduł 1: YouTube
    ytEnabled: {{YT_ENABLED}},          // Checkbox: Włącz blokowanie na YT
    ytAdSpeed: {{YT_AD_SPEED}},          // Lista rozwijana: Prędkość reklamy (2x, 4x, 8x, 16x)
    ytMuteAds: {{YT_MUTE_ADS}},          // Checkbox: Wyciszaj przyspieszone reklamy
    ytAutoResume: {{YT_AUTO_RESUME}},       // Checkbox: Automatycznie wznawiaj wideo ("Czy nadal oglądasz?")
    ytAggressiveSkip: true,   // Checkbox: Wymuszaj symulację kliknięcia myszką w "Pomiń"

    // Moduł 2: Bezpieczeństwo (VOD / Filman)
    vodAntiClickjack: {{VOD_ANTI_CLICKJACK}},   // Checkbox: Neutralizuj niewidzialne linki podążające za kursorem

    // Moduł 3: Omijanie adblock-walli i irytujących pop-upów
    genericAdsEnabled: {{GENERIC_ADS_ENABLED}},  // Checkbox: Ukrywaj standardowe banery i paywalle
    restoreScroll: true,      // Checkbox: Odblokuj przewijanie strony (Scroll Lock Bypass)

    // Zaawansowane (Dla power userów)
    customAdSelectors: "{{CUSTOM_AD_SELECTORS}}"      // Pole tekstowe (Textarea) dla własnych klas, po przecinku (np. ".moj-popup, #baner1")
};

// Zmienna przechowująca nasz interwał, żebyśmy mogli go resetować z poziomu formularza
let autoAdBlockerInterval = null;

// Funkcja pomocnicza do logowania (działa tylko, gdy debugMode to true)
function logger(message) {
    if (omniConfig.debugMode) {
        console.log(`[OmniBlocker] ${message}`);
    }
}

// GŁÓWNA FUNKCJA URUCHAMIAJĄCA
function startOmniBlocker() {
    // Jeśli skrypt już działał, zatrzymaj go, żeby nie duplikować pętli
    if (autoAdBlockerInterval) {
        clearInterval(autoAdBlockerInterval);
    }

    // Jeśli główny włącznik jest wyłączony, nie robimy nic
    if (!omniConfig.isActive) {
        logger("Algorytm wstrzymany.");
        return;
    }

    logger(`Uruchamianie algorytmu. Interwał: ${omniConfig.checkIntervalMs}ms`);

    autoAdBlockerInterval = setInterval(() => {

        // --- MODUŁ 1: YOUTUBE ---
        if (omniConfig.ytEnabled) {
            const video = document.querySelector('video');
            const adIsShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
            const ytSkipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .videoAdUiSkipButton, .ytp-ad-skip-button-container, [id^="skip-button"], .ytp-ad-text.ytp-ad-skip-button-text');
            const continueWatchingButton = document.querySelector('yt-button-renderer.ytmusic-you-there-renderer[dialog-confirm] button, yt-confirm-dialog-renderer [dialog-confirm] button, yt-confirm-dialog-renderer #confirm-button button');

            if (omniConfig.ytAutoResume && continueWatchingButton) {
                continueWatchingButton.click();
                logger('YouTube: Wznowiono odtwarzanie.');
            }

            if (adIsShowing) {
                if (video) {
                    if (video.playbackRate !== omniConfig.ytAdSpeed) {
                        video.playbackRate = omniConfig.ytAdSpeed;
                    }
                    if (omniConfig.ytMuteAds && !video.muted) {
                        video.muted = true;
                    }
                }

                if (ytSkipButton) {
                    ytSkipButton.click();

                    if (omniConfig.ytAggressiveSkip) {
                        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                        ytSkipButton.dispatchEvent(clickEvent);
                    }
                }
            }
        }

        // --- MODUŁ 2: CLICKJACKER NEUTRALIZER ---
        if (omniConfig.vodAntiClickjack) {
            const suspiciousLinks = document.querySelectorAll('a[target="_blank"][style*="display: block"]');
            suspiciousLinks.forEach(link => {
                const currentStyle = link.getAttribute('style') || '';
                if (currentStyle.includes('height: inherit')) {
                    link.style.setProperty('position', 'fixed', 'important');
                    link.style.setProperty('pointer-events', 'none', 'important');
                    link.style.setProperty('opacity', '0', 'important');
                }
            });
        }

        // --- MODUŁ 3: GENERIC ADS & POPUPS ---
        if (omniConfig.genericAdsEnabled) {
            // Łączymy wbudowane selektory z tymi wpisanymi przez użytkownika w formularzu
            let selectors = '.adsbygoogle, .ad-container, .ad-banner, .advertisement, .ad-wrapper, .ad_wrapper, [id^="div-gpt-ad"], [id^="dfp-slot-"], [id^="sponsoring"], #template-container, .maintenance-modal';

            if (omniConfig.customAdSelectors.trim() !== "") {
                selectors += `, ${omniConfig.customAdSelectors}`;
            }

            try {
                const genericAds = document.querySelectorAll(selectors);
                genericAds.forEach(ad => {
                    ad.style.setProperty('position', 'fixed', 'important');
                    ad.style.setProperty('left', '-10000px', 'important');
                    ad.style.setProperty('pointer-events', 'none', 'important');
                    ad.style.setProperty('opacity', '0', 'important');
                });
            } catch (error) {
                // Try-catch łapie błędy, jeśli użytkownik wpisze w formularzu nieprawidłowy selektor CSS
                logger(`Błąd składni w Custom Selectors: ${error.message}`);
            }

            const genericCloseButtons = document.querySelectorAll('.ad-close, .close-ad, .dismiss-button, .close-advertisement, [aria-label="Close ad"], [aria-label="Zamknij reklamę"], .bottom-anchor__close, .maintenance-modal a.close, a[data-type="close"]');
            genericCloseButtons.forEach(button => button.click());
        }

        // --- MODUŁ 4: SCROLL RECOVERY ---
        if (omniConfig.restoreScroll) {
            if (document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden') {
                document.body.style.setProperty('overflow', 'auto', 'important');
                document.documentElement.style.setProperty('overflow', 'auto', 'important');
                logger('Przywrócono możliwość przewijania strony.');
            }
        }

    }, omniConfig.checkIntervalMs);
}

// INICJALIZACJA STARTOWA
startOmniBlocker();