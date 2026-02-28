// ═══════════════════════════════════════════
// AutaDo100k – Web App
// Reads car listings from the same Firestore
// as the mobile app (project: autodo100k)
// ═══════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// ── Firebase config (same project as mobile app) ──
const firebaseConfig = {
    apiKey: "AIzaSyD51-5YojkTKYRbqjhIMBFX0_vUixYfU8M",
    authDomain: "autodo100k.firebaseapp.com",
    projectId: "autodo100k",
    storageBucket: "autodo100k.firebasestorage.app",
    messagingSenderId: "727572875175",
    appId: "1:727572875175:web:3443cb24dfd99829a91882 "
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ── Auth UI ──
onAuthStateChanged(auth, (user) => {
    const authForm = document.getElementById("authForm");
    const authUser = document.getElementById("authUser");
    const authEmailDisplay = document.getElementById("authEmailDisplay");
    if (!authForm || !authUser) return;

    if (user) {
        authForm.style.display = "none";
        authUser.style.display = "flex";
        authEmailDisplay.textContent = user.email;
    } else {
        authForm.style.display = "flex";
        authUser.style.display = "none";
        authEmailDisplay.textContent = "";
    }
});

window.loginUser = async function () {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    if (!email || !password) { alert("Vyplňte e-mail a heslo."); return; }
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        alert("Přihlášení se nezdařilo: " + e.message);
    }
};

window.registerUser = async function () {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    if (!email || !password) { alert("Vyplňte e-mail a heslo."); return; }
    if (password.length < 6) { alert("Heslo musí mít alespoň 6 znaků."); return; }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
        alert("Registrace se nezdařila: " + e.message);
    }
};

window.logoutUser = async function () {
    try {
        await signOut(auth);
    } catch (e) {
        alert("Odhlášení se nezdařilo: " + e.message);
    }
};

window.resetPassword = async function () {
    const email = document.getElementById("authEmail").value.trim();
    if (!email) { alert("Zadejte e-mail pro obnovu hesla."); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        alert("E-mail pro obnovu hesla byl odeslán na: " + email);
    } catch (e) {
        alert("Nepodařilo se odeslat e-mail: " + e.message);
    }
};

// ── State ──
let allCars = [];

// ── Czech regions for filter ──
const regions = [
    "Praha", "Středočeský", "Jihočeský", "Plzeňský", "Karlovarský",
    "Ústecký", "Liberecký", "Královéhradecký", "Pardubický",
    "Vysočina", "Jihomoravský", "Olomoucký", "Zlínský", "Moravskoslezský"
];

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
    setupFilterToggle();
    populateRegionFilter();
    await loadCars();
});

function setupFilterToggle() {
    const btn = document.getElementById("filterToggle");
    const panel = document.getElementById("filterPanel");
    btn.addEventListener("click", () => {
        panel.classList.toggle("open");
        btn.textContent = panel.classList.contains("open") ? "🔍 Filtry ▲" : "🔍 Filtry ▼";
    });
}

function populateRegionFilter() {
    const select = document.getElementById("filterRegion");
    regions.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        select.appendChild(opt);
    });
}

// ── Load cars from Firestore ──
async function loadCars() {
    try {
        const q = query(collection(db, "cars"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        allCars = [];
        const brands = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            const car = {
                id: doc.id,
                brand: data.brand || "",
                model: data.model || "",
                year: data.year || 0,
                mileage: data.mileage || 0,
                price: data.price || 0,
                fuel: data.fuel || "",
                engine: data.engine || "",
                transmission: data.transmission || "",
                description: data.description || "",
                region: data.region || "",
                city: data.city || "",
                phone: data.phone || "",
                ownerEmail: data.ownerEmail || "",
                ownerName: data.ownerName || "",
                imageUrls: data.imageUrls || [],
                isSold: data.isSold || false,
                isSuspended: data.isSuspended || false,
                isTop: data.isTop || false,
                topExpiresAtMillis: data.topExpiresAtMillis || 0,
                stkMonth: data.stkMonth || 0,
                stkYear: data.stkYear || 0,
                vin: data.vin || "",
                viewCount: data.viewCount || 0,
                createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date()
            };

            // Check if TOP is active
            car.isTopActive = car.isTop && car.topExpiresAtMillis > Date.now();

            allCars.push(car);

            if (car.brand) brands.add(car.brand);
        });

        // Populate brand filter
        const brandSelect = document.getElementById("filterBrand");
        [...brands].sort().forEach(b => {
            const opt = document.createElement("option");
            opt.value = b;
            opt.textContent = b;
            brandSelect.appendChild(opt);
        });

        applyFilters();
    } catch (error) {
        console.error("Error loading cars:", error);
        document.getElementById("loading").innerHTML =
            `<p style="color: #FF5722;">❌ Nepodařilo se načíst inzeráty.<br><small>${error.message}</small></p>`;
    }
}

// ── Filters & Sort ──
window.applyFilters = function () {
    const brand = document.getElementById("filterBrand").value;
    const fuel = document.getElementById("filterFuel").value;
    const transmission = document.getElementById("filterTransmission").value;
    const priceFrom = parseInt(document.getElementById("filterPriceFrom").value) || 0;
    const priceTo = parseInt(document.getElementById("filterPriceTo").value) || Infinity;
    const yearFrom = parseInt(document.getElementById("filterYearFrom").value) || 0;
    const mileageTo = parseInt(document.getElementById("filterMileageTo").value) || Infinity;
    const region = document.getElementById("filterRegion").value;
    const sort = document.getElementById("sortSelect").value;

    let filtered = allCars.filter(car => {
        // Hide suspended cars
        if (car.isSuspended) return false;

        if (brand && car.brand !== brand) return false;
        if (fuel && car.fuel !== fuel) return false;
        if (transmission && car.transmission !== transmission) return false;
        if (car.price < priceFrom || car.price > priceTo) return false;
        if (car.year < yearFrom) return false;
        if (car.mileage > mileageTo) return false;
        if (region && car.region !== region) return false;

        return true;
    });

    // Sort: TOP cars always first, then by selected criteria
    filtered.sort((a, b) => {
        // TOP active first
        if (a.isTopActive && !b.isTopActive) return -1;
        if (!a.isTopActive && b.isTopActive) return 1;

        // Not sold before sold
        if (!a.isSold && b.isSold) return -1;
        if (a.isSold && !b.isSold) return 1;

        switch (sort) {
            case "cheapest": return a.price - b.price;
            case "expensive": return b.price - a.price;
            case "mileage": return a.mileage - b.mileage;
            case "year": return b.year - a.year;
            case "newest":
            default: return b.createdAt - a.createdAt;
        }
    });

    renderCars(filtered);
};

window.resetFilters = function () {
    document.getElementById("filterBrand").value = "";
    document.getElementById("filterFuel").value = "";
    document.getElementById("filterTransmission").value = "";
    document.getElementById("filterPriceFrom").value = "";
    document.getElementById("filterPriceTo").value = "";
    document.getElementById("filterYearFrom").value = "";
    document.getElementById("filterMileageTo").value = "";
    document.getElementById("filterRegion").value = "";
    document.getElementById("sortSelect").value = "newest";
    applyFilters();
};

// ── Render car cards ──
function renderCars(cars) {
    const container = document.getElementById("listings");

    if (cars.length === 0) {
        container.innerHTML = '<div class="no-results">🔍 Žádné inzeráty neodpovídají filtru</div>';
        document.getElementById("carCount").textContent = "0 inzerátů";
        return;
    }

    const activeCount = cars.filter(c => !c.isSold).length;
    const soldCount = cars.filter(c => c.isSold).length;
    document.getElementById("carCount").textContent =
        `${activeCount} inzerátů` + (soldCount > 0 ? ` • ${soldCount} prodáno` : "");

    container.innerHTML = cars.map(car => createCarCard(car)).join("");

    // Attach click listeners
    container.querySelectorAll(".car-card").forEach(card => {
        card.addEventListener("click", () => {
            const id = card.dataset.id;
            const car = allCars.find(c => c.id === id);
            if (car) openDetail(car);
        });
    });
}

function createCarCard(car) {
    const imageHtml = car.imageUrls.length > 0
        ? `<img class="car-image" src="${car.imageUrls[0]}" alt="${car.brand} ${car.model}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=car-image-placeholder>🚗</div>'">`
        : `<div class="car-image-placeholder">🚗</div>`;

    const topBadge = car.isTopActive ? `<span class="badge-top">⭐ TOP</span>` : "";
    const soldBadge = car.isSold ? `<span class="badge-sold">PRODÁNO</span>` : "";
    const photoCount = car.imageUrls.length > 1 ? `<span class="photo-count">📷 ${car.imageUrls.length}</span>` : "";
    const engineInfo = car.engine ? `<span class="spec-tag">🔧 ${car.engine}</span>` : "";
    const cardClass = `car-card${car.isTopActive ? " is-top" : ""}${car.isSold ? " is-sold" : ""}`;

    return `
        <div class="${cardClass}" data-id="${car.id}">
            <div class="car-image-container">
                ${imageHtml}
                ${topBadge}
                ${soldBadge}
                ${photoCount}
            </div>
            <div class="car-info">
                <div class="car-title">${car.brand} ${car.model}</div>
                <div class="car-price">${car.price.toLocaleString("cs-CZ")} Kč</div>
                <div class="car-specs">
                    <span class="spec-tag">📅 ${car.year}</span>
                    <span class="spec-tag">🛣️ ${car.mileage.toLocaleString("cs-CZ")} km</span>
                    ${car.fuel ? `<span class="spec-tag">⛽ ${car.fuel}</span>` : ""}
                    ${engineInfo}
                    ${car.transmission ? `<span class="spec-tag">⚙️ ${car.transmission}</span>` : ""}
                </div>
                <div class="car-location">📍 ${car.region}${car.city ? ", " + car.city : ""}</div>
            </div>
        </div>
    `;
}

// ── Car Detail Modal ──
let currentGalleryIndex = 0;
let currentGalleryUrls = [];

window.openDetail = function (car) {
    currentGalleryIndex = 0;
    currentGalleryUrls = car.imageUrls;

    const stkDisplay = car.stkMonth > 0 && car.stkYear > 0 ? `${String(car.stkMonth).padStart(2, "0")}/${car.stkYear}` : "—";
    const dateDisplay = car.createdAt.toLocaleDateString("cs-CZ");

    const galleryHtml = currentGalleryUrls.length > 0
        ? `
            <img id="galleryImage" src="${currentGalleryUrls[0]}" alt="${car.brand} ${car.model}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2260%22>🚗</text></svg>'">
            ${currentGalleryUrls.length > 1 ? `
                <button class="gallery-nav gallery-prev" onclick="event.stopPropagation(); galleryNav(-1)">‹</button>
                <button class="gallery-nav gallery-next" onclick="event.stopPropagation(); galleryNav(1)">›</button>
                <div class="gallery-counter" id="galleryCounter">1 / ${currentGalleryUrls.length}</div>
            ` : ""}
        `
        : `<div class="car-image-placeholder" style="height:100%">🚗</div>`;

    const contactHtml = (car.phone || car.ownerEmail) ? `
        <div class="detail-contact">
            <h3>📞 Kontakt na prodávajícího</h3>
            ${car.ownerName ? `<p style="margin-bottom:10px;color:#ccc;">👤 ${car.ownerName}</p>` : ""}
            <div class="contact-row">
                ${car.phone ? `<a href="tel:${car.phone}" class="contact-btn contact-phone" onclick="event.stopPropagation()">📞 ${car.phone}</a>` : ""}
                ${car.ownerEmail ? `<a href="mailto:${car.ownerEmail}" class="contact-btn contact-email" onclick="event.stopPropagation()">✉️ Napsat email</a>` : ""}
            </div>
        </div>
    ` : "";

    document.getElementById("modalContent").innerHTML = `
        <div class="detail-gallery">${galleryHtml}</div>
        <div class="detail-body">
            ${car.isTopActive ? `<div style="color: #FFD700; font-size: 14px; margin-bottom: 8px;">⭐ TOP inzerát</div>` : ""}
            ${car.isSold ? `<div style="color: #FF5722; font-size: 14px; margin-bottom: 8px; font-weight: bold;">✅ PRODÁNO</div>` : ""}
            <div class="detail-title">${car.brand} ${car.model}</div>
            <div class="detail-price">${car.price.toLocaleString("cs-CZ")} Kč</div>

            <div class="detail-specs">
                <div class="detail-spec"><div class="detail-spec-label">📅 Rok výroby</div><div class="detail-spec-value">${car.year}</div></div>
                <div class="detail-spec"><div class="detail-spec-label">🛣️ Nájezd</div><div class="detail-spec-value">${car.mileage.toLocaleString("cs-CZ")} km</div></div>
                ${car.fuel ? `<div class="detail-spec"><div class="detail-spec-label">⛽ Palivo</div><div class="detail-spec-value">${car.fuel}</div></div>` : ""}
                ${car.engine ? `<div class="detail-spec"><div class="detail-spec-label">🔧 Motor</div><div class="detail-spec-value">${car.engine}</div></div>` : ""}
                ${car.transmission ? `<div class="detail-spec"><div class="detail-spec-label">⚙️ Převodovka</div><div class="detail-spec-value">${car.transmission}</div></div>` : ""}
                <div class="detail-spec"><div class="detail-spec-label">🔍 STK</div><div class="detail-spec-value">${stkDisplay}</div></div>
                <div class="detail-spec"><div class="detail-spec-label">📍 Lokalita</div><div class="detail-spec-value">${car.region}${car.city ? ", " + car.city : ""}</div></div>
                ${car.vin ? `<div class="detail-spec"><div class="detail-spec-label">🔢 VIN</div><div class="detail-spec-value">${car.vin}</div></div>` : ""}
                <div class="detail-spec"><div class="detail-spec-label">👁️ Zobrazení</div><div class="detail-spec-value">${car.viewCount}</div></div>
                <div class="detail-spec"><div class="detail-spec-label">📅 Přidáno</div><div class="detail-spec-value">${dateDisplay}</div></div>
            </div>

            ${car.description ? `<div class="detail-description">${car.description}</div>` : ""}
            ${contactHtml}
        </div>
    `;

    document.getElementById("modalOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
};

window.closeModal = function (event) {
    if (event && event.target !== document.getElementById("modalOverlay")) return;
    document.getElementById("modalOverlay").classList.remove("open");
    document.body.style.overflow = "";
};

// Close on Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") galleryNav(-1);
    if (e.key === "ArrowRight") galleryNav(1);
});

window.galleryNav = function (direction) {
    if (currentGalleryUrls.length <= 1) return;
    currentGalleryIndex = (currentGalleryIndex + direction + currentGalleryUrls.length) % currentGalleryUrls.length;
    document.getElementById("galleryImage").src = currentGalleryUrls[currentGalleryIndex];
    const counter = document.getElementById("galleryCounter");
    if (counter) counter.textContent = `${currentGalleryIndex + 1} / ${currentGalleryUrls.length}`;
};
