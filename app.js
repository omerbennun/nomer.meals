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

// Initialize Firebase (Only Auth and Database needed now!)
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

// --- SAVE MEAL (WITH BASE64 IMAGE ENCODING) ---
function saveMeal() {
    const id = document.getElementById('meal-id').value;
    const name = document.getElementById('meal-name').value.trim();
    const ingredients = document.getElementById('meal-ingredients').value.trim();
    const instructions = document.getElementById('meal-instructions').value.trim();
    const fileInput = document.getElementById('meal-image-file');
    let existingImage = document.getElementById('meal-image-url').value;

    if (!name) return alert("חובה להזין את שם הארוחה.");

    // Function to push or update data in Firebase Realtime Database
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

    // If a new file was chosen, read it as a Base64 string first
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const base64String = e.target.result;
            commitToDatabase(base64String);
        };
        
        reader.readAsDataURL(file);
    } else {
        // Keep existing image if no new file was selected during editing   
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
    document.getElementById('meal-image-file').value = ''; // Clear file picker
    
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

// --- RANDOMIZER & SMART SHOPPING LIST ---
function randomizeMeals(count) {
    if (mealsArray.length === 0) return alert("אין ארוחות במאגר.");
    
    const shuffled = [...mealsArray].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const resultsDiv = document.getElementById('results');
    const shoppingListSection = document.getElementById('shopping-list-section');
    const shoppingListItems = document.getElementById('shopping-list-items');
    
    resultsDiv.innerHTML = '';
    shoppingListItems.innerHTML = '';
    
    let allIngredients = [];

    selected.forEach(m => {
        let html = `<div class="meal-card">
                        <h3>${m.name}</h3>`;
        if (m.ingredients) {
            html += `<strong>מצרכים:</strong><br><p style="white-space: pre-wrap; margin-top:5px;">${m.ingredients}</p>`;
            
            // Extract ingredients line by line for the shopping list
            const lines = m.ingredients.split('\n');
            lines.forEach(line => {
                const cleaned = line.trim();
                if (cleaned) allIngredients.push(cleaned);
            });
        }
        if (m.instructions) html += `<strong>הוראות הכנה:</strong><br><p style="white-space: pre-wrap; margin-top:5px;">${m.instructions}</p>`;
        if (m.image) html += `<img src="${m.image}" alt="${m.name}">`;
        html += `</div>`;
        resultsDiv.innerHTML += html;
    });

    // Populate shopping list if ingredients exist
    if (allIngredients.length > 0) {
        // Remove exact duplicates if any
        const uniqueIngredients = [...new Set(allIngredients)];
        
        uniqueIngredients.forEach(item => {
            shoppingListItems.innerHTML += `<li>${item}</li>`;
        });
        
        shoppingListSection.classList.remove('hidden');
    } else {
        shoppingListSection.classList.add('hidden');
    }
}