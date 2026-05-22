import { db } from './firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const currentUsername = urlParams.get('user');

const participantsList = document.getElementById('participantsList');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

if (roomId && currentUsername) {
    const presenceRef = doc(db, `rooms/${roomId}/participants`, currentUsername);

    // Initialize Presence configuration
    setDoc(presenceRef, {
        username: currentUsername,
        lastActive: serverTimestamp()
    });

    // Handle abrupt window closures cleanly
    window.addEventListener('beforeunload', () => {
        deleteDoc(presenceRef);
    });

    // Standard Exit Request Pipeline
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', async () => {
            if (confirm("Disconnect session connection?")) {
                await deleteDoc(presenceRef);
                window.location.href = 'index.html';
            }
        });
    }

    // Realtime Listener updating Active Badges dynamically
    onSnapshot(collection(db, `rooms/${roomId}/participants`), (snapshot) => {
        participantsList.innerHTML = '';
        snapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const pill = document.createElement('span');
            pill.classList.add('participant-pill');
            pill.innerHTML = `<i class="fa-solid fa-user-ninja" style="color: var(--neon-glow); margin-right: 6px;"></i> ${userData.username}`;
            participantsList.appendChild(pill);
        });
    });
}