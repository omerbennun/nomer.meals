let sessionDeclinedIds = []; // Holds declined IDs until next plan reset

// --- ALGORITHM: TIERED DRAW ---
function selectMealsByTier(count, filterText, currentBoardIds) {
    let pool = [...mealsArray].filter(m => !currentBoardIds.includes(m.id) && !sessionDeclinedIds.includes(m.id));

    if (filterText) {
        const keywords = filterText.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        pool = pool.filter(meal => keywords.some(kw => (meal.ingredients || '').toLowerCase().includes(kw)));
    }

    // Group by cookCount tier
    const tiers = {};
    pool.forEach(meal => {
        const c = meal.cookCount || 0;
        if (!tiers[c]) tiers[c] = [];
        tiers[c].push(meal);
    });

    // Sort tiers lowest to highest
    const sortedTierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
    
    let selected = [];
    for (const key of sortedTierKeys) {
        if (selected.length >= count) break;
        
        // Shuffle the current tier randomly
        const shuffledTier = tiers[key].sort(() => 0.5 - Math.random());
        
        // Take as many as we need from this tier
        const needed = count - selected.length;
        selected.push(...shuffledTier.slice(0, needed));
    }
    return selected;
}

// --- OFFICIAL PLAN ACTIONS ---
function generateOfficialPlan() {
    if (mealsArray.length === 0) return alert("אין ארוחות במאגר.");
    
    const count = parseInt(document.getElementById('plan-count').value) || 3;
    const filter = document.getElementById('plan-filter').value;
    
    sessionDeclinedIds = []; // Reset limbo on fresh generation
    const chosen = selectMealsByTier(count, filter, []);
    
    if (chosen.length < count && filter) {
         alert(`נמצאו רק ${chosen.length} ארוחות התואמות לסינון.`);
    }

    db.ref('activePlan').set(chosen.map(m => m.id));
}

function swapMeal(mealIdToSwap) {
    sessionDeclinedIds.push(mealIdToSwap); // Send to limbo
    
    const currentActiveIds = [...activePlanIds];
    const index = currentActiveIds.indexOf(mealIdToSwap);
    
    // Request 1 replacement meal, excluding the current board
    const replacement = selectMealsByTier(1, document.getElementById('plan-filter').value, currentActiveIds);
    
    if (replacement.length > 0) {
        currentActiveIds[index] = replacement[0].id;
        db.ref('activePlan').set(currentActiveIds);
    } else {
        alert("אין יותר ארוחות פנויות במאגר להחלפה!");
        sessionDeclinedIds = sessionDeclinedIds.filter(id => id !== mealIdToSwap); // Release from limbo if failed
    }
}

async function finishPlan() {
    if (activePlanIds.length === 0) return;
    if (!confirm("האם לארכב את השבוע הנוכחי? פעולה זו תעדכן את היסטוריית הבישולים.")) return;

    // Increment cookCount for all meals currently on board
    const updates = {};
    activePlanIds.forEach(id => {
        const meal = mealsArray.find(m => m.id === id);
        const newCount = (meal.cookCount || 0) + 1;
        updates[`meals/${id}/cookCount`] = newCount;
    });

    await db.ref().update(updates);
    await db.ref('activePlan').set([]); // Clear the board
    sessionDeclinedIds = [];
    alert("השבוע הסתיים בהצלחה! הסקורבורד עודכן.");
}

// --- SANDBOX (Unaffected by tiers/counts) ---
function randomizeSandbox(count) {
    if (mealsArray.length === 0) return;
    const shuffled = [...mealsArray].sort(() => 0.5 - Math.random());
    const results = shuffled.slice(0, count);
    
    const container = document.getElementById('sandbox-results');
    container.innerHTML = results.map(m => `<div class="meal-card" style="background: var(--card-bg);"><h3>${m.name}</h3></div>`).join('');
}