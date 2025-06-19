import { GoogleGenerativeAI } from "@google/generative-ai";
import { Chess } from 'chess.js';

const API_KEY = "AIzaSyA12o-8MdQijs2xb4hfJWbObxgzaBZIti0";
const MODEL_NAME = "gemini-1.5-flash-latest";
const SYSTEM_INSTRUCTION = {
    parts: [{
        text: "Nama kamu Zenthic Ai, sebuah asisten ai yang dibuat oleh zenith, jawab semua pertanyaan dengan detail. Kamu merespon dengan ramah dan senang hati membantu."
    }]
};

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac',
    'text/plain', 'text/csv', 'text/html', 'application/pdf', 'application/json',
];
const MAX_FILE_SIZE_MB = 15;

let generativeModel;
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
    { id: 'susunkata', name: 'Susun Kata', emoji: ' unscramble', image: 'https://files.catbox.moe/5kmntj.jpg' },
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

try {
    if (!API_KEY || API_KEY.includes("YOUR_API_KEY")) {
        throw new Error("API Key belum diatur di alipai.js.");
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    const generationConfig = {
        maxOutputTokens: 2048,
        temperature: 1,
        topP: 0.95,
    };
    generativeModel = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: generationConfig
    });
    initializeApp();
} catch (error) {
    console.error("Initialization Error:", error);
    showCustomAlert(`Error Inisialisasi: ${error.message}`, "error");
    document.body.innerHTML = `<div style="color:red; padding: 2rem; text-align:center;">Gagal memuat aplikasi. Pastikan API Key Anda valid.</div>`;
}

function initializeApp() {
    const savedHistoryJSON = localStorage.getItem('alip-ai-history');
    const savedHistory = savedHistoryJSON ? JSON.parse(savedHistoryJSON) : [];
    chat = generativeModel.startChat({ history: savedHistory, systemInstruction: SYSTEM_INSTRUCTION });

    if (savedHistory.length > 0) {
        chatContainer.innerHTML = '';
        savedHistory.forEach(message => {
            const sender = message.role === 'model' ? 'ai' : 'user';
            const textContent = message.parts.filter(p => p.text).map(p => p.text).join('');

            const imageUrls = message.parts
                .filter(p => p.inlineData)
                .map(p => `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`);

            const messageDiv = displayMessage(sender, { text: textContent, images: imageUrls });
            renderFinalResponse(messageDiv.querySelector('.message-content'), textContent);
            addFinalMessageControls(messageDiv, textContent);
        });
        isChatStarted = true;
        scrollToBottom();
    } else {
        renderInitialUI();
    }
    setupEventListeners();
    const savedTheme = localStorage.getItem('alip-ai-theme') || 'dark';
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
    displayMessage('user', { text: promptText, files: files });
    clearFileInput();

    const aiMessageDiv = displayMessage('ai', {});
    const aiMessageContent = aiMessageDiv.querySelector('.message-content');
    const thinkingBlock = createThinkingBlock();
    aiMessageContent.appendChild(thinkingBlock);
    const thinkingTextElement = thinkingBlock.querySelector('.thinking-content p');
    let fullResponse = "";

    try {
        const fileParts = await getFileParts(files);
        const requestPayload = [];
        if (promptText) requestPayload.push(promptText);
        if (fileParts.length > 0) requestPayload.push(...fileParts);

        if (requestPayload.length === 0) throw new Error("Tidak ada prompt untuk dikirim.");

        const result = await chat.sendMessageStream(requestPayload);
        thinkingBlock.querySelector('.thinking-header').classList.add('expanded');

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            if (thinkingTextElement) {
                thinkingTextElement.textContent += chunkText;
                thinkingTextElement.parentElement.scrollTop = thinkingTextElement.parentElement.scrollHeight;
            }
        }

        renderFinalResponse(aiMessageContent, fullResponse);
        addFinalMessageControls(aiMessageDiv, fullResponse);

        const currentHistory = await chat.getHistory();
        const historyToSave = currentHistory.map(entry => ({
            ...entry,
            parts: entry.parts.filter(part => part.text !== undefined)
        }));
        localStorage.setItem('zenthic-ai-history', JSON.stringify(historyToSave));

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
            </a>
        </div>
    `;
    return card;
}

function createInstagramCard(data, originalLink = '') {
    const card = document.createElement('div');
    card.className = 'tool-card';
    const firstItem = data[0];

    const isVideo = firstItem.url.toLowerCase().includes('.mp4') || originalLink.includes('/reel/');

    card.innerHTML = `
        <div class="tool-card-header">
            <img src="https://files.catbox.moe/ruypt1.jpg" alt="Instagram">
            <h4>Instagram Downloader</h4>
        </div>
        ${isVideo 
            ? `<video src="${firstItem.url}" class="preview-media" controls poster="${firstItem.thumbnail}"></video>`
            : `<img src="${firstItem.url}" class="preview-media" alt="Instagram content">`
        }
        <div class="tool-card-body">
            <p>Konten dari Instagram siap diunduh.</p>
        </div>
        <div class="tool-card-actions">
            <a href="${firstItem.url}" class="download-btn" target="_blank" rel="noopener noreferrer" download>
                Unduh ${isVideo ? 'Video' : 'Gambar'}
            </a>
        </div>
    `;
    return card;
}

function createTiktokCard(data) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    const videoUrl = data.download.video[0];
    const audioUrl = data.download.audio;
    const title = data.metadata.title || 'Video TikTok';
    card.innerHTML = `
        <div class="tool-card-header">
            <img src="https://files.catbox.moe/ruypt1.jpg" alt="TikTok">
            <h4>TikTok Downloader</h4>
        </div>
        <video src="${videoUrl}" class="preview-media" controls></video>
        <div class="tool-card-body">
            <p class="file-title">${title}</p>
            <p>Suka: ${data.metadata.stats.likeCount.toLocaleString()}</p>
        </div>
        <div class="tool-card-actions">
            <a href="${videoUrl}" class="download-btn" target="_blank" rel="noopener noreferrer" download>Unduh Video</a>
            <a href="${audioUrl}" class="download-btn" target="_blank" rel="noopener noreferrer" download style="background-color: var(--secondary-color);">Unduh Audio (MP3)</a>
        </div>
    `;
    return card;
}

function createYoutubeCard(videoData, audioData) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `
        <div class="tool-card-header">
            <img src="https://files.catbox.moe/ruypt1.jpg" alt="YouTube">
            <h4>YouTube Downloader</h4>
        </div>
        <img src="${videoData.thumbnail}" class="preview-media" alt="YouTube thumbnail">
        <div class="tool-card-body">
            <p class="file-title">${videoData.title}</p>
            <p>Uploader: ${videoData.uploader}</p>
        </div>
        <div class="tool-card-actions">
            <a href="${videoData.download_url}" class="download-btn" target="_blank" rel="noopener noreferrer" download>Unduh Video (${videoData.resolution}p)</a>
            <a href="${audioData.download_url}" class="download-btn" target="_blank" rel="noopener noreferrer" download style="background-color: var(--secondary-color);">Unduh Audio (MP3)</a>
        </div>
    `;
    return card;
}

function createImageToolResultCard(imageUrl, toolName) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `
        <div class="tool-card-header">
            <img src="https://files.catbox.moe/gqmb50.jpg" alt="Image Tool">
            <h4>Hasil ${toolName}</h4>
        </div>
        <img src="${imageUrl}" class="preview-media" alt="Hasil proses gambar">
        <div class="tool-card-body">
            <p>Gambar Anda telah berhasil diproses.</p>
        </div>
        <div class="tool-card-actions">
            <button class="download-btn">Unduh Gambar</button>
        </div>
    `;
    card.querySelector('.download-btn').onclick = async () => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            downloadBlob(blob, `alipai_${toolName}_${Date.now()}.png`);
        } catch (error) {
            showCustomAlert('Gagal mengunduh gambar.', 'error');
            console.error('Download error:', error);
        }
    };
    return card;
}

async function handleDownloader(prompt) {
    if (!prompt) {
        displayMessage('ai', { text: "Silakan berikan link untuk diunduh." });
        return;
    }
    const aiMessageDiv = displayMessage('ai', {});
    const content = aiMessageDiv.querySelector('.message-content');
    const skeletonCard = createDownloaderSkeletonCard();
    renderToolCard(skeletonCard, content);
    const progressBar = skeletonCard.querySelector('.skeleton-progress-bar');
    const progressText = skeletonCard.querySelector('.skeleton-progress-text');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 99) progress = 99;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Memuat... ${Math.floor(progress)}%`;
    }, 200);

    try {
        let card;
        if (prompt.includes('tiktok.com')) {
            const data = await fetchApi(`https://api.siputzx.my.id/api/tiktok/v2?url=${encodeURIComponent(prompt)}`);
            card = createTiktokCard(data.data);
        } else if (prompt.includes('mediafire.com')) {
            const data = await fetchApi(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(prompt)}`);
            card = createMediafireCard(data.data);
        } else if (prompt.includes('instagram.com')) {
            const response = await fetchApi(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(prompt)}`);
            const mediaData = response.data || response.result || response;
            if (!Array.isArray(mediaData) || mediaData.length === 0) {
                throw new Error("Tidak dapat menemukan media atau format respons API tidak valid.");
            }
            card = createInstagramCard(mediaData, prompt);
        } else if (prompt.includes('youtube.com') || prompt.includes('youtu.be')) {
            progressText.textContent = 'Mengunduh video... 50%';
            const videoData = await fetchApi(`https://ytdlpyton.nvlgroup.my.id/download/?url=${encodeURIComponent(prompt)}&resolution=720&mode=url`);
            progressText.textContent = 'Mengunduh audio... 80%';
            const audioData = await fetchApi(`https://ytdlpyton.nvlgroup.my.id/download/audio?url=${encodeURIComponent(prompt)}&mode=url`);
            card = createYoutubeCard(videoData, audioData);
        } else {
            throw new Error("Link tidak dikenali. Hanya mendukung TikTok, Mediafire, Instagram, dan YouTube.");
        }
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressText.textContent = 'Selesai! 100%';
        setTimeout(() => {
            renderToolCard(card, content);
        }, 300);
    } catch (error) {
        clearInterval(progressInterval);
        console.error("Downloader Error:", error);
        content.innerHTML = `<p style="color: #f44336; padding: 1rem;">Gagal mengunduh: ${error.message}</p>`;
        addFinalMessageControls(aiMessageDiv, `Gagal mengunduh: ${error.message}`);
    }
}

async function handleImageTools(prompt) {
    if (!prompt) {
        displayMessage('ai', { text: "Silakan berikan perintah atau link untuk tool gambar." });
        return;
    }

    const aiMessageDiv = displayMessage('ai', {});
    const content = aiMessageDiv.querySelector('.message-content');
    const skeletonCard = createDownloaderSkeletonCard();
    renderToolCard(skeletonCard, content);
    const progressBar = skeletonCard.querySelector('.skeleton-progress-bar');
    const progressText = skeletonCard.querySelector('.skeleton-progress-text');

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 99) progress = 99;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Memproses gambar... ${Math.floor(progress)}%`;
    }, 250);

    try {
        const promptLower = prompt.toLowerCase();
        let apiUrl;
        let toolName;

        if (promptLower.startsWith('upscale ')) {
            const url = prompt.substring(8).trim();
            apiUrl = `https://api.siputzx.my.id/api/iloveimg/upscale?image=${encodeURIComponent(url)}&scale=4`;
            toolName = "Upscale";
        } else if (promptLower.startsWith('removebg ')) {
            const url = prompt.substring(9).trim();
            apiUrl = `https://api.siputzx.my.id/api/iloveimg/removebg?image=${encodeURIComponent(url)}`;
            toolName = "Remove BG";
        } else {
            throw new Error("Format perintah tidak dikenali. Gunakan 'upscale <url>' atau 'removebg <url>'.");
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressText.textContent = 'Selesai! 100%';

        setTimeout(() => {
            const resultCard = createImageToolResultCard(imageUrl, toolName);
            renderToolCard(resultCard, content);
        }, 300);

    } catch (error) {
        clearInterval(progressInterval);
        console.error("Image Tools Error:", error);
        content.innerHTML = `<p style="color: #f44336; padding: 1rem;">Gagal memproses: ${error.message}</p>`;
        addFinalMessageControls(aiMessageDiv, `Gagal memproses: ${error.message}`);
    }
}

function handleImageGeneration(prompt) {
    if (!prompt) {
        displayMessage('ai', { text: 'Tolong berikan deskripsi untuk gambar yang ingin dibuat.' });
        return;
    }
    const aiMessageDiv = displayMessage('ai', {});
    const container = document.createElement('div');
    container.className = 'image-gen-container';
    container.innerHTML = `<div class="image-gen-loader"><p>Membuat gambar...</p><p class="prompt-text">${prompt}</p></div>`;
    aiMessageDiv.querySelector('.message-content').appendChild(container);
    scrollToBottom();
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = "anonymous";
    img.onload = () => {
        container.innerHTML = '';
        container.appendChild(img);
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'image-download-btn';
        downloadBtn.textContent = 'Unduh Gambar';
        downloadBtn.onclick = () => downloadImage(imageUrl, prompt);
        container.appendChild(downloadBtn);
        addFinalMessageControls(aiMessageDiv, `Gambar dihasilkan dari prompt: "${prompt}" di URL: ${imageUrl}`);
    };
    img.onerror = () => {
        container.innerHTML = `<p style="color:#f44336;">Gagal membuat gambar. Coba deskripsi lain.</p>`;
        addFinalMessageControls(aiMessageDiv, "Gagal membuat gambar. Coba deskripsi lain.");
    };
}

function setupEventListeners() {
    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
    });
    modeSelectorBtn.addEventListener('click', () => modeSelectorModal.classList.remove('hidden'));
    modeSelectorModal.addEventListener('click', (e) => {
        if (e.target === modeSelectorModal) modeSelectorModal.classList.add('hidden');
    });
    modeOptions.forEach(option => {
    option.addEventListener('click', () => {
        const newMode = option.dataset.mode;
        if (newMode === currentMode) {
            modeSelectorModal.classList.add('hidden');
            return;
        }

        const currentContent = document.createDocumentFragment();
        while (chatContainer.firstChild) {
            currentContent.appendChild(chatContainer.firstChild);
        }
        if (currentContent.hasChildNodes()) {
            viewStates[currentMode] = {
                content: currentContent,
                scrollPos: chatContainer.scrollTop
            };
        }

        clearInterval(gameTimerInterval);
        chatContainer.onscroll = null;
        currentMode = newMode;
        document.getElementById('current-mode-text').textContent = option.querySelector('h4').textContent.trim();
        updateInputPlaceholders();
        modeSelectorModal.classList.add('hidden');

        if (viewStates[currentMode]) {
            const savedState = viewStates[currentMode];
            chatContainer.appendChild(savedState.content);

            if (currentMode === 'random') {
                chatContainer.onscroll = () => {
                    if (!isLoadingRandom && chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 500) {
                        loadMoreRandomContent();
                    }
                };
            }
            setTimeout(() => chatContainer.scrollTop = savedState.scrollPos, 0);

        } else {
            chatContainer.innerHTML = '';
            isChatStarted = false;
            switch (currentMode) {
                case 'downloader':
                    displayDownloaderInstructions();
                    break;
                case 'image-tools':
                    displayImageToolsInstructions();
                    break;
                case 'game':
                    showGameSelectionScreen();
                    break;
                case 'random':
                    initializeRandomMode();
                    break;
                default:
                    renderInitialUI();
                    break;
            }
        }
        updateScrollNavVisibility();
    });
});
    promptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit();
    });
    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = `${promptInput.scrollHeight}px`;
    });
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    clearChatBtn.addEventListener('click', () => showConfirmationDialog('Bersihkan Layar?', 'Tindakan ini hanya akan membersihkan tampilan, histori tidak akan hilang.', () => {
        if (currentMode === 'game') showGameSelectionScreen();
        else if (currentMode === 'random') initializeRandomMode();
        else if (currentMode === 'downloader') displayDownloaderInstructions();
        else if (currentMode === 'image-tools') displayImageToolsInstructions();
        else renderInitialUI();
        showCustomAlert('Layar dibersihkan.', 'info');
    }));
    resetChatBtn.addEventListener('click', () => showConfirmationDialog('Reset Sesi Chat?', 'Semua histori percakapan ini akan dihapus permanen.', () => {
        localStorage.removeItem('alip-ai-history');
        if (currentMode === 'chat') {
            initializeApp();
        } else {
            chat = generativeModel.startChat({ history: [], systemInstruction: SYSTEM_INSTRUCTION });
            if (currentMode === 'game') showGameSelectionScreen();
            else if (currentMode === 'random') initializeRandomMode();
            else if (currentMode === 'downloader') displayDownloaderInstructions();
            else if (currentMode === 'image-tools') displayImageToolsInstructions();
            else renderInitialUI();
        }
        showCustomAlert('Sesi chat telah di-reset.', 'info');
    }));
    const runnerModal = document.getElementById('code-runner-modal');
    const closeRunnerBtn = document.getElementById('close-runner-btn');
    const closeRunner = () => runnerModal.classList.add('hidden');
    closeRunnerBtn.addEventListener('click', closeRunner);
    runnerModal.addEventListener('click', (e) => {
        if (e.target === runnerModal) closeRunner();
    });
    const scrollUpBtn = document.getElementById('scroll-up-btn');
    const scrollDownBtn = document.getElementById('scroll-down-btn');

    if (scrollUpBtn && scrollDownBtn) {
        scrollUpBtn.addEventListener('click', () => scrollToAiMessage('up'));
        scrollDownBtn.addEventListener('click', () => scrollToAiMessage('down'));
    }
}

function updateScrollNavVisibility() {
    const scrollNav = document.getElementById('ai-scroll-nav');
    if (!scrollNav) return;

    const aiMessages = document.querySelectorAll('.ai-message');
    if (aiMessages.length > 1) {
        scrollNav.classList.remove('hidden');
    } else {
        scrollNav.classList.add('hidden');
    }
}

function scrollToAiMessage(direction) {
    const anchors = Array.from(
        document.querySelectorAll('.ai-message .message-content, .ai-message h2, .ai-message h3, .ai-message .code-block-container')
    ).sort((a, b) => a.offsetTop - b.offsetTop);

    if (anchors.length === 0) return;

    const viewportTop = chatContainer.scrollTop;
    const buffer = 2;

    let targetAnchor = null;

    if (direction === 'down') {
        targetAnchor = anchors.find(anchor => anchor.offsetTop > viewportTop + buffer);
        
        if (!targetAnchor) {
            scrollToBottom();
            return;
        }
    } else {
        const previousAnchors = anchors.filter(anchor => anchor.offsetTop < viewportTop - buffer);
        
        if (previousAnchors.length > 0) {
            targetAnchor = previousAnchors[previousAnchors.length - 1];
        }
    }

    if (targetAnchor) {
        targetAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateInputPlaceholders() {
    const promptWrapper = document.querySelector('.prompt-area-wrapper');
    const showPrompt = ['chat', 'downloader', 'image-tools', 'generate-image'].includes(currentMode);
    promptWrapper.style.display = showPrompt ? 'block' : 'none';
    if (!showPrompt) return;
    uploadButton.style.display = (currentMode === 'chat') ? 'flex' : 'none';
    let placeholder = 'Kirim pesan...';
    if (currentMode === 'generate-image') placeholder = 'Deskripsikan gambar yang ingin dibuat...';
    else if (currentMode === 'image-tools') placeholder = 'Gunakan: upscale <url> atau removebg <url>';
    else if (currentMode === 'downloader') placeholder = 'Tempelkan link disini.';
    promptInput.placeholder = placeholder;
}

function speakText(text, buttonEl) {
    if (!('speechSynthesis' in window)) {
        showCustomAlert('Browser tidak mendukung fitur suara.', 'error');
        return;
    }
    if (speechSynthesis.speaking && activeTts.utterance) {
        speechSynthesis.cancel();
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    activeTts.utterance = utterance;
    activeTts.button = buttonEl;
    utterance.onstart = () => {
        buttonEl.classList.add('speaking');
        buttonEl.title = "Hentikan Suara";
    };
    utterance.onend = () => {
        buttonEl.classList.remove('speaking');
        buttonEl.title = "Dengarkan Jawaban";
        activeTts.utterance = null;
        activeTts.button = null;
    };
    utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        showCustomAlert('Gagal memutar suara.', 'error');
        utterance.onend();
    };
    speechSynthesis.speak(utterance);
}

function createThinkingBlock() {
    const thinkingBlock = document.createElement('div');
    thinkingBlock.className = 'thinking-block';
    const header = document.createElement('div');
    header.className = 'thinking-header';
    header.textContent = 'Alip Gek Miker...';

    const thinkingContent = document.createElement('div');
    thinkingContent.className = 'thinking-content';

    const p = document.createElement('p');
    thinkingContent.appendChild(p);

    header.onclick = () => {
        header.classList.toggle('expanded');
        thinkingContent.style.maxHeight = header.classList.contains('expanded') ? '300px' : '0px';
    };

    thinkingBlock.append(header, thinkingContent);
    return thinkingBlock;
}

async function fetchApi(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    const json = await response.json();
    if (json.status === false || json.success === false) {
        throw new Error(json.message || 'API returned a failure status');
    }
    return json;
}

function showCustomAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    const iconMap = { success: '✔', error: '✖', info: 'ℹ' };
    alertDiv.innerHTML = `<span>${iconMap[type]}</span> ${message}`;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => { alertDiv.remove(); }, 4000);
}

function applyTheme(theme) {
    document.body.className = theme;
    document.getElementById('highlight-theme').href = document.body.classList.contains('dark') ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css' : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    localStorage.setItem('alip-ai-theme', theme);
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        Array.from(e.target.files).forEach(file => {
            if (uploadedFiles.length >= 5) {
                showCustomAlert('Maksimal 5 file.', 'error');
                return;
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                showCustomAlert(`Ukuran file maksimal ${MAX_FILE_SIZE_MB} MB.`, 'error');
                return;
            }

            uploadedFiles.push(file);

            const filePreviewItem = document.createElement('div');
            filePreviewItem.className = 'file-preview-item';
            filePreviewItem.dataset.fileName = file.name;

            let previewContent = '<span class="file-preview-icon">📄</span>';
            if (file.type.startsWith('image/')) {
                previewContent = `<img src="${URL.createObjectURL(file)}" alt="preview">`;
            } else if (file.type.startsWith('video/')) {
                previewContent = '<span class="file-preview-icon">🎬</span>';
            } else if (file.type.startsWith('audio/')) {
                previewContent = '<span class="file-preview-icon">🎵</span>';
            } else if (file.type === 'application/pdf') {
                previewContent = '<span class="file-preview-icon">📕</span>';
            }

            filePreviewItem.innerHTML = `${previewContent} <span class="file-preview-name">${file.name.length > 20 ? file.name.substring(0, 18) + '...' : file.name}</span><button title="Hapus file">×</button>`;

            filePreviewItem.querySelector('button').onclick = () => {
                const index = uploadedFiles.findIndex(f => f.name === file.name);
                if (index > -1) {
                    uploadedFiles.splice(index, 1);
                }
                filePreviewItem.remove();
            };

            filePreviewContainer.appendChild(filePreviewItem);
        });
    }
    fileInput.value = '';
}

function clearFileInput() {
    uploadedFiles = [];
    fileInput.value = '';
    filePreviewContainer.innerHTML = '';
};

async function getFileParts(files) {
    const filePromises = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                inlineData: {
                    data: reader.result.split(',')[1],
                    mimeType: file.type
                }
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });
    return Promise.all(filePromises);
}

function createActionButton(title, innerHTML, onClick) {
    const btn = document.createElement('button');
    btn.className = 'code-action-btn';
    btn.title = title;
    btn.innerHTML = innerHTML;
    btn.onclick = onClick;
    return btn;
}

function downloadCode(text, lang) {
    const exts = { 'javascript': 'js', 'python': 'py', 'html': 'html', 'css': 'css', 'text': 'txt', 'java': 'java', 'csharp': 'cs', 'cpp': 'cpp', 'go': 'go', 'js': 'js' };
    const filename = `alip-ai-code.${exts[lang] || lang || 'txt'}`;
    downloadBlob(new Blob([text], { type: 'text/plain' }), filename);
}

async function downloadImage(imageUrl, prompt) {
    const filename = prompt.slice(0, 30).replace(/[\/\s]+/g, '_') + '.png';
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                downloadBlob(blob, filename);
            } else {
                downloadWithProxy();
            }
        }, 'image/png');
    };
    img.onerror = () => {
        downloadWithProxy();
    };
    const downloadWithProxy = async () => {
        try {
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`);
            if (!response.ok) throw new Error(`Proxy fetch gagal: ${response.status}`);
            const blob = await response.blob();
            downloadBlob(blob, filename);
        } catch (proxyError) {
            showCustomAlert('Gagal unduh otomatis. Mencoba buka di tab baru...', 'error');
            window.open(imageUrl, '_blank');
        }
    };
    img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showCustomAlert(`Mengunduh ${filename}...`, 'success');
}

function showConfirmationDialog(title, message, onConfirm) {
    let dialog = document.querySelector('.confirmation-dialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        document.body.appendChild(dialog);
    }
    dialog.innerHTML = `<div class="dialog-content"><h4>${title}</h4><p>${message}</p><div class="dialog-buttons"><button class="cancel-btn">Batal</button><button class="confirm-btn">Ya, Lanjutkan</button></div></div>`;
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const closeDialog = () => dialog.classList.remove('visible');
    confirmBtn.onclick = () => { onConfirm(); closeDialog(); };
    cancelBtn.onclick = closeDialog;
    dialog.onclick = (e) => { if (e.target === dialog) closeDialog(); };
    dialog.classList.add('visible');
}

function runCodeInPreview(code, lang) {
    const runnerModal = document.getElementById('code-runner-modal');
    const iframe = document.getElementById('code-runner-iframe');
    let srcDocContent = '';
    const normalizedLang = lang === 'js' ? 'javascript' : lang;
    if (normalizedLang === 'html') {
        srcDocContent = code.trim().toLowerCase().includes('<html') ? code : `<!DOCTYPE html><html><head><title>Pratinjau</title><style>body{font-family:sans-serif;color:#333;}</style></head><body>${code}</body></html>`;
    } else if (normalizedLang === 'javascript') {
        srcDocContent = `<!DOCTYPE html><html><head><title>Pratinjau JS</title></head><body><h3>Lihat konsol browser (F12 atau Ctrl+Shift+I) untuk output.</h3><script>${code}<\/script></body></html>`;
    } else if (normalizedLang === 'css') {
        srcDocContent = `<!DOCTYPE html><html><head><title>Pratinjau CSS</title><style>${code}</style></head><body><h1>Contoh Teks</h1><p>Ini adalah paragraf untuk melihat efek dari kode CSS yang Anda berikan.</p><button>Tombol</button><div style="width:100px;height:100px;background:lightblue;margin-top:1rem;"></div></body></html>`;
    }
    iframe.srcdoc = srcDocContent;
    runnerModal.classList.remove('hidden');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initializeRandomMode() {
    randomDisplayedIds.clear();
    randomContentPools.quote = [];
    chatContainer.innerHTML = '';
    const feedContainer = document.createElement('div');
    feedContainer.id = 'random-feed-container';
    chatContainer.appendChild(feedContainer);
    chatContainer.onscroll = null;
    chatContainer.onscroll = () => {
        if (!isLoadingRandom && chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 500) {
            loadMoreRandomContent();
        }
    };
    loadMoreRandomContent(5);
}

async function loadMoreRandomContent(count = 2) {
    if (isLoadingRandom) return;
    isLoadingRandom = true;
    const feedContainer = document.getElementById('random-feed-container');
    const loaderId = `loader-${Date.now()}`;
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'random-loader-spinner';
    loader.innerHTML = '<div class="game-loader"></div>';
    feedContainer.appendChild(loader);
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(fetchAndProcessRandomItem());
    }
    await Promise.all(promises);
    const existingLoader = document.getElementById(loaderId);
    if (existingLoader) existingLoader.remove();
    isLoadingRandom = false;
}

async function fetchAndProcessRandomItem() {
    const feedContainer = document.getElementById('random-feed-container');
    let retries = 0;
    const maxRetries = 15;
    while (retries < maxRetries) {
        const endpoint = randomApiEndpoints[Math.floor(Math.random() * randomApiEndpoints.length)];
        try {
            let itemData;
            let itemId;
            let card;
            if (endpoint.type === 'quote') {
                if (randomContentPools.quote.length === 0) {
                    const response = await fetchApi(endpoint.url);
                    randomContentPools.quote = shuffleArray((response.data || []).filter(q => q.quotes));
                }
                itemData = randomContentPools.quote.pop();
                if (!itemData) continue;
                itemId = itemData.link;
                if (randomDisplayedIds.has(itemId)) continue;
                card = createQuotePostCard(itemData);
            } else if (endpoint.type === 'image') {
                const response = await fetch(endpoint.url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    itemData = data.url || data.result || (data.data && data.data.url);
                } else if (contentType && contentType.startsWith('image/')) {
                    itemData = response.url;
                } else {
                    throw new Error(`Unexpected content-type: ${contentType}`);
                }
                if (!itemData || typeof itemData !== 'string') {
                    retries++;
                    continue;
                }
                itemId = itemData;
                if (randomDisplayedIds.has(itemId)) continue;
                const category = endpoint.url.includes('cecan') ? `cecan/${endpoint.url.split('/').pop()}` : endpoint.url.split('/').pop();
                card = createImagePostCard(itemData, category);
            }
            if (card) {
                randomDisplayedIds.add(itemId);
                feedContainer.appendChild(card);
                return;
            }
        } catch (error) {}
        retries++;
    }
}

function createImagePostCard(imageUrl, category) {
    const card = document.createElement('div');
    card.className = 'random-post-card image-post';
    card.innerHTML = `
        <div class="post-header">
            <img src="https://files.catbox.moe/o03dje.jpg" alt="avatar" class="post-avatar">
            <span class="post-username">Random Image</span>
        </div>
        <div class="post-media-container">
            <img src="${imageUrl}" alt="Random content from ${category}" class="post-image" loading="lazy">
        </div>
        <div class="post-caption">
             <p>Gambar acak dari kategori: <strong>${category}</strong></p>
        </div>
        <div class="post-actions">
            <div class="action-btn like-btn">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span>Suka</span>
            </div>
            <div class="action-btn download-btn-random">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Unduh</span>
            </div>
        </div>`;
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle('liked');
    });
    const downloadBtn = card.querySelector('.download-btn-random');
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filename = category.replace(/\//g, '_');
        downloadImage(imageUrl, filename);
    });
    return card;
}

function createQuotePostCard(quoteData) {
    const card = document.createElement('div');
    card.className = 'random-post-card quote-post';
    card.innerHTML = `
        <div class="post-header">
             <img src="${quoteData.gambar}" alt="avatar" class="post-avatar">
            <span class="post-username">${quoteData.karakter}</span>
        </div>
        <div class="quote-content-container">
            <p class="quote-text">"${quoteData.quotes}"</p>
            <p class="quote-source">- ${quoteData.karakter}, <em>${quoteData.anime}</em></p>
        </div>
        <div class="post-actions">
             <div class="action-btn like-btn">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span>Suka</span>
            </div>
            <div class="action-btn copy-btn-random">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Salin</span>
            </div>
        </div>`;
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle('liked');
    });
    const copyBtn = card.querySelector('.copy-btn-random');
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const textToCopy = `"${quoteData.quotes}"\n- ${quoteData.karakter} (${quoteData.anime})`;
        navigator.clipboard.writeText(textToCopy);
        showCustomAlert('Quote disalin!', 'success');
    });
    return card;
}

function handleGameCardClick(game) {
    if (game.id === 'tictactoe') {
        showTicTacToeLevelScreen();
    } else if (game.id === 'chess') {
        showChessGameTypeSelection();
    } else if (game.id === 'maths') {
        showMathLevelScreen();
    } else if (game.id === 'memorycard') {
        showMemoryCardSetupScreen();
    } else {
        startNewGame(game.id);
    }
}

function showChessGameTypeSelection() {
    chatContainer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'chess-type-selection-container';

    container.innerHTML = `
        <h2 class="ttt-title">Pilih Mode Catur</h2>
        <div class="chess-type-card" id="vs-ai-btn">
            <div class="chess-type-card-icon">🤖</div>
            <h3>Lawan AI</h3>
            <p>Tantang salah satu karakter AI dengan tingkat kesulitan berbeda.</p>
        </div>
        <div class="chess-type-card" id="vs-friend-btn">
            <div class="chess-type-card-icon">👤⚔️👤</div>
            <h3>Lawan Teman</h3>
            <p>Bermain berdua dengan teman di satu perangkat (Hotseat).</p>
        </div>
        <button class="back-button">⬅️ Kembali ke Menu Game</button>
    `;

    container.querySelector('#vs-ai-btn').onclick = showChessModeScreen;
    container.querySelector('#vs-friend-btn').onclick = showChessPVPSetupScreen;
    container.querySelector('.back-button').onclick = showGameSelectionScreen;

    chatContainer.appendChild(container);
    scrollToBottom();
}

function showChessPVPSetupScreen() {
    chatContainer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'game-ui-container';

    container.innerHTML = `
        <div class="chess-setup-container">
            <h2 class="ttt-title">♟️ Pengaturan PVP ♟️</h2>
            <div class="chess-setup-step">
                <h4>1. Nama Pemain</h4>
                <div class="pvp-player-inputs">
                    <input type="text" id="player1-name" placeholder="Pemain 1 (Putih)" value="Player 1">
                    <input type="text" id="player2-name" placeholder="Pemain 2 (Hitam)" value="Player 2">
                </div>
            </div>

            <div class="chess-setup-step">
                <h4>2. Kontrol Waktu</h4>
                <div class="ttt-button-group time-selection">
                    <button class="ttt-select-btn" data-time="60">⚡ 1m</button>
                    <button class="ttt-select-btn" data-time="180">🏃 3m</button>
                    <button class="ttt-select-btn active" data-time="300">⚔️ 5m</button>
                    <button class="ttt-select-btn" data-time="600">🧠 10m</button>
                    <button class="ttt-select-btn" data-time="-1">🕊️ ∞</button>
                </div>
            </div>

            <div class="chess-setup-step">
                <h4>3. Tema Papan Catur</h4>
                <div class="board-theme-grid">
                    <div class="board-theme-option theme-classic active" data-theme="theme-classic"></div>
                    <div class="board-theme-option theme-ocean" data-theme="theme-ocean"></div>
                    <div class="board-theme-option theme-forest" data-theme="theme-forest"></div>
                    <div class="board-theme-option theme-purple" data-theme="theme-purple"></div>
                    <div class="board-theme-option theme-cherry" data-theme="theme-cherry"></div>
                    <div class="board-theme-option theme-ice" data-theme="theme-ice"></div>
                    <div class="board-theme-option theme-sand" data-theme="theme-sand"></div>
                    <div class="board-theme-option theme-slate" data-theme="theme-slate"></div>
                </div>
            </div>

            <button id="start-pvp-game-btn" class="chess-control-btn premium" style="width:100%; margin-top:1rem;">Mulai Pertandingan</button>
            <button class="back-button">⬅️ Kembali ke Pilihan Mode</button>
        </div>
    `;

    container.querySelectorAll('.time-selection .ttt-select-btn, .board-theme-grid .board-theme-option').forEach(btn => {
        btn.onclick = () => {
            const parentGroup = btn.parentElement;
            parentGroup.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    container.querySelector('#start-pvp-game-btn').onclick = () => {
        const player1Name = container.querySelector('#player1-name').value || "Player 1";
        const player2Name = container.querySelector('#player2-name').value || "Player 2";
        const selectedTime = parseInt(container.querySelector('.time-selection .active').dataset.time);
        const selectedTheme = container.querySelector('.board-theme-grid .active').dataset.theme;

        const opponentPVP = { name: player2Name, image: 'https://files.catbox.moe/k3vnvs.jpg' };

        startChessGame(player1Name, opponentPVP, selectedTime, selectedTheme, null, 'w', 'pvp');
    };

    container.querySelector('.back-button').onclick = showChessGameTypeSelection;
    chatContainer.appendChild(container);
    scrollToBottom();
}

function showGameSelectionScreen() {
    chatContainer.innerHTML = '';
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-ui-container';
    gameContainer.innerHTML = `<h2>Pilih Game Favoritmu!</h2><p>Tantang dirimu dengan salah satu permainan seru di bawah ini.</p>`;

    const hotGameIds = ['chess', 'tictactoe'];
    const hotGames = gamesList.filter(g => hotGameIds.includes(g.id));
    const otherGames = gamesList.filter(g => !hotGameIds.includes(g.id));

    const createGrid = (games, title) => {
        const section = document.createElement('div');
        if (title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'game-category-title';
            titleEl.textContent = title;
            section.appendChild(titleEl);
        }

        const grid = document.createElement('div');
        grid.className = 'game-selection-grid';
        games.forEach(game => {
            const card = document.createElement('div');
            card.className = 'game-select-card';
            card.innerHTML = `<img src="${game.image}" alt="${game.name}" class="game-card-image"><div class="game-card-name">${game.name}</div>`;
            card.onclick = () => handleGameCardClick(game);
            grid.appendChild(card);
        });
        section.appendChild(grid);
        return section;
    };

    gameContainer.appendChild(createGrid(hotGames, '🔥 Hot Games'));

    const divider = document.createElement('hr');
    divider.className = 'game-divider';
    gameContainer.appendChild(divider);

    gameContainer.appendChild(createGrid(otherGames, 'Lainnya'));

    chatContainer.appendChild(gameContainer);
    chatContainer.scrollTop = 0;
}

async function startNewGame(gameId, level = null) {
    if (gameId === 'maths' && !level) {
        showMathLevelScreen();
        return;
    }
    chatContainer.innerHTML = `<div class="initial-view"><div class="game-loader"></div><p>Memuat game...</p></div>`;
    scrollToBottom();
    try {
        let url = `https://api.siputzx.my.id/api/games/${gameId}`;
        if (level) url += `?level=${level}`;
        const response = await fetchApi(url);
        renderGameCard(gameId, response, level);
    } catch (error) {
        console.error("Game Error:", error);
        showCustomAlert(`Gagal memuat game: ${error.message}`, 'error');
        chatContainer.innerHTML = `<div class="game-card"><p style="color: #f44336;">Gagal memuat game: ${error.message}</p><div class="game-controls"><button id="back-to-menu">Kembali ke Menu</button></div></div>`;
        document.getElementById('back-to-menu').onclick = showGameSelectionScreen;
    }
}

function showMathLevelScreen() {
    chatContainer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'game-ui-container';
    container.innerHTML = `<h2>Pilih Level Math</h2><p>Pilih tingkat kesulitan untuk permainan Math.</p>`;
    const grid = document.createElement('div');
    grid.className = 'game-selection-grid math-level-grid';
    const levels = ['noob', 'easy', 'medium', 'hard', 'extreme', 'impossible', 'impossible2', 'impossible3', 'impossible4', 'impossible5'];
    levels.forEach(level => {
        const btn = document.createElement('button');
        btn.className = 'game-select-btn';
        btn.textContent = level;
        btn.onclick = () => startNewGame('maths', level);
        grid.appendChild(btn);
    });
    const backButton = document.createElement('button');
    backButton.textContent = '⬅️ Kembali ke Menu Game';
    backButton.className = 'back-button';
    backButton.onclick = showGameSelectionScreen;
    container.appendChild(grid);
    container.appendChild(backButton);
    chatContainer.appendChild(container);
    scrollToBottom();
}

function renderGameCard(gameId, response, level) {
    clearInterval(gameTimerInterval);
    chatContainer.innerHTML = '';
    const gameData = response.data || response;
    const card = document.createElement('div');
    card.className = 'game-card';
    const gameInfo = gamesList.find(g => g.id === gameId);
    const gameName = gameInfo?.name || 'Game';
    const correctAnswer = (gameData.jawaban || gameData.name || gameData.result)?.toString();
    let contentHTML = `
        <div id="game-timer">⏳ 02:00</div>
        <h3>${gameInfo?.emoji || '🕹️'} ${gameName}</h3>
    `;
    if (gameData.soal) contentHTML += `<p class="question">${gameData.soal}</p>`;
    if (gameData.str) contentHTML += `<p class="question">${gameData.str} = ?</p>`;
    if (gameData.tipe) contentHTML += `<p class="clue">💡 Clue: ${gameData.tipe}</p>`;
    if (gameData.img) contentHTML += `<img src="${gameData.img}" class="game-media" alt="Tebak Gambar">`;
    if (gameData.gambar) contentHTML += `<img src="${gameData.gambar}" class="game-media" alt="Tebak Karakter">`;
    if (gameData.audio) {
        const proxiedAudioUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(gameData.audio)}`;
        contentHTML += `
            <div class="custom-audio-player hero-audio">
                <audio id="game-audio-element" src="${proxiedAudioUrl}" preload="auto"></audio>
                <button id="play-audio-btn" title="Dengarkan suara">
                    <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="pause-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <span>Dengarkan Suara Hero</span>
            </div>
        `;
    }
    if (gameData.lagu) {
        contentHTML += `
            <div class="custom-audio-player song-player">
                <audio id="game-audio-element" src="${gameData.lagu}" preload="metadata"></audio>
                <button id="play-audio-btn">
                    <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="pause-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <div class="progress-info">
                    <div id="current-time">0:00</div>
                    <div class="progress-bar-wrapper"><div class="progress-bar"></div></div>
                    <div id="duration">0:00</div>
                </div>
            </div>
        `;
    }
    contentHTML += `
        <form id="game-form" novalidate>
            <input type="text" id="game-answer" placeholder="Ketik jawabanmu di sini..." required autocomplete="off">
            <button type="submit">Jawab!</button>
        </form>
        <div id="game-feedback"></div>
        <div class="game-controls">
            <button id="give-up-btn" class="danger">🏳️ Menyerah</button>
            <button id="next-question" class="primary">Soal Berikutnya ➡️</button>
        </div>
        <button id="back-to-menu">⬅️ Menu Utama</button>
    `;
    card.innerHTML = contentHTML;
    chatContainer.appendChild(card);
    const form = card.querySelector('#game-form');
    const input = card.querySelector('#game-answer');
    const feedback = card.querySelector('#game-feedback');
    const timerDisplay = card.querySelector('#game-timer');
    const giveUpBtn = card.querySelector('#give-up-btn');
    input.focus();
    if (gameData.audio || gameData.lagu) {
        const audioElement = card.querySelector('#game-audio-element');
        const playBtn = card.querySelector('#play-audio-btn');
        playBtn.onclick = () => {
            if (audioElement.paused) audioElement.play();
            else audioElement.pause();
        };
        audioElement.onplay = () => playBtn.classList.add('playing');
        audioElement.onpause = () => playBtn.classList.remove('playing');
        audioElement.onended = () => playBtn.classList.remove('playing');
    }
    if (gameData.lagu) {
        const audioElement = card.querySelector('#game-audio-element');
        const currentTimeEl = card.querySelector('#current-time');
        const durationEl = card.querySelector('#duration');
        const progressBar = card.querySelector('.progress-bar');
        const progressBarWrapper = card.querySelector('.progress-bar-wrapper');
        const formatTime = (time) => {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        audioElement.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audioElement.duration);
        });
        audioElement.addEventListener('timeupdate', () => {
            currentTimeEl.textContent = formatTime(audioElement.currentTime);
            const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
        });
        progressBarWrapper.addEventListener('click', (e) => {
            const rect = progressBarWrapper.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            const duration = audioElement.duration;
            audioElement.currentTime = (clickX / width) * duration;
        });
    }
    const endGame = (reason) => {
        clearInterval(gameTimerInterval);
        input.disabled = true;
        form.querySelector('button').disabled = true;
        giveUpBtn.disabled = true;
        const answerText = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;
        feedback.className = 'feedback';
        if (reason === 'win') {
            feedback.innerHTML = `<p><strong>🎉 KEREN! JAWABANMU BENAR! 🎉</strong></p>`;
            feedback.classList.add('correct');
        } else if (reason === 'giveup') {
            feedback.innerHTML = `<p><strong>🏳️ Kamu Menyerah!</strong> Jawaban yang benar adalah: <strong>${answerText}</strong></p>`;
            feedback.classList.add('incorrect');
        } else if (reason === 'timeup') {
            feedback.innerHTML = `<p><strong>⌛ Waktu Habis!</strong> Jawaban yang benar adalah: <strong>${answerText}</strong></p>`;
            feedback.classList.add('time-up');
        }
    };
    let timeLeft = 120;
    gameTimerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `⏳ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            endGame('timeup');
        }
    }, 1000);
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const userAnswer = input.value.trim();
        if (!userAnswer) {
            input.classList.add('input-error-shake');
            setTimeout(() => input.classList.remove('input-error-shake'), 500);
            return;
        }
        const isCorrect = Array.isArray(correctAnswer) ? correctAnswer.some(ans => ans.toLowerCase() === userAnswer.toLowerCase()) : userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        if (isCorrect) {
            endGame('win');
        } else {
            feedback.innerHTML = `<p>🤔 Jawaban salah, coba lagi!</p>`;
            feedback.className = 'feedback try-again-shake';
            input.classList.add('input-error-shake');
            setTimeout(() => {
                input.classList.remove('input-error-shake');
                feedback.innerHTML = '';
                feedback.className = 'feedback';
            }, 1500);
            input.value = '';
            input.focus();
        }
    });
    giveUpBtn.onclick = () => endGame('giveup');
    card.querySelector('#next-question').onclick = () => startNewGame(gameId, level);
    card.querySelector('#back-to-menu').onclick = () => {
        clearInterval(gameTimerInterval);
        showGameSelectionScreen();
    };
    scrollToBottom();
}

function showTicTacToeLevelScreen() {
    chatContainer.innerHTML = '';
    let selectedMark = 'X';
    let selectedLevel = 'medium';
    let mode = 'ai';
    const container = document.createElement('div');
    container.className = 'game-ui-container ttt-level-selection';
    container.innerHTML = `
        <h2 class="ttt-title">Tic-Tac-Toe</h2>
        <div class="ttt-option-group">
            <p>Pilih Mode:</p>
            <div class="ttt-button-group">
                <button class="ttt-select-btn active" data-mode="ai">👤 vs 🤖 (AI)</button>
                <button class="ttt-select-btn" data-mode="pvp">👤 vs 👤 (Teman)</button>
            </div>
        </div>
        <div id="ai-options">
            <div class="ttt-option-group">
                <p>Pilih Giliranmu:</p>
                <div class="ttt-button-group">
                    <button class="ttt-select-btn active" data-mark="X">Main sebagai X (Pertama)</button>
                    <button class="ttt-select-btn" data-mark="O">Main sebagai O (Kedua)</button>
                </div>
            </div>
            <div class="ttt-option-group">
                <p>Pilih Kesulitan AI:</p>
                <div class="ttt-button-group">
                    <button class="ttt-select-btn" data-level="easy">😊 Easy</button>
                    <button class="ttt-select-btn active" data-level="medium">🤔 Medium</button>
                    <button class="ttt-select-btn" data-level="hard">😈 Hard</button>
                </div>
            </div>
        </div>
        <button id="ttt-start-game-btn">Mulai Bermain</button>
        <button class="back-button">⬅️ Kembali ke Menu Game</button>
    `;
    const modeButtons = container.querySelectorAll('[data-mode]');
    const aiOptions = container.querySelector('#ai-options');
    modeButtons.forEach(btn => {
        btn.onclick = () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.dataset.mode;
            aiOptions.style.display = (mode === 'ai') ? 'block' : 'none';
        };
    });
    const markButtons = container.querySelectorAll('[data-mark]');
    markButtons.forEach(btn => {
        btn.onclick = () => {
            markButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMark = btn.dataset.mark;
        };
    });
    const levelButtons = container.querySelectorAll('[data-level]');
    levelButtons.forEach(btn => {
        btn.onclick = () => {
            levelButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLevel = btn.dataset.level;
        };
    });
    container.querySelector('#ttt-start-game-btn').onclick = () => {
        if (mode === 'pvp') {
            startTicTacToe('pvp', 'X');
        } else {
            startTicTacToe(selectedLevel, selectedMark);
        }
    };
    container.querySelector('.back-button').onclick = showGameSelectionScreen;
    chatContainer.appendChild(container);
    scrollToBottom();
}

function startTicTacToe(level, playerMark) {
    let board = Array(9).fill(null);
    let currentPlayer = 'X';
    let isGameActive = true;
    const isPVP = level === 'pvp';
    const aiMark = isPVP ? null : (playerMark === 'X' ? 'O' : 'X');
    const playerMarkSVG = (mark) => (mark === 'X' ?
        `<svg class="ttt-x" viewBox="0 0 52 52"><path d="M16 16 36 36 M36 16 16 36"/></svg>` :
        `<svg class="ttt-o" viewBox="0 0 52 52"><circle cx="26" cy="26" r="10"/></svg>`
    );
    const render = () => {
        chatContainer.innerHTML = '';
        const gameContainer = document.createElement('div');
        gameContainer.className = 'tic-tac-toe-container';
        gameContainer.innerHTML = `
            <h3 class="ttt-title">${isPVP ? 'Player 1 vs Player 2' : `Player vs AI (${level})`}</h3>
            <div id="ttt-status"></div>
            <div id="ttt-board">
                ${board.map((_, index) => `<div class="ttt-cell" data-index="${index}"></div>`).join('')}
                <div id="ttt-win-line-container"><div id="ttt-line"></div></div>
            </div>
            <div class="ttt-controls">
                <button id="ttt-play-again">Play Again</button>
                <button id="ttt-change-settings">Change Settings</button>
            </div>
        `;
        gameContainer.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.addEventListener('click', () => handlePlayerClick(parseInt(cell.dataset.index)));
        });
        gameContainer.querySelector('#ttt-play-again').onclick = () => startTicTacToe(level, playerMark);
        gameContainer.querySelector('#ttt-change-settings').onclick = showTicTacToeLevelScreen;
        chatContainer.appendChild(gameContainer);
    };
    const updateStatus = (text) => document.getElementById('ttt-status').textContent = text;
    const handlePlayerClick = (index) => {
        if (!isGameActive || board[index] !== null) return;
        if (!isPVP && currentPlayer !== playerMark) return;
        makeMove(index);
    };
    const makeMove = (index) => {
        if (!isGameActive || board[index] !== null) return;
        board[index] = currentPlayer;
        updateCell(index);
        const gameResult = checkWinner();
        if (gameResult) {
            endGame(gameResult);
            return;
        }
        currentPlayer = (currentPlayer === 'X') ? 'O' : 'X';
        if (isPVP) {
            updateStatus(`Player ${currentPlayer === 'X' ? '1' : '2'}'s Turn (${currentPlayer})`);
        } else {
            if (currentPlayer === aiMark) {
                updateStatus("AI is thinking...");
                setTimeout(aiMove, 500);
            } else {
                updateStatus(`Your Turn (${playerMark})`);
            }
        }
    };
    const aiMove = () => {
        if (!isGameActive) return;
        let move;
        if (level === 'easy') move = findBestMoveEasy();
        else if (level === 'medium') move = findBestMoveMedium();
        else move = findBestMoveHard();
        if (move !== -1) {
            makeMove(move);
        }
    };
    const findBestMoveEasy = () => {
        const emptyCells = board.map((c, i) => c === null ? i : null).filter(i => i !== null);
        return emptyCells.length > 0 ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : -1;
    };
    const findBestMoveMedium = () => {
        for (let p of [aiMark, playerMark]) {
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = p;
                    if (checkWinner()) {
                        board[i] = null;
                        return i;
                    }
                    board[i] = null;
                }
            }
        }
        return findBestMoveEasy();
    };
    const findBestMoveHard = () => {
        let bestScore = -Infinity;
        let move = -1;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = aiMark;
                let score = minimax(board, 0, false);
                board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    };
    const minimax = (currentBoard, depth, isMaximizing) => {
        const scores = {
            [aiMark]: 10,
            [playerMark]: -10,
            'tie': 0
        };
        let result = checkWinner();
        if (result !== null) return scores[result.winner] ? scores[result.winner] - depth : 0;
        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = aiMark;
                    bestScore = Math.max(bestScore, minimax(currentBoard, depth + 1, false));
                    currentBoard[i] = null;
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = playerMark;
                    bestScore = Math.min(bestScore, minimax(currentBoard, depth + 1, true));
                    currentBoard[i] = null;
                }
            }
            return bestScore;
        }
    };
    const updateCell = (index) => {
        const cell = document.querySelector(`.ttt-cell[data-index='${index}']`);
        if (cell) cell.innerHTML = playerMarkSVG(board[index]);
    };
    const checkWinner = () => {
        const winConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
        ];
        for (let i = 0; i < winConditions.length; i++) {
            const [a, b, c] = winConditions[i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line: winConditions[i] };
            }
        }
        return board.includes(null) ? null : { winner: 'tie', line: null };
    };
    const endGame = (result) => {
        isGameActive = false;
        const status = document.getElementById('ttt-status');
        const controls = document.querySelector('.ttt-controls');
        if (result.winner === 'tie') {
            status.textContent = "It's a Tie!";
            status.style.color = '#f7b733';
        } else {
            let winnerText;
            if (isPVP) {
                winnerText = `Player ${result.winner === 'X' ? '1' : '2'} Wins!`;
            } else {
                winnerText = (result.winner === playerMark) ? 'You Win!' : 'AI Wins!';
            }
            status.textContent = winnerText;
            if (isPVP) {
                status.style.color = (result.winner === 'X') ? '#3498db' : '#f1c40f';
            } else {
                status.style.color = (result.winner === playerMark) ? '#2ecc71' : '#e74c3c';
            }
            drawWinLine(result.line);
        }
        if (controls) controls.classList.add('visible');
    };
    const drawWinLine = (line) => {
        if (!line) return;
        const lineClasses = {
            '0,1,2': 'h-top', '3,4,5': 'h-middle', '6,7,8': 'h-bottom', '0,3,6': 'v-left', '1,4,7': 'v-center', '2,5,8': 'v-right', '0,4,8': 'd-1', '2,4,6': 'd-2'
        };
        const lineKey = line.join(',');
        const lineElement = document.getElementById('ttt-line');
        if (lineElement && lineClasses[lineKey]) {
            lineElement.className = `line-${lineClasses[lineKey]}`;
            lineElement.style.opacity = 1;
        }
    };
    render();
    if (isPVP) {
        updateStatus("Player 1's Turn (X)");
    } else {
        if (currentPlayer === aiMark) {
            updateStatus("AI is thinking...");
            setTimeout(aiMove, 500);
        } else {
            updateStatus(`Your Turn (${playerMark})`);
        }
    }
}

const chessChatMessages = {
    id: {
        opening: ["Hm, menarik.", "Langkah yang bisa ditebak.", "Baiklah, mari kita lihat.", "Aku sudah mengantisipasi ini."],
        check: ["Skak.", "Raja mu dalam bahaya.", "Satu langkah ceroboh...", "Hati-hati."],
        capture: ["Bidanku lebih berharga.", "Pengorbanan yang sia-sia.", "Terima kasih atas bidaknya.", "Sudah kuperhitungkan."],
        winning: ["Kemenangan sudah di depan mata.", "Kamu tidak punya harapan lagi.", "Menyerah saja, itu lebih terhormat.", "Permainan yang bagus, tapi belum cukup."],
        losing: ["Sial, aku tidak melihat itu.", "Ini... di luar dugaan.", "Belum, ini belum berakhir!", "Bagaimana bisa..."]
    },
    en: {
        opening: ["Hmm, interesting.", "A predictable move.", "Alright, let's see.", "I've anticipated this."],
        check: ["Check.", "Your king is in danger.", "One careless move...", "Be careful."],
        capture: ["My piece was more valuable.", "A futile sacrifice.", "Thanks for the piece.", "All according to plan."],
        winning: ["Victory is within my grasp.", "You have no hope left.", "Just surrender, it's more honorable.", "Good game, but not good enough."],
        losing: ["Damn, I didn't see that.", "This... is unexpected.", "Not yet, it's not over!", "How could this be..."]
    },
    jp: {
        opening: ["ふむ、面白い。", "予測可能な動きだ。", "いいだろう、見てみよう。", "これは予想済みだ。"],
        check: ["チェック。", "王が危険だ。", "一つの不注意な動きが…", "気をつけろ。"],
        capture: ["私の駒の方が価値があったな。", "無駄な犠牲だ。", "駒をありがとう。", "計画通りだ。"],
        winning: ["勝利は目前だ。", "もう希望はないぞ。", "降参したまえ、その方が名誉だ。", "いい試合だったが、まだ足りないな。"],
        losing: ["しまった、それが見えなかった。", "これは…想定外だ。", "まだだ、まだ終わらんよ！", "どうしてこうなった…"]
    },
    es: {
        opening: ["Hmm, interesante.", "Un movimiento predecible.", "Bien, veamos.", "He anticipado esto."],
        check: ["Jaque.", "Tu rey está en peligro.", "Un movimiento descuidado...", "Ten cuidado."],
        capture: ["Mi pieza era más valiosa.", "Un sacrificio inútil.", "Gracias por la pieza.", "Todo según el plan."],
        winning: ["La victoria está a mi alcance.", "Ya no tienes esperanza.", "Ríndete, es más honorable.", "Buen juego, pero no lo suficiente."],
        losing: ["Maldición, no vi eso.", "Esto... es inesperado.", "¡Aún no, esto no ha terminado!", "Cómo pudo pasar..."]
    }
};

function showGameOverModal(title, message, gameParameters) {
    const oldModal = document.querySelector('.game-over-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    modal.innerHTML = `
        <div class="game-over-content">
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="game-over-buttons">
                <button id="back-to-menu-btn">Menu Utama</button>
                <button id="play-again-btn">Main Lagi</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    document.getElementById('play-again-btn').onclick = () => {
        closeModal();
        startChessGame(
            gameParameters.playerName,
            gameParameters.opponent,
            gameParameters.timeControl,
            gameParameters.boardTheme,
            gameParameters.language,
            gameParameters.playerSide,
            gameParameters.gameMode
        );
    };

    document.getElementById('back-to-menu-btn').onclick = () => {
        closeModal();
        showChessGameTypeSelection();
    };
}

function showChessModeScreen() {
    chatContainer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'game-ui-container';

    let selectedOpponent = null;
    let playerName = "You";
    let lastSelectedCard = null;

    const opponentStats = {
        'Ayanokouji Kiyotaka': 'Skill: Manipulation. Kelemahan: Tidak Diketahui.',
        'Arisu Sakayanagi': 'Skill: Genius Intellect. Tipe: Strategis, Positional Player.',
        'Sae Chabasira': 'Skill: Strict Instructor. Tipe: Agresif, Menekan Lawan.',
        'Kazuma Sakagami': 'Skill: Perfect Being. Tipe: Serangan Balik, Akurasi Tinggi.',
        'Ichika Amasawa': 'Skill: Deception. Tipe: Tidak Terduga, Penuh Jebakan.',
        'Horikita Manabu': 'Skill: Former President. Tipe: Solid, Tanpa Celah Pertahanan.',
        'Horikita Suzune': 'Skill: High Potential. Tipe: Kalkulatif, Terus Berkembang.',
        'Rokusuke Koenji': 'Skill: Natural Narcissist. Tipe: Unorthodox, Sulit Dibaca.',
        'Kikyou Kushida': 'Skill: Two-Faced. Tipe: Agresif di Awal, Rapuh di Akhir.',
        'Kakeru Ryuen': 'Skill: Fear and Control. Tipe: Brutal, Mengorbankan Bidak.',
        'Honami Ichinose': 'Skill: Class Leader. Tipe: Seimbang, Permainan Aman.',
        'Kei Karuizawa': 'Skill: The Parasite. Tipe: Bertahan, Menunggu Kesalahan Lawan.',
    };

    container.innerHTML = `
        <div class="chess-setup-container">
            <h2 class="ttt-title">♟️ Pengaturan Catur ♟️</h2>
            <div class="chess-setup-step">
                <h4>1. Profil Anda</h4>
                <div class="user-profile-setup">
                     <img src="https://files.catbox.moe/gqmb50.jpg" alt="Your Avatar">
                     <input type="text" class="chess-player-name-input" value="${playerName}" placeholder="Masukkan Nama Anda">
                </div>
            </div>
            <div class="chess-setup-step">
                <h4>2. Pilih Lawan AI</h4>
                <div class="chess-opponent-grid">
                    ${chessOpponents.map((opp, index) => `
                        <div class="opponent-card" data-index="${index}">
                            <img src="${opp.image}" alt="${opp.name}">
                            <div class="opponent-details">
                                <div class="opponent-name">${opp.name}</div>
                                <div class="opponent-rank rank-${opp.rank.toLowerCase()}">Rank: ${opp.rank}</div>
                                <div class="opponent-dynamic-content"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="back-button" style="margin-top: 2rem;">⬅️ Kembali ke Pilihan Mode</button>
        </div>
    `;

    const modal = document.getElementById('chess-final-setup-modal');
    const modalContent = modal.querySelector('#final-setup-content');
    const finalStartBtn = modal.querySelector('#final-start-game-btn');

    container.querySelectorAll('.opponent-card').forEach(card => {
        card.onclick = () => {
            if (lastSelectedCard && lastSelectedCard !== card) {
                lastSelectedCard.classList.remove('selected');
                const oldDynamicContent = lastSelectedCard.querySelector('.opponent-dynamic-content');
                if (oldDynamicContent) oldDynamicContent.innerHTML = '';
            }

            card.classList.toggle('selected');
            const dynamicContent = card.querySelector('.opponent-dynamic-content');

            if (card.classList.contains('selected')) {
                selectedOpponent = chessOpponents[parseInt(card.dataset.index)];
                dynamicContent.innerHTML = `
                    <p class="opponent-stats">${opponentStats[selectedOpponent.name] || 'Tidak ada data...'}</p>
                    <button class="opponent-play-btn">Play vs ${selectedOpponent.name.split(' ')[0]}</button>
                `;

                dynamicContent.querySelector('.opponent-play-btn').onclick = (e) => {
                    e.stopPropagation();

                    modalContent.innerHTML = `
                         <div class="setup-section">
                            <h5>Pilih Sisi</h5>
                            <div class="ttt-button-group side-selection">
                                <button class="ttt-select-btn active" data-side="w" title="Main sebagai Putih">♔</button>
                                <button class="ttt-select-btn" data-side="b" title="Main sebagai Hitam">♚</button>
                                <button class="ttt-select-btn" data-side="random" title="Acak">🎲</button>
                            </div>
                        </div>
                        <div class="setup-section">
                            <h5>Bahasa (Language)</h5>
                            <div class="ttt-button-group language-selection">
                                <button class="ttt-select-btn active" data-lang="id" title="Indonesia">🇮🇩</button>
                                <button class="ttt-select-btn" data-lang="en" title="English">🇬🇧</button>
                                <button class="ttt-select-btn" data-lang="jp" title="Japanese">🇯🇵</button>
                                <button class="ttt-select-btn" data-lang="es" title="Spanish">🇪🇸</button>
                            </div>
                        </div>
                        <div class="setup-section">
                            <h5>Kontrol Waktu</h5>
                            <div class="ttt-button-group time-selection">
                                <button class="ttt-select-btn" data-time="60">⚡ 1m</button>
                                <button class="ttt-select-btn" data-time="180">🏃 3m</button>
                                <button class="ttt-select-btn active" data-time="300">⚔️ 5m</button>
                                <button class="ttt-select-btn" data-time="600">🧠 10m</button>
                                <button class="ttt-select-btn" data-time="-1">🕊️ ∞</button>
                            </div>
                        </div>
                        <div class="setup-section">
                            <h5>Tema Papan Catur</h5>
                            <div class="board-theme-grid">
                                <div class="board-theme-option theme-classic active" data-theme="theme-classic"></div>
                                <div class="board-theme-option theme-ocean" data-theme="theme-ocean"></div>
                                <div class="board-theme-option theme-forest" data-theme="theme-forest"></div>
                                <div class="board-theme-option theme-purple" data-theme="theme-purple"></div>
                                <div class="board-theme-option theme-cherry" data-theme="theme-cherry"></div>
                                <div class="board-theme-option theme-ice" data-theme="theme-ice"></div>
                                <div class="board-theme-option theme-sand" data-theme="theme-sand"></div>
                                <div class="board-theme-option theme-slate" data-theme="theme-slate"></div>
                            </div>
                        </div>
                    `;

                    modal.querySelectorAll('.side-selection .ttt-select-btn, .language-selection .ttt-select-btn, .time-selection .ttt-select-btn, .board-theme-grid .board-theme-option').forEach(btn => {
                        btn.onclick = () => {
                            const parentGroup = btn.parentElement;
                            parentGroup.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                        };
                    });

                    modal.style.display = 'flex';
                };
                lastSelectedCard = card;
            } else {
                dynamicContent.innerHTML = '';
                lastSelectedCard = null;
            }
        };
    });

    finalStartBtn.onclick = () => {
        const selectedSide = modal.querySelector('.side-selection .active').dataset.side;
        const selectedLang = modal.querySelector('.language-selection .active').dataset.lang;
        const selectedTime = parseInt(modal.querySelector('.time-selection .active').dataset.time);
        const selectedTheme = modal.querySelector('.board-theme-grid .active').dataset.theme;
        playerName = container.querySelector('.chess-player-name-input').value || "You";

        modal.style.display = 'none';
        const loader = document.getElementById('chess-loader-overlay');
        loader.style.display = 'flex';

        setTimeout(() => {
            loader.style.display = 'none';
            startChessGame(playerName, selectedOpponent, selectedTime, selectedTheme, selectedLang, selectedSide, 'ai');
        }, 1500);
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

    container.querySelector('.back-button').onclick = showChessGameTypeSelection;
    chatContainer.appendChild(container);
}

function showPromotionDialog(from, to, color, callback) {
    const oldModal = document.getElementById('promotion-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'promotion-modal';
    const pieceChoices = ['q', 'r', 'b', 'n'];

    modal.innerHTML = `
        <div class="promotion-content">
            <h4>Pilih Promosi Pion</h4>
            <div class="promotion-choices">
                ${pieceChoices.map(p => `
                    <div class="promotion-piece" data-piece="${p}" 
                         style="background-image: url('${pieceImages[color + p.toUpperCase()]}')">
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.promotion-piece').forEach(el => {
        el.onclick = () => {
            const piece = el.dataset.piece;
            modal.remove();
            callback(piece);
        };
    });
}

function startChessGame(playerName, opponent, timeControl, boardTheme, language, playerSide, gameMode = 'ai') {
    let board = null;
    const game = new Chess();
    let whiteTime = timeControl;
    let blackTime = timeControl;
    let currentTimer = null;
    let chatTimeout = null;
    let finalPlayerSide = playerSide;

    const gameParameters = { playerName, opponent, timeControl, boardTheme, language, playerSide, gameMode };

    if (gameMode === 'ai' && finalPlayerSide === 'random') {
        finalPlayerSide = Math.random() < 0.5 ? 'w' : 'b';
    }

    const pieceValue = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 90 };

    const removeHighlights = () => {
        $('#chess-board .square-55d63').find('.highlight-legal, .highlight-capture').remove();
    };

    const highlightMoves = (square) => {
        const moves = game.moves({ square: square, verbose: true });
        if (moves.length === 0) return;

        moves.forEach(move => {
            const highlightClass = move.flags.includes('c') || move.flags.includes('e') ? 'highlight-capture' : 'highlight-legal';
            $('#chess-board .square-' + move.to).append(`<div class="${highlightClass}"></div>`);
        });
    };

    const evaluateBoard = (currentBoard) => {
        let totalEvaluation = 0;
        currentBoard.forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    totalEvaluation += (pieceValue[piece.type] || 0) * (piece.color === 'w' ? 1 : -1);
                }
            });
        });
        return totalEvaluation;
    };

    const minimax = (depth, isMaximizingPlayer, alpha, beta) => {
        if (depth === 0 || game.isGameOver()) {
            return -evaluateBoard(game.board());
        }

        const moves = game.moves();
        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = minimax(depth - 1, false, alpha, beta);
                game.undo();
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = minimax(depth - 1, true, alpha, beta);
                game.undo();
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };

    const findBestMoveMinimax = (depth) => {
        const possibleMoves = game.moves({ verbose: true });
        let bestMove = null;
        let bestValue = -Infinity;

        for (const move of possibleMoves) {
            game.move(move.san);
            const boardValue = minimax(depth - 1, false, -Infinity, Infinity);
            game.undo();
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
        return bestMove;
    };

    const getAIMove = (rank) => {
        const possibleMoves = game.moves({ verbose: true });
        if (possibleMoves.length === 0) return null;

        if (game.history().length < 4 && ['S', 'SS', 'SSS', 'A', 'B'].includes(rank)) {
            const openings = ['e4', 'd4', 'c4', 'Nf3', 'g3', 'b3'];
            const validOpenings = openings.filter(move => game.moves().includes(move));
            if (validOpenings.length > 0) {
                const moveSAN = validOpenings[Math.floor(Math.random() * validOpenings.length)];
                return possibleMoves.find(m => m.san === moveSAN);
            }
        }

        if (rank === 'C') {
            return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }

        if (rank === 'B' || rank === 'A') {
            if (Math.random() > 0.3) {
                const captureMoves = possibleMoves.filter(m => m.flags.includes('c'));
                if (captureMoves.length > 0) {
                    return captureMoves[Math.floor(Math.random() * captureMoves.length)];
                }
            }
            return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }

        let depth = 2;
        if (rank === 'SS') depth = 3;
        if (rank === 'SSS') depth = 3;
        return findBestMoveMinimax(depth);
    };

    const formatTime = (seconds) => {
        if (seconds === -1) return "∞";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };
    const stopTimer = () => clearInterval(currentTimer);

    const startTimer = () => {
        if (timeControl === -1 || game.isGameOver()) return;

        currentTimer = setInterval(() => {
            const turn = game.turn();
            if (game.isGameOver()) {
                stopTimer();
                return;
            }
            if (turn === 'w') {
                whiteTime--;
                const timerDisplay = document.getElementById('player-timer');
                if (timerDisplay) {
                    timerDisplay.textContent = formatTime(whiteTime);
                    timerDisplay.classList.toggle('low-time', whiteTime > 0 && whiteTime < 30);
                }
                if (whiteTime <= 0) {
                    stopTimer();
                    showGameOverModal('Waktu Habis!', `${opponent.name} (Hitam) Menang!`, gameParameters);
                }
            } else {
                blackTime--;
                const timerDisplay = document.getElementById('opponent-timer');
                if (timerDisplay) {
                    timerDisplay.textContent = formatTime(blackTime);
                    timerDisplay.classList.toggle('low-time', blackTime > 0 && blackTime < 30);
                }
                if (blackTime <= 0) {
                    stopTimer();
                    showGameOverModal('Waktu Habis!', `${playerName} (Putih) Menang!`, gameParameters);
                }
            }
        }, 1000);
    };

    function showOpponentChat(message, duration = 4000) {
        if (gameMode === 'pvp') return;
        const bubble = document.getElementById('opponent-chat-bubble');
        if (bubble && message) {
            clearTimeout(chatTimeout);
            bubble.textContent = message;
            bubble.classList.add('visible');
            chatTimeout = setTimeout(() => {
                bubble.classList.remove('visible');
            }, duration);
        }
    }

    function triggerRandomChat() {
        if (game.isGameOver() || !language) return;

        const personality = opponentPersonalities[opponent.name] || (opponent.gender === 'female' ? opponentPersonalities.default_female : opponentPersonalities.default_male);
        const langMessages = personality[language] || personality.en;

        if (!langMessages) return;

        const history = game.history({ verbose: true });
        const lastMove = history[history.length - 1];
        let chatCategory;
        const evaluation = evaluateBoard(game.board()) * (finalPlayerSide === 'w' ? 1 : -1);

        if (history.length < 5) chatCategory = 'opening';
        else if (game.inCheck()) chatCategory = 'check';
        else if (lastMove && lastMove.flags.includes('c')) chatCategory = 'capture';
        else if (evaluation < -4) chatCategory = 'winning';
        else if (evaluation > 4) chatCategory = 'losing';
        else return;

        if (Math.random() > 0.6) return;

        const messages = langMessages[chatCategory];
        if (messages) {
            const message = messages[Math.floor(Math.random() * messages.length)];
            showOpponentChat(message);
        }
    }

    function updateCapturedPieces() {
        const whiteCaptured = [];
        const blackCaptured = [];

        game.history({ verbose: true }).forEach(move => {
            if (move.captured) {
                const pieceColor = move.color === 'w' ? 'b' : 'w';
                if (pieceColor === 'w') {
                    whiteCaptured.push(move.captured);
                } else {
                    blackCaptured.push(move.captured);
                }
            }
        });

        const sortOrder = ['p', 'n', 'b', 'r', 'q'];
        const sortFn = (a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b);
        whiteCaptured.sort(sortFn);
        blackCaptured.sort(sortFn);

        const player1CapturedContainer = document.getElementById('player-captured-pieces');
        const player2CapturedContainer = document.getElementById('opponent-captured-pieces');

        if (player1CapturedContainer && player2CapturedContainer) {
            const playerIsWhite = (gameMode === 'ai' && finalPlayerSide === 'w') || gameMode === 'pvp';
            const opponentIsWhite = (gameMode === 'ai' && finalPlayerSide === 'b');

            if (playerIsWhite) {
                player1CapturedContainer.innerHTML = blackCaptured.map(p => `<img src="${pieceImages['b' + p.toUpperCase()]}" class="captured-piece-img">`).join('');
                player2CapturedContainer.innerHTML = whiteCaptured.map(p => `<img src="${pieceImages['w' + p.toUpperCase()]}" class="captured-piece-img">`).join('');
            } else {
                player1CapturedContainer.innerHTML = whiteCaptured.map(p => `<img src="${pieceImages['w' + p.toUpperCase()]}" class="captured-piece-img">`).join('');
                player2CapturedContainer.innerHTML = blackCaptured.map(p => `<img src="${pieceImages['b' + p.toUpperCase()]}" class="captured-piece-img">`).join('');
            }
        }
    }

    function makeAIMove() {
        if (gameMode === 'pvp' || game.isGameOver()) return;

        const rank = opponent.rank;
        let thinkingTime = 1000 + Math.random() * 1500;
        if (['B', 'C'].includes(rank)) thinkingTime = 500 + Math.random() * 800;

        setTimeout(() => {
            if (game.isGameOver()) {
                stopTimer();
                return;
            }

            const move = getAIMove(rank);
            if (move) {
                game.move(move.san);
                board.position(game.fen());
                updateCapturedPieces();
                triggerRandomChat();
            }

            updateStatus();
            if (game.isGameOver()) {
                handleEndGame();
            }

        }, thinkingTime);
    }

    function renderChess() {
        chatContainer.innerHTML = '';
        const chessContainer = document.createElement('div');
        chessContainer.className = 'chess-container';

        const player1Name = gameMode === 'ai' ? playerName : playerName;
        const player2Name = opponent.name;

        const player1Image = 'https://files.catbox.moe/gqmb50.jpg';
        const player2Image = opponent.image;

        const player1Label = gameMode === 'ai' ? (finalPlayerSide === 'w' ? ' (Putih)' : ' (Hitam)') : ' (Putih)';
        const player2Label = gameMode === 'ai' ? (finalPlayerSide === 'b' ? ' (Putih)' : ' (Hitam)') : ' (Hitam)';

        const playerTimerValue = gameMode === 'ai' ? (finalPlayerSide === 'w' ? whiteTime : blackTime) : whiteTime;
        const opponentTimerValue = gameMode === 'ai' ? (finalPlayerSide === 'b' ? whiteTime : blackTime) : blackTime;

        const topPlayerName = gameMode === 'ai' && finalPlayerSide === 'b' ? player1Name : player2Name;
        const bottomPlayerName = gameMode === 'ai' && finalPlayerSide === 'b' ? player2Name : player1Name;
        const topPlayerImage = gameMode === 'ai' && finalPlayerSide === 'b' ? player1Image : player2Image;
        const bottomPlayerImage = gameMode === 'ai' && finalPlayerSide === 'b' ? player2Image : player1Image;
        const topPlayerLabel = gameMode === 'ai' && finalPlayerSide === 'b' ? ' (Putih)' : ' (Hitam)';
        const bottomPlayerLabel = gameMode === 'ai' && finalPlayerSide === 'b' ? ' (Hitam)' : ' (Putih)';


        chessContainer.innerHTML = `
            <div id="opponent-info" class="chess-player-info">
                <div class="player-details">
                    <div class="player-name">${topPlayerName}${topPlayerLabel}</div>
                    <div class="captured-pieces" id="opponent-captured-pieces"></div>
                    <div id="opponent-timer" class="player-timer">${formatTime(gameMode === 'ai' && finalPlayerSide === 'b' ? playerTimerValue : opponentTimerValue)}</div>
                </div>
                <img src="${topPlayerImage}" class="player-profile-pic">
            </div>
            ${gameMode === 'ai' ? '<div id="opponent-chat-bubble" class="chess-chat-bubble"></div>' : ''}
            <div id="chess-board-wrapper" class="${boardTheme}"><div id="chess-board"></div></div>
            <div id="player-info" class="chess-player-info">
                <img src="${bottomPlayerImage}" class="player-profile-pic">
                <div class="player-details">
                    <div class="player-name">${bottomPlayerName}${bottomPlayerLabel}</div>
                    <div class="captured-pieces" id="player-captured-pieces"></div>
                    <div id="player-timer" class="player-timer">${formatTime(gameMode === 'ai' && finalPlayerSide === 'b' ? opponentTimerValue : playerTimerValue)}</div>
                </div>
            </div>
            <div id="chess-status"></div>
            <div class="chess-controls">
                <button class="chess-control-btn" id="chess-reset">Game Baru</button>
                <button class="chess-control-btn premium" id="chess-menu">Menu Utama</button>
            </div>
        `;
        if (timeControl === -1) {
            chessContainer.querySelector('#opponent-timer').style.display = 'none';
            chessContainer.querySelector('#player-timer').style.display = 'none';
        }
        chatContainer.appendChild(chessContainer);

        document.getElementById('chess-reset').onclick = () => {
            showConfirmationDialog('Mulai Game Baru?', 'Progres saat ini akan hilang. Yakin?', () => {
                stopTimer();
                if (gameMode === 'pvp') {
                    showChessPVPSetupScreen();
                } else {
                    showChessModeScreen();
                }
            });
        };
        document.getElementById('chess-menu').onclick = () => {
            showConfirmationDialog('Kembali ke Menu Utama?', 'Game saat ini akan dihentikan. Yakin?', () => {
                stopTimer();
                showGameSelectionScreen();
            });
        };
    }

    function updateStatus() {
        stopTimer();

        const statusEl = document.getElementById('chess-status');
        const player1TimerEl = document.getElementById('player-timer');
        const player2TimerEl = document.getElementById('opponent-timer');

        if (game.isGameOver()) {
            if (player1TimerEl) player1TimerEl.classList.remove('active');
            if (player2TimerEl) player2TimerEl.classList.remove('active');
            return;
        };

        const turn = game.turn();

        if (statusEl) {
            const turnName = turn === 'w' ? (gameMode === 'pvp' ? playerName : (finalPlayerSide === 'w' ? playerName : opponent.name)) : (gameMode === 'pvp' ? opponent.name : (finalPlayerSide === 'b' ? playerName : opponent.name));
            const thinkingText = (gameMode === 'ai' && turn !== finalPlayerSide) ? ` sedang berpikir...` : '';
            statusEl.textContent = `Giliran ${turnName}${thinkingText}`;
        }

        const isBottomPlayerTurn = (gameMode === 'ai' && finalPlayerSide === 'b') ? turn === 'b' : turn === 'w';

        if (player1TimerEl) player1TimerEl.classList.toggle('active', isBottomPlayerTurn);
        if (player2TimerEl) player2TimerEl.classList.toggle('active', !isBottomPlayerTurn);

        startTimer();
    }

    function handleEndGame() {
        if (!game.isGameOver()) return;
        stopTimer();
        let title = "Permainan Selesai";
        let message = "Hasilnya Seri!";

        if (game.isCheckmate()) {
            const winnerName = game.turn() === 'b' ? (playerName + " (Putih)") : (opponent.name + " (Hitam)");
            title = 'SKAKMAT!';
            message = `${winnerName} Menang!`;
        }
        showGameOverModal(title, message, gameParameters);
    }

    function onPieceClick(square) {
        removeHighlights();
        highlightMoves(square);
    }

    function onDrop(source, target) {
        removeHighlights();
        let move = null;
        try {
            move = game.move({ from: source, to: target, promotion: 'q' });
        } catch (e) { return 'snapback'; }

        if (move === null) return 'snapback';

        if (move.flags.includes('p')) {
            game.undo();
            showPromotionDialog(source, target, move.color, (promotionPiece) => {
                game.move({ from: source, to: target, promotion: promotionPiece });
                board.position(game.fen());
                onSnapEnd();
            });
            return 'snapback';
        }
    }

    function onSnapEnd() {
        updateCapturedPieces();
        updateStatus();

        if (game.isGameOver()) {
            handleEndGame();
            return;
        }

        if (gameMode === 'ai' && game.turn() !== finalPlayerSide) {
            makeAIMove();
        }
    }

    function onDragStart(source, piece) {
        if (game.isGameOver()) return false;

        if (game.turn() !== piece.charAt(0)) {
            return false;
        }

        if (gameMode === 'ai' && game.turn() !== finalPlayerSide) {
            return false;
        }

        highlightMoves(source);
        return true;
    }

    renderChess();
    const config = {
        draggable: true,
        position: 'start',
        pieceTheme: (p) => pieceImages[p],
        onDragStart,
        onDrop,
        onSnapEnd,
        onClick: onPieceClick,
        orientation: (gameMode === 'ai' && finalPlayerSide === 'b') ? 'black' : 'white'
    };
    board = Chessboard('chess-board', config);
    updateCapturedPieces();
    updateStatus();

    if (gameMode === 'ai' && game.turn() !== finalPlayerSide) {
        makeAIMove();
    }

    $(window).trigger('resize');
}

function showMemoryCardSetupScreen() {
    chatContainer.innerHTML = '';
    let selectedTheme = 'emoji';
    let selectedTime = 120;

    const container = document.createElement('div');
    container.className = 'game-ui-container memory-setup-container';
    container.innerHTML = `
        <h2 class="ttt-title">🃏 Pengaturan Memory Card 🃏</h2>

        <div class="memory-option-group">
            <p>Pilih Tema Kartu</p>
            <div class="memory-theme-selection">
                ${Object.keys(memoryCardSets).map(theme => `
                    <button class="memory-option-btn theme-option" data-theme="${theme}">
                        ${memoryCardSets[theme][0]}
                        <span>${theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="memory-option-group">
            <p>Pilih Waktu</p>
            <div class="memory-time-selection">
                <button class="memory-option-btn time-option" data-time="60">1:00</button>
                <button class="memory-option-btn time-option" data-time="120">2:00</button>
                <button class="memory-option-btn time-option" data-time="180">3:00</button>
                <button class="memory-option-btn time-option" data-time="240">4:00</button>
            </div>
        </div>

        <button id="memory-start-game-btn">Mulai Bermain</button>
        <button class="back-button">⬅️ Kembali ke Menu Game</button>
    `;

    const themeBtns = container.querySelectorAll('.theme-option');
    themeBtns.forEach(btn => {
        if (btn.dataset.theme === selectedTheme) btn.classList.add('active');
        btn.onclick = () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTheme = btn.dataset.theme;
        };
    });

    const timeBtns = container.querySelectorAll('.time-option');
    timeBtns.forEach(btn => {
        if (parseInt(btn.dataset.time) === selectedTime) btn.classList.add('active');
        btn.onclick = () => {
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTime = parseInt(btn.dataset.time);
        };
    });

    container.querySelector('#memory-start-game-btn').onclick = () => {
        startMemoryCardGame(selectedTheme, selectedTime);
    };
    container.querySelector('.back-button').onclick = showGameSelectionScreen;
    chatContainer.appendChild(container);
    scrollToBottom();
}

function startMemoryCardGame(theme, timeInSeconds) {
    clearInterval(gameTimerInterval);
    chatContainer.innerHTML = '';

    let score = 0;
    let hasFlippedCard = false;
    let lockBoard = true;
    let firstCard, secondCard;
    const totalPairs = 12;
    let matchedPairs = 0;

    const cardSet = memoryCardSets[theme];
    const wildCard = '⭐';
    const gameCards = shuffleArray([...cardSet, ...cardSet, wildCard]);

    const gameContainer = document.createElement('div');
    gameContainer.className = 'memory-card-container';
    gameContainer.innerHTML = `
        <div class="memory-header">
            <div class="memory-info">Skor: <span id="memory-score">0</span></div>
            <div id="game-timer">⏳ 00:00</div>
            <div class="memory-info">Pasangan: <span id="memory-pairs">0</span>/${totalPairs}</div>
        </div>
        <div id="memory-board"></div>
        <div id="memory-feedback" class="feedback-hidden"></div>
        <div class="memory-controls">
            <button id="memory-play-again" style="display:none;">Main Lagi</button>
            <button id="memory-change-settings" style="display:none;">Menu</button>
        </div>
    `;
    const board = gameContainer.querySelector('#memory-board');

    gameCards.forEach(item => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('memory-card');
        cardElement.dataset.item = item;
        cardElement.innerHTML = `
            <div class="card-face card-front">${item}</div>
            <div class="card-face card-back">?</div>
        `;
        board.appendChild(cardElement);
        cardElement.addEventListener('click', flipCard);
    });

    chatContainer.appendChild(gameContainer);

    const scoreEl = document.getElementById('memory-score');
    const pairsEl = document.getElementById('memory-pairs');
    const timerEl = document.getElementById('game-timer');
    const feedbackEl = document.getElementById('memory-feedback');

    function flipCard() {
        if (lockBoard || this.classList.contains('is-flipped')) return;
        this.classList.add('is-flipped');

        if (!hasFlippedCard) {
            hasFlippedCard = true;
            firstCard = this;
            return;
        }
        secondCard = this;
        lockBoard = true;
        checkForMatch();
    }

    function checkForMatch() {
        let isMatch = firstCard.dataset.item === secondCard.dataset.item;
        if (isMatch) {
            score += 100;
            setTimeout(handleCorrectMatch, 500);
        } else {
            score = Math.max(0, score - 10);
            setTimeout(unflipCards, 1000);
        }
        scoreEl.textContent = score;
    }

    function handleCorrectMatch() {
        firstCard.removeEventListener('click', flipCard);
        secondCard.removeEventListener('click', flipCard);
        firstCard.classList.add('is-matched');
        secondCard.classList.add('is-matched');

        matchedPairs++;
        pairsEl.textContent = matchedPairs;

        if (matchedPairs === totalPairs) {
            endGame(true);
        }
        resetBoard();
    }

    function unflipCards() {
        firstCard.classList.remove('is-flipped');
        secondCard.classList.remove('is-flipped');
        resetBoard();
    }

    function resetBoard() {
        hasFlippedCard = false;
        lockBoard = false;
        [firstCard, secondCard] = [null, null];
    }

    function endGame(isWin) {
        clearInterval(gameTimerInterval);
        lockBoard = true;
        feedbackEl.classList.remove('feedback-hidden');
        if (isWin) {
            score += timeLeft * 10;
            scoreEl.textContent = score;
            feedbackEl.textContent = `🎉 Selamat, Anda Menang! Skor Akhir: ${score} 🎉`;
            feedbackEl.style.backgroundColor = 'var(--alert-success-bg)';
            const remainingCard = board.querySelector('.memory-card:not(.is-matched)');
            if (remainingCard) remainingCard.classList.add('is-flipped');
        } else {
            feedbackEl.textContent = `⌛ Waktu Habis! Coba lagi! ⌛`;
            feedbackEl.style.backgroundColor = 'var(--alert-error-bg)';
        }
        gameContainer.querySelector('#memory-play-again').style.display = 'inline-block';
        gameContainer.querySelector('#memory-change-settings').style.display = 'inline-block';
    }

    let timeLeft = timeInSeconds;
    const updateTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.textContent = `⏳ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    updateTimer();

    setTimeout(() => {
        document.querySelectorAll('.memory-card').forEach(card => card.classList.add('is-flipped'));
    }, 500);

    setTimeout(() => {
        document.querySelectorAll('.memory-card').forEach(card => card.classList.remove('is-flipped'));
        lockBoard = false;

        gameTimerInterval = setInterval(() => {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) {
                endGame(false);
            }
        }, 1000);
    }, 2500);

    gameContainer.querySelector('#memory-play-again').onclick = () => startMemoryCardGame(theme, timeInSeconds);
    gameContainer.querySelector('#memory-change-settings').onclick = showMemoryCardSetupScreen;
}

function renderToolCard(cardElement, container) {
    container.innerHTML = '';
    container.style.padding = '0';
    container.style.border = 'none';
    container.style.background = 'transparent';
    container.appendChild(cardElement);
    scrollToBottom();
}

function displayDownloaderInstructions() {
    const instructions = `<p><strong>Mode Downloader Aktif</strong></p><p>Tempel link dari salah satu platform di bawah ini:</p><ul><li>Instagram (Post, Reel, Story)</li><li>TikTok (Video)</li><li>Mediafire (File)</li><li>YouTube (Video & Shorts)</li></ul>`;
    displayMessage('system', { text: instructions });
}

function displayImageToolsInstructions() {
    const instructions = `
        <p><strong>Mode Image Tools Aktif</strong></p>
        <p>Gunakan salah satu perintah di bawah ini:</p>
        <ul>
            <li><code>upscale https://.../gambar.jpg</code></li>
            <li><code>removebg https://.../gambar.png</code></li>
        </ul>
        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">
        <p><strong>Ubah Gambar Jadi URL</strong></p>
        <p style="font-size: 0.9em; color: var(--text-color-muted);">
            Klik tombol di bawah untuk mengunggah gambar. Setelah selesai, salin link langsungnya (misal: ...jpg, .png) untuk digunakan pada perintah di atas.
        </p>
        <div class="tool-choice-container" style="margin-top: 0.75rem;">
            <a href="https://catbox.moe/" target="_blank" rel="noopener noreferrer" class="suggestion-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><path d="m21 3-9 9"></path><path d="M15 3h6v6"></path></svg>
                Buka CatBox.moe
            </a>
        </div>
    `;
    displayMessage('system', { text: instructions });
}