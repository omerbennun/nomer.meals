// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDY1dl97i0-Des1CmHCb9wNA8jpmAIuNac",
  authDomain: "mymeals-f5dc0.firebaseapp.com",
  databaseURL: "https://mymeals-f5dc0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mymeals-f5dc0",
  storageBucket: "mymeals-f5dc0.firebasestorage.app",
  messagingSenderId: "533677624737",
  appId: "1:533677624737:web:8821f04f8aa2a1a6998fe0",
  measurementId: "G-1Y8SZCZ4GE"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentMeals = {};
let mealsArray = [];

// --- DARK MODE LOGIC ---
const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.innerText = '☀️';
}
themeToggle.addEventListener('click', () => {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerText = '🌙';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerText = '☀️';
    }
});

// --- AUTHENTICATION ---
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('logout-btn').classList.add('hidden');
    }
});

function login() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    document.getElementById('login-error').innerText = '';
    auth.signInWithEmailAndPassword(email, pass).catch((error) => {
        document.getElementById('login-error').innerText = "שגיאה בהתחברות. ודא שאימייל והסיסמה נכונים.";
    });
}

function logout() { auth.signOut(); }

// --- DATABASE LISTENER ---
db.ref('meals').on('value', (snapshot) => {
    currentMeals = snapshot.val() || {};
    mealsArray = [];
    const libraryDiv = document.getElementById('meals-library');
    libraryDiv.innerHTML = '';

    if (Object.keys(currentMeals).length === 0) {
        libraryDiv.innerHTML = '<p class="text-muted">אין ארוחות במאגר.</p>';
        return;
    }

    for (const id in currentMeals) {
        const meal = currentMeals[id];
        mealsArray.push({ id, ...meal });
        
        libraryDiv.innerHTML += `
            <div class="meal-list-item">
                <strong>${meal.name}</strong>
                <div class="meal-actions">
                    <button onclick="editMeal('${id}')">ערוך</button>
                    <button class="danger-btn" onclick="deleteMeal('${id}')">מחק</button>
                </div>
            </div>
        `;
    }
});

// --- SAVE MEAL ---
function saveMeal() {
    const id = document.getElementById('meal-id').value;
    const name = document.getElementById('meal-name').value.trim();
    const ingredients = document.getElementById('meal-ingredients').value.trim();
    const instructions = document.getElementById('meal-instructions').value.trim();
    const fileInput = document.getElementById('meal-image-file');
    let existingImage = document.getElementById('meal-image-url').value;

    if (!name) return alert("חובה להזין את שם הארוחה.");

    const commitToDatabase = (imageData) => {
        const mealData = {
            name: name,
            ingredients: ingredients,
            instructions: instructions,
            image: imageData || ""
        };

        if (id) {
            db.ref(`meals/${id}`).update(mealData);
            alert("הארוחה עודכנה בהצלחה!");
        } else {
            db.ref('meals').push(mealData);
            alert("ארוחה חדשה נוספה בהצלחה!");
        }
        resetForm();
    };

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) { commitToDatabase(e.target.result); };
        reader.readAsDataURL(file);
    } else {
        commitToDatabase(existingImage);
    }
}

function editMeal(id) {
    const meal = currentMeals[id];
    document.getElementById('meal-id').value = id;
    document.getElementById('meal-name').value = meal.name || '';
    document.getElementById('meal-ingredients').value = meal.ingredients || '';
    document.getElementById('meal-instructions').value = meal.instructions || '';
    document.getElementById('meal-image-url').value = meal.image || '';
    document.getElementById('meal-image-file').value = '';
    
    document.getElementById('form-title').innerText = 'עריכת מתכון';
    document.getElementById('save-btn').innerText = 'עדכן ארוחה';
    document.getElementById('cancel-btn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteMeal(id) {
    if (confirm("האם אתה בטוח שברצונך למחוק ארוחה זו?")) {
        db.ref(`meals/${id}`).remove();
    }
}

function resetForm() {
    document.getElementById('meal-id').value = '';
    document.getElementById('meal-name').value = '';
    document.getElementById('meal-ingredients').value = '';
    document.getElementById('meal-instructions').value = '';
    document.getElementById('meal-image-file').value = '';
    document.getElementById('meal-image-url').value = '';
    
    document.getElementById('form-title').innerText = 'הוספת מתכון חדש';
    document.getElementById('save-btn').innerText = 'שמור ארוחה';
    document.getElementById('cancel-btn').classList.add('hidden');
}

// --- HEBREW INGREDIENT DICTIONARY ---
const ingredientDictionary = {
    "מזווה ויבשים": ["רסק עגבניות", "עגבניות מרוסקות", "פסטה", "אורז", "קמח", "סוכר", "שמן", "שמן זית", "עדשים", "שעועית", "בורגול", "פירורי לחם", "שיבולת שועל", "אטריות", "חומוס", "אבקת אפיה"],
    "תבלינים ורטבים": ["פלפל שחור", "פלפל שחור גרוס", "מלח", "כמון", "פפריקה", "רוטב סויה", "חומץ", "רוטב צ'ילי", "כורכום", "אורגנו"],
    "בשר, עוף ודגים": ["בקר", "עוף", "חזה עוף", "טחינה", "סלמון", "דג", "בשר טחון", "הודו", "קציצות", "שניצל"],
    "מוצרי חלב וביצים": ["חלב", "ביצים", "ביצה", "גבינה", "חמאה", "שמנת", "יוגורט", "קוטג'", "גבינה צהובה"],
    "ירקות ופירות": ["עגבנייה", "עגבניות", "בצל", "שום", "גזר", "מלפפון", "תפוח אדמה", "פלפל", "לימון", "לימונים", "פטרוזיליה", "כוסברה", "חסה", "קישוא", "חציל", "בטטה", "אבוקדו", "סלרי", "סלק"]
};

function parseHebrewQuantityAndUnit(line) {
    let qty = 1;
    let unit = '';
    let notes = [];
    
    // 1. Extract anything in brackets as a note (removing the brackets themselves for now)
    let cleanName = line.replace(/\((.*?)\)/g, (match, innerText) => {
        notes.push(innerText.trim());
        return '';
    });

    const wordNumbers = {
        'חצי': 0.5, 'רבע': 0.25, 'אחת': 1, 'אחד': 1, 'שתי': 2, 'שני': 2, 'שנים': 2,
        'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5,
        'שש': 6, 'שישה': 6, 'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'עשרה': 10
    };

    const knownUnits = ['ק״ג', 'ק׳ג', 'קג', 'גרם', 'מ״ל', 'מל', 'ליטר', 'כוסות', 'כוס', 'כפות', 'כף', 'כפיות', 'כפית', 'שיני', 'שן', 'חבילת', 'חבילה', 'צרור', 'קופסת', 'קופסה', 'שקית', 'שקיות'];

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

    const remainingWords = cleanName.trim().split(/\s+/);
    if (remainingWords.length > 0 && knownUnits.includes(remainingWords[0])) {
        unit = remainingWords[0].replace(/['"״׳]/g, '"');
        cleanName = remainingWords.slice(1).join(' ');
    }

    // 2. Find and extract descriptors BEFORE deleting them
    const descriptorsRegex = /חתוך לקוביות|פרוסות|סחוטים|קצוצה|קצוץ|טרי|מושרה|שימורים|לפי הטעם|גדול|גדולים|מעט/g;
    const foundDescriptors = cleanName.match(descriptorsRegex);
    if (foundDescriptors) {
        notes.push(...foundDescriptors);
    }

    // 3. Clean the item name by removing the descriptors and fixing extra spaces
    cleanName = cleanName
        .replace(descriptorsRegex, '')
        .replace(/['"״׳]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Join all extracted notes with a comma
    let note = notes.filter(Boolean).join(', ');

    return { qty, unit, cleanName, note };
}

function categorizeAndAggregate(rawLines) {
    const categories = {
        "ירקות ופירות": {},
        "בשר, עוף ודגים": {},
        "מוצרי חלב וביצים": {},
        "מזווה ויבשים": {},
        "תבלינים ורטבים": {},
        "שונות": {}
    };

    const instructionBlacklist = [
        "לטחון", "לסנן", "להוסיף", "ללוש", "להכניס", "לרוטב", "בסיר", 
        "נטגן", "נחמם", "נבשל", "לשפוך", "לערבב"
    ];

    rawLines.forEach(line => {
        // Initialize the item if it doesn't exist
        if (!categories[assignedCategory][itemName]) {
            categories[assignedCategory][itemName] = { units: {}, note: '' };
        }
        
        let unitKey = parsed.unit || '';
        if (!categories[assignedCategory][itemName].units[unitKey]) {
            categories[assignedCategory][itemName].units[unitKey] = 0;
        }
        categories[assignedCategory][itemName].units[unitKey] += parsed.qty;
        
        // Intelligently append unique notes
        if (parsed.note) {
            let currentNotes = categories[assignedCategory][itemName].note ? categories[assignedCategory][itemName].note.split(', ') : [];
            let incomingNotes = parsed.note.split(', ');
            incomingNotes.forEach(n => {
                if (n && !currentNotes.includes(n)) {
                    currentNotes.push(n.trim());
                }
            });
            categories[assignedCategory][itemName].note = currentNotes.join(', ');
        }
    });

    return categories;
}

// --- RANDOMIZER & SMART SHOPPING LIST ---
function randomizeMeals(count) {
    if (mealsArray.length === 0) return alert("אין ארוחות במאגר.");
    
    const shuffled = [...mealsArray].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const resultsDiv = document.getElementById('results');
    const shoppingListSection = document.getElementById('shopping-list-section');
    const shoppingListContainer = document.getElementById('shopping-list-container');
    
    resultsDiv.innerHTML = '';
    shoppingListContainer.innerHTML = '';
    
    let allRawLines = [];

    selected.forEach(m => {
        let html = `<div class="meal-card">
                        <h3>${m.name}</h3>`;
        if (m.ingredients) {
            html += `<strong>מצרכים:</strong><br><p style="white-space: pre-wrap; margin-top:5px;">${m.ingredients}</p>`;
            m.ingredients.split('\n').forEach(line => {
                if (line.trim()) allRawLines.push(line.trim());
            });
        }
        if (m.instructions) html += `<strong>הוראות הכנה:</strong><br><p style="white-space: pre-wrap; margin-top:5px;">${m.instructions}</p>`;
        if (m.image) html += `<img src="${m.image}" alt="${m.name}">`;
        html += `</div>`;
        resultsDiv.innerHTML += html;
    });

    if (allRawLines.length > 0) {
        const categorized = categorizeAndAggregate(allRawLines);
        let hasItems = false;

        for (const [catName, items] of Object.entries(categorized)) {
            const itemKeys = Object.keys(items);
            if (itemKeys.length === 0) continue;
            
            hasItems = true;
            let catHtml = `<div style="margin-bottom: 15px;">
                            <strong style="color: var(--primary);">${catName}:</strong>
                            <ul style="margin: 5px 0 0 0; padding-right: 20px;">`;
            
            for (const [item, data] of Object.entries(items)) {
                let parts = [];
                
                // Construct the string for each unit
                for (const [unit, qty] of Object.entries(data.units)) {
                    let qtyStr = '';
                    if (qty === 0.5) qtyStr = 'חצי ';
                    else if (qty === 0.25) qtyStr = 'רבע ';
                    else qtyStr = `${qty} `;

                    const unitStr = unit ? `${unit} ` : '';
                    parts.push(`${qtyStr}${unitStr}`.trim());
                }
                
                // Render the note (brackets) in a slightly faded color
                const noteStr = data.note ? ` <span style="color: #888; font-size: 0.9em;">${data.note}</span>` : '';
                
                // Combine it all: "רבע כוס + 3 כפות שמן (או מושרה)"
                catHtml += `<li>${parts.join(' + ')} ${item}${noteStr}</li>`;
            }
            
            catHtml += `</ul></div>`;
            shoppingListContainer.innerHTML += catHtml;
        }

        if (hasItems) {
            shoppingListSection.classList.remove('hidden');
        } else {
            shoppingListSection.classList.add('hidden');
        }
    } else {
        shoppingListSection.classList.add('hidden');
    }
}