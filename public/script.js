// Global variables
let requiredWords = [];
let examDescription = '';
let conversationHistory = [];
let recognition;
let synthesis = window.speechSynthesis;
let isLLMSpeaking = false;
let isUserSpeaking = false;
let currentTranscript = '';
// let API_KEY = '';

// PAGE NAVIGATION
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

// PAGE 1: LANDING PAGE -> START PAGE
function goToStartPage() {
    // Get values from landing page
    const wordsInput = document.getElementById("chars_input").value.trim();
    const examDescInput = document.getElementById("exam_desc_input").value.trim();

    // If text boxes are not all filled in, alert the user
    if (!wordsInput || !examDescInput) {
        alert('Please fill in all fields before submitting.');
        return;
    }

    // Parse words/grammar structures and assign to global variables
    requiredWords = wordsInput.split('\n').filter(w => w.trim() !== '');
    examDescription = examDescInput;

    // Display on start page
    document.getElementById("chars_label").textContent = requiredWords.join('\n');
    document.getElementById("exam_desc_label").textContent = examDescription;

    showPage('start-page');
}

// PAGE 2: START PAGE -> CONVERSATION PAGE
function goToConversationPage() {
    // Request microphone permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                // Permission granted
                showPage('conversation-page');
                initializeSpeechRecognition();
                startConversation();
            })
            .catch(function(err) {
                // Permission not granted
                alert('Microphone access is required to use LanguageBot. Please allow microphone access and try again.');
                console.error('Microphone access denied:', err);
            });
    } else {
        // Audio recording not available
        alert('Your browser does not support audio recording. Please use Google Chrome.');
    }
}

// SPEECH RECOGNITION SETUP
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        // Speech recognition not available
        alert('Speech recognition is not supported in your browser. Please use Google Chrome.');
        return;
    }

    // Set up speech recognition
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; // Chinese language
    recognition.continuous = true;
    recognition.interimResults = true;

    // Transcribe audio
    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        currentTranscript = finalTranscript || interimTranscript;
        document.getElementById('status-text').textContent = 'You: ' + currentTranscript;
    };

    // Speech recognition does not work
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        document.getElementById('status-text').textContent = 'Error: ' + event.error;
    };
}

// CONVERSATION MANAGEMENT
function startConversation() {
    conversationHistory = [];

    llmSpeak();
}

// LLM SPEAKS
function llmSpeak(prompt) {
    isLLMSpeaking = true;
    showSpeakerIcon();
    document.getElementById('status-text').textContent = 'Chatbot is speaking...';

    // Call LLM API with conversation history
    callLLMAPI(prompt)
        .then(response => {
            conversationHistory.push({ speaker: 'LLM', text: response });

            // Use text-to-speech
            speakText(response);
        })
        .catch(error => {
            console.error('LLM API error:', error);
            document.getElementById('status-text').textContent = 'Error communicating with chatbot. Please reload the page and try again.';
            isLLMSpeaking = false;
            showMicrophoneIcon();
        });
}

// SPEAKING CHINESE TEXT
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8; 
    utterance.pitch = 1.0;  
    utterance.volume = 1.0; 

    // Select a higher quality voice if available
    const voices = synthesis.getVoices();
    const chineseVoice = voices.find(voice =>
        voice.lang.startsWith('zh') &&
        (voice.name.includes('Premium') || voice.name.includes('Enhanced') || voice.localService === false)
    ) || voices.find(voice => voice.lang.startsWith('zh'));

    if (chineseVoice) {
        utterance.voice = chineseVoice;
    }

    utterance.onend = function() {
        isLLMSpeaking = false;
        showMicrophoneIcon();
        startListening();
    };

    synthesis.speak(utterance);
}

// LISTEN TO THE USER
function startListening() {
    if (recognition && !isUserSpeaking) {
        isUserSpeaking = true;
        currentTranscript = '';
        document.getElementById('status-text').textContent = 'Your turn to speak...';
        recognition.start();
    }
}

// END USER MESSAGE
// Function is called in index.html
function endMessage() {
    if (isUserSpeaking && recognition) {
        recognition.stop();
        isUserSpeaking = false;

        if (currentTranscript.trim()) {
            conversationHistory.push({ speaker: 'User', text: currentTranscript });

            // Send user's response to LLM
            llmSpeak(currentTranscript);
        } else {
            document.getElementById('status-text').textContent = 'No speech detected. Please try again.';
            showMicrophoneIcon();
        }
    }
}

// END CONVERSATION
function endConversation() {
    if (recognition) {
        recognition.stop();
    }
    synthesis.cancel();

    showPage('post-conversation-page');
    generateScoreReport();
}

// ICON MANAGEMENT
function showSpeakerIcon() {
    document.getElementById('speaker-icon').style.display = 'block';
    document.getElementById('microphone-icon').style.display = 'none';
}

function showMicrophoneIcon() {
    document.getElementById('speaker-icon').style.display = 'none';
    document.getElementById('microphone-icon').style.display = 'block';
}

// PAGE 4: SCORE REPORT
function generateScoreReport() {
    // Display transcript
    const transcriptDiv = document.getElementById('transcript');
    transcriptDiv.innerHTML = '';

    // Highlight required words/structures in user messages
    conversationHistory.forEach(entry => {
        const p = document.createElement('p');
        p.className = entry.speaker === 'User' ? 'user-message' : 'llm-message';

        let highlightedText = entry.text;

        // If user used the word, highlight it
        if (entry.speaker === 'User') {
            requiredWords.forEach(word => {
                const regex = new RegExp(word, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark>$&</mark>');
            });
        }

        p.innerHTML = `<strong>${entry.speaker}:</strong> ${highlightedText}`;
        transcriptDiv.appendChild(p);
    });

    // Count how many required words were used
    const userMessages = conversationHistory.filter(e => e.speaker === 'User').map(e => e.text).join(' ');
    const usedWords = requiredWords.filter(word => {
        const regex = new RegExp(word, 'i');
        return regex.test(userMessages);
    });
    document.getElementById('word-count').textContent = `You used ${usedWords.length} out of ${requiredWords.length} required words/grammar structures.`;

    // Generate grammar feedback using LLM
    generateGrammarFeedback(userMessages);
}

// GENERATE GRAMMAR FEEDBACK
function generateGrammarFeedback(userText) {
    const feedbackPrompt = `As a Chinese language teacher, analyze the following dialogue, which represents a student's responses in a conversation. Provide constructive grammar feedback in English in a short paragraph. Focus on grammar mistakes, sentence structure, and areas for improvement. Please format your response in plaintext and do not use any markdown formatting. Address your response to the student. \n\n${userText}`;

    callLLMAPI(feedbackPrompt)
        .then(feedback => {
            document.getElementById('grammar-feedback').textContent = feedback;
        })
        .catch(error => {
            console.error('Error generating feedback:', error);
            document.getElementById('grammar-feedback').textContent = 'Unable to generate feedback at this time.';
        });
}

// LLM API INTEGRATION
async function callLLMAPI(prompt) {
    let contents = [
        {
            role: 'user',
            parts: [{
                text: `[A new user has just opened the chat. Please greet them and start the conversation]`
            }]
        }
    ];
    let SYSTEM_INSTRUCTION = `You are a Chinese language teacher helping a student practice Chinese conversation. The conversation description is as follows: "${examDescription}". The student needs to use these words and grammar structures: ${requiredWords.join(', ')}. Converse naturally in Chinese, always following the description of the conversation. While conversing, subtly encourage the student to use the required vocabulary, but try not to explicit mention the vocabulary words or the conversation topic. Keep your responses between 1-3 sentences. Please format your response in plaintext and do not use any markdown formatting.`;

    if (prompt !== undefined) {
        // Add conversation history
        conversationHistory.forEach(entry => {
            contents.push({
                role: entry.speaker === 'User' ? 'user' : 'model',
                parts: [{
                    text: entry.text
                }]
            });
        });

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{
                text: prompt
            }]
        });
    }

    const response = await fetch(`/api/v1beta/models/gemini-2.5-flash-lite:generateContent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: contents,
            systemInstruction: 
            {
                "parts": [
                    {"text": SYSTEM_INSTRUCTION}
                ]
            }
        })
    });
    const data = await response.json();
    console.log(data);
    return data.candidates[0].content.parts[0].text;
}

// PRINT FUNCTIONS
function printReport() {
    window.print();
}

// Initialize: Show landing page on load
window.onload = function() {
    showPage('landing-page');
};