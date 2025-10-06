// Global variables
let requiredWords = [];
let examDescription = '';
let conversationHistory = [];
let recognition;
let synthesis = window.speechSynthesis;
let isLLMSpeaking = false;
let isUserSpeaking = false;
let currentTranscript = '';

// PAGE NAVIGATION
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

// PAGE 1: LANDING PAGE -> START PAGE
function goToStartPage() {
    const wordsInput = document.getElementById("chars_input").value.trim();
    examDescription = document.getElementById("exam_desc_input").value.trim();

    if (!wordsInput || !examDescription) {
        alert('Please fill in all fields before submitting.');
        return;
    }

    // Parse words/grammar structures
    requiredWords = wordsInput.split('\n').filter(w => w.trim() !== '');

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
                alert('Microphone access is required to use LanguageBot. Please allow microphone access and try again.');
                console.error('Microphone access denied:', err);
            });
    } else {
        alert('Your browser does not support audio recording. Please use a modern browser like Chrome.');
    }
}

// SPEECH RECOGNITION SETUP
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome.');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; // Chinese language
    recognition.continuous = true;
    recognition.interimResults = true;

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

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        document.getElementById('status-text').textContent = 'Error: ' + event.error;
    };
}

// CONVERSATION MANAGEMENT
function startConversation() {
    conversationHistory = [];

    // LLM starts the conversation
    const systemPrompt = `You are a Chinese language teacher helping a student practice Chinese conversation. The exam description is: "${examDescription}". The student needs to use these words and grammar structures: ${requiredWords.join(', ')}. Start the conversation naturally in Chinese and encourage the student to use the required vocabulary.`;

    llmSpeak(systemPrompt, true);
}

function llmSpeak(prompt, isFirstMessage = false) {
    isLLMSpeaking = true;
    showSpeakerIcon();
    document.getElementById('status-text').textContent = 'Chatbot is speaking...';

    // Call LLM API (using a placeholder - needs actual API integration)
    callLLMAPI(prompt, isFirstMessage)
        .then(response => {
            conversationHistory.push({ speaker: 'LLM', text: response });

            // Use text-to-speech
            speakText(response);
        })
        .catch(error => {
            console.error('LLM API error:', error);
            document.getElementById('status-text').textContent = 'Error communicating with chatbot.';
            isLLMSpeaking = false;
            showMicrophoneIcon();
        });
}

function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;

    utterance.onend = function() {
        isLLMSpeaking = false;
        showMicrophoneIcon();
        startListening();
    };

    synthesis.speak(utterance);
}

function startListening() {
    if (recognition && !isUserSpeaking) {
        isUserSpeaking = true;
        currentTranscript = '';
        document.getElementById('status-text').textContent = 'Your turn to speak...';
        recognition.start();
    }
}

function endMessage() {
    if (isUserSpeaking && recognition) {
        recognition.stop();
        isUserSpeaking = false;

        if (currentTranscript.trim()) {
            conversationHistory.push({ speaker: 'User', text: currentTranscript });

            // Send user's response to LLM
            llmSpeak(currentTranscript, false);
        } else {
            document.getElementById('status-text').textContent = 'No speech detected. Please try again.';
            showMicrophoneIcon();
        }
    }
}

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

    conversationHistory.forEach(entry => {
        const p = document.createElement('p');
        p.className = entry.speaker === 'User' ? 'user-message' : 'llm-message';

        let highlightedText = entry.text;

        // Highlight required words/structures in user messages
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

function generateGrammarFeedback(userText) {
    const feedbackPrompt = `As a Chinese language teacher, analyze this student's Chinese conversation and provide constructive grammar feedback in English. Focus on grammar mistakes, sentence structure, and areas for improvement:\n\n${userText}`;

    callLLMAPI(feedbackPrompt, false, true)
        .then(feedback => {
            document.getElementById('grammar-feedback').textContent = feedback;
        })
        .catch(error => {
            console.error('Error generating feedback:', error);
            document.getElementById('grammar-feedback').textContent = 'Unable to generate feedback at this time.';
        });
}

// TODO: ADD GEMINI? (LOTS OF FREE CREDITS)
// LLM API INTEGRATION (PLACEHOLDER - NEEDS ACTUAL IMPLEMENTATION)
async function callLLMAPI(prompt, isFirstMessage = false, isFeedback = false) {
    // This is a placeholder. You need to implement actual API calls to OpenAI or similar service
    // For now, returning mock responses

    // IMPORTANT: Replace this with actual API integration
    // Example using OpenAI API:
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: prompt }
            ]
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
    */

    return new Promise((resolve) => {
        setTimeout(() => {
            if (isFeedback) {
                resolve('Your Chinese pronunciation and grammar show good progress. Consider working on your tone accuracy, especially with third tone changes. Also, try to use more complex sentence structures with 把 and 被 constructions to sound more natural.');
            } else if (isFirstMessage) {
                resolve('你好！很高兴见到你。今天我们来练习中文对话。你可以先介绍一下自己吗？');
            } else {
                resolve('很好！请继续说。');
            }
        }, 1000);
    });
}

// PRINT FUNCTIONS
function printReport() {
    window.print();
}

// Initialize: Show landing page on load
window.onload = function() {
    showPage('landing-page');
};