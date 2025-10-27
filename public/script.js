// Global variables
let requiredWords = [];
let examDescription = '';
let conversationHistory = [];
let recognition;
let synthesis = window.speechSynthesis;
let isLLMSpeaking = false;
let isUserSpeaking = false;
let currentTranscript = '';
let languageCode = 'zh-CN';
let selectedLanguageName = 'Chinese';
let possibleLanguages = {
    Chinese: 'zh-CN',
    Japanese: 'ja-JP',
    Spanish: 'es-ES',
    English: 'en-US'
}
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

    const languageSelect = document.getElementById('language_select');
    selectedLanguageName = languageSelect.value;
    languageCode = possibleLanguages[selectedLanguageName];

    // If text boxes are not all filled in, alert the user
    // I don't think this is necessary because sometimes you might just want to have a conversation on a random topic
    // if (!wordsInput || !examDescInput) {
    //     alert('Please fill in all fields before submitting.');
    //     return;
    // }

    // Parse words/grammar structures and assign to global variables
    requiredWords = wordsInput.split('\n').filter(w => w.trim() !== '');
    examDescription = examDescInput;

    // Display on start page
    document.getElementById("chars_label").textContent = requiredWords.join('\n');
    document.getElementById("exam_desc_label").textContent = examDescription;

    showPage('start-page');
}

// POPULATE LANGUAGE CHOOSER
function populateLanguageDropdown() {
    const select = document.getElementById('language_select');

    // Clear existing options (in case of restart/re-init)
    select.innerHTML = '';

    for (const name in possibleLanguages) {
        const option = document.createElement('option');
        option.value = name; // e.g., 'Chinese'
        option.textContent = name;
        
        // Make Chinese the default selection
        if (name === 'Chinese') {
            option.selected = true;
            // Also ensure the global variables are set to the default
            selectedLanguageName = 'Chinese';
            languageCode = possibleLanguages[name];
        }
        
        select.appendChild(option);
    }

    // Add an event listener to update global variables on change
    select.addEventListener('change', function() {
        selectedLanguageName = this.value;
        languageCode = possibleLanguages[selectedLanguageName];
        
        // This log helps confirm the change
        console.log(`Language changed to: ${selectedLanguageName} (${languageCode})`);
    });
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

// CONVERSATION PAGE -> LANDING PAGE
function goToLandingPage() {
    document.getElementById("chars_input").value = '';
    document.getElementById("exam_desc_input").value = '';
    showPage('landing-page');
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
    recognition.lang = languageCode;
    recognition.continuous = true;
    recognition.interimResults = true;

    // Transcribe audio
    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Start from event.resultIndex to get results new to this event call
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                // For final results, append them to the main transcript buffer
                finalTranscript += transcript;
            } else {
                // For interim results, just store the latest one to show to the user
                interimTranscript += transcript;
            }
        }

        
        
        currentTranscript = ''; // Reset current for a full rebuild
        let currentInterim = '';

        for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                currentTranscript += event.results[i][0].transcript;
            } else {
                currentInterim += event.results[i][0].transcript;
            }
        }
        
        // Display the accumulated final text plus the current interim text
        document.getElementById('status-text').textContent = 'You: ' + (currentTranscript + currentInterim);
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        document.getElementById('status-text').textContent = 'Error: ' + event.error + '. Restarting listener...';
        // Check for specific errors that stop the service (e.g., 'not-allowed', 'service-not-allowed')
        // For general errors, we can restart listening.
        isUserSpeaking = false; // The error stops the recognition implicitly
        showMicrophoneIcon();
        // Automatically restart listening after an error (except fatal ones like 'not-allowed')
        if (event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
            setTimeout(startListening, 1000); // Wait a second before trying again
        }
    };
    
    // The 'end' event fires when the speech recognition service has disconnected.
    // This happens after a recognition.stop(), or after a pause/no-speech timeout (if continuous=false).
    recognition.onend = function() {
        if (isUserSpeaking) {
            // This case should ideally not happen if endMessage() is called, 
            // but is a safeguard if the service stops on its own while the user is *intended* to be speaking.
            // For now, keep the main logic in endMessage.
            // We set isUserSpeaking to false in endMessage, so if it's true here, the service stopped prematurely.
            console.log("Recognition ended unexpectedly.");
            isUserSpeaking = false; 
            showMicrophoneIcon();
        }
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

// SPEAKING TEXT
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    utterance.rate = 0.8; 
    utterance.pitch = 1.0;  
    utterance.volume = 1.0; 

    // Select highest quality voice based on the language
    const voices = synthesis.getVoices();
    const selectedVoice = voices.find(voice =>
        voice.lang.startsWith(languageCode.substring(0, 2)) &&
        (voice.name.includes('Premium') || voice.name.includes('Enhanced') || voice.localService === false)
    ) || voices.find(voice => voice.lang.startsWith(languageCode.substring(0, 2)));

    if (selectedVoice) {
        utterance.voice = selectedVoice;
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
        currentTranscript = ''; // Important: reset transcript for the new turn
        document.getElementById('status-text').textContent = 'Your turn to speak...';
        
        // Reset the visual display when listening starts
        document.getElementById('status-text').textContent = 'Your turn to speak...'; 

        // Add a try-catch in case recognition.start() fails after an error
        try {
            recognition.start();
        } catch (e) {
            console.error("Error starting recognition:", e);
            document.getElementById('status-text').textContent = 'Error starting mic. Please try reloading.';
            isUserSpeaking = false;
        }
    }
}
// END USER MESSAGE
// Function is called in index.html when "end message" button is pressed
function endMessage() {
    if (isUserSpeaking && recognition) {
        // Stop recognition. This will trigger the final 'onresult' and then 'onend'.
        // We handle the transcript check *after* stopping.
        recognition.stop();
        isUserSpeaking = false;

        // Give a brief moment for the final 'onresult' to process if recognition.stop() is synchronous
        // In practice, since we modified onresult to be cumulative, we just check currentTranscript.
        
        // FIX 1: If no text, restart listening instead of just stopping
        if (currentTranscript.trim()) {
            conversationHistory.push({ speaker: 'User', text: currentTranscript });
            document.getElementById('status-text').textContent = 'Processing: ' + currentTranscript;

            // Send user's response to LLM
            llmSpeak(currentTranscript);
        } else {
            // No speech detected. Tell user and start listening again.
            document.getElementById('status-text').textContent = 'No speech detected. Please try again.';
            showMicrophoneIcon();
            
            // Wait briefly before restarting the mic to avoid race conditions
            setTimeout(startListening, 500); 
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
    const feedbackPrompt = `As a ${selectedLanguageName} language teacher, analyze the following dialogue, which represents a student's responses in a conversation. Provide constructive grammar feedback in English in a short paragraph. Focus on grammar mistakes, sentence structure, and areas for improvement. Please format your response in plaintext and do not use any markdown formatting. Address your response to the student. \n\n${userText}`;

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
    let SYSTEM_INSTRUCTION = `You are a ${selectedLanguageName} language teacher helping a student practice ${selectedLanguageName} conversation. The conversation description is as follows: "${examDescription}". The student needs to use these words and grammar structures: ${requiredWords.join(', ')}. Converse naturally in ${selectedLanguageName}, always following the description of the conversation. While conversing, subtly encourage the student to use the required vocabulary, but try not to explicit mention the vocabulary words or the conversation topic. Keep your responses between 1-3 sentences. Please format your response in plaintext and do not use any markdown formatting.`;

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
    populateLanguageDropdown();
};