import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, sendEmailVerification, setPersistence, browserLocalPersistence, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBBuXEgTrEbAkj-BN_VSSYoVDx5e51fw4A",
    authDomain: "achieve-mate.firebaseapp.com",
    projectId: "achieve-mate",
    storageBucket: "achieve-mate.firebasestorage.app",
    messagingSenderId: "209711943902",
    appId: "1:209711943902:web:e8df445f14cc5c9b6eb24f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Persistence error:", error);
});


window.isUserLoggedIn = () => !!auth.currentUser;

window.showToast = function (msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}


let deferredPrompt;
const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
const isInStandaloneMode = () => ('standalone' in window.navigator) || (window.navigator.standalone);


window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); 
    deferredPrompt = e;
    console.log("Install prompt captured");
});


window.checkInstallState = () => {
    if (isInStandaloneMode()) return;
    const modal = document.getElementById('pwa-install-modal');
    const androidBtn = document.getElementById('pwa-android-btn');
    const iosGuide = document.getElementById('pwa-ios-guide');
    if (isIos()) {
        iosGuide.style.display = 'block';
        androidBtn.style.display = 'none';
        modal.classList.add('active');
    } else if (deferredPrompt) {
        androidBtn.style.display = 'block';
        iosGuide.style.display = 'none';
        modal.classList.add('active');
    }
};


window.triggerInstall = async () => {
    const modal = document.getElementById('pwa-install-modal');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'accepted') modal.classList.remove('active');
    } else {
        alert("To install: Tap your browser menu (⋮) and select 'Install App' or 'Add to Home Screen'.");
    }
};



window.confirmDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const btn = document.querySelector('#deleteAccountModal .btn-danger');
    const oldText = btn.textContent;
    btn.textContent = "Deleting...";
    btn.disabled = true;

    try {
  
        await deleteDoc(doc(db, "users", user.uid));


        await deleteUser(user);

        window.showToast("Account deleted successfully.", "success");
        window.closeModal('deleteAccountModal');
    } catch (error) {
        console.error("Delete Error:", error);

        if (error.code === 'auth/requires-recent-login') {
            const password = prompt("Security Check: Please enter your password to confirm deletion:");

            if (password) {
                try {
                    const credential = EmailAuthProvider.credential(user.email, password);
                    await reauthenticateWithCredential(user, credential);

  
                    await deleteDoc(doc(db, "users", user.uid));
                    await deleteUser(user);

                    window.showToast("Account deleted successfully.", "success");
                    window.closeModal('deleteAccountModal');
                    return;

                } catch (reAuthError) {
                    window.showToast("Incorrect password or error: " + reAuthError.message, "error");
                }
            } else {
                window.showToast("Deletion cancelled.", "info");
            }
        } else {
            window.showToast("Error deleting account: " + error.message, "error");
        }
    } finally {
        btn.textContent = oldText;
        btn.disabled = false;
    }
}

window.handleAuth = async (e) => {
    if (e) e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const isSignup = document.getElementById('tab-signup').classList.contains('active');
    const btn = document.getElementById('auth-btn');
    const originalText = isSignup ? "Create Account" : "Login";

    btn.textContent = "Processing...";
    btn.disabled = true;
    btn.style.opacity = "0.7";

    const safetyTimeout = setTimeout(() => {
        if (btn.disabled) {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.opacity = "1";
            window.showToast("Request timed out. Please check connection.", "error");
        }
    }, 15000);

    try {
        if (isSignup) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await sendEmailVerification(userCredential.user);
            await signOut(auth);

      
            document.getElementById('verification-modal').classList.add('active');

            window.tempAuthData = { email, pass };

        } else {
            await signInWithEmailAndPassword(auth, email, pass);
           
        }
    } catch (err) {
        console.error("Auth Error:", err);
        let msg = "Something went wrong.";
        if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
        else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') msg = "Wrong email or password.";
        else if (err.code === 'auth/weak-password') msg = "Password too weak (min 6 chars).";
        else if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
        else if (err.code === 'auth/network-request-failed') msg = "Network error. Check connection.";
        window.showToast(msg, "error");
    } finally {
        clearTimeout(safetyTimeout);
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
    }
};

window.closeVerificationModal = function () {
    document.getElementById('verification-modal').classList.remove('active');
  
    window.toggleAuthMode('login');
    if (window.tempAuthData) {
        setTimeout(() => {
            document.getElementById('auth-email').value = window.tempAuthData.email;
            document.getElementById('auth-password').value = window.tempAuthData.pass;
            window.tempAuthData = null;
        }, 100);
    }
};

window.handleResetPassword = async () => {
    const email = document.getElementById('auth-email').value;
    if (!email) return window.showToast("Enter email in the box first.", "error");
    try { await sendPasswordResetEmail(auth, email); window.showToast("Reset link sent!", "success"); } catch (e) { window.showToast(e.message, "error"); }
};

window.logoutUser = () => signOut(auth).then(() => location.reload());


onAuthStateChanged(auth, (user) => {

    const loader = document.getElementById('initial-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    }

    if (user) {
        if (!user.emailVerified) {
            window.showToast("Please verify your email first.", "error");
            signOut(auth);
            return;
        }

     
        document.getElementById('auth-overlay').style.display = 'none'; 
        // document.getElementById('appWrapper').style.display = 'flex'; // ALWAYS FLEX in Guest Mode
        document.getElementById('verification-modal').classList.remove('active');

        updateUserUI(user);
        loadDataFromCloud(user.uid);

      
        setTimeout(window.checkInstallState, 1500);

    } else {
        
        document.getElementById('auth-overlay').style.display = 'flex';
        resetUserUI();

        
        setTimeout(window.checkInstallState, 1500);
    }
});

function updateUserUI(user) {
    const name = user.displayName || user.email.split('@')[0];
    const initial = name[0].toUpperCase();
    setText('profileName', name);
    setText('profileEmail', user.email);
    setText('profilePic', initial);

   
    const headerBadge = document.getElementById('headerUserBadge');
    if (headerBadge) { headerBadge.style.display = 'flex'; setText('headerUserInitials', initial); setText('headerUserName', name); }
    document.getElementById('headerLoginBtn').style.display = 'none';


    const vStat = document.getElementById('verificationStatus');
    if (vStat) vStat.style.display = 'none';

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';

    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';

    document.getElementById('profileLoginBtn').style.display = 'none';
}

function resetUserUI() {
    setText('profileName', "Guest User");
    setText('profileEmail', "Not logged in");
    setText('profilePic', "U");

    // Header Logic
    const headerBadge = document.getElementById('headerUserBadge');
    if (headerBadge) headerBadge.style.display = 'none';
    document.getElementById('headerLoginBtn').style.display = 'flex'; 

   
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';

    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    document.getElementById('profileLoginBtn').style.display = 'inline-flex';
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

async function loadDataFromCloud(uid) {
    const docRef = doc(db, "users", uid);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            window.appData = { ...window.appData, ...cloudData };
            if (window.refreshUI) window.refreshUI();
        } else {
            window.saveCloudData();
        }
    } catch (e) { console.error(e); }
}

window.saveCloudData = async () => {
    if (auth.currentUser && window.appData) {
        await setDoc(doc(db, "users", auth.currentUser.uid), window.appData);
    }
};