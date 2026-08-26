// --- RENDER OFFICIAL PLAN ---
function renderOfficialPlan() {
    const container = document.getElementById('official-plan-container') || document.getElementById('official-plan-results');
    const finishBtn = document.getElementById('finish-week-btn');
    if (!container) return;
    container.innerHTML = '';

    if (currentOfficialMeals.length === 0) {
        container.innerHTML = '<p class="text-muted">אין תוכנית פעילה כרגע.</p>';
        if (finishBtn) finishBtn.classList.add('hidden');
        return;
    }

    currentOfficialMeals.forEach(m => {
        const imageHtml = m.image ? `<img src="${m.image}" alt="${m.name}" class="meal-img">` : '';
        const cookCount = m.cookCount || 0;

        container.innerHTML += `
            <div class="meal-card" style="border-right: 4px solid var(--primary, #007bff);">
                <div class="meal-card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${m.name}</h3>
                    <span class="scoreboard-badge">🏆 ${cookCount} בישולים</span>
                </div>
                ${imageHtml}
                ${m.ingredients ? `<strong>מצרכים:</strong><p style="white-space: pre-wrap;">${m.ingredients}</p>` : ''}
                ${m.instructions ? `<strong>הוראות הכנה:</strong><p style="white-space: pre-wrap;">${m.instructions}</p>` : ''}
                <div class="plan-actions" style="margin-top: 15px;">
                    <button class="danger-btn" onclick="swapMeal('${m.id}')">🗑️ החלף ארוחה (ללא ניקוד)</button>
                </div>
            </div>
        `;
    });
    if (finishBtn) finishBtn.classList.remove('hidden');
    if (typeof renderShoppingList === 'function') renderShoppingList();
}

// --- RENDER OFFICIAL SHOPPING LIST ---
function renderShoppingList() {
    const container = document.getElementById('official-shopping-container') || document.getElementById('shopping-list-container');
    const section = document.getElementById('official-shopping-section');
    if (!container) return;
    container.innerHTML = '';
    
    if (currentOfficialMeals.length === 0) {
        if (section) section.classList.add('hidden');
        return;
    }

    let allRawLines = [];
    currentOfficialMeals.forEach(m => {
        if (m.ingredients) allRawLines.push(...m.ingredients.split('\n').map(l => l.trim()));
    });

    const multInput = document.getElementById('servings-multiplier');
    const multiplier = multInput ? parseFloat(multInput.value) || 1 : 1;
    const categorized = categorizeAndAggregate(allRawLines, multiplier);
    let hasItems = false;

    for (const [catName, items] of Object.entries(categorized)) {
        if (Object.keys(items).length === 0) continue;
        hasItems = true;
        
        let catHtml = `<div class="category-block" style="margin-bottom: 15px;">
                        <strong style="color: var(--primary, #007bff);">${catName}:</strong>
                        <ul style="margin: 5px 0 0 0; padding-right: 20px;">`;
        
        for (const [item, data] of Object.entries(items)) {
            let parts = Object.entries(data.units).map(([unit, qty]) => {
                const qStr = Number.isInteger(qty) ? qty : parseFloat(qty.toFixed(2));
                return `${qStr} ${unit}`.trim();
            });
            const noteStr = data.note ? ` <span style="color: #888; font-size: 0.9em;">(${data.note})</span>` : '';
            
            catHtml += `
                <li class="shopping-item">
                    <span onclick="this.classList.toggle('completed')" style="cursor: pointer;">
                        ${parts.join(' + ')} ${item}${noteStr}
                    </span>
                    <button class="recat-btn" title="שנה קטגוריה" onclick="openRecatMenu(event, '${item}')">🏷️</button>
                </li>`;
        }
        container.innerHTML += catHtml + `</ul></div>`;
    }

    if (section) {
        if (hasItems) section.classList.remove('hidden');
        else section.classList.add('hidden');
    }
}

// --- SANDBOX RESULTS & SHOPPING LIST RENDERERS ---
let currentSandboxMeals = [];

function renderSandboxResults() {
    const container = document.getElementById('sandbox-results');
    if (!container) return;
    container.innerHTML = '';

    currentSandboxMeals.forEach(m => {
        const imageHtml = m.image ? `<img src="${m.image}" alt="${m.name}" class="meal-img">` : '';
        const cookCount = m.cookCount || 0;

        container.innerHTML += `
            <div class="meal-card" style="background: var(--card-bg);">
                <div class="meal-card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${m.name}</h3>
                    <span class="scoreboard-badge">🏆 ${cookCount} בישולים</span>
                </div>
                ${imageHtml}
                ${m.ingredients ? `<strong>מצרכים:</strong><p style="white-space: pre-wrap;">${m.ingredients}</p>` : ''}
                ${m.instructions ? `<strong>הוראות הכנה:</strong><p style="white-space: pre-wrap;">${m.instructions}</p>` : ''}
            </div>
        `;
    });

    renderSandboxShoppingList();
}

function renderSandboxShoppingList() {
    const container = document.getElementById('sandbox-shopping-container');
    const section = document.getElementById('sandbox-shopping-section');
    if (!container) return;

    let allRawLines = [];
    currentSandboxMeals.forEach(m => {
        if (m.ingredients) allRawLines.push(...m.ingredients.split('\n').map(l => l.trim()));
    });

    if (allRawLines.length === 0) {
        if (section) section.classList.add('hidden');
        return;
    }

    const multInput = document.getElementById('servings-multiplier');
    const multiplier = multInput ? parseFloat(multInput.value) || 1 : 1;
    const categorized = categorizeAndAggregate(allRawLines, multiplier);
    
    container.innerHTML = '';
    let hasItems = false;

    for (const [catName, items] of Object.entries(categorized)) {
        if (Object.keys(items).length === 0) continue;
        hasItems = true;

        let catHtml = `<div class="category-block" style="margin-bottom: 15px;">
                        <strong style="color: var(--primary, #007bff);">${catName}:</strong>
                        <ul style="margin: 5px 0 0 0; padding-right: 20px;">`;

        for (const [item, data] of Object.entries(items)) {
            let parts = Object.entries(data.units).map(([unit, qty]) => {
                const qStr = Number.isInteger(qty) ? qty : parseFloat(qty.toFixed(2));
                return `${qStr} ${unit}`.trim();
            });
            const noteStr = data.note ? ` <span style="color: #888; font-size: 0.9em;">(${data.note})</span>` : '';

            catHtml += `
                <li class="shopping-item">
                    <span onclick="this.classList.toggle('completed')" style="cursor: pointer;">
                        ${parts.join(' + ')} ${item}${noteStr}
                    </span>
                    <button class="recat-btn" title="שנה קטגוריה" onclick="openRecatMenu(event, '${item}')">🏷️</button>
                </li>`;
        }
        catHtml += `</ul></div>`;
        container.innerHTML += catHtml;
    }

    if (section) {
        if (hasItems) section.classList.remove('hidden');
        else section.classList.add('hidden');
    }
}

// --- RECATEGORIZATION POPOVER ---
function openRecatMenu(event, itemName) {
    event.stopPropagation();
    let popover = document.getElementById('recat-popover');
    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'recat-popover';
        popover.className = 'recat-popover hidden';
        document.body.appendChild(popover);
    }
    
    const categories = Object.keys(ingredientDictionary).filter(c => c !== "שונות");
    popover.innerHTML = `<div class="popover-title">העבר קטגוריה:</div>` + 
        categories.map(c => `<button class="popover-item-btn" onclick="teachDictionary('${itemName}', '${c}'); document.getElementById('recat-popover').classList.add('hidden')">${c}</button>`).join('');
    
    const rect = event.target.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popover.style.left = `${rect.left + window.scrollX - 100}px`;
    popover.classList.remove('hidden');
}
document.addEventListener('click', e => { if (!e.target.closest('#recat-popover') && !e.target.closest('.recat-btn')) document.getElementById('recat-popover')?.classList.add('hidden'); });

// --- RENDER LIBRARY & FORMS ---
function renderLibrary() {
    const lib = document.getElementById('meals-library');
    if (!lib) return;
    lib.innerHTML = mealsArray.map(m => `
        <div class="meal-list-item">
            <strong>${m.name} <small class="scoreboard-badge">🏆 ${m.cookCount || 0} בישולים</small></strong>
            <div>
                <button onclick="editMeal('${m.id}')">ערוך</button>
                <button class="danger-btn" onclick="deleteMeal('${m.id}')">מחק</button>
            </div>
        </div>
    `).join('');
}

function editMeal(id) {
    const meal = mealsArray.find(m => m.id === id);
    if (!meal) return;
    document.getElementById('meal-id').value = id;
    document.getElementById('meal-name').value = meal.name || '';
    document.getElementById('meal-ingredients').value = meal.ingredients || '';
    document.getElementById('meal-instructions').value = meal.instructions || '';
    
    document.getElementById('form-title').innerText = 'עריכת מתכון';
    document.getElementById('save-btn').innerText = 'עדכן ארוחה';
    document.getElementById('cancel-btn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    ['meal-id', 'meal-name', 'meal-ingredients', 'meal-instructions', 'meal-image-file'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('form-title').innerText = 'הוספת מתכון חדש';
    document.getElementById('save-btn').innerText = 'שמור ארוחה';
    document.getElementById('cancel-btn').classList.add('hidden');
}

// --- THEME & EXPORT ---
function applyTheme(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerText = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        if (themeToggle) themeToggle.innerText = '🌙';
    }
}

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme((savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) ? 'dark' : 'light');

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

function generateFormattedTextList(containerId = 'shopping-list-container') {
    const container = document.getElementById(containerId) || document.getElementById('official-shopping-container');
    if (!container) return '';
    let text = "🛒 *רשימת קניות*\n\n";
    container.querySelectorAll('.category-block, div').forEach(catDiv => {
        const catTitle = catDiv.querySelector('strong')?.innerText;
        if (!catTitle) return;
        text += `*${catTitle}*\n`;
        catDiv.querySelectorAll('li.shopping-item span').forEach(item => text += `• ${item.innerText.trim()}\n`);
        text += '\n';
    });
    return text.trim();
}

function shareToWhatsApp(containerId) { 
    const text = generateFormattedTextList(containerId);
    if (!text) return alert("רשימת הקניות ריקה.");
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank'); 
}

function copyShoppingList(containerId) { 
    const text = generateFormattedTextList(containerId);
    if (!text) return alert("רשימת הקניות ריקה.");
    navigator.clipboard.writeText(text).then(() => alert("הועתק!")); 
}

// --- TAB NAVIGATION ---
function switchTab(tabId, event) {
    // 1. Hide all tab content sections
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('hidden');
        tab.style.display = 'none';
    });

    // 2. Remove active state from all navigation buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Show and activate the targeted tab container
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.classList.remove('hidden');
        targetTab.style.display = 'block';
    }

    // 4. Highlight the active button
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    // 5. Force re-render of components when switching
    if (tabId === 'tab-library' && typeof renderLibrary === 'function') {
        renderLibrary();
    }
    if (tabId === 'tab-official' && typeof renderOfficialPlan === 'function') {
        renderOfficialPlan();
    }
}

// Ensure library renders immediately if data is already loaded
if (typeof mealsArray !== 'undefined' && mealsArray.length > 0) {
    if (typeof renderLibrary === 'function') renderLibrary();
}