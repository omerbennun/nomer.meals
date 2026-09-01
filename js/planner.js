let sessionDeclinedIds = []; // Holds declined IDs until next plan reset

// --- ALGORITHM: TIERED DRAW ---

function stemHebrewWord(word) {
    let w = word.trim();
    if (!w) return '';
    
    // 1. Strip plural suffixes generically first (while sofit letters are intact)
    if (w.endsWith('ות')) w = w.slice(0, -2);
    else if (w.endsWith('ים')) w = w.slice(0, -2);
    
    // 2. Strip feminine singular endings and spelling variations (כתיב מלא/חסר)
    if (w.endsWith('ייה')) w = w.slice(0, -3);
    else if (w.endsWith('יה')) w = w.slice(0, -2);
    else if (w.endsWith('ה')) w = w.slice(0, -1);
    
    // 3. Replace Hebrew final letters (אותיות סופיות) with their middle counterparts last
    w = w.replace(/ך/g, 'כ')
         .replace(/ם/g, 'מ')
         .replace(/ן/g, 'נ')
         .replace(/ף/g, 'פ')
         .replace(/ץ/g, 'צ');
    
    return w;
}

function normalizeHebrewSearch(str) {
    if (!str) return '';
    return str.toLowerCase()
        .split(/\s+/)
        .map(stemHebrewWord)
        .join(' ');
}

function hebrewMatch(text, keyword) {
    const normText = normalizeHebrewSearch(text);
    const normKw = normalizeHebrewSearch(keyword);
    return normText.includes(normKw);
}

function selectMealsByTier(count, filterText, currentBoardIds = [], ignoreDeclined = false) {
    let pool = [...mealsArray].filter(meal => {
        if (currentBoardIds.includes(meal.id)) return false;
        if (!ignoreDeclined && sessionDeclinedIds.includes(meal.id)) return false;
        return true;
    });

    if (filterText) {
        const keywords = filterText.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        pool = pool.filter(meal => {
            const ingredientsText = (meal.ingredients || '').toLowerCase();
            return keywords.some(kw => hebrewMatch(ingredientsText, kw));
        });
    }

    const tiers = {};
    pool.forEach(meal => {
        const c = meal.cookCount || 0;
        if (!tiers[c]) tiers[c] = [];
        tiers[c].push(meal);
    });

    const sortedTierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
    
    let selected = [];
    for (const key of sortedTierKeys) {
        if (selected.length >= count) break;
        const shuffledTier = tiers[key].sort(() => 0.5 - Math.random());
        const needed = count - selected.length;
        selected.push(...shuffledTier.slice(0, needed));
    }
    return selected;
}

// --- OFFICIAL PLAN ACTIONS ---
function generateOfficialPlan(presetCount) {
    if (isGuestMode) {
        return alert("פעולה זו אינה זמינה במצב אורח.");
    }

    if (mealsArray.length === 0) return alert("אין ארוחות במאגר.");
    
    const countInput = document.getElementById('plan-count');
    let count = presetCount || (countInput ? parseInt(countInput.value, 10) : 3);

    // Force integer range strictly between 1 and 3
    if (isNaN(count) || count < 1) count = 1;
    if (count > 3) {
        count = 3;
        if (countInput) countInput.value = 3;
    }
    
    const filterInput = document.getElementById('plan-filter');
    const filter = filterInput ? filterInput.value : '';
    
    sessionDeclinedIds = []; 
    const chosen = selectMealsByTier(count, filter, []);
    
    if (chosen.length < count && filter) {
         alert(`נמצאו רק ${chosen.length} ארוחות התואמות לסינון.`);
    }

    db.ref('activePlan').set(chosen.map(m => m.id)).catch(err => {
        console.error("Error setting active plan:", err);
        alert("שגיאה בשמירת התוכנית. ודא שאתה מחובר.");
    });
}

function swapMeal(mealIdToSwap) {
    // 1. Temporarily add to declined
    if (!sessionDeclinedIds.includes(mealIdToSwap)) {
        sessionDeclinedIds.push(mealIdToSwap);
    }
    
    const currentActiveIds = [...activePlanIds];
    const index = currentActiveIds.indexOf(mealIdToSwap);
    const filterInput = document.getElementById('plan-filter');
    const filter = filterInput ? filterInput.value.trim() : '';
    
    // Attempt 1: Normal selection with current filter and declined state
    let replacement = selectMealsByTier(1, filter, currentActiveIds);
    
    if (replacement.length > 0) {
        currentActiveIds[index] = replacement[0].id;
        db.ref('activePlan').set(currentActiveIds);
        return;
    }
    
    // --- DIAGNOSIS & FALLBACK HANDLING ---
    const backupDeclined = [...sessionDeclinedIds];
    
    // Test Scenario A: Did we just run out of options because of session declinations?
    sessionDeclinedIds = []; // Clear temporarily
    let replacementWithoutDeclined = selectMealsByTier(1, filter, currentActiveIds);
    
    if (replacementWithoutDeclined.length > 0) {
        // Pool exhausted! Auto-reset declined list and proceed with swap
        showToast("כל הארוחות תואמות הסינון הוצגו. האפשרויות אופסו מחדש!");
        currentActiveIds[index] = replacementWithoutDeclined[0].id;
        db.ref('activePlan').set(currentActiveIds);
        return;
    }
    
    // Test Scenario B: Is the active text filter blocking all remaining library meals?
    let replacementWithoutFilterOrDeclined = selectMealsByTier(1, '', currentActiveIds);
    
    // Restore declined state before triggering alerts
    sessionDeclinedIds = backupDeclined;
    
    if (replacementWithoutFilterOrDeclined.length > 0) {
        // The filter is the bottleneck
        alert(`אין ארוחות נוספות במאגר התואמות את הסינון "${filter}". נקה את שדה הסינון כדי לראות אפשרויות נוספות.`);
    } else {
        // Truly no other meals exist in the database library
        alert("אין ארוחות נוספות במאגר להחלפה. הוסף מתכונים נוספים למאגר כדי לאפשר החלפות.");
    }
    
    // Roll back the current meal from declined so the user isn't locked out
    sessionDeclinedIds = sessionDeclinedIds.filter(id => id !== mealIdToSwap);
}

// Toast notification helper for smooth feedback
function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:10px 20px; border-radius:5px; z-index:1000; transition:opacity 0.3s; font-size: 14px;";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}

async function finishPlan() {
    if (!activePlanIds || activePlanIds.length === 0) {
        alert("אין ארוחות פעילות בתוכנית כרגע.");
        return;
    }

    if (!confirm("האם לארכב את השבוע הנוכחי? פעולה זו תעדכן את היסטוריית הבישולים.")) return;

    try {
        const updates = {};

        // Increment cook count for each meal in the active plan
        activePlanIds.forEach(id => {
            const meal = mealsArray.find(m => m.id === id);
            const currentCount = meal ? (meal.cookCount || 0) : 0;
            updates[`meals/${id}/cookCount`] = currentCount + 1;
        });

        // Reset active plan in Firebase
        updates['activePlan'] = [];

        await db.ref().update(updates);

        // Reset local session tracking
        sessionDeclinedIds = [];
        currentOfficialMeals = [];
        officialMealMultipliers = {};

        alert("השבוע הסתיים בהצלחה! מדד הבישולים עודכן.");

        // Refresh UI
        if (typeof renderOfficialPlan === 'function') renderOfficialPlan();
        if (typeof renderLibrary === 'function') renderLibrary();

    } catch (error) {
        console.error("Error committing plan:", error);
        alert("אירעה שגיאה בעידכון התוכנית. אנא נסה שוב.");
    }
}

// --- SANDBOX GENERATOR ---
function randomizeSandbox(count) {
    if (mealsArray.length === 0) return alert("אין ארוחות במאגר.");

    const filterText = document.getElementById('pantry-filter')?.value.trim() || '';
    
    // Use the exact same tiered selection and hebrewMatch logic as the official plan
    const chosen = selectMealsByTier(count, filterText, [], true);

    if (chosen.length === 0) {
        return alert("לא נמצאו ארוחות המכילות את המצרכים שצוינו.");
    }

    if (chosen.length < count && filterText) {
        // Optional notice if filter results are fewer than requested count
        console.warn(`Found only ${chosen.length} meals matching sandbox filter.`);
    }

    currentSandboxMeals = chosen;

    if (typeof renderSandboxResults === 'function') {
        renderSandboxResults();
    }
}