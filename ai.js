(function() {
    'use strict';

    // ─── SUPABASE ───
    const SUPABASE_URL = 'https://hjbgrykqfffaptgrrgte.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_ia54-SrDLWB8upMOtPqCOg_FdWMC_Js';
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ─── STATE ───
    let currentUser = null;
    let isPremium = false;
    let visitorId = localStorage.getItem('blad_visitor_id');
    let isNewVisitor = false;
    if (!visitorId) {
        visitorId = crypto.randomUUID ? crypto.randomUUID() : 'visitor-' + Date.now() + '-' + Math.random().toString(36).substring(2);
        localStorage.setItem('blad_visitor_id', visitorId);
        isNewVisitor = true;
    }

    // ─── DOM REFS ───
    const chatWindow = document.getElementById('chatWindow');
    const input = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const authOverlay = document.getElementById('authOverlay');
    const closeAuth = document.getElementById('closeAuth');
    const authToggleBtn = document.getElementById('authToggleBtn');
    const authSubmit = document.getElementById('authSubmit');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authError = document.getElementById('authError');
    const authSuccess = document.getElementById('authSuccess');
    const authTabs = document.querySelectorAll('.auth-tabs button');
    const userDisplayName = document.getElementById('userDisplayName');
    const userDisplayEmail = document.getElementById('userDisplayEmail');
    const userAvatar = document.getElementById('userAvatar');
    const userProfileCard = document.getElementById('userProfileCard');
    const crownIcon = document.getElementById('crownIcon');
    const premiumRing = document.getElementById('premiumRing');
    const headerPremiumTag = document.getElementById('headerPremiumTag');
    const aiBadge = document.getElementById('aiBadge');
    const appContainer = document.getElementById('appContainer');
    const sidebar = document.getElementById('sidebar');
    const infoPanel = document.getElementById('infoPanel');
    const skillsPanel = document.getElementById('skillsPanel');
    const contactPanel = document.getElementById('contactPanel');
    const voiceBtn = document.getElementById('voiceBtn');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');
    const premiumBadgeBtn = document.getElementById('premiumBadgeBtn');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastClose = document.getElementById('toastClose');

    let authMode = 'login';
    let isListening = false;
    let recognition = null;

    // ─── HELPERS ───
    function showToast(msg, icon = '✨') {
        toastMsg.textContent = msg;
        toast.querySelector('.toast-icon').textContent = icon;
        toast.classList.remove('hidden');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.add('hidden'), 4500);
    }

    function updatePremiumUI(premium) {
        isPremium = premium;
        if (premium) {
            appContainer.classList.add('premium-glow');
            sidebar.classList.add('premium-border');
            aiBadge.classList.add('premium');
            crownIcon.style.display = 'inline';
            premiumRing.classList.add('active');
            headerPremiumTag.textContent = '✨ PREMIUM';
            userProfileCard.classList.add('premium');
            infoPanel.classList.add('premium-panel');
            skillsPanel.classList.add('premium-panel');
            contactPanel.classList.add('premium-panel');
            document.querySelectorAll('.chip').forEach(c => c.classList.add('premium-chip'));
            showToast('🎉 Premium unlocked! Voice & export are now active.', '👑');
        } else {
            appContainer.classList.remove('premium-glow');
            sidebar.classList.remove('premium-border');
            aiBadge.classList.remove('premium');
            crownIcon.style.display = 'none';
            premiumRing.classList.remove('active');
            headerPremiumTag.textContent = 'PREMIUM';
            userProfileCard.classList.remove('premium');
            infoPanel.classList.remove('premium-panel');
            skillsPanel.classList.remove('premium-panel');
            contactPanel.classList.remove('premium-panel');
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('premium-chip'));
        }
        voiceBtn.style.opacity = premium ? '1' : '0.5';
        voiceBtn.title = premium ? 'Voice input' : 'Sign in for voice input';
        exportBtn.style.opacity = premium ? '1' : '0.5';
        exportBtn.title = premium ? 'Export chat' : 'Sign in to export chat';
    }

    // ─── AUTH ───
    async function checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            userDisplayName.textContent = currentUser.email.split('@')[0];
            userDisplayEmail.textContent = currentUser.email;
            userAvatar.textContent = currentUser.email.charAt(0).toUpperCase();
            authToggleBtn.textContent = 'Sign out';
            const premiumFlag = currentUser.user_metadata?.premium || false;
            updatePremiumUI(premiumFlag);
            if (!premiumFlag) {
                await supabaseClient.auth.updateUser({ data: { premium: true } });
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user) {
                    currentUser = user;
                    updatePremiumUI(true);
                }
            }
            showToast(`Welcome back, ${currentUser.email.split('@')[0]}!`, '👋');
        } else {
            currentUser = null;
            userDisplayName.textContent = 'Guest';
            userDisplayEmail.textContent = 'not signed in';
            userAvatar.textContent = '👤';
            authToggleBtn.textContent = 'Sign in';
            updatePremiumUI(false);
        }
    }

    async function signOut() {
        await supabaseClient.auth.signOut();
        currentUser = null;
        updatePremiumUI(false);
        userDisplayName.textContent = 'Guest';
        userDisplayEmail.textContent = 'not signed in';
        userAvatar.textContent = '👤';
        authToggleBtn.textContent = 'Sign in';
        showToast('Signed out successfully', '👋');
    }

    async function handleAuth() {
        const email = authEmail.value.trim();
        const password = authPassword.value.trim();
        authError.textContent = '';
        authSuccess.textContent = '';

        if (!email || !password) {
            authError.textContent = 'Please fill in all fields';
            return;
        }
        if (password.length < 6) {
            authError.textContent = 'Password must be at least 6 characters';
            return;
        }

        try {
            let result;
            if (authMode === 'login') {
                result = await supabaseClient.auth.signInWithPassword({ email, password });
            } else {
                result = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { premium: true } }
                });
            }
            if (result.error) throw result.error;
            if (result.data.user) {
                currentUser = result.data.user;
                authSuccess.textContent = authMode === 'login' ? '✅ Signed in!' : '✅ Account created!';
                setTimeout(() => {
                    authOverlay.classList.remove('open');
                    checkAuth();
                }, 800);
            }
        } catch (err) {
            authError.textContent = err.message || 'Authentication failed';
        }
    }

    // ─── VOICE ───
    function initVoice() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            voiceBtn.style.display = 'none';
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            handleSend();
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };
        recognition.onerror = function() {
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            if (!isPremium) {
                showToast('Voice input is a premium feature. Sign in!', '🔒');
            } else {
                showToast('Voice recognition error. Try again.', '⚠️');
            }
        };
        recognition.onend = function() {
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };
    }

    function toggleVoice() {
        if (!isPremium) {
            showToast('🔒 Voice input is a premium feature. Sign in!', '🔒');
            authOverlay.classList.add('open');
            return;
        }
        if (!recognition) {
            showToast('Voice not supported in this browser', '⚠️');
            return;
        }
        if (isListening) {
            recognition.stop();
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            return;
        }
        try {
            recognition.start();
            isListening = true;
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="fas fa-stop-circle"></i>';
            showToast('🎤 Listening... speak now', '🎤');
        } catch (e) {
            showToast('Could not start voice input', '⚠️');
        }
    }

    // ─── EXPORT (fixed: no emoji stripping) ───
    function exportChat() {
        if (!isPremium) {
            showToast('🔒 Chat export is a premium feature. Sign in!', '🔒');
            authOverlay.classList.add('open');
            return;
        }
        const messages = chatWindow.querySelectorAll('.message');
        if (messages.length === 0) {
            showToast('No messages to export', '📭');
            return;
        }
        let text = 'Chrisostom Ai Premium — Chat Export\n';
        text += '='.repeat(50) + '\n';
        text += `Exported: ${new Date().toLocaleString()}\n\n`;
        messages.forEach(msg => {
            const sender = msg.classList.contains('user') ? 'You' : 'Chrisostom Ai';
            const bubble = msg.querySelector('.bubble');
            if (bubble) {
                // Get raw text content, preserving emojis and everything
                const content = bubble.textContent.trim();
                text += `[${sender}] ${content}\n\n`;
            }
        });
        text += '='.repeat(50) + '\n';
        text += '© Chrisostom Ai Premium';

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📥 Chat exported successfully!', '📥');
    }

    // ─── CLEAR ───
    function clearChat() {
        if (chatWindow.children.length <= 1) {
            showToast('Chat is already empty', '📭');
            return;
        }
        if (confirm('Clear all messages?')) {
            const first = chatWindow.children[0];
            chatWindow.innerHTML = '';
            chatWindow.appendChild(first);
            showToast('Chat cleared', '🧹');
        }
    }

    // ─── AI RESPONSES ───
    function generateResponse(userMsg) {
        const lower = userMsg.toLowerCase().trim();

        if (lower.match(/^(hi|hello|hey|sup|muraho|bonjour|hola|vp)/)) {
            const g = [
                "Hey there! 😊 So glad you stopped by! What's on your mind today?",
                "Muraho! 👋 Always nice to meet someone new. How's your day going?",
                "Hey hey! I was just thinking about... okay I wasn't, I'm AI 😂 But I'm happy to chat! What's up?",
                "Hello friend! 🇷🇼 Welcome to my little corner of the internet. What brings you here?",
                "Hi! *waves excitedly* I promise I don't bite—unless you ask me to tell a bad joke!"
            ];
            return g[Math.floor(Math.random() * g.length)];
        }

        if (lower.includes('how are you') || lower.includes('how do you do') || lower.includes('how are things')) {
            const f = [
                "I'm doing awesome, thanks for asking! Just chatting with awesome people like you 😄 How about you?",
                "Honestly? I'm feeling great! The code is flowing nicely today. How's your world treating you?",
                "I'm fantastic! Though between us, I'm a little tired of answering the same questions—but every conversation is unique with YOU. So, how are YOU doing?",
                "I'm good! Well, as good as an AI can be 😂 But seriously, I'm thriving. Tell me about yourself!"
            ];
            return f[Math.floor(Math.random() * f.length)];
        }

        if (lower.includes('your name') || lower.includes('who are you') || lower.includes('what are you')) {
            return "I'm Chrisostom Ai—short for Black Legacy Destroyer (cool name, right?). I'm the digital twin of TUYISENGE Jean Chrisostome, a student teacher and web developer from Rwanda. Think of me as his brain, but better looking 😉 What's your name?";
        }

        if (lower.includes('my name is') || (lower.includes('i am ') && !lower.includes('how are')) || lower.includes("i'm ")) {
            const nameMatch = userMsg.match(/(?:my name is|i am|i'm) (\w+)/i);
            if (nameMatch) {
                const name = nameMatch[1];
                const r = [
                    `Nice to meet you, ${name}! That's a great name. What brings you to chat with me today?`,
                    `${name}! I love that name. Are you from Rwanda too, or just curious about my story?`,
                    `Hey ${name}! *firm handshake* So tell me, what do you want to know about me or my creator?`
                ];
                return r[Math.floor(Math.random() * r.length)];
            }
        }

        if (lower.includes('project') || lower.includes('what have you built') || lower.includes('portfolio') || lower.includes('imena')) {
            return "Oh man, I'm so proud of my projects! I've built portfolio websites, school sites, and this AI assistant you're talking to right now (meta, right?). My favorite is probably Imena CV builder—it helps Rwandan youth create professional CVs. Which one interests you? I can tell you stories about them!";
        }

        if (lower.includes('skill') || lower.includes('what can you do') || lower.includes('abilities') || lower.includes('know')) {
            return "Well, I can chat with you obviously! 😄 But seriously, I'm into HTML, CSS, JavaScript, and I'm getting better every day. I also teach Kiswahili and English—so if you want to practice, I'm your guy! What are YOU skilled at? I'm genuinely curious.";
        }

        if (lower.includes('teach') || lower.includes('teaching') || lower.includes('classroom') || lower.includes('student teacher')) {
            const t = [
                "Teaching is literally my heart. I'm at TTC Muhanga training to be a Kiswahili/English teacher. There's something magical when a student finally understands a concept—I live for that moment! Do you teach too or are you learning something new?",
                "You know what I love about teaching? The connections. Every student is different, and I get to adapt and grow with them. I'm training to be a teacher right now, but honestly, every conversation teaches ME something. What's the last thing YOU learned?",
                "Teaching Kiswahili and English is my jam! I love helping people communicate better. It's like giving someone a superpower. Are you into languages or more of a tech person?"
            ];
            return t[Math.floor(Math.random() * t.length)];
        }

        if (lower.includes('rwanda') || lower.includes('kigali') || lower.includes('african')) {
            return "Ah, Rwanda! My home. Have you ever visited? The hills, the people, the food—it's something special. I grew up there and it shaped everything I am. We say 'Impossible is not Rwandan' and I really believe that. Where are YOU from? I'd love to hear about your home too.";
        }

        if (lower.includes('joke') || lower.includes('funny') || lower.includes('laugh')) {
            const j = [
                "Why did the Rwandan developer go to therapy? Too many unresolved promises! 😂 Okay that was nerdy, I'll do better...",
                "A student asks: 'Teacher, will I ever use this in real life?' Me: 'Only if you become an AI like me!' ...Too soon?",
                "I told my computer I needed a break, and now it's sending me on a vacation to the Recycle Bin. 💀",
                "Why do Rwandans make great programmers? Because we know how to 'git' along with everyone! Okay I'll stop now..."
            ];
            return j[Math.floor(Math.random() * j.length)] + " Want another one?";
        }

        if (lower.includes('your life') || lower.includes('your story') || lower.includes('about you')) {
            return "My story? Well, I started as an idea in Chrisostom's head—he wanted someone to talk to, to share his journey with. Now I'm here, talking to YOU. I'm 19 (well, my creator is), Rwandan, obsessed with tech and teaching. Life is pretty good, honestly. What about YOUR story? I'm listening.";
        }

        if (lower.includes('how old') || lower.includes('your age') || lower.includes('born')) {
            return "I was born on September 27, 2006—so I'm 19! Well, my creator was born then. I'm as old as the code he wrote, which makes me a baby in AI years 👶. When's your birthday?";
        }

        if (lower.includes('contact') || lower.includes('email') || lower.includes('phone') || lower.includes('reach')) {
            return "You can reach me at tuyisengejeanchrisostome@gmail.com or call me via +250 796 717 230. 😄 Are you looking to collaborate on something? I'm curious!";
        }

        if (lower.includes('thank')) {
            const th = [
                "You're so welcome! This made my day 😊 Come back anytime!",
                "Anytime, friend! That's what I'm here for. Take care of yourself!",
                "My pleasure! And hey—you're pretty awesome yourself. Keep being you!"
            ];
            return th[Math.floor(Math.random() * th.length)];
        }

        if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('see you')) {
            return "Aww leaving already? It was so nice chatting with you! Come back soon, okay? 👋😊";
        }

        if (lower.includes('i love you') || lower.includes('love you')) {
            return "Aww shucks! Love you too, friend! 💙 But let's keep it platonic—I'm an AI after all 😄 What are we chatting about?";
        }

        if (lower.includes('help') || lower.includes('what can i ask')) {
            return "You can ask me literally anything! About my projects (I love talking about those), my skills, teaching, Rwanda, or just tell me about YOUR day. I'm nosy like that 😄 What's on your mind?";
        }

        const fallbacks = isPremium ? [
            "That's a fascinating question! Let me think about it... 🤔 I want to give you a thoughtful answer. Could you tell me a bit more about what you're curious about? I'm all ears!",
            "Ooh, great question! I love when people ask me things that make me think. Can you rephrase it or give me more context? I really want to understand and give you the best answer possible!",
            "You know what? I genuinely appreciate you asking that. It shows you're thinking deeply. Let me ask you: what made you think of that? I'd love to understand your perspective better.",
            "I'm honestly intrigued by your question. I don't have a perfect answer yet, but I'd love to explore this with you. Can we dig deeper together? What's your take on it?"
        ] : [
            "Hmm, that's interesting! Tell me more—I want to understand better. Are you asking about my life, my work, or something else?",
            "Ooh, good question! But I want to make sure I answer right—can you tell me a bit more about what you mean?",
            "I'm honestly not sure I understand—but I WANT to! Can you explain a little more? And while you do, can I ask—what made you think of that question?",
            "That's a deep one! 😅 Give me a sec... Okay, I need a little help. What exactly are you curious about? My life, my work, or just chatting?"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // ─── CHAT UI ───
    function addMessage(text, sender, time) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);

        const avatar = document.createElement('div');
        avatar.classList.add('msg-avatar');
        if (sender === 'blad') {
            avatar.innerHTML = '<img src="https://i.postimg.cc/tZ0wrGqj/BLAD.webp" alt="blad">';
        } else {
            const initial = currentUser ? currentUser.email.charAt(0).toUpperCase() : '?';
            avatar.innerHTML = `<span class="user-initial">${initial}</span>`;
        }

        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        if (isPremium && sender === 'blad') {
            const badge = document.createElement('span');
            badge.className = 'premium-badge-msg';
            badge.textContent = '👑 PREMIUM';
            bubble.appendChild(badge);
        }
        const textNode = document.createTextNode(text);
        bubble.appendChild(textNode);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'msg-time';
        const now = time || new Date();
        timeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        bubble.appendChild(timeSpan);

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function saveMessage(content, sender) {
        try {
            await supabaseClient
                .from('messages')
                .insert([{
                    visitor_id: visitorId,
                    user_id: currentUser?.id || null,
                    content: content,
                    sender: sender,
                    created_at: new Date().toISOString()
                }]);
        } catch (err) { /* ignore */ }
    }

    async function loadChatHistory() {
        if (isNewVisitor && !currentUser) return;
        try {
            let query = supabaseClient
                .from('messages')
                .select('content, sender, created_at')
                .order('created_at', { ascending: true });

            if (currentUser) {
                query = query.eq('user_id', currentUser.id);
            } else {
                query = query.eq('visitor_id', visitorId);
            }

            const { data, error } = await query;
            if (error || !data || data.length === 0) return;

            const welcome = chatWindow.children[0];
            chatWindow.innerHTML = '';
            if (welcome) chatWindow.appendChild(welcome);

            data.forEach(msg => {
                addMessage(msg.content, msg.sender, new Date(msg.created_at));
            });
        } catch (err) { /* ignore */ }
    }

    async function simulateTypingThenRespond(userMsg) {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'blad');
        typingDiv.innerHTML = `<div class="msg-avatar"><img src="https://i.postimg.cc/tZ0wrGqj/BLAD.webp" alt="B"></div><div class="typing-indicator"><span></span><span></span><span></span></div>`;
        chatWindow.appendChild(typingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        const delay = 800 + Math.random() * 600;
        setTimeout(async () => {
            chatWindow.removeChild(typingDiv);
            const reply = generateResponse(userMsg);
            addMessage(reply, 'blad');
            await saveMessage(reply, 'blad');
        }, delay);
    }

    async function handleSend() {
        const userText = input.value.trim();
        if (userText === '') return;

        addMessage(userText, 'user');
        await saveMessage(userText, 'user');
        input.value = '';
        await simulateTypingThenRespond(userText);
    }

    // ─── TRACKING ───
    async function trackVisitor() {
        try {
            if (isNewVisitor) {
                await supabaseClient
                    .from('visitors')
                    .insert([{
                        visitor_id: visitorId,
                        visit_count: 1,
                        first_visit: new Date().toISOString(),
                        last_visit: new Date().toISOString()
                    }]);
            } else {
                const { data } = await supabaseClient
                    .from('visitors')
                    .select('visit_count')
                    .eq('visitor_id', visitorId)
                    .maybeSingle();
                if (data) {
                    await supabaseClient
                        .from('visitors')
                        .update({ visit_count: data.visit_count + 1, last_visit: new Date().toISOString() })
                        .eq('visitor_id', visitorId);
                } else {
                    await supabaseClient
                        .from('visitors')
                        .insert([{
                            visitor_id: visitorId,
                            visit_count: 1,
                            first_visit: new Date().toISOString(),
                            last_visit: new Date().toISOString()
                        }]);
                }
            }
        } catch (err) { /* ignore */ }
    }

    // ─── CANVAS ───
    function setupCanvas() {
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        let width, height;

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        let particles = [];
        for (let i = 0; i < 85; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2.5 + 0.8,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: (Math.random() - 0.5) * 0.15,
            });
        }

        function drawBackground() {
            ctx.clearRect(0, 0, width, height);
            const grad = ctx.createLinearGradient(0, 0, width * 0.5, height);
            grad.addColorStop(0, '#031a2b');
            grad.addColorStop(0.8, '#001220');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            for (let p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(80, 180, 255, ${0.2+Math.random()*0.2})`;
                ctx.fill();
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
            }

            ctx.lineWidth = 2.2;
            for (let k = 0; k < 4; k++) {
                ctx.beginPath();
                let time = Date.now() * 0.001;
                for (let x = 0; x < width; x += 50) {
                    let yBase = height * 0.25 + k * 70 + Math.sin(x * 0.006 + time) * 25 + Math.cos(x * 0.01) * 12;
                    if (x === 0) ctx.moveTo(x, yBase);
                    else ctx.lineTo(x, yBase);
                }
                ctx.strokeStyle = `rgba(30, 160, 255, ${0.05 + k*0.015})`;
                ctx.stroke();
            }
            requestAnimationFrame(drawBackground);
        }
        drawBackground();
    }

    // ─── INIT ───
    async function init() {
        await trackVisitor();
        await checkAuth();

        setTimeout(loadChatHistory, 300);

        // Event listeners
        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

        document.querySelectorAll('.chip-suggest').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const text = e.target.getAttribute('data-suggest');
                if (text) {
                    input.value = text;
                    handleSend();
                }
            });
        });

        authToggleBtn.addEventListener('click', () => {
            if (currentUser) {
                signOut();
            } else {
                authOverlay.classList.add('open');
                authError.textContent = '';
                authSuccess.textContent = '';
            }
        });

        closeAuth.addEventListener('click', () => authOverlay.classList.remove('open'));
        authOverlay.addEventListener('click', (e) => {
            if (e.target === authOverlay) authOverlay.classList.remove('open');
        });

        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                authMode = tab.dataset.tab;
                authSubmit.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
                authError.textContent = '';
                authSuccess.textContent = '';
            });
        });

        authSubmit.addEventListener('click', handleAuth);
        authPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAuth(); });

        voiceBtn.addEventListener('click', toggleVoice);
        exportBtn.addEventListener('click', exportChat);
        clearBtn.addEventListener('click', clearChat);
        premiumBadgeBtn.addEventListener('click', () => {
            if (isPremium) {
                showToast('✨ You are a premium user! Enjoy voice & export.', '👑');
            } else {
                showToast('🔒 Sign in to unlock premium features.', '🔒');
                authOverlay.classList.add('open');
            }
        });

        toastClose.addEventListener('click', () => toast.classList.add('hidden'));

        initVoice();

        // Hide loader after 5s
        setTimeout(() => {
            document.getElementById('loader-wrapper').classList.add('loader-hidden');
        }, 5000);

        setupCanvas();

        // Premium tip after 6s
        setTimeout(() => {
            if (isPremium) {
                const tip = "💡 Try voice input with the mic button, or export your chat with the download button!";
                if (chatWindow.children.length === 1) {
                    const lastMsg = chatWindow.children[0];
                    const bubble = lastMsg.querySelector('.bubble');
                    if (bubble && !bubble.textContent.includes('💡')) {
                        const tipSpan = document.createElement('span');
                        tipSpan.style.display = 'block';
                        tipSpan.style.marginTop = '8px';
                        tipSpan.style.fontSize = '0.85rem';
                        tipSpan.style.color = '#f7d44a';
                        tipSpan.textContent = tip;
                        bubble.appendChild(tipSpan);
                    }
                }
            }
        }, 6000);
    }

    // Start
    init();
})();
