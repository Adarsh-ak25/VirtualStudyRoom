import { db } from './firebase.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================================================
// SECURE USER RUNTIME API CREDENTIAL KEY CONFIGURATIONS
// ==========================================================================
const GEMINI_API_KEY = "AIzaSyBSkt4tgqrFNZA61d1fixIxEUyIxlo20JA"; 
const SPOTIFY_CLIENT_ID = "b707ed58a1c640018a59a7b4daec96a7"; 
const SUPABASE_URL = "https://azuewazzhfssblesitzz.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_buH4XEKwsThBbPtNLedwow_VevgBBR_"; 

// Safety-wrapped instantiation keeps placeholder initialization strings from triggering script exceptions
let supabase = null;
try {
    if (SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith("YOUR_")) {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.warn("Supabase initialization buffered until valid key configurations are active:", e);
}

// ==========================================================================
// HOISTED HELPER METHODS
// ==========================================================================
function formatMsToTimeString(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

function paintSliderGreenFillTrack(element) {
    if (!element) return;
    const currentVal = parseFloat(element.value) || 0;
    const maxVal = parseFloat(element.max) || 100;
    const ratioPercentage = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;
    element.style.background = `linear-gradient(to right, #1ed760 0%, #1ed760 ${ratioPercentage}%, #4c4c4c ${ratioPercentage}%, #4c4c4c 100%)`;
}

// Runtime Global State Map
const urlParams = new URLSearchParams(window.location.search || window.location.hash.replace('#', '?'));
let roomId = urlParams.get('room') || sessionStorage.getItem('activeRoomId');
let currentUsername = urlParams.get('user') || sessionStorage.getItem('activeUsername');
let spotifyToken = sessionStorage.getItem('spotifyToken');
let spotifyPlayerInstance = null;
let virtualDeviceId = null;

let localTrackDurationMax = 0;
let isShuffleActive = false;
let currentRepeatState = "off"; 

// Pomodoro Timer Parameters
let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60; 
let isPomodoroRunning = false;

const portalModalOverlay = document.getElementById('portalModalOverlay');
const portalSubmitBtn = document.getElementById('portalSubmitBtn');
const portalRoomType = document.getElementById('portalRoomType');
const portalCodeGroup = document.getElementById('portalCodeGroup');

if (roomId) sessionStorage.setItem('activeRoomId', roomId);
if (currentUsername) sessionStorage.setItem('activeUsername', currentUsername);

// ==========================================================================
// SPOTIFY Web Playback SDK Core Mounting Listener
// ==========================================================================
window.onSpotifyWebPlaybackSDKReady = () => {
    if (!spotifyToken) return;
    
    spotifyPlayerInstance = new Spotify.Player({
        name: 'Live Study Room Web Player',
        getOAuthToken: cb => { cb(spotifyToken); },
        volume: 0.5
    });

    spotifyPlayerInstance.addListener('ready', ({ device_id }) => {
        console.log('Virtual Web Playback SDK Device Mounted with ID:', device_id);
        virtualDeviceId = device_id;
    });

    spotifyPlayerInstance.addListener('player_state_changed', state => {
        if (!state) return;
        
        document.getElementById('spotifyTrackName').textContent = state.track_window.current_track.name;
        document.getElementById('spotifyArtistName').textContent = state.track_window.current_track.artists.map(a => a.name).join(', ');
        
        const currentArtUrl = state.track_window.current_track.album.images[0]?.url;
        if(currentArtUrl) {
            document.getElementById('spotifyAlbumArt').src = currentArtUrl;
        }

        document.getElementById('spPlayBtn').innerHTML = state.paused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
        document.getElementById('playerDiskIcon').classList.toggle('spinning', !state.paused);
        
        const slider = document.getElementById('timelineSlider');
        localTrackDurationMax = state.duration;
        slider.max = localTrackDurationMax;
        slider.value = state.position;
        
        paintSliderGreenFillTrack(slider);
        
        document.getElementById('timelineCurrent').textContent = formatMsToTimeString(state.position);
        document.getElementById('timelineDuration').textContent = formatMsToTimeString(localTrackDurationMax);
    });

    spotifyPlayerInstance.connect();

    setInterval(async () => {
        if (spotifyPlayerInstance && virtualDeviceId) {
            const currentStatus = await spotifyPlayerInstance.getCurrentState();
            if (currentStatus && !currentStatus.paused) {
                const slider = document.getElementById('timelineSlider');
                slider.value = currentStatus.position;
                paintSliderGreenFillTrack(slider);
                document.getElementById('timelineCurrent').textContent = formatMsToTimeString(currentStatus.position);
            }
        }
    }, 1000);
};

// ==========================================================================
// FIXED LIFECYCLE INITIALIZER: Bypasses type="module" DOMContentLoaded listener failure loops
// ==========================================================================
if (portalRoomType && portalCodeGroup) {
    // Correct initial visual mapping for passcode fields instantly on runtime load
    portalCodeGroup.classList.toggle('hidden', portalRoomType.value !== 'private');
    portalRoomType.addEventListener('change', (e) => {
        portalCodeGroup.classList.toggle('hidden', e.target.value !== 'private');
    });
}

const volSlider = document.getElementById('volumeSlider');
if (volSlider) paintSliderGreenFillTrack(volSlider);

initializeInterfaceLayoutToggles();
initializePomodoroMatrixTimer();

(async () => {
    const codeParam = urlParams.get('code');
    if (codeParam && !spotifyToken) {
        await exchangeCodeForSpotifyToken(codeParam);
        window.history.replaceState({}, document.title, window.location.pathname + '?room=' + roomId + '&user=' + currentUsername);
    }

    if (!roomId || !currentUsername) {
        if (portalModalOverlay) portalModalOverlay.classList.remove('hidden');
        if (portalSubmitBtn) portalSubmitBtn.addEventListener('click', handleRoomEntryFlow);
    } else {
        if (portalModalOverlay) portalModalOverlay.classList.add('hidden');
        
        const roomRef = doc(db, "rooms", roomId);
        getDoc(roomRef).then(async (snap) => {
            if (!snap.exists()) {
                const savedType = sessionStorage.getItem('lastRoomTypeSelection') || "public";
                const savedCode = sessionStorage.getItem('lastRoomCodeSelection') || null;
                await setDoc(roomRef, {
                    name: roomId.replace(/_/g, ' '),
                    type: savedType,
                    code: savedCode,
                    createdAt: new Date()
                }).catch(e => console.warn("Background workspace syncing deferred:", e));
            }
            initializeWorkspaceEngine();
            initializeSpotifyModule();
            initializeIsolatedGeminiWidget();
        }).catch(err => {
            console.error("Local backup offline routing path active:", err);
            initializeWorkspaceEngine();
            initializeSpotifyModule();
            initializeIsolatedGeminiWidget();
        });
    }
})();

function initializeInterfaceLayoutToggles() {
    const focusModeBtn = document.getElementById('focusModeBtn');
    focusModeBtn?.addEventListener('click', () => {
        document.body.classList.toggle('focus-mode-active');
        const isActive = document.body.classList.contains('focus-mode-active');
        focusModeBtn.innerHTML = isActive ? 
            `<i class="fa-solid fa-eye text-orange"></i> <span>Normal Mode</span>` : 
            `<i class="fa-solid fa-eye-slash"></i> <span>Focus Mode</span>`;
    });
}

function initializePomodoroMatrixTimer() {
    const timerDisplay = document.getElementById('pomodoroTimerDisplay');
    const startBtn = document.getElementById('pomoStartBtn');
    const pauseBtn = document.getElementById('pomoPauseBtn');
    const resetBtn = document.getElementById('pomoResetBtn');

    function updateDisplay() {
        const minutes = Math.floor(pomodoroTimeLeft / 60);
        const seconds = pomodoroTimeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    startBtn?.addEventListener('click', () => {
        if (isPomodoroRunning) return;
        isPomodoroRunning = true;
        pomodoroInterval = setInterval(() => {
            if (pomodoroTimeLeft > 0) {
                pomodoroTimeLeft--;
                updateDisplay();
            } else {
                clearInterval(pomodoroInterval);
                isPomodoroRunning = false;
                alert("Pomodoro timer complete.");
                pomodoroTimeLeft = 25 * 60;
                updateDisplay();
            }
        }, 1000);
    });

    pauseBtn?.addEventListener('click', () => {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
    });

    resetBtn?.addEventListener('click', () => {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        pomodoroTimeLeft = 25 * 60;
        updateDisplay();
    });
}

// FIXED: Local-First portal handler executes workspace entry instantaneously with no connection stalls
function handleRoomEntryFlow() {
    const userIn = document.getElementById('portalUsername').value.trim();
    const roomIn = document.getElementById('portalRoomId').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const typeIn = portalRoomType.value;
    const codeIn = document.getElementById('portalRoomCode').value.trim();

    if (!userIn || !roomIn) return alert("Please specify username and room target parameters.");
    if (typeIn === "private" && !codeIn) return alert("Please specify a passcode for private space entry.");

    // Map selections to local runtime sessions instantly 
    sessionStorage.setItem('activeRoomId', roomIn);
    sessionStorage.setItem('activeUsername', userIn);
    sessionStorage.setItem('lastRoomTypeSelection', typeIn);
    sessionStorage.setItem('lastRoomCodeSelection', typeIn === "private" ? codeIn : null);
    sessionStorage.setItem('authenticatedRoom_' + roomIn, 'true');

    // Fire window parameter redirection route path immediately 
    window.location.href = window.location.origin + window.location.pathname + '?room=' + roomIn + '&user=' + userIn;
}

function initializeWorkspaceEngine() {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');
    const attachBtn = document.getElementById('attachBtn');
    const hiddenFileInput = document.getElementById('hiddenFileInput');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const uploadProgressBarFill = document.getElementById('uploadProgressBarFill');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const rightSidebarFileCabinet = document.getElementById('rightSidebarFileCabinet');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');

    leaveRoomBtn?.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = window.location.origin + window.location.pathname;
    });

    getDoc(doc(db, "rooms", roomId)).then(snap => {
        if(snap.exists()) {
            const data = snap.data();
            document.getElementById('roomTitleDisplay').textContent = data.name;
            const badge = document.getElementById('roomTypeBadge');
            if (badge) badge.textContent = data.type;
        }
    });

    if (attachBtn && hiddenFileInput) {
        attachBtn.addEventListener('click', () => hiddenFileInput.click());
        hiddenFileInput.addEventListener('change', handleFileSharingStream);
    }

    const messagesRef = collection(db, "rooms", roomId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    onSnapshot(q, (snapshot) => {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        if (rightSidebarFileCabinet) rightSidebarFileCabinet.innerHTML = '';
        let fileCount = 0;

        snapshot.forEach((doc) => {
            const msg = doc.data();
            renderMessageNode(msg);
            if (msg.type === "file") {
                fileCount++;
                appendToFileCabinetRight(msg);
            }
        });
        if (fileCount === 0 && rightSidebarFileCabinet) {
            rightSidebarFileCabinet.innerHTML = '<div class="empty-cabinet-msg">No documents archived yet.</div>';
        }
    });

    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textValue = messageInput.value.trim();
            if (!textValue) return;
            messageInput.value = '';

            await addDoc(messagesRef, {
                sender: currentUsername,
                text: textValue,
                type: "text",
                timestamp: serverTimestamp()
            });
        });
    }

    async function handleFileSharingStream(e) {
        const file = e.target.files[0];
        if (!file || !supabase) return;

        if (uploadProgressContainer) uploadProgressContainer.classList.remove('hidden');
        if (uploadProgressBarFill) uploadProgressBarFill.style.width = '30%';
        if (uploadProgressText) uploadProgressText.textContent = 'Uploading to Supabase...';

        try {
            const uniqueFileName = Date.now() + '_' + file.name.replace(/\s+/g, '_');
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(uniqueFileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            if (uploadProgressBarFill) uploadProgressBarFill.style.width = '80%';

            const { data: urlData } = supabase.storage
                .from('uploads')
                .getPublicUrl(uniqueFileName);

            if (uploadProgressBarFill) uploadProgressBarFill.style.width = '100%';
            setTimeout(() => { if (uploadProgressContainer) uploadProgressContainer.classList.add('hidden'); }, 400);

            await addDoc(messagesRef, {
                sender: currentUsername,
                type: "file",
                fileName: file.name,
                fileUrl: urlData.publicUrl,
                fileSize: (file.size / 1024).toFixed(1) + " KB",
                timestamp: serverTimestamp()
            });

            if (hiddenFileInput) hiddenFileInput.value = '';
        } catch (err) {
            console.error(err);
            if (uploadProgressContainer) uploadProgressContainer.classList.add('hidden');
        }
    }

    function renderMessageNode(data) {
        const wrapper = document.createElement('div');
        let typeClass = data.sender === currentUsername ? 'outgoing' : 'incoming';
        wrapper.classList.add('message-node', typeClass);
        
        const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
        let layout = '<span class="message-sender">' + data.sender + '</span>';

        if (data.type === "file") {
            layout += `
                <div class="file-attachment-card">
                    <i class="fa-solid fa-file-invoice file-icon"></i>
                    <div class="file-meta-info">
                        <span class="file-name-txt" title="${data.fileName}">${data.fileName}</span>
                        <small>${data.fileSize}</small>
                    </div>
                    <a href="${data.fileUrl}" target="_blank" class="btn-download-file"><i class="fa-solid fa-download"></i></a>
                </div>`;
        } else {
            layout += '<p>' + (data.text || "") + '</p>';
        }
        
        layout += '<span class="message-meta">' + timeStr + '</span>';
        wrapper.innerHTML = layout;
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendToFileCabinetRight(data) {
        if (!rightSidebarFileCabinet) return;
        const card = document.createElement('div');
        card.classList.add('cabinet-file-card');
        card.innerHTML = `
            <i class="fa-solid fa-file-lines text-orange" style="font-size: 1.15rem;"></i>
            <div class="cabinet-file-info">
                <span class="cabinet-file-name" title="${data.fileName}">${data.fileName}</span>
                <span class="cabinet-file-sender">By: ${data.sender}</span>
            </div>
            <a href="${data.fileUrl}" target="_blank" class="btn-download-file" style="width:30px; height:30px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></a>`;
        rightSidebarFileCabinet.appendChild(card);
    }
}

function initializeIsolatedGeminiWidget() {
    const geminiTimeline = document.getElementById('geminiChatTimeline');
    const promptInput = document.getElementById('geminiPromptInput');
    const sendBtn = document.getElementById('geminiSendBtn');

    if (!sendBtn || !promptInput || !geminiTimeline) return;

    async function fireGeminiPrompt() {
        const queryText = promptInput.value.trim();
        if (!queryText) return;

        promptInput.value = '';

        const userBubble = document.createElement('div');
        userBubble.classList.add('ai-bubble', 'user');
        userBubble.textContent = queryText;
        geminiTimeline.appendChild(userBubble);
        geminiTimeline.scrollTop = geminiTimeline.scrollHeight;

        const loadingBubble = document.createElement('div');
        loadingBubble.classList.add('ai-bubble', 'bot');
        loadingBubble.innerHTML = "<i class='fa-solid fa-ellipsis fa-pulse'></i> Gemini is compiling response...";
        geminiTimeline.appendChild(loadingBubble);
        geminiTimeline.scrollTop = geminiTimeline.scrollHeight;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: queryText }] }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            const aiTextReply = data.candidates[0].content.parts[0].text;
            loadingBubble.textContent = aiTextReply;
            geminiTimeline.scrollTop = geminiTimeline.scrollHeight;

        } catch (err) {
            console.error("Gemini Endpoint Failure:", err);
            loadingBubble.innerHTML = `❌ <strong>Google API Error:</strong> ${err.message || 'Check network connection formatting profiles.'}`;
        }
    }

    sendBtn.addEventListener('click', fireGeminiPrompt);
    promptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fireGeminiPrompt(); });
}

function initializeSpotifyModule() {
    const connectSpotifyBtn = document.getElementById('connectSpotifyBtn');
    const spotifyAuthContainer = document.getElementById('spotifyAuthContainer');
    const spotifyPlayerContainer = document.getElementById('spotifyPlayerContainer');
    
    if (connectSpotifyBtn) {
        connectSpotifyBtn.addEventListener('click', redirectToSpotifyPKCEAuth);
    }

    if (spotifyToken) {
        if (spotifyAuthContainer) spotifyAuthContainer.classList.add('hidden');
        if (spotifyPlayerContainer) spotifyPlayerContainer.classList.remove('hidden');
        
        const spotifyScriptTag = document.createElement('script');
        spotifyScriptTag.src = "https://sdk.scdn.co/spotify-player.js";
        document.head.appendChild(spotifyScriptTag);

        bindPlaybackControls();
        bindInteractiveSliders();
    }
}

function bindPlaybackControls() {
    const controlMap = [
        { id: 'spPlayBtn', endpoint: 'play' },
        { id: 'spNextBtn', endpoint: 'next' },
        { id: 'spPrevBtn', endpoint: 'previous' }
    ];
    
    controlMap.forEach(control => {
        document.getElementById(control.id)?.addEventListener('click', async () => {
            const targetDevice = virtualDeviceId ? "device_id=" + virtualDeviceId : "";
            let method = "POST";
            let endpointUrl = 'https://api.spotify.com/v1/me/player/' + control.endpoint + '?' + targetDevice;
            
            if (control.endpoint === 'play') {
                const isPlaying = document.getElementById('spPlayBtn').innerHTML.includes('pause');
                endpointUrl = 'https://api.spotify.com/v1/me/player/' + (isPlaying ? 'pause' : 'play') + '?' + targetDevice;
                method = "PUT";
            }
            
            await fetch(endpointUrl, { method: method, headers: { "Authorization": "Bearer " + spotifyToken } });
            setTimeout(fetchCurrentSpotifyPlayback, 400);
        });
    });

    document.getElementById('spShuffleBtn')?.addEventListener('click', async () => {
        isShuffleActive = !isShuffleActive;
        document.getElementById('spShuffleBtn').classList.toggle('active-state', isShuffleActive);
        const targetDevice = virtualDeviceId ? "&device_id=" + virtualDeviceId : "";
        await fetch('https://api.spotify.com/v1/me/player/shuffle?state=' + isShuffleActive + targetDevice, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + spotifyToken }
        });
    });

    document.getElementById('spRepeatBtn')?.addEventListener('click', async () => {
        const statesList = ["off", "context", "track"];
        let nextIndex = (statesList.indexOf(currentRepeatState) + 1) % statesList.length;
        currentRepeatState = statesList[nextIndex];

        document.getElementById('spRepeatBtn').classList.toggle('active-state', currentRepeatState !== "off");
        
        const targetDevice = virtualDeviceId ? "&device_id=" + virtualDeviceId : "";
        await fetch('https://api.spotify.com/v1/me/player/repeat?state=' + currentRepeatState + targetDevice, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + spotifyToken }
        });
    });
}

function bindInteractiveSliders() {
    const timelineSlider = document.getElementById('timelineSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');

    timelineSlider?.addEventListener('input', (e) => { paintSliderGreenFillTrack(e.target); });
    timelineSlider?.addEventListener('change', async (e) => {
        const targetMs = parseInt(e.target.value);
        if (spotifyPlayerInstance) {
            await spotifyPlayerInstance.seek(targetMs);
        }
    });

    volumeSlider?.addEventListener('input', async (e) => {
        paintSliderGreenFillTrack(e.target);
        const volumeLevel = parseInt(e.target.value);
        
        if (spotifyPlayerInstance) {
            await spotifyPlayerInstance.setVolume(volumeLevel / 100);
        }
        if (volumeLevel === 0) {
            volumeIcon.className = "fa-solid fa-volume-xmark";
        } else if (volumeLevel < 40) {
            volumeIcon.className = "fa-solid fa-volume-low";
        } else {
            volumeIcon.className = "fa-solid fa-volume-high";
        }
    });
}

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, x => possible[x % possible.length]).join('');
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function redirectToSpotifyPKCEAuth() {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    window.sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = "user-read-currently-playing user-modify-playback-state user-read-playback-state streaming user-read-private user-read-email";

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.search = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scopes,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        show_dialog: 'true'
    }).toString();

    window.location.href = authUrl.toString();
}

async function exchangeCodeForSpotifyToken(code) {
    const codeVerifier = window.sessionStorage.getItem('spotify_code_verifier');
    const redirectUri = window.location.origin + window.location.pathname;

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: "b707ed58a1c640018a59a7b4daec96a7",
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier
            })
        });

        const data = await response.json();
        if (data.access_token) {
            spotifyToken = data.access_token;
            window.sessionStorage.setItem('spotifyToken', spotifyToken);
            window.location.reload(); 
        }
    } catch (err) {
        console.error("Token Exchange Error:", err);
    }
}

async function fetchCurrentSpotifyPlayback() {
    if (!spotifyToken) return;
    try {
        const res = await fetch("https://api.spotify.com/v1/me/player", {
            headers: { "Authorization": "Bearer " + spotifyToken }
        });
        if (res.status === 200) {
            const data = await res.json();
            if (data && data.item) {
                document.getElementById('spotifyTrackName').textContent = data.item.name;
                document.getElementById('spotifyArtistName').textContent = data.item.artists.map(a => a.name).join(', ');
                document.getElementById('spPlayBtn').innerHTML = data.is_playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
            }
        }
    } catch (err) { console.error(err); }
}