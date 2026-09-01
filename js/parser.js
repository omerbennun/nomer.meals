// --- INGREDIENT DICTIONARY ---
async function loadIngredientDictionary() {
    const dictRef = db.ref('settings/ingredientDictionary');
    const snapshot = await dictRef.once('value');

    if (snapshot.exists()) {
        ingredientDictionary = snapshot.val();
    } else {
        ingredientDictionary = {
            "מזווה ויבשים": ["רסק עגבניות", "עגבניות מרוסקות", "פסטה", "אורז", "קמח", "סוכר", "שמן", "שמן זית", "עדשים", "שעועית", "בורגול", "פירורי לחם", "שיבולת שועל", "אטריות", "חומוס", "אבקת אפיה"],
            "תבלינים ורטבים": ["פלפל שחור", "פלפל שחור גרוס", "מלח", "כמון", "פפריקה", "רוטב סויה", "חומץ", "רוטב צ'ילי", "כורכום", "אורגנו"],
            "בשר, עוף ודגים": ["בקר", "עוף", "חזה עוף", "טחינה", "סלמון", "דג", "בשר טחון", "הודו", "קציצות", "שניצל"],
            "מוצרי חלב וביצים": ["חלב", "ביצים", "ביצה", "גבינה", "חמאה", "שמנת", "יוגורט", "קוטג'", "גבינה צהובה"],
            "ירקות ופירות": ["עגבנייה", "עגבניות", "בצל", "שום", "גזר", "מלפפון", "תפוח אדמה", "פלפל", "לימון", "לימונים", "פטרוזיליה", "כוסברה", "חסה", "קישוא", "חציל", "בטטה", "אבוקדו", "סלרי", "סלק"],
            "שונות": []
        };
        await dictRef.set(ingredientDictionary);
    }

    // Trigger re-render on load so categories reflect immediately on startup
    if (typeof renderOfficialPlan === 'function') renderOfficialPlan();
    if (typeof renderShoppingList === 'function') renderShoppingList();
    if (typeof renderSandboxShoppingList === 'function') renderSandboxShoppingList();
}

async function teachDictionary(itemName, newCategory) {
    if (!newCategory) return;
    for (const cat in ingredientDictionary) {
        if (Array.isArray(ingredientDictionary[cat])) {
            ingredientDictionary[cat] = ingredientDictionary[cat].filter(kw => kw !== itemName);
        }
    }
    if (!ingredientDictionary[newCategory]) ingredientDictionary[newCategory] = [];
    if (!ingredientDictionary[newCategory].includes(itemName)) {
        ingredientDictionary[newCategory].push(itemName);
    }

    await db.ref('settings/ingredientDictionary').set(ingredientDictionary);

    if (typeof renderOfficialPlan === 'function') renderOfficialPlan();
    if (typeof renderShoppingList === 'function') renderShoppingList();
    if (typeof renderSandboxShoppingList === 'function') renderSandboxShoppingList();
}

// --- UNIT NORMALIZATION ---
function normalizeUnit(unit) {
    if (!unit) return '';
    const clean = unit.replace(/['"״׳]/g, '').trim();
    if (['קג', 'קילוגרם', 'ק׳ג'].includes(clean)) return 'ק״ג';
    if (['גרם', 'ג'].includes(clean)) return 'גרם';
    if (['מל', 'מליליטר'].includes(clean)) return 'מ״ל';
    if (['ליטר'].includes(clean)) return 'ליטר';
    if (['כוס', 'כוסות'].includes(clean)) return 'כוס';
    if (['כף', 'כפות'].includes(clean)) return 'כף';
    if (['כפית', 'כפיות'].includes(clean)) return 'כפית';
    if (['חבילה', 'חבילות', 'חבילת'].includes(clean)) return 'חבילה';
    if (['קופסה', 'קופסאות', 'קופסת'].includes(clean)) return 'קופסה';
    if (['שקית', 'שקיות'].includes(clean)) return 'שקית';
    if (['שן', 'שיני'].includes(clean)) return 'שן';
    return clean;
}

// --- INSTRUCTION FILTER ---
function isInstructionLine(line, cleanName) {
    const trimmedLine = line.trim();
    if (trimmedLine.endsWith(':') || trimmedLine.startsWith('–') || trimmedLine.startsWith('-')) return true;

    const firstWord = cleanName.trim().split(/\s+/)[0] || '';

    // Verbs starting with Lamed that indicate preparation steps
    const instructionVerbs = [
        'לטחון', 'להוסיף', 'ללוש', 'לערבב', 'לבשל', 'לחתוך', 'להרתיח', 
        'לקצוץ', 'לטגן', 'לחמם', 'לסדר', 'למרוח', 'להעביר', 'לסנן', 
        'להכניס', 'לאפות', 'לצקת', 'לפורר', 'לשטוף', 'לקלף', 'להשהות', 
        'לקרר', 'לצנן', 'להניח', 'לכסות', 'לתבל', 'לשפוך', 'לקפל', 'לרוטב'
    ];

    if (instructionVerbs.includes(firstWord)) return true;

    if (firstWord.startsWith('ל') && firstWord.length >= 3) {
        const instructionKeywords = ['הכל', 'יחד', 'למקרר', 'מכוסה', 'דקות', 'דק', 'תנור', 'מחבת', 'סיר', 'קערה', 'אש', 'מעלות'];
        if (instructionKeywords.some(kw => line.includes(kw))) return true;
    }

    return false;
}

// --- PARSING & AGGREGATION LOGIC ---
function parseHebrewQuantityAndUnit(line) {
    let qty = 1;
    let unit = '';
    let notes = [];

    // 1. Extract bracketed or parenthetical notes e.g. (טרי) or [קצוץ]
    let cleanName = line.replace(/[\(\\[](.*?)[\)\\]]/g, (match, innerText) => {
        if (innerText.trim()) notes.push(innerText.trim());
        return '';
    });

    // 2. Parse numbers written as Hebrew words
    const wordNumbers = {
        'חצי': 0.5, 'רבע': 0.25, 'אחת': 1, 'אחד': 1, 'שתי': 2, 'שני': 2, 'שנים': 2,
        'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5,
        'שש': 6, 'שישה': 6, 'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'עשרה': 10
    };

    const knownUnits = [
        'ק״ג', 'ק׳ג', 'קג', 'גרם', 'ג\'', 'ג', 'מ״ל', 'מל', 'ליטר', 
        'כוסות', 'כוס', 'כפות', 'כף', 'כפיות', 'כפית', 'שיני', 'שן', 
        'חבילת', 'חבילה', 'חבילות', 'צרור', 'קופסת', 'קופסה', 'קופסאות', 
        'שקית', 'שקיות', 'יחידה', 'יחידות'
    ];

    const words = cleanName.trim().split(/\s+/);
    if (words.length > 0) {
        const firstWord = words[0];
        if (wordNumbers[firstWord] !== undefined) {
            qty = wordNumbers[firstWord];
            cleanName = words.slice(1).join(' ');
        } else {
            const numericMatch = firstWord.match(/^([0-9]+(?:\.[0-9]+)?)/);
            if (numericMatch) {
                qty = parseFloat(numericMatch[1]) || 1;
                cleanName = words.slice(1).join(' ');
            }
        }
    }

    // 3. Extract unit
    const remainingWords = cleanName.trim().split(/\s+/);
    if (remainingWords.length > 0 && knownUnits.includes(remainingWords[0])) {
        unit = normalizeUnit(remainingWords[0]);
        cleanName = remainingWords.slice(1).join(' ');
    }

    // 4. Extract preparation descriptors into notes
    const descriptorsRegex = /חתוך לקוביות|חתוך|חתוכה|חתוכים|חתוכות|פרוס|פרוסה|פרוסים|פרוסות|קצוץ|קצוצה|קצוצים|קצוצות|מגורר|מגוררת|מגוררים|מגוררות|כתוש|כתושה|כתושים|כתושות|קלופ|קלופה|קלופים|קלופות|קלוף|רצועות|מעוך|מעוכה|מרוסק|מרוסקת|טרי|טרייה|טריים|טריות|קפוא|קפואה|קפואים|קפואות|יבש|יבשה|יבשים|יבשות|מבושל|מבושלת|מבושלים|מבושלות|אפוי|אפויה|אפויים|אפויות|מטוגן|מטוגנת|מטוגנים|מטוגנות|קלוי|קלויה|קלויים|קלויות|מושרה|מושרים|מושרות|שטוף|שטופה|שטופים|שטופות|מנופה|מנופת|סחוט|סחוטה|סחוטים|סחוטות|שימורים|מיובש|מיובשת|שלם|שלמה|שלמים|שלמות|מגורען|מגורענת|ללא גרעינים|גדוש|גדושה|קמצוץ|לפי הטעם|מעט|הרבה/g;
    const foundDescriptors = cleanName.match(descriptorsRegex);
    if (foundDescriptors) {
        foundDescriptors.forEach(d => {
            if (!notes.includes(d)) notes.push(d);
        });
    }

    // 5. Clean name
    cleanName = cleanName
        .replace(descriptorsRegex, '')
        .replace(/['"״׳]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    let note = notes.filter(Boolean).join(', ');

    return { qty, unit, cleanName, note };
}

function categorizeAndAggregate(rawLines, multiplier = 1) {
    const categories = {
        "ירקות ופירות": {},
        "בשר, עוף ודגים": {},
        "מוצרי חלב וביצים": {},
        "מזווה ויבשים": {},
        "תבלינים ורטבים": {},
        "שונות": {}
    };

    // Ensure all dictionary categories exist in structure
    Object.keys(ingredientDictionary).forEach(k => {
        if (!categories[k]) categories[k] = {};
    });

    rawLines.forEach(line => {
        if (!line) return;

        const parsed = parseHebrewQuantityAndUnit(line);
        let itemName = parsed.cleanName;

        if (!itemName || itemName.length < 2) return;

        // Filter out instruction steps
        if (isInstructionLine(line, parsed.cleanName)) return;

        let assignedCategory = "שונות"; 
        let longestMatch = "";

        // Match against dictionary keywords
        for (const [cat, keywords] of Object.entries(ingredientDictionary)) {
            if (!Array.isArray(keywords)) continue;
            for (const kw of keywords) {
                if (line.includes(kw) && kw.length > longestMatch.length) {
                    longestMatch = kw;
                    assignedCategory = cat;
                }
            }
        }

        // Canonicalize name to merge identical ingredients
        if (longestMatch) {
            itemName = longestMatch;
        } else {
            itemName = itemName.replace(/\s+(טרי|קפוא|יבש)$/g, '').trim();
        }

        if (!categories[assignedCategory][itemName]) {
            categories[assignedCategory][itemName] = { units: {}, note: '' };
        }
        
        let unitKey = parsed.unit || '';
        if (!categories[assignedCategory][itemName].units[unitKey]) {
            categories[assignedCategory][itemName].units[unitKey] = 0;
        }

        // Apply quantity multiplier
        categories[assignedCategory][itemName].units[unitKey] += (parsed.qty * multiplier);
        
        // Merge notes without duplicates
        if (parsed.note) {
            let currentNotes = categories[assignedCategory][itemName].note 
                ? categories[assignedCategory][itemName].note.split(', ') 
                : [];
            let incomingNotes = parsed.note.split(', ');
            incomingNotes.forEach(n => {
                const trimmed = n.trim();
                if (trimmed && !currentNotes.includes(trimmed)) {
                    currentNotes.push(trimmed);
                }
            });
            categories[assignedCategory][itemName].note = currentNotes.join(', ');
        }
    });

    return categories;
}