// --- FIREBASE INIT ---
const firebaseConfig = {
  apiKey: "AIzaSyDY1dl97i0-Des1CmHCb9wNA8jpmAIuNac",
  authDomain: "mymeals-f5dc0.firebaseapp.com",
  databaseURL: "https://mymeals-f5dc0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mymeals-f5dc0",
  storageBucket: "mymeals-f5dc0.firebasestorage.app",
  messagingSenderId: "533677624737",
  appId: "1:533677624737:web:8821f04f8aa2a1a6998fe0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Global State
let mealsArray = [];
let ingredientDictionary = {};
let activePlanIds = []; 
let currentOfficialMeals = []; 
let isGuestMode = false;

// 1. PUBLIC LISTENERS (Run for everyone including guests)
function listenToPublicData() {
    // Listen to Meals
    db.ref('meals').on('value', (snapshot) => {
        const data = snapshot.val();
        mealsArray = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];

        // If in Guest Mode, auto-generate initial meals as soon as data arrives
        if (isGuestMode && mealsArray.length > 0) {
            const count = document.getElementById('sandbox-count')?.value || 3;
            if (typeof randomizeSandbox === 'function') {
                randomizeSandbox(count);
            }
        }

        if (typeof renderLibrary === 'function' && !isGuestMode) {
            renderLibrary();
        }
    });

    // Listen to Settings / Ingredient Dictionary
    db.ref('settings/ingredientDictionary').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && typeof ingredientDictionary !== 'undefined') {
            ingredientDictionary = data;
        }
    });
}

// 2. PROTECTED LISTENERS (Run ONLY when logged in)
function listenToActivePlan() {
    if (isGuestMode || !auth.currentUser) return;

    db.ref('activePlan').on('value', (snapshot) => {
        activePlanIds = snapshot.val() || [];
        
        // Sync full meal objects from active plan IDs
        currentOfficialMeals = activePlanIds
            .map(id => mealsArray.find(m => m.id === id))
            .filter(Boolean);

        if (typeof renderOfficialPlan === 'function') {
            renderOfficialPlan();
        }
    });
}

// 3. AUTHENTICATION OBSERVER
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is logged in
        isGuestMode = false;
        document.getElementById('login-screen')?.classList.add('hidden');
        document.getElementById('app-container')?.classList.remove('hidden');

        listenToPublicData();
        listenToActivePlan();
    } else if (!isGuestMode) {
        // User logged out
        document.getElementById('login-screen')?.classList.remove('hidden');
        document.getElementById('app-container')?.classList.add('hidden');
    }
});

// 4. GUEST MODE INITIALIZER
function loginAsGuest() {
    isGuestMode = true;

    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');

    if (typeof applyGuestPermissions === 'function') {
        applyGuestPermissions();
    }

    // Start listening to public meals & settings
    listenToPublicData();

    // If meals are already loaded locally, randomize immediately
    if (mealsArray && mealsArray.length > 0) {
        randomizeSandbox(3);
    }
}

// --- AUTHENTICATION ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        await loadIngredientDictionary();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }
});

function login() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, pass).catch(() => {
        document.getElementById('login-error').innerText = "שגיאה בהתחברות.";
    });
}
function logout() { auth.signOut(); }

// --- DB LISTENERS ---
db.ref('meals').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    mealsArray = Object.keys(data).map(id => ({ 
        id, 
        ...data[id], 
        cookCount: data[id].cookCount || 0 // Default missing counts to 0
    }));
    if (typeof renderLibrary === 'function') renderLibrary();
});

db.ref('activePlan').on('value', (snapshot) => {
    activePlanIds = snapshot.val() || [];
    currentOfficialMeals = mealsArray.filter(m => activePlanIds.includes(m.id));
    if (typeof renderOfficialPlan === 'function') renderOfficialPlan();
    if (typeof renderShoppingList === 'function') renderShoppingList();
});

// --- CRUD OPERATIONS ---
function saveMeal() {
    const id = document.getElementById('meal-id').value;
    const name = document.getElementById('meal-name').value.trim();
    const ingredients = document.getElementById('meal-ingredients').value.trim();
    const instructions = document.getElementById('meal-instructions').value.trim();
    const fileInput = document.getElementById('meal-image-file');
    let existingImage = document.getElementById('meal-image-url').value;

    if (!name) return alert("חובה להזין שם ארוחה.");

    const commit = (img) => {
        const mealData = { name, ingredients, instructions, image: img || "" };
        
        if (id) {
            db.ref(`meals/${id}`).update(mealData);
        } else {
            // New meal: Inherit the current minimum cookCount to stay fair!
            const minCount = mealsArray.length > 0 ? Math.min(...mealsArray.map(m => m.cookCount)) : 0;
            mealData.cookCount = minCount;
            db.ref('meals').push(mealData);
        }
        resetForm();
    };

    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = e => commit(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
    } else commit(existingImage);
}

function deleteMeal(id) {
    if (confirm("בטוח שברצונך למחוק ארוחה זו?")) db.ref(`meals/${id}`).remove();
}