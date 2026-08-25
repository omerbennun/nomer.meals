// --- INGREDIENT DICTIONARY ---
async function loadIngredientDictionary() {
    const snapshot = await db.ref('settings/ingredientDictionary').once('value');
    if (snapshot.exists()) {
        ingredientDictionary = snapshot.val();
    } else {
        ingredientDictionary = { "ירקות ופירות": [], "בשר, עוף ודגים": [], "שונות": [] }; // Minimal fallback
    }
}

async function teachDictionary(itemName, newCategory) {
    if (!newCategory) return;
    for (const cat in ingredientDictionary) {
        if (Array.isArray(ingredientDictionary[cat])) {
            ingredientDictionary[cat] = ingredientDictionary[cat].filter(kw => kw !== itemName);
        }
    }
    if (!ingredientDictionary[newCategory]) ingredientDictionary[newCategory] = [];
    ingredientDictionary[newCategory].push(itemName);
    
    await db.ref('settings/ingredientDictionary').set(ingredientDictionary);
    renderShoppingList(); // Re-render live
}

// --- PARSING LOGIC ---
function parseHebrewQuantityAndUnit(line) {
    let qty = 1;
    let unit = '';
    let notes = [];

    let cleanName = line.replace(/\((.*?)\)/g, (match, inner) => {
        notes.push(inner.trim()); return '';
    });

    const words = cleanName.trim().split(/\s+/);
    const numericMatch = words[0]?.match(/^([0-9]+(?:\.[0-9]+)?)/);
    if (numericMatch) {
        qty = parseFloat(numericMatch[1]) || 1;
        cleanName = words.slice(1).join(' ');
    } else if (['חצי','רבע','אחת','שתי'].includes(words[0])) {
        // ... Extend this block with your full number mappings if needed
        qty = words[0] === 'חצי' ? 0.5 : (words[0] === 'רבע' ? 0.25 : 1);
        cleanName = words.slice(1).join(' ');
    }

    const remaining = cleanName.trim().split(/\s+/);
    if (['ק״ג','גרם','מ״ל','ליטר','כוס','כפות','כפית'].includes(remaining[0])) {
        unit = remaining[0];
        cleanName = remaining.slice(1).join(' ');
    }

    cleanName = cleanName.replace(/['"״׳]/g, '').trim();
    return { qty, unit, cleanName, note: notes.join(', ') };
}

function categorizeAndAggregate(rawLines, multiplier = 1) {
    const categories = { "שונות": {} };
    Object.keys(ingredientDictionary).forEach(k => categories[k] = {});

    rawLines.forEach(line => {
        if (!line || line.endsWith(':')) return;
        
        const parsed = parseHebrewQuantityAndUnit(line);
        let itemName = parsed.cleanName;
        if (itemName.length < 2) return;

        let assignedCategory = "שונות"; 
        let longestMatch = 0;

        for (const [cat, keywords] of Object.entries(ingredientDictionary)) {
            if (!Array.isArray(keywords)) continue;
            for (const kw of keywords) {
                if (line.includes(kw) && kw.length > longestMatch) {
                    longestMatch = kw.length;
                    assignedCategory = cat;
                }
            }
        }

        if (!categories[assignedCategory][itemName]) {
            categories[assignedCategory][itemName] = { units: {}, note: '' };
        }
        
        let u = parsed.unit || '';
        if (!categories[assignedCategory][itemName].units[u]) categories[assignedCategory][itemName].units[u] = 0;
        categories[assignedCategory][itemName].units[u] += (parsed.qty * multiplier);
    });

    return categories;
}