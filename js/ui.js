// --- RENDER OFFICIAL PLAN ---
function renderOfficialPlan() {
    const container = document.getElementById('official-plan-results');
    const finishBtn = document.getElementById('finish-week-btn');
    container.innerHTML = '';

    if (currentOfficialMeals.length === 0) {
        container.innerHTML = '<p class="text-muted">אין תוכנית פעילה כרגע.</p>';
        finishBtn.classList.add('hidden');
        return;
    }

    currentOfficialMeals.forEach(m => {
        container.innerHTML += `
            <div class="meal-card" style="border-right: 4px solid var(--primary, #007bff);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h3>${m.name} <span style="font-size: 0.6em; color: gray;">(בושל ${m.cookCount || 0} פעמים)</span></h3>
                    <button onclick="swapMeal('${m.id}')" title="החלף ארוחה זו" style="background:none; border:none; font-size:1.5em; cursor:pointer;">🎲</button>
                </div>
                ${m.ingredients ? `<strong>מצרכים:</strong><p style="white-space: pre-wrap;">${m.ingredients}</p>` : ''}
                ${m.instructions ? `<strong>הוראות:</strong><p style="white-space: pre-wrap;">${m.instructions}</p>` : ''}
            </div>
        `;
    });
    finishBtn.classList.remove('hidden');
}

// --- RENDER SHOPPING LIST ---
function renderShoppingList() {
    const container = document.getElementById('shopping-list-container');
    container.innerHTML = '';
    
    if (currentOfficialMeals.length === 0) return;

    let allRawLines = [];
    currentOfficialMeals.forEach(m => {
        if (m.ingredients) allRawLines.push(...m.ingredients.split('\n').map(l => l.trim()));
    });

    const multiplier = parseFloat(document.getElementById('servings-multiplier').value) || 1;
    const categorized = categorizeAndAggregate(allRawLines, multiplier);

    for (const [catName, items] of Object.entries(categorized)) {
        if (Object.keys(items).length === 0) continue;
        
        let catHtml = `<div style="margin-bottom: 15px;">
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
                    <button class="recat-btn" onclick="openRecatMenu(event, '${item}')">🏷️</button>
                </li>`;
        }
        container.innerHTML += catHtml + `</ul></div>`;
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
document.addEventListener('click', e => { if (!e.target.closest('#recat-popover')) document.getElementById('recat-popover')?.classList.add('hidden'); });

// --- RENDER LIBRARY & FORMS ---
function renderLibrary() {
    const lib = document.getElementById('meals-library');
    lib.innerHTML = mealsArray.map(m => `
        <div class="meal-list-item">
            <strong>${m.name} <small>(${m.cookCount} בישולים)</small></strong>
            <div>
                <button onclick="editMeal('${m.id}')">ערוך</button>
                <button class="danger-btn" onclick="deleteMeal('${m.id}')">מחק</button>
            </div>
        </div>
    `).join('');
}

function editMeal(id) {
    const meal = mealsArray.find(m => m.id === id);
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
    ['meal-id', 'meal-name', 'meal-ingredients', 'meal-instructions', 'meal-image-file'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('form-title').innerText = 'הוספת מתכון חדש';
    document.getElementById('save-btn').innerText = 'שמור ארוחה';
    document.getElementById('cancel-btn').classList.add('hidden');
}

// --- THEME & EXPORT ---

// Theme Helper Functions
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

// Initial Theme Load (runs automatically)
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    applyTheme('dark');
} else {
    applyTheme('light');
}

// Click Listener for Toggle Button
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

// Export Functions
function generateFormattedTextList() {
    const container = document.getElementById('shopping-list-container');
    let text = "🛒 *רשימת קניות*\n\n";
    container.querySelectorAll('div').forEach(catDiv => {
        const catTitle = catDiv.querySelector('strong')?.innerText;
        if (!catTitle) return;
        text += `*${catTitle}*\n`;
        catDiv.querySelectorAll('li.shopping-item span').forEach(item => text += `• ${item.innerText.trim()}\n`);
        text += '\n';
    });
    return text.trim();
}

function shareToWhatsApp() { 
    const text = generateFormattedTextList();
    if (!text) return alert("רשימת הקניות ריקה.");
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank'); 
}

function copyShoppingList() { 
    const text = generateFormattedTextList();
    if (!text) return alert("רשימת הקניות ריקה.");
    navigator.clipboard.writeText(text).then(() => alert("הועתק!")); 
}