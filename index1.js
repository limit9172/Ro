import { Chess } from 'chess.js';

// API Configuration
const API_KEY = "sk-d6aaf34f3f5545b8b4e6dbec3fa685ac"; // Dapatkan dari https://platform.deepseek.com/
const MODEL_NAME = "deepseek-chat";
const SYSTEM_PROMPT = "Nama kamu Zenthic Ai, sebuah asisten ai yang dibuat oleh zenith, jawab semua pertanyaan dengan detail. Kamu merespon dengan ramah dan senang hati membantu.";

// Constants
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac',
    'text/plain', 'text/csv', 'text/html', 'application/pdf', 'application/json',
];
const MAX_FILE_SIZE_MB = 15;

// Global Variables
let chat;
let currentMode = 'chat';
let uploadedFiles = [];
let viewStates = {};
let isChatStarted = false;
let activeTts = { utterance: null, button: null };
let gameTimerInterval = null;
let isLoadingRandom = false;

let randomDisplayedIds = new Set();
const randomApiEndpoints = [
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/blue-archive' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/neko' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/waifu' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/cecan/japan' },
    { type: 'quote', url: 'https://api.siputzx.my.id/api/r/quotesanime' }
];

let randomContentPools = { quote: [] };

// Game Data
const opponentPersonalities = {
    default_male: {
        id: { opening: ["Hm, menarik.", "Langkah yang bisa ditebak.", "Baiklah, mari kita lihat."], check: ["Skak.", "Raja mu dalam bahaya.", "Hati-hati."], capture: ["Pengorbanan yang sia-sia.", "Terima kasih atas bidaknya."], winning: ["Kemenangan sudah di depan mata.", "Menyerah saja."], losing: ["Sial, aku tidak melihat itu.", "Ini... di luar dugaan."] },
        en: { opening: ["Hmm, interesting.", "A predictable move.", "Alright, let's see."], check: ["Check.", "Your king is in danger.", "Be careful."], capture: ["A futile sacrifice.", "Thanks for the piece."], winning: ["Victory is within my grasp.", "Just surrender."], losing: ["Damn, I didn't see that.", "This... is unexpected."] },
    },
    default_female: {
        id: { opening: ["Firasatku mengatakan ini akan menarik.", "Langkah yang manis.", "Aku terima tantanganmu."], check: ["Skak, lho.", "Raja-mu dalam masalah, ya?", "Fokus, dong."], capture: ["Ups, punyamu hilang~", "Ini milikku sekarang, oke?"], winning: ["Hehe, sepertinya aku akan menang.", "Sudah berakhir untukmu."], losing: ["Eh? Kok bisa!?", "Curang! Kamu pasti curang!"] },
        en: { opening: ["I have a feeling this will be fun.", "A sweet move.", "I accept your challenge."], check: ["Check~", "Is your king in trouble?", "Focus, please."], capture: ["Oops, yours is gone~", "This is mine now, 'kay?"], winning: ["Hehe, looks like I'm going to win.", "It's over for you."], losing: ["Huh? How!?", "You must be cheating!"] },
    },
    'Ayanokouji Kiyotaka': {
        id: { opening: ["Alat hanyalah alat.", "Mari kita lihat kemampuanmu.", "Jangan kecewakan aku."], check: ["Skak.", "Jalanmu sudah tertutup.", "Ini adalah konsekuensi logis."], capture: ["Semua bidak bisa dikorbankan.", "Sesuai perkiraan.", "Langkah yang tidak efisien darimu."], winning: ["Kemenangan atau kekalahan tidak penting.", "Sudah berakhir.", "Prosesnya lebih berarti."], losing: ["Informasi yang menarik.", "Aku belajar sesuatu yang baru.", "Jadi, ini kemampuanmu."] },
        en: { opening: ["A tool is just a tool.", "Let's see your capabilities.", "Don't disappoint me."], check: ["Check.", "Your path is closed.", "A logical consequence."], capture: ["All pieces are expendable.", "As expected.", "An inefficient move on your part."], winning: ["Winning or losing is trivial.", "It's over.", "The process is what matters."], losing: ["Interesting data.", "I've learned something new.", "So, this is your true ability."] },
    },
    'Kakeru Ryuen': {
        id: { opening: ["Kukuku, tunjukkan rasa takutmu!", "Ayo bermain, monster.", "Hiburlah aku."], check: ["Mati kau!", "Tidak ada tempat lari!", "Lihat, rajamu gemetaran!"], capture: ["Bidak lemah tidak berguna!", "Kekerasan adalah segalanya!", "Ini balasanmu!"], winning: ["Aku adalah rajanya!", "Tunduk di hadapanku!", "Lemah! Terlalu lemah!"], losing: ["Mustahil! Aku tidak mungkin kalah!", "Ini belum berakhir!", "Sialan kau..."] },
        en: { opening: ["Kukuku, show me your fear!", "Let's dance, monster.", "Entertain me."], check: ["Die!", "Nowhere to run!", "Look, your king is trembling!"], capture: ["Weak pieces are useless!", "Violence is everything!", "This is your reward!"], winning: ["I am the king!", "Bow before me!", "Weak! Too weak!"], losing: ["Impossible! I can't lose!", "This isn't over!", "You bastard..."] },
    },
    'Arisu Sakayanagi': {
        id: { opening: ["Fufu, permainan yang elegan.", "Apakah kamu bisa mengimbangiku?", "Mari kita mulai duel catur kita."], check: ["Checkmate sudah terlihat, fufu.", "Raja Anda terpojok, ya?", "Satu langkah lebih dekat."], capture: ["Sebuah pertukaran yang indah.", "Terima kasih atas kontribusinya.", "Setiap bidak memiliki peran."], winning: ["Seperti yang saya duga, ini akhirnya.", "Permainan yang cukup bagus.", "Anda tidak akan bisa mengalahkan saya."], losing: ["Oh? Ini di luar skenario saya.", "Anda... ternyata lebih menarik dari dugaan.", "Fufu, saya akui langkah itu."] },
        en: { opening: ["Fufu, an elegant game.", "Can you keep up with me?", "Let's begin our chess duel."], check: ["I can already see the checkmate, fufu.", "Your king is cornered, isn't he?", "One step closer."], capture: ["A beautiful exchange.", "Thank you for your contribution.", "Every piece has its role."], winning: ["Just as I predicted, this is the end.", "A fairly good game.", "You will not be able to defeat me."], losing: ["Oh? This is outside my scenario.", "You... are more interesting than I thought.", "Fufu, I acknowledge that move."] },
    }
};

const memoryCardSets = {
    hewan: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
    makanan: ['🍔', '🍕', '🌭', '🍿', '🍩', '🍪', '🎂', '🍦', '🍓', '🍉', '🍟', '🍣'],
    sayuran: ['🥕', '🌽', '🥦', '🥒', '🥬', '🍅', '🍆', '🌶️', '🥑', '🍄', '🥔', '🧅'],
    kendaraan: ['🚗', '🚕', '🚌', '🚑', '🚓', '🚚', '🚜', '🚲', '🛵', '✈️', '🚀', '🚢'],
    peralatan: ['🔨', '⛏️', '🔩', '🔧', '⚙️', '💡', '🔬', '🔭', '📎', '📌', '📏', '✂️'],
    emoji: ['😀', '😂', '😍', '🤔', '😎', '😭', '😡', '😱', '🥳', '🤯', '😴', '😇'],
    buah: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🥝', '🍍', '🥭', '🍑', '🍒']
};

const chessOpponents = [
    { name: 'Ayanokouji Kiyotaka', rank: 'SSS', image: 'https://files.catbox.moe/b83uj0.jpg', gender: 'male' },
    { name: 'Arisu Sakayanagi', rank: 'SSS', image: 'https://files.catbox.moe/ww60wo.jpg', gender: 'female' },
    { name: 'Sae Chabasira', rank: 'SS', image: 'https://files.catbox.moe/ig2ez2.jpg', gender: 'female' },
    { name: 'Kazuma Sakagami', rank: 'SS', image: 'https://files.catbox.moe/utjdzk.jpeg', gender: 'male' },
    { name: 'Ichika Amasawa', rank: 'S', image: 'https://files.catbox.moe/og9z8e.jpg', gender: 'female' },
    { name: 'Horikita Manabu', rank: 'S', image: 'https://files.catbox.moe/se12ld.jpg', gender: 'male' },
    { name: 'Horikita Suzune', rank: 'A', image: 'https://files.catbox.moe/idysin.jpg', gender: 'female' },
    { name: 'Rokusuke Koenji', rank: 'A', image: 'https://files.catbox.moe/be90gm.jpg', gender: 'male' },
    { name: 'Kikyou Kushida', rank: 'B', image: 'https://files.catbox.moe/zlu5m5.jpg', gender: 'female' },
    { name: 'Kakeru Ryuen', rank: 'B', image: 'https://files.catbox.moe/eo2x0w.jpg', gender: 'male' },
    { name: 'Honami Ichinose', rank: 'C', image: 'https://files.catbox.moe/y8rkf6.jpg', gender: 'female' },
    { name: 'Kei Karuizawa', rank: 'C', image: 'https://files.catbox.moe/v051i5.jpg', gender: 'female' },
];

const gamesList = [
    { id: 'memorycard', name: 'Memory Card', emoji: '🃏', image: 'https://files.catbox.moe/8q192i.png' },
    { id: 'asahotak', name: 'Asah Otak', emoji: '🧠', image: 'https://files.catbox.moe/qibpvv.jpg' },
    { id: 'caklontong', name: 'Cak Lontong', emoji: '🤣', image: 'https://files.catbox.moe/o5b1d5.jpg' },
    { id: 'family100', name: 'Family 100', emoji: '👨‍👩‍👧‍👦', image: 'https://files.catbox.moe/5eg6dg.jpg' },
    { id: 'tictactoe', name: 'Tic-Tac-Toe', emoji: '🤖', image: 'https://files.catbox.moe/k3vnvs.jpg' },
    { id: 'chess', name: 'Chess', emoji: '♟️', image: 'https://files.catbox.moe/c104p8.jpg' },
    { id: 'maths', name: 'Math', emoji: '🧮', image: 'https://files.catbox.moe/8az0s4.jpg' },
    { id: 'tebakgambar', name: 'Tebak Gambar', emoji: '🖼️', image: 'https://files.catbox.moe/3a36w5.jpg' },
    { id: 'siapakahaku', name: 'Siapakah Aku', emoji: '👤', image: 'https://files.catbox.moe/mu0ku5.jpg' },
    { id: 'susunkata', name: 'Susun Kata', emoji: '🔤', image: 'https://files.catbox.moe/5kmntj.jpg' },
    { id: 'tebakbendera', name: 'Tebak Bendera', emoji: '🏳️', image: 'https://files.catbox.moe/cyj5cs.jpg' },
    { id: 'tebakkata', name: 'Tebak Kata', emoji: '🗣️', image: 'https://files.catbox.moe/23fqzt.jpg' },
    { id: 'tebaklirik', name: 'Tebak Lirik', emoji: '🎶', image: 'https://files.catbox.moe/6rsspt.jpg' },
    { id: 'tebaklagu', name: 'Tebak Lagu', emoji: '🎧', image: 'https://files.catbox.moe/o6mlo7.jpg' },
    { id: 'tebakheroml', name: 'Tebak Hero ML', emoji: '⚔️', image: 'https://files.catbox.moe/8ig65n.jpg' },
    { id: 'tebakgame', name: 'Tebak Game', emoji: '🎮', image: 'https://files.catbox.moe/leuxe9.jpg' },
    { id: 'karakter-freefire', name: 'Tebak Char FF', emoji: '🔥', image: 'https://files.catbox.moe/uon05j.jpg' },
];

const pieceImages = {
    wP: 'https://files.catbox.moe/24cvlg.png', bP: 'https://files.catbox.moe/dfq948.png',
    wR: 'https://files.catbox.moe/mlyoy8.png', bR: 'https://files.catbox.moe/wl3euo.png',
    wN: 'https://files.catbox.moe/2u3cwt.png', bN: 'https://files.catbox.moe/lphi1e.png',
    wB: 'https://files.catbox.moe/hrgih8.png', bB: 'https://files.catbox.moe/roq8vh.png',
    wQ: 'https://files.catbox.moe/e5g6ng.png', bQ: 'https://files.catbox.moe/x9mi5r.png',
    wK: 'https://files.catbox.moe/xyblex.png', bK: 'https://files.catbox.moe/pch40o.png',
};

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const filePreviewContainer = document.getElementById('file-preview-container');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const modeSelectorBtn = document.getElementById('mode-selector-btn');
const modeSelectorModal = document.getElementById('mode-selector-modal');
const modeOptions = document.querySelectorAll('.mode-option');
const clearChatBtn = document.getElementById('clear-chat-btn');
const resetChatBtn = document.getElementById('reset-chat-btn');
const alertContainer = document.getElementById('alert-container');

// DeepSeek API Functions
async function sendDeepSeekMessage(messages) {
    try {
        const formattedMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...chat.history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: "user", content: Array.isArray(messages) ? messages.map(m => m.text || m).join(' ') : messages }
        ];

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: formattedMessages,
                stream: true,
                max_tokens: 2048,
                temperature: 1,
                top_p: 0.95
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        return {
            stream: {
                [Symbol.asyncIterator]() {
                    return {
                        async next() {
                            try {
                                const { value, done } = await reader.read();
                                if (done) {
                                    return { done: true };
                                }

                                const chunk = decoder.decode(value);
                                const lines = chunk.split('\n');
                                
                                for (const line of lines) {
                                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                                        try {
                                            const data = JSON.parse(line.slice(6));
                                            if (data.choices && data.choices[0].delta.content) {
                                                return {
                                                    done: false,
                                                    value: { text: data.choices[0].delta.content }
                                                };
                                            }
                                        } catch (e) {
                                            // Skip invalid JSON
                                        }
                                    }
                                }
                                return this.next();
                            } catch (error) {
                                console.error('Stream error:', error);
                                return { done: true };
                            }
                        }
                    };
                }
            }
        };
    } catch (error) {
        console.error('DeepSeek API Error:', error);
        throw error;
    }
}

// Initialize App
try {
    if (!API_KEY || API_KEY.includes("YOUR_DEEPSEEK_API_KEY")) {
        throw new Error("API Key DeepSeek belum diatur di index.js.");
    }
    
    initializeApp();
} catch (error) {
    console.error("Initialization Error:", error);
    showCustomAlert(`Error Inisialisasi: ${error.message}`, "error");
    document.body.innerHTML = `<div style="color:red; padding: 2rem; text-align:center;">Gagal memuat aplikasi. Pastikan API Key DeepSeek Anda valid.</div>`;
}

function initializeApp() {
    const savedHistoryJSON = localStorage.getItem('zenthic-ai-history');
    const savedHistory = savedHistoryJSON ? JSON.parse(savedHistoryJSON) : [];
    
    chat = {
        history: savedHistory,
        sendMessageStream: async (messages) => {
            return await sendDeepSeekMessage(messages);
        },
        getHistory: () => chat.history
    };

    if (savedHistory.length > 0) {
        chatContainer.innerHTML = '';
        savedHistory.forEach(message => {
            const sender = message.role === 'assistant' ? 'ai' : 'user';
            const textContent = message.content;

            const messageDiv = displayMessage(sender, { text: textContent });
            renderFinalResponse(messageDiv.querySelector('.message-content'), textContent);
            addFinalMessageControls(messageDiv, textContent);
        });
        isChatStarted = true;
        scrollToBottom();
    } else {
        renderInitialUI();
    }
    setupEventListeners();
    const savedTheme = localStorage.getItem('zenthic-ai-theme') || 'dark';
    applyTheme(savedTheme);
    promptInput.value = '';
    promptInput.style.height = 'auto';

    updateScrollNavVisibility();
}

function renderInitialUI() {
    chatContainer.innerHTML = '';
    const initialView = document.createElement('div');
    initialView.className = 'initial-view';

    let suggestionsHTML = '';
    if (currentMode === 'generate-image') {
        suggestionsHTML = `
            <button class="suggestion-btn">Gadis Anime Berambut Putih</button>
            <button class="suggestion-btn">Anime Girls White Hair</button>
            <button class="suggestion-btn">白髪のアニメの女の子</button>
        `;
    } else {
        suggestionsHTML = `
            <button class="suggestion-btn">Kode Portofolio Simple</button>
            <button class="suggestion-btn">Simple Portfolio Code</button>
            <button class="suggestion-btn">シンプルなポートフォリオコード</button>
        `;
    }

    initialView.innerHTML = `
        <img src="https://files.catbox.moe/gqmb50.jpg" alt="Logo" class="logo-circle">
        <p>Halo! Saya Zenthic Ai. Pilih mode di atas atau coba salah satu saran di bawah untuk memulai.</p>
        <div class="suggestion-area">
            ${suggestionsHTML}
        </div>
    `;

    chatContainer.appendChild(initialView);
    initialView.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.onclick = () => {
            promptInput.value = btn.textContent;
            promptInput.focus();
            handleFormSubmit();
        };
    });
    isChatStarted = false;
    promptInput.value = '';
    promptInput.style.height = 'auto';
}

function displayMessage(sender, { text = '', images = [], files = [], element = null } = {}) {
    if (!isChatStarted && sender !== 'system' && currentMode !== 'game' && currentMode !== 'random') {
        chatContainer.innerHTML = '';
        isChatStarted = true;
    }
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    if (sender === 'ai') {
        const ttsButton = document.createElement('button');
        ttsButton.className = 'tts-btn';
        ttsButton.title = 'Dengarkan Jawaban';
        ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        messageHeader.appendChild(ttsButton);
    }

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    const otherAttachedFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));

    const imageUrls = [
        ...images,
        ...imageFiles.map(f => URL.createObjectURL(f))
    ];

    if (imageUrls.length > 0) {
        imageUrls.forEach(imageUrl => {
            const figure = document.createElement('figure');
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Uploaded image';
            figure.appendChild(img);
            messageContent.appendChild(figure);
        });
    }
    
    if (videoFiles.length > 0) {
        videoFiles.forEach(file => {
            const videoContainer = document.createElement('div');
            videoContainer.className = 'message-video-container';
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.className = 'message-video';
            videoContainer.appendChild(video);
            messageContent.appendChild(videoContainer);
        });
    }

    if (otherAttachedFiles.length > 0) {
        otherAttachedFiles.forEach(file => {
            const fileBlock = document.createElement('div');
            fileBlock.className = 'message-file-attachment';
            const fileIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>`;
            fileBlock.innerHTML = `${fileIconSVG} <span class="file-name">${file.name}</span>`;
            messageContent.appendChild(fileBlock);
        });
    }

    if (text) {
        const p = document.createElement('p');
        p.innerHTML = text;
        messageContent.appendChild(p);
    }
    if (element) {
        messageContent.appendChild(element);
    }
    messageDiv.append(messageHeader, messageContent);
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

function addFinalMessageControls(messageDiv, rawText) {
    const ttsButton = messageDiv.querySelector('.tts-btn');
    if (ttsButton) {
        ttsButton.classList.add('ready');
        ttsButton.onclick = () => speakText(rawText.replace(/```[\s\S]*?```/g, 'blok kode'), ttsButton);
    }
    const copyBtn = document.createElement('button');
    copyBtn.className = 'response-copy-btn';
    copyBtn.title = 'Salin Respon';
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(rawText);
        showCustomAlert('Respon disalin!', 'success');
    };
    messageDiv.querySelector('.message-content').appendChild(copyBtn);
}

function renderFinalResponse(container, text) {
    container.innerHTML = '';
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    const parts = text.split(/(```[\s\S]*?```)/g);
    parts.forEach(part => {
        if (part.startsWith('```')) {
            renderCodeBlock(container, part);
        } else if (part.trim()) {
            const contentBlock = document.createElement('div');
            contentBlock.innerHTML = part.trim().replace(/\n/g, '<br>');
            container.appendChild(contentBlock);
        }
    });
    setTimeout(() => {
        container.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    }, 0);
}

function renderCodeBlock(container, fullCodeBlock) {
    const langMatch = fullCodeBlock.match(/```(\w*)\n/);
    const lang = langMatch ? langMatch[1].toLowerCase() : 'text';
    const code = fullCodeBlock.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
    const codeContainer = document.createElement('div');
    codeContainer.className = 'code-block-container';
    const header = document.createElement('div');
    header.className = 'code-header';
    const langName = document.createElement('span');
    langName.textContent = lang;
    const actions = document.createElement('div');
    actions.className = 'code-header-actions';
    if (['html', 'javascript', 'js', 'css'].includes(lang)) {
        const playBtn = createActionButton('Jalankan Kode', `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>`, () => runCodeInPreview(code, lang));
        actions.append(playBtn);
    }
    const copyBtn = createActionButton('Salin Kode', `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`, () => {
        navigator.clipboard.writeText(code);
        showCustomAlert('Kode disalin!', 'success');
    });
    const downloadBtn = createActionButton('Unduh File', `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z"/></svg>`, () => downloadCode(code, lang));
    actions.append(copyBtn, downloadBtn);
    header.append(langName, actions);
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.className = `language-${lang}`;
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    codeContainer.append(header, pre);
    container.appendChild(codeContainer);
}

async function handleFormSubmit() {
    const promptText = promptInput.value.trim();
    const files = [...uploadedFiles];
    if (!promptText && files.length === 0) return;

    promptInput.value = '';
    promptInput.style.height = 'auto';

    if (currentMode !== 'chat') {
        if (!isChatStarted) {
            chatContainer.innerHTML = '';
            isChatStarted = true;
        }
        displayMessage('user', { text: promptText });
        if (currentMode === 'generate-image') handleImageGeneration(promptText);
        else if (currentMode === 'image-tools') await handleImageTools(promptText);
        else if (currentMode === 'downloader') await handleDownloader(promptText);
        clearFileInput();
        return;
    }

    if (!isChatStarted) {
        chatContainer.innerHTML = '';
        isChatStarted = true;
    }
    
    // Untuk DeepSeek, files mungkin tidak didukung
    if (files.length > 0) {
        showCustomAlert('DeepSeek saat ini tidak mendukung upload file. Hanya teks yang diproses.', 'info');
    }
    
    displayMessage('user', { text: promptText });
    clearFileInput();

    const aiMessageDiv = displayMessage('ai', {});
    const aiMessageContent = aiMessageDiv.querySelector('.message-content');
    const thinkingBlock = createThinkingBlock();
    aiMessageContent.appendChild(thinkingBlock);
    const thinkingTextElement = thinkingBlock.querySelector('.thinking-content p');
    let fullResponse = "";

    try {
        // Tambahkan ke history
        chat.history.push({ role: 'user', content: promptText });
        
        const result = await chat.sendMessageStream(promptText);
        thinkingBlock.querySelector('.thinking-header').classList.add('expanded');

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            if (thinkingTextElement) {
                thinkingTextElement.textContent += chunkText;
                thinkingTextElement.parentElement.scrollTop = thinkingTextElement.parentElement.scrollHeight;
            }
        }

        // Tambahkan respon ke history
        chat.history.push({ role: 'assistant', content: fullResponse });

        renderFinalResponse(aiMessageContent, fullResponse);
        addFinalMessageControls(aiMessageDiv, fullResponse);

        // Simpan history ke localStorage
        localStorage.setItem('zenthic-ai-history', JSON.stringify(chat.history));

        updateScrollNavVisibility();

    } catch (error) {
        console.error("Chat Error:", error);
        if (thinkingBlock) thinkingBlock.remove();
        const errorMessage = `Maaf, terjadi kesalahan: ${error.message}`;
        renderFinalResponse(aiMessageContent, errorMessage);
        addFinalMessageControls(aiMessageDiv, errorMessage);
    }

    scrollToBottom();
}

// Downloader Functions
function createDownloaderSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'downloader-skeleton-card';
    card.innerHTML = `
        <div class="skeleton-header"></div>
        <div class="skeleton-body"></div>
        <div class="skeleton-progress-container">
            <div class="skeleton-progress-bar"></div>
        </div>
        <div class="skeleton-progress-text">Menganalisis link... 0%</div>
    `;
    return card;
}

function createMediafireCard(data) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `
        <div class="tool-card-header">
            <img src="https://files.catbox.moe/ruypt1.jpg" alt="Mediafire">
            <h4>Mediafire Download</h4>
        </div>
        <div class="tool-card-body">
            <p class="file-title">${data.fileName}</p>
            <p class="file-info">Ukuran: ${data.fileSize} | Diunggah: ${data.uploadDate}</p>
        </div>
        <div class="tool-card-actions">
            <a href="${data.downloadLink}" class="download-btn" target="_blank" rel="noopener noreferrer">
                Unduh File
            </a
