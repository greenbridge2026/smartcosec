// Reusable Messages Enhancements: Group Chat, Starred Sync, & WebRTC Calls
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Web Audio API Ringtone sound generator
const CallSound = {
    audioCtx: null,
    oscillator: null,
    gainNode: null,
    intervalId: null,

    init() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    },

    playRing() {
        try {
            if (!this.audioCtx) this.init();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            
            this.gainNode = this.audioCtx.createGain();
            this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
            this.gainNode.connect(this.audioCtx.destination);
            
            let ring = true;
            this.intervalId = setInterval(() => {
                if (ring) {
                    this.oscillator = this.audioCtx.createOscillator();
                    this.oscillator.type = 'sine';
                    this.oscillator.frequency.setValueAtTime(400, this.audioCtx.currentTime);
                    this.oscillator.connect(this.gainNode);
                    this.oscillator.start();
                    setTimeout(() => {
                        try { this.oscillator.stop(); } catch(e){}
                    }, 1000);
                }
                ring = !ring;
            }, 1800);
        } catch(e) { console.error('Audio failed to play:', e); }
    },

    stopRing() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.oscillator) {
            try { this.oscillator.stop(); } catch(e){}
            this.oscillator = null;
        }
    }
};

const callOverlayHtml = `
<div id="call-overlay" class="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center font-outfit hidden transition-all duration-300">
    <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 relative flex flex-col items-center">
        <div class="text-center mb-6 z-10 w-full">
            <h3 id="call-status-label" class="text-[10px] font-bold tracking-widest text-emerald-500 uppercase">Incoming Call</h3>
            <h2 id="call-partner-name" class="text-2xl font-bold text-white mt-1">...</h2>
            <div id="call-timer" class="text-xs text-slate-400 mt-1 hidden">00:00</div>
        </div>
        <div id="call-media-area" class="w-full h-80 rounded-2xl overflow-hidden relative bg-slate-950 border border-slate-800 mb-8 flex items-center justify-center">
            <video id="remote-video" class="w-full h-full object-cover hidden" autoplay playsinline></video>
            <div id="call-avatar-placeholder" class="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-500 flex items-center justify-center font-bold text-4xl uppercase animate-pulse">
                U
            </div>
            <video id="local-video" class="absolute bottom-4 right-4 w-24 h-32 object-cover rounded-lg border border-white/20 bg-slate-900 hidden" autoplay playsinline muted></video>
        </div>
        <div id="call-controls" class="flex items-center gap-4 z-10">
            <button id="btn-toggle-audio" class="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
            <button id="btn-toggle-video" class="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
            </button>
            <button id="btn-accept-call" class="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors hidden">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
            <button id="btn-hangup-call" class="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6Z"/></svg>
            </button>
        </div>
    </div>
</div>
`;

class CallingService {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.activeCall = null; // { id, callerId, callerName, receiverId, receiverName, mediaType, status }
        this.isAudioMuted = false;
        this.isVideoMuted = false;
        this.callTimerInterval = null;
        this.callDurationSec = 0;
        this.currentPortal = 'admin';
    }

    init(portal) {
        this.currentPortal = portal;
        document.body.insertAdjacentHTML('beforeend', callOverlayHtml);
        this.setupButtonListeners();
    }

    setupButtonListeners() {
        document.getElementById('btn-accept-call').onclick = () => this.acceptCall();
        document.getElementById('btn-hangup-call').onclick = () => this.hangupCall(true);
        document.getElementById('btn-toggle-audio').onclick = () => this.toggleAudio();
        document.getElementById('btn-toggle-video').onclick = () => this.toggleVideo();
    }

    async handleSignal(data) {
        const { subtype, senderId, senderName, mediaType, sdp, candidate, callId } = data;
        
        if (subtype === 'incoming_call') {
            if (this.activeCall) {
                this.sendSignal(senderId, 'busy', callId);
                return;
            }
            this.activeCall = { id: callId, callerId: senderId, callerName: senderName, receiverId: myId, receiverName: myName, mediaType, status: 'incoming' };
            CallSound.playRing();
            this.showIncomingUI();
        } else if (subtype === 'busy') {
            CallSound.stopRing();
            this.showToast('User is busy');
            this.endCallUI();
        } else if (subtype === 'decline') {
            CallSound.stopRing();
            this.showToast('Call declined');
            this.endCallUI();
        } else if (subtype === 'accept') {
            CallSound.stopRing();
            this.showToast('Call accepted, connecting...');
            this.activeCall.status = 'connected';
            this.startTimer();
            await this.setupPeerConnection(senderId, true);
        } else if (subtype === 'sdp_offer') {
            await this.handleSdpOffer(senderId, sdp);
        } else if (subtype === 'sdp_answer') {
            await this.handleSdpAnswer(sdp);
        } else if (subtype === 'ice_candidate') {
            await this.handleIceCandidate(candidate);
        } else if (subtype === 'end_call') {
            this.showToast('Call ended');
            this.hangupCall(false);
        }
    }

    async makeCall(targetId, targetName, mediaType) {
        const callId = 'call-' + Date.now();
        this.activeCall = { id: callId, callerId: myId, callerName: myName, receiverId: targetId, receiverName: targetName, mediaType, status: 'outgoing' };
        
        this.showOutgoingUI();
        CallSound.playRing();

        this.sendSignal(targetId, 'incoming_call', callId, { mediaType });
        
        // Timeout for unanswered call
        this.callTimeout = setTimeout(() => {
            if (this.activeCall && this.activeCall.status === 'outgoing') {
                this.showToast('No answer');
                this.logCall('missed');
                this.sendSignal(targetId, 'end_call', callId);
                this.hangupCall(true);
            }
        }, 30000);
    }

    async acceptCall() {
        CallSound.stopRing();
        if (!this.activeCall) return;
        this.activeCall.status = 'connected';
        this.showConnectedUI();
        this.startTimer();
        this.sendSignal(this.activeCall.callerId, 'accept', this.activeCall.id);
        await this.setupPeerConnection(this.activeCall.callerId, false);
    }

    async setupPeerConnection(targetId, isCaller) {
        try {
            this.peerConnection = new RTCPeerConnection(rtcConfig);
            
            // Get local stream
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: this.activeCall.mediaType === 'video'
                });
                
                const localVideo = document.getElementById('local-video');
                if (this.activeCall.mediaType === 'video' && localVideo) {
                    localVideo.srcObject = this.localStream;
                    localVideo.classList.remove('hidden');
                }
                
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            } catch (e) {
                console.warn('Camera/mic access failed, using simulated call connection');
                this.showToast('No camera/mic found. Starting simulated call.');
            }

            this.peerConnection.ontrack = (event) => {
                const remoteVideo = document.getElementById('remote-video');
                const avatar = document.getElementById('call-avatar-placeholder');
                if (remoteVideo && event.streams[0]) {
                    remoteVideo.srcObject = event.streams[0];
                    remoteVideo.classList.remove('hidden');
                    if (avatar) avatar.classList.add('hidden');
                }
            };

            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendSignal(targetId, 'ice_candidate', this.activeCall.id, { candidate: event.candidate });
                }
            };

            if (isCaller) {
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);
                this.sendSignal(targetId, 'sdp_offer', this.activeCall.id, { sdp: offer });
            }
        } catch (e) {
            console.error('Peer connection setup failed:', e);
        }
    }

    async handleSdpOffer(senderId, sdp) {
        if (!this.peerConnection) await this.setupPeerConnection(senderId, false);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.sendSignal(senderId, 'sdp_answer', this.activeCall.id, { sdp: answer });
    }

    async handleSdpAnswer(sdp) {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    }

    async handleIceCandidate(candidate) {
        if (this.peerConnection) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch(e) {}
        }
    }

    sendSignal(targetId, subtype, callId, extra = {}) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'call_signal',
                targetUserId: targetId,
                senderId: myId,
                senderName: myName,
                callId,
                subtype,
                ...extra
            }));
        }
    }

    hangupCall(sendNotification = true) {
        CallSound.stopRing();
        if (this.callTimeout) clearTimeout(this.callTimeout);
        
        if (this.activeCall) {
            if (sendNotification) {
                const target = myId === this.activeCall.callerId ? this.activeCall.receiverId : this.activeCall.callerId;
                this.sendSignal(target, this.activeCall.status === 'incoming' ? 'decline' : 'end_call', this.activeCall.id);
            }
            
            // Capture call data BEFORE endCallUI sets activeCall to null
            const finalStatus = this.activeCall.status === 'incoming' ? 'declined' : 
                                this.activeCall.status === 'connected' ? 'completed' : 'missed';
            const callSnapshot = { ...this.activeCall };
            const durationSnapshot = this.callDurationSec;
            
            // Log call with snapshot
            this.logCallData(callSnapshot, finalStatus, durationSnapshot);
        }
        
        this.endCallUI();
    }

    async logCallData(callData, status, duration) {
        try {
            // Log in call repository
            await fetch('/api/messages/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callerId: callData.callerId,
                    callerName: callData.callerName,
                    receiverId: callData.receiverId,
                    receiverName: callData.receiverName,
                    mediaType: callData.mediaType,
                    status: status,
                    duration: duration
                })
            });
            
            // Log call as a chat message in the conversation
            const getCallChatId = (idA, idB) => {
                if (idA === 'staff-admin' || idA === 'admin' || idA === 'support') return idB;
                if (idB === 'staff-admin' || idB === 'admin' || idB === 'support') return idA;
                const sorted = [idA, idB].sort();
                return `chat_${sorted[0]}_${sorted[1]}`;
            };
            
            const chatConversationId = getCallChatId(callData.callerId, callData.receiverId);
            
            const mins = Math.floor(duration / 60).toString().padStart(2, '0');
            const secs = (duration % 60).toString().padStart(2, '0');
            const durationStr = `${mins}:${secs}`;
            
            let callIcon = callData.mediaType === 'video' ? '📹' : '📞';
            let statusText = status === 'completed' ? `Completed (${durationStr})` : 
                             status === 'missed' ? 'Missed Call' : 'Declined';
                             
            const callMessagePayload = {
                text: `${callIcon} ${callData.mediaType.toUpperCase()} CALL: ${statusText}`,
                reactions: {},
                attachments: [],
                isCallLog: true,
                callDetails: {
                    mediaType: callData.mediaType,
                    status: status,
                    duration: duration
                }
            };
            
            let senderRole = 'staff';
            if (window.location.pathname.includes('/admin/')) {
                senderRole = 'admin';
            } else if (window.location.pathname.includes('/client/')) {
                senderRole = 'client';
            } else if (window.location.pathname.includes('/staff/')) {
                senderRole = 'staff';
            } else {
                if (callData.callerId === 'staff-admin' || callData.callerId === 'admin') {
                    senderRole = 'admin';
                } else if (callData.callerId.startsWith('client')) {
                    senderRole = 'client';
                }
            }
            
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: chatConversationId,
                    senderId: callData.callerId,
                    senderName: callData.callerName,
                    senderRole: senderRole,
                    text: JSON.stringify(callMessagePayload)
                })
            });
            
            // Trigger call history list refresh (no tab guard)
            if (typeof window.loadCallHistory === 'function') {
                window.loadCallHistory();
            }
        } catch(e) { console.error('Call logging failed:', e); }
    }

    async logCall(status) {
        if (!this.activeCall) return;
        await this.logCallData(this.activeCall, status, this.callDurationSec);

    }

    toggleAudio() {
        this.isAudioMuted = !this.isAudioMuted;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => track.enabled = !this.isAudioMuted);
        }
        const btn = document.getElementById('btn-toggle-audio');
        if (this.isAudioMuted) {
            btn.classList.add('bg-red-500', 'hover:bg-red-600');
            btn.classList.remove('bg-slate-800', 'hover:bg-slate-700');
        } else {
            btn.classList.remove('bg-red-500', 'hover:bg-red-600');
            btn.classList.add('bg-slate-800', 'hover:bg-slate-700');
        }
    }

    toggleVideo() {
        this.isVideoMuted = !this.isVideoMuted;
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => track.enabled = !this.isVideoMuted);
        }
        const btn = document.getElementById('btn-toggle-video');
        if (this.isVideoMuted) {
            btn.classList.add('bg-red-500', 'hover:bg-red-600');
            btn.classList.remove('bg-slate-800', 'hover:bg-slate-700');
        } else {
            btn.classList.remove('bg-red-500', 'hover:bg-red-600');
            btn.classList.add('bg-slate-800', 'hover:bg-slate-700');
        }
    }

    startTimer() {
        this.callDurationSec = 0;
        const timerEl = document.getElementById('call-timer');
        if (timerEl) {
            timerEl.classList.remove('hidden');
            timerEl.innerText = '00:00';
        }
        this.callTimerInterval = setInterval(() => {
            this.callDurationSec++;
            const m = Math.floor(this.callDurationSec / 60).toString().padStart(2, '0');
            const s = (this.callDurationSec % 60).toString().padStart(2, '0');
            if (timerEl) timerEl.innerText = `${m}:${s}`;
        }, 1000);
    }

    stopTimer() {
        if (this.callTimerInterval) {
            clearInterval(this.callTimerInterval);
            this.callTimerInterval = null;
        }
    }

    showIncomingUI() {
        const overlay = document.getElementById('call-overlay');
        const accept = document.getElementById('btn-accept-call');
        const status = document.getElementById('call-status-label');
        const partner = document.getElementById('call-partner-name');
        const avatar = document.getElementById('call-avatar-placeholder');
        
        if (status) status.innerText = `Incoming ${this.activeCall.mediaType} call`;
        if (partner) partner.innerText = this.activeCall.callerName;
        if (avatar) avatar.innerText = this.activeCall.callerName.charAt(0);
        if (accept) accept.classList.remove('hidden');
        if (overlay) overlay.classList.remove('hidden');
    }

    showOutgoingUI() {
        const overlay = document.getElementById('call-overlay');
        const accept = document.getElementById('btn-accept-call');
        const status = document.getElementById('call-status-label');
        const partner = document.getElementById('call-partner-name');
        const avatar = document.getElementById('call-avatar-placeholder');
        
        if (status) status.innerText = `Calling (${this.activeCall.mediaType})...`;
        if (partner) partner.innerText = this.activeCall.receiverName;
        if (avatar) avatar.innerText = this.activeCall.receiverName.charAt(0);
        if (accept) accept.classList.add('hidden');
        if (overlay) overlay.classList.remove('hidden');
    }

    showConnectedUI() {
        const status = document.getElementById('call-status-label');
        const accept = document.getElementById('btn-accept-call');
        if (status) status.innerText = 'Connected';
        if (accept) accept.classList.add('hidden');
    }

    endCallUI() {
        this.stopTimer();
        const overlay = document.getElementById('call-overlay');
        if (overlay) overlay.classList.add('hidden');
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        const localVideo = document.getElementById('local-video');
        const remoteVideo = document.getElementById('remote-video');
        const avatar = document.getElementById('call-avatar-placeholder');
        if (localVideo) {
            localVideo.srcObject = null;
            localVideo.classList.add('hidden');
        }
        if (remoteVideo) {
            remoteVideo.srcObject = null;
            remoteVideo.classList.add('hidden');
        }
        if (avatar) avatar.classList.remove('hidden');
        
        this.activeCall = null;
        this.callDurationSec = 0;
    }

    showToast(msg) {
        const container = document.getElementById('toast-container') || (() => {
            const div = document.createElement('div');
            div.id = 'toast-container';
            div.className = 'fixed bottom-5 right-5 space-y-3 z-[9999]';
            document.body.appendChild(div);
            return div;
        })();
        const toast = document.createElement('div');
        toast.className = 'bg-slate-900 border border-slate-800 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-2xl flex items-center gap-2';
        toast.innerHTML = `<span>📞</span><span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}

window.Calling = new CallingService();

// --- Starred Messages Rest Implementation ---

window.toggleStarredDatabase = async function(msgId, isStarred, userId, callback) {
    const method = isStarred ? 'POST' : 'DELETE';
    try {
        await fetch(`/api/messages/starred/${msgId}?userId=${userId}`, { method });
        if (callback) callback();
    } catch(e) { console.error('Failed to update starred status:', e); }
};

// --- Dynamic Group Chat Modal Creators ---

const groupModalHtml = `
<div id="group-create-modal" class="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center font-outfit hidden">
    <div class="bg-white border border-slate-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative flex flex-col">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Create Group Chat</h3>
        <div class="space-y-4 mb-6">
            <div>
                <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Group Name</label>
                <input type="text" id="new-group-name" placeholder="e.g. Finance Operations" class="w-full mt-1.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10">
            </div>
            <div>
                <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invite Members</label>
                <div id="group-member-checklist" class="max-h-40 overflow-y-auto mt-2 border border-slate-100 rounded-xl p-3 divide-y divide-slate-50 space-y-1 bg-slate-50/50">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        </div>
        <div class="flex gap-3 justify-end">
            <button onclick="document.getElementById('group-create-modal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
            <button id="btn-submit-create-group" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">Create Group</button>
        </div>
    </div>
</div>
`;

window.showCreateGroupModal = async function() {
    let modal = document.getElementById('group-create-modal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', groupModalHtml);
        modal = document.getElementById('group-create-modal');
    }
    
    // Fetch users for checklist
    try {
        const res = await fetch('/api/messages/users');
        let users = await res.json();
        try {
            const localStaff = JSON.parse(localStorage.getItem('local_staff_accounts') || '[]');
            localStaff.forEach(ls => {
                const exists = users.some(u => u.email === ls.email || u.id === ls.id);
                if (!exists) {
                    users.push({
                        id: ls.id,
                        name: (ls.firstName + " " + ls.lastName).trim(),
                        role: ls.role || 'STAFF',
                        email: ls.email
                    });
                }
            });
        } catch(e) {}
        const checklist = document.getElementById('group-member-checklist');
        checklist.innerHTML = users.filter(u => u.id !== myId).map(u => `
            <label class="flex items-center gap-3 py-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input type="checkbox" name="group-member" value="${u.id}" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500/10">
                <span>${u.name} (${u.role})</span>
            </label>
        `).join('') || '<div class="text-center text-slate-400 text-xs py-4">No eligible users found</div>';
        
        document.getElementById('btn-submit-create-group').onclick = async () => {
            const name = document.getElementById('new-group-name').value.trim();
            if (!name) return alert('Please enter a group name.');
            
            const selectedCheckbox = document.querySelectorAll('input[name="group-member"]:checked');
            const memberIds = Array.from(selectedCheckbox).map(cb => cb.value);
            memberIds.push(myId); // include creator
            
            try {
                const createRes = await fetch('/api/messages/groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        memberIds: memberIds,
                        createdBy: myId
                    })
                });
                if (createRes.ok) {
                    modal.classList.add('hidden');
                    document.getElementById('new-group-name').value = '';
                    if (typeof window.fetchConversations === 'function') {
                        window.fetchConversations();
                    } else if (typeof window.loadTeamChatSidebar === 'function') {
                        window.loadTeamChatSidebar();
                    }
                }
            } catch(e) { console.error(e); }
        };
        
        modal.classList.remove('hidden');
    } catch(e) { console.error('Failed to load users:', e); }
};

// --- Group Management Info Popup ---

const groupManageHtml = `
<div id="group-manage-modal" class="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center font-outfit hidden">
    <div class="bg-white border border-slate-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative flex flex-col">
        <h3 class="text-lg font-bold text-slate-900 mb-2">Group Information</h3>
        <input type="text" id="manage-group-name" class="text-sm font-bold text-slate-800 px-3 py-2 border border-slate-200 rounded-xl mb-4 focus:outline-none">
        
        <div class="mb-4">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Group Members</h4>
            <div id="group-members-list" class="max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <!-- Dynamically loaded -->
            </div>
        </div>
        
        <div class="mb-6">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Invite Additional Members</h4>
            <div id="group-invite-checklist" class="max-h-32 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-1">
                <!-- Dynamically loaded -->
            </div>
        </div>
        
        <div class="flex gap-3 justify-between">
            <button id="btn-save-group-manage" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">Save Changes</button>
            <button onclick="document.getElementById('group-manage-modal').classList.add('hidden')" class="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">Close</button>
        </div>
    </div>
</div>
`;

window.showGroupManagementPopup = async function(groupId) {
    let modal = document.getElementById('group-manage-modal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', groupManageHtml);
        modal = document.getElementById('group-manage-modal');
    }
    
    try {
        // Fetch group details
        const res = await fetch('/api/messages/users');
        let allUsers = await res.json();
        try {
            const localStaff = JSON.parse(localStorage.getItem('local_staff_accounts') || '[]');
            localStaff.forEach(ls => {
                const exists = allUsers.some(u => u.email === ls.email || u.id === ls.id);
                if (!exists) {
                    allUsers.push({
                        id: ls.id,
                        name: (ls.firstName + " " + ls.lastName).trim(),
                        role: ls.role || 'STAFF',
                        email: ls.email
                    });
                }
            });
        } catch(e) {}
        
        // Find group from teamGroups or dynamic list (e.g. check standard database endpoint)
        const groupsRes = await fetch(`/api/messages/groups?userId=${myId}`);
        const groups = await groupsRes.json();
        const group = groups.find(g => g.id === groupId);
        
        if (!group) return;
        
        const nameInput = document.getElementById('manage-group-name');
        nameInput.value = group.name;
        
        // Members list
        const listDiv = document.getElementById('group-members-list');
        listDiv.innerHTML = allUsers.filter(u => group.memberIds.includes(u.id)).map(u => `
            <div class="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span class="text-xs font-semibold text-slate-700">${u.name}</span>
                ${u.id !== group.createdBy && u.id !== myId ? `
                    <button onclick="removeUserFromGroup('${group.id}', '${u.id}')" class="text-[10px] text-red-500 font-bold hover:underline">Remove</button>
                ` : `<span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">${u.id === group.createdBy ? 'Owner' : 'Member'}</span>`}
            </div>
        `).join('');
        
        // Invite Checklist
        const inviteDiv = document.getElementById('group-invite-checklist');
        inviteDiv.innerHTML = allUsers.filter(u => !group.memberIds.includes(u.id)).map(u => `
            <label class="flex items-center gap-3 py-1 cursor-pointer text-xs font-semibold text-slate-700">
                <input type="checkbox" name="invite-member" value="${u.id}" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500/10">
                <span>${u.name}</span>
            </label>
        `).join('') || '<div class="text-slate-400 text-[10px] py-2">All users are already members</div>';
        
        // Save Name
        document.getElementById('btn-save-group-manage').onclick = async () => {
            const newName = nameInput.value.trim();
            if (!newName) return;
            
            // Invites
            const checkedBoxes = document.querySelectorAll('input[name="invite-member"]:checked');
            const inviteIds = Array.from(checkedBoxes).map(cb => cb.value);
            
            try {
                if (newName !== group.name) {
                    await fetch(`/api/messages/groups/${group.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName })
                    });
                }
                
                if (inviteIds.length > 0) {
                    await fetch(`/api/messages/groups/${group.id}/members`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userIds: inviteIds })
                    });
                }
                
                modal.classList.add('hidden');
                if (typeof window.fetchConversations === 'function') {
                    window.fetchConversations();
                } else if (typeof window.loadTeamChatSidebar === 'function') {
                    window.loadTeamChatSidebar();
                }
                if (typeof window.selectTeamConversation === 'function' && selectedTeamChatId === group.id) {
                    window.selectTeamConversation(group.id, newName);
                }
            } catch(e) { console.error(e); }
        };
        
        modal.classList.remove('hidden');
    } catch(e) { console.error('Failed to load group manager:', e); }
};

window.removeUserFromGroup = async function(groupId, userId) {
    if (!confirm('Remove member from group?')) return;
    try {
        const res = await fetch(`/api/messages/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            document.getElementById('group-manage-modal').classList.add('hidden');
            if (typeof window.fetchConversations === 'function') {
                window.fetchConversations();
            } else if (typeof window.loadTeamChatSidebar === 'function') {
                window.loadTeamChatSidebar();
            }
            if (typeof window.selectTeamConversation === 'function' && selectedTeamChatId === groupId) {
                window.selectTeamConversation(groupId, document.getElementById('manage-group-name').value);
            }
        }
    } catch(e) { console.error(e); }
};

// --- Voice Recording Service ---
class VoiceRecorderService {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingTimer = null;
        this.duration = 0;
    }

    async startRecording(onTick, onError) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.isRecording = true;
            this.duration = 0;

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.start();

            this.recordingTimer = setInterval(() => {
                this.duration++;
                if (onTick) onTick(this.duration);
            }, 1000);

        } catch (e) {
            console.error('Failed to start recording:', e);
            if (onError) onError(e);
        }
    }

    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                resolve(null);
                return;
            }

            clearInterval(this.recordingTimer);
            this.isRecording = false;

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        blob: audioBlob,
                        url: reader.result, // base64 URL
                        name: `VoiceNote-${Date.now()}.webm`,
                        type: 'audio/webm',
                        size: audioBlob.size
                    });
                };
                reader.readAsDataURL(audioBlob);

                // Stop tracks
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.stop();
        });
    }
}

window.VoiceRecorder = new VoiceRecorderService();

window.categorizeFile = function(fileName, fileType) {
    const nameLower = fileName.toLowerCase();
    const typeLower = (fileType || '').toLowerCase();
    
    if (nameLower.includes('passport')) {
        return 'Passport Copies';
    } else if (nameLower.includes('bill') || nameLower.includes('utility') || nameLower.includes('invoice')) {
        return 'Utility Bills';
    } else if (nameLower.includes('contract') || nameLower.includes('agreement') || nameLower.includes('lease') || nameLower.includes('policy')) {
        return 'Contracts';
    } else if (typeLower.includes('pdf') || nameLower.endsWith('.pdf')) {
        return 'PDFs';
    } else if (typeLower.startsWith('image/') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.gif') || nameLower.endsWith('.webp')) {
        return 'Images';
    }
    return 'Other Documents';
};
