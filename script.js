// Core state
let isPro = localStorage.getItem('isPro') === 'true';
let currentQR = null;
let logoImage = null;
let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');
const typeSelect = document.getElementById('type');
const dynamicInputs = document.getElementById('dynamic-inputs');
const fgColor = document.getElementById('fg-color');
const bgColor = document.getElementById('bg-color');
const transparentBg = document.getElementById('transparent-bg');
const sizeInput = document.getElementById('size');
const sizeValue = document.getElementById('size-value');
const errorLevel = document.getElementById('error-level');
const dotStyle = document.getElementById('dot-style');
const logoUpload = document.getElementById('logo-upload');
const generateBtn = document.getElementById('generate-btn');
const resetBtn = document.getElementById('reset-btn');
const qrPreview = document.getElementById('qr-preview');
const downloadPng = document.getElementById('download-png');
const downloadSvg = document.getElementById('download-svg');
const saveQr = document.getElementById('save-qr');
const historyGrid = document.getElementById('history-grid');

// Modals
const upgradeModal = document.getElementById('upgrade-modal');
const pricingModal = document.getElementById('pricing-modal');
const upgradeTriggers = document.querySelectorAll('#upgrade-btn, #mobile-upgrade');
const pricingTriggers = document.querySelectorAll('#pricing-trigger, #mobile-pricing, #footer-pricing');
const closeModals = document.querySelectorAll('.close-modal');

// Init
updateDynamicInputs();
renderHistory();
updateProFeatures();
qrPreview.innerHTML = '<p class="empty-state">Your QR code will appear here</p>';

// Hamburger
hamburgerBtn.addEventListener('click', () => {
    hamburgerBtn.classList.toggle('active');
    mobileMenu.classList.toggle('active');
});

document.querySelectorAll('.mobile-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
    });
});

// Smooth scroll
document.querySelectorAll('.scroll-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            if (mobileMenu.classList.contains('active')) {
                hamburgerBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        }
    });
});

// Theme
themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// Inputs
typeSelect.addEventListener('change', () => {
    updateDynamicInputs();
    debounceGenerate();
});

sizeInput.addEventListener('input', () => {
    sizeValue.textContent = `${sizeInput.value}px`;
    debounceGenerate();
});

[fgColor, bgColor, errorLevel, dotStyle].forEach(el => el.addEventListener('change', debounceGenerate));

transparentBg.addEventListener('change', () => {
    bgColor.disabled = transparentBg.checked;
    debounceGenerate();
});

logoUpload.addEventListener('change', (e) => {
    if (!isPro) { showUpgrade(); logoUpload.value = ''; return; }
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => { logoImage = ev.target.result; generateQR(); };
        reader.readAsDataURL(file);
    }
});

// Buttons
generateBtn.addEventListener('click', generateQR);
resetBtn.addEventListener('click', resetForm);

downloadPng.addEventListener('click', () => currentQR?.download({ name: "qr-code", extension: "png" }));
downloadSvg.addEventListener('click', () => isPro ? currentQR?.download({ name: "qr-code", extension: "svg" }) : showUpgrade());

saveQr.addEventListener('click', () => {
    if (!currentQR) return;
    const name = prompt("Name this QR code:", "My QR Code") || "Untitled QR";
    history.unshift({
        name,
        content: getContent(),
        options: currentQR._options,
        logo: logoImage,
        date: new Date().toISOString()
    });
    localStorage.setItem('qrHistory', JSON.stringify(history));
    renderHistory();
});

// Modals
pricingTriggers.forEach(t => t.addEventListener('click', (e) => { e.preventDefault(); pricingModal.classList.add('active'); }));
upgradeTriggers.forEach(t => t.addEventListener('click', () => upgradeModal.classList.add('active')));
document.getElementById('upgrade-confirm').addEventListener('click', () => {
    isPro = true;
    localStorage.setItem('isPro', 'true');
    alert('Upgraded to Pro! (Demo mode)');
    upgradeModal.classList.remove('active');
    updateProFeatures();
});
closeModals.forEach(btn => btn.addEventListener('click', () => btn.closest('.modal').classList.remove('active')));
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); }));

// Functions
function updateDynamicInputs() {
    const type = typeSelect.value;
    let html = '';
    switch (type) {
        case 'url': html = `<div class="field"><label>URL</label><input type="url" id="content-input" placeholder="https://example.com"></div>`; break;
        case 'text': html = `<div class="field"><label>Text</label><textarea id="content-input" rows="4" placeholder="Enter your text"></textarea></div>`; break;
        case 'email': html = `<div class="field"><label>Email</label><input type="email" id="content-input" placeholder="hello@example.com"></div>`; break;
        case 'phone': html = `<div class="field"><label>Phone</label><input type="tel" id="content-input" placeholder="+1 (555) 123-4567"></div>`; break;
        case 'wifi':
            html = `
                <div class="field"><label>SSID</label><input type="text" id="wifi-ssid"></div>
                <div class="field"><label>Password</label><input type="password" id="wifi-pass"></div>
                <div class="field"><label>Encryption</label><select id="wifi-enc"><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">None</option></select></div>`;
            break;
    }
    dynamicInputs.innerHTML = html;
    document.getElementById('content-input')?.focus();
    debounceGenerate();
}

function getContent() {
    const type = typeSelect.value;
    if (type === 'wifi') {
        const ssid = document.getElementById('wifi-ssid')?.value.trim() || '';
        const pass = document.getElementById('wifi-pass')?.value || '';
        const enc = document.getElementById('wifi-enc')?.value || 'nopass';
        if (!ssid) return '';
        return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }
    const input = document.getElementById('content-input');
    if (!input?.value.trim()) return '';
    let content = input.value.trim();
    if (type === 'email') content = `mailto:${content}`;
    if (type === 'phone') content = `tel:${content}`;
    return content;
}

// Fully Responsive QR Generation
function generateQR() {
    const content = getContent();
    if (!content) {
        qrPreview.innerHTML = '<p class="empty-state">Enter content to generate a QR code</p>';
        currentQR = null;
        return;
    }

    qrPreview.innerHTML = '';

    const baseSize = +sizeInput.value;

    const options = {
        width: baseSize,
        height: baseSize,
        data: content,
        dotsOptions: { color: fgColor.value, type: dotStyle.value },
        backgroundOptions: { color: transparentBg.checked ? 'transparent' : bgColor.value },
        cornersSquareOptions: { type: 'extra-rounded' },
        qrOptions: { errorCorrectionLevel: errorLevel.value }
    };

    if (logoImage && isPro) {
        options.image = logoImage;
        options.imageOptions = { crossOrigin: 'anonymous', margin: 20, imageSize: 0.3 };
    }

    currentQR = new QRCodeStyling(options);
    currentQR.append(qrPreview);

    // Ensure responsiveness after render
    const rendered = qrPreview.querySelector('canvas') || qrPreview.querySelector('svg');
    if (rendered) {
        rendered.style.maxWidth = '100%';
        rendered.style.height = 'auto';
        rendered.style.width = 'auto';
    }
}

function debounceGenerate() {
    clearTimeout(window.qrTimeout);
    window.qrTimeout = setTimeout(generateQR, 300);
}

function resetForm() {
    document.getElementById('qr-form').reset();
    logoImage = null;
    logoUpload.value = '';
    sizeValue.textContent = '300px';
    bgColor.disabled = false;
    updateDynamicInputs();
    qrPreview.innerHTML = '<p class="empty-state">Your QR code will appear here</p>';
    currentQR = null;
}

function renderHistory() {
    if (history.length === 0) {
        historyGrid.innerHTML = '<p class="empty-state">No saved QR codes yet.<br>Generate and save your first one!</p>';
        return;
    }

    historyGrid.innerHTML = history.map((item, i) => `
        <div class="history-item">
            <div class="history-preview" id="hist-${i}"></div>
            <div class="history-name">${item.name}</div>
            <div class="history-actions">
                <button class="btn btn-outline load-btn" data-index="${i}">Load</button>
                <button class="btn btn-secondary delete-btn" data-index="${i}">Delete</button>
            </div>
        </div>
    `).join('');

    history.forEach((item, i) => {
        const temp = new QRCodeStyling({ ...item.options, width: 200, height: 200, image: isPro ? item.logo : null });
        temp.append(document.getElementById(`hist-${i}`));
    });

    document.querySelectorAll('.load-btn').forEach(b => b.addEventListener('click', () => loadHistory(+b.dataset.index)));
    document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', () => deleteHistory(+b.dataset.index)));
}

function loadHistory(index) {
    const item = history[index];
    const isWifi = item.content.startsWith('WIFI:');
    const isEmail = item.content.startsWith('mailto:');
    const isPhone = item.content.startsWith('tel:');
    typeSelect.value = isWifi ? 'wifi' : isEmail ? 'email' : isPhone ? 'phone' : item.content.length > 100 ? 'text' : 'url';
    updateDynamicInputs();

    if (isWifi) {
        const parts = item.content.match(/S:([^;]+);T:([^;]*);P:([^;]*);/);
        if (parts) {
            document.getElementById('wifi-ssid').value = parts[1];
            document.getElementById('wifi-pass').value = parts[3];
            document.getElementById('wifi-enc').value = parts[2] || 'nopass';
        }
    } else {
        const input = document.getElementById('content-input');
        if (input) {
            let val = item.content;
            if (isEmail) val = val.replace('mailto:', '');
            if (isPhone) val = val.replace('tel:', '');
            input.value = val;
        }
    }

    fgColor.value = item.options.dotsOptions.color;
    const bg = item.options.backgroundOptions.color;
    transparentBg.checked = bg === 'transparent';
    bgColor.value = transparentBg.checked ? '#020617' : bg;
    bgColor.disabled = transparentBg.checked;
    sizeInput.value = item.options.width;
    sizeValue.textContent = `${item.options.width}px`;
    errorLevel.value = item.options.qrOptions.errorCorrectionLevel;
    dotStyle.value = item.options.dotsOptions.type;
    logoImage = item.logo || null;

    generateQR();
}

function deleteHistory(index) {
    if (confirm('Delete this QR code?')) {
        history.splice(index, 1);
        localStorage.setItem('qrHistory', JSON.stringify(history));
        renderHistory();
    }
}

function showUpgrade() {
    upgradeModal.classList.add('active');
}

function updateProFeatures() {
    document.querySelectorAll('.pro-locked').forEach(el => {
        el.style.opacity = isPro ? '1' : '0.6';
        el.style.pointerEvents = isPro ? 'auto' : 'none';
        if (el.contains(logoUpload)) logoUpload.disabled = !isPro;
    });
}

// === MOBILE RESPONSIVENESS ENHANCEMENTS ===
// Makes your app feel fast, native, and perfectly responsive on phones

// 1. Remove 300ms tap delay on mobile (makes buttons feel instant)
(function () {
    if ('addEventListener' in document) {
        document.addEventListener('DOMContentLoaded', function () {
            // FastClick-like behavior without external library
            let touchStartX = 0;
            document.body.addEventListener('touchstart', function (e) {
                touchStartX = e.touches[0].clientX;
            }, { passive: true });

            document.body.addEventListener('touchend', function (e) {
                if (!e.target.closest || !e.target.closest('a, button, input, select, textarea')) return;
                const touchEndX = e.changedTouches[0].clientX;
                // Only trigger if no significant swipe
                if (Math.abs(touchEndX - touchStartX) < 10) {
                    e.target.click();
                }
            }, { passive: true });
        });
    }
})();

// 2. Improve form inputs on mobile
document.addEventListener('DOMContentLoaded', () => {
    // Fix iOS zoom on input focus
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            document.documentElement.style.setProperty('--viewport-height', window.innerHeight + 'px');
        });

        // Better color picker on mobile
        if (input.type === 'color') {
            input.style.width = '100%';
            input.style.height = '50px';
            input.style.border = 'none';
            input.style.borderRadius = '12px';
            input.style.cursor = 'pointer';
        }

        // File input styling for mobile
        if (input.type === 'file') {
            input.style.opacity = '0';
            input.style.position = 'absolute';
            input.style.width = '100%';
            input.style.height = '100%';
            input.style.cursor = 'pointer';
        }
    });

    // Make range slider thumb larger on touch devices
    const range = document.querySelector('#size');
    if (range) {
        range.style.height = '8px';
        range.style.borderRadius = '8px';
        range.style.background = '#334155';
    }

    // Touch-friendly buttons
    document.querySelectorAll('button, .btn').forEach(btn => {
        btn.style.minHeight = '48px';
        btn.style.touchAction = 'manipulation'; // Better tap response
    });
});

// 3. Dynamic viewport height fix for mobile address bar
(function () {
    const setVH = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 200);
    });
})();

// 4. Smooth scrolling polyfill for older mobile browsers
if ('scrollBehavior' in document.documentElement.style === false) {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}