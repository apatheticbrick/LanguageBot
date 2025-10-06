// Global variables
let userEmail = '';
let requiredWords = [];
let examDescription = '';
let conversationHistory = [];
let recognition;
let synthesis = window.speechSynthesis;
let isLLMSpeaking = false;
let isUserSpeaking = false;
let currentTranscript = '';
let mediaRecorder;
let audioChunks = [];
let useNativeSpeechRecognition = false;

// PAGE NAVIGATION
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

// PAGE 1: LANDING PAGE -> START PAGE
function goToStartPage() {
    userEmail = document.getElementById("email_input").value.trim();
    const wordsInput = document.getElementById("chars_input").value.trim();
    examDescription = document.getElementById("exam_desc_input").value.trim();

    if (!userEmail || !wordsInput || !examDescription) {
        alert('Please fill in all fields before submitting.');
        return;
    }

    // Parse words/grammar structures
    requiredWords = wordsInput.split('\n').filter(w => w.trim() !== '');

    // Display on start page
    document.getElementById("email_label").textContent = userEmail;
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

    if (SpeechRecognition) {
        // Use native Web Speech API (Chrome, Edge, Opera)
        useNativeSpeechRecognition = true;
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
    } else {
        // Fallback for Firefox and other browsers using MediaRecorder API
        useNativeSpeechRecognition = false;
        console.log('Using MediaRecorder API fallback for speech recognition');
    }
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
    if (!isUserSpeaking) {
        isUserSpeaking = true;
        currentTranscript = '';
        document.getElementById('status-text').textContent = 'Your turn to speak...';

        if (useNativeSpeechRecognition && recognition) {
            recognition.start();
        } else {
            startMediaRecorderListening();
        }
    }
}

function startMediaRecorderListening() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = function(event) {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = function() {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioForTranscription(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            document.getElementById('status-text').textContent = 'Recording... Click "End Message" when done.';
        })
        .catch(function(err) {
            console.error('Error accessing microphone:', err);
            document.getElementById('status-text').textContent = 'Error: Could not access microphone';
            isUserSpeaking = false;
        });
}

function endMessage() {
    if (isUserSpeaking) {
        if (useNativeSpeechRecognition && recognition) {
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
        } else if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            document.getElementById('status-text').textContent = 'Processing audio...';
        }
    }
}

async function sendAudioForTranscription(audioBlob) {
    try {
        // IMPORTANT: You need to implement a backend API endpoint that handles speech-to-text
        // This example uses Google Cloud Speech-to-Text, but you need to set up your own backend

        // Option 1: Send to your own backend server
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', 'zh-CN');

        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Transcription service unavailable');
        }

        const data = await response.json();
        currentTranscript = data.transcript || '';

        isUserSpeaking = false;

        if (currentTranscript.trim()) {
            document.getElementById('status-text').textContent = 'You: ' + currentTranscript;
            conversationHistory.push({ speaker: 'User', text: currentTranscript });
            llmSpeak(currentTranscript, false);
        } else {
            document.getElementById('status-text').textContent = 'No speech detected. Please try again.';
            showMicrophoneIcon();
        }
    } catch (error) {
        console.error('Transcription error:', error);
        document.getElementById('status-text').textContent = 'Error: Transcription service unavailable. Please set up a backend API endpoint at /api/transcribe';
        isUserSpeaking = false;
        showMicrophoneIcon();
    }
}

function endConversation() {
    if (useNativeSpeechRecognition && recognition) {
        recognition.stop();
    } else if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
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

// EMAIL AND PRINT FUNCTIONS
function sendReportToEmail() {
    // This requires a backend service or EmailJS integration
    // Placeholder implementation
    alert(`Score report will be sent to ${userEmail}. (Note: Email functionality requires backend integration or EmailJS setup)`);

    // Example using EmailJS (requires EmailJS account and setup):
    /*
    emailjs.send("service_id", "template_id", {
        to_email: userEmail,
        report_html: document.getElementById('score-report').innerHTML
    }).then(function(response) {
        alert('Report sent successfully!');
    }, function(error) {
        alert('Failed to send report: ' + error);
    });
    */
}

function printReport() {
    window.print();
}

// Initialize: Show landing page on load
window.onload = function() {
    showPage('landing-page');
};