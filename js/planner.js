let sessionDeclinedIds = []; // Holds declined IDs until next plan reset

// --- ALGORITHM: TIERED DRAW ---
function selectMealsByTier(count, filterText, currentBoardIds) {
    let pool = [...mealsArray].filter(m => !currentBoardIds.includes(m.id) && !sessionDeclinedIds.includes(m.id));

    if (filterText) {
        const keywords = filterText.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        pool = pool.filter(meal => keywords.some(kw => (meal.ingredients || '').toLowerCase().includes(kw)));
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
    if (mealsArray.length === 0) return alert("אין ארוחות במאגר.");
    
    const countInput = document.getElementById('plan-count');
    const count = presetCount || (countInput ? parseInt(countInput.value) : 3);
    const filterInput = document.getElementById('plan-filter');
    const filter = filterInput ? filterInput.value : '';
    
    sessionDeclinedIds = []; 
    const chosen = selectMealsByTier(count, filter, []);
    
    if (chosen.length < count && filter) {
         alert(`נמצאו רק ${chosen.length} ארוחות התואמות לסינון.`);
    }

    db.ref('activePlan').set(chosen.map(m => m.id));
}

function swapMeal(mealIdToSwap) {
    sessionDeclinedIds.push(mealIdToSwap);
    
    const currentActiveIds = [...activePlanIds];
    const index = currentActiveIds.indexOf(mealIdToSwap);
    const filterInput = document.getElementById('plan-filter');
    const filter = filterInput ? filterInput.value : '';
    
    const replacement = selectMealsByTier(1, filter, currentActiveIds);
    
    if (replacement.length > 0) {
        currentActiveIds[index] = replacement[0].id;
        db.ref('activePlan').set(currentActiveIds);
    } else {
        alert("אין יותר ארוחות פנויות במאגר להחלפה!");
        sessionDeclinedIds = sessionDeclinedIds.filter(id => id !== mealIdToSwap);
    }
}

async function finishPlan() {
    if (activePlanIds.length === 0) return;
    if (!confirm("האם לארכב את השבוע הנוכחי? פעולה זו תעדכן את היסטוריית הבישולים.")) return;

    const updates = {};
    activePlanIds.forEach(id => {
        const meal = mealsArray.find(m => m.id === id);
        const newCount = (meal ? meal.cookCount || 0 : 0) + 1;
        updates[`meals/${id}/cookCount`] = newCount;
    });

    await db.ref().update(updates);
    await db.ref('activePlan').set([]); 
    sessionDeclinedIds = [];
    alert("השבוע הסתיים בהצלחה! הסקורבורד עודכן.");
}

// --- SANDBOX GENERATOR ---
function randomizeSandbox(count) {
    if (mealsArray.length === 0) return alert("אין ארוחות במאגר.");

    const filterText = document.getElementById('pantry-filter')?.value.trim().toLowerCase() || '';
    let pool = [...mealsArray];

    if (filterText) {
        const keywords = filterText.split(',').map(k => k.trim()).filter(Boolean);
        if (keywords.length > 0) {
            pool = pool.filter(meal => {
                const ingredientsText = (meal.ingredients || '').toLowerCase();
                return keywords.some(kw => ingredientsText.includes(kw));
            });
        }
    }

    if (pool.length === 0) {
        return alert("לא נמצאו ארוחות המכילות את המצרכים שצוינו.");
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    currentSandboxMeals = shuffled.slice(0, count);

    if (typeof renderSandboxResults === 'function') {
        renderSandboxResults();
    }
}