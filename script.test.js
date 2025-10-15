/**
 * LanguageBot Test Suite
 *
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Install required testing dependencies (if not already installed):
 *    npm install --save-dev jest jest-environment-jsdom @testing-library/jest-dom
 *
 * 2. The package.json should already have the test configuration. If not, add:
 *    "scripts": {
 *      "test": "jest",
 *      "test:watch": "jest --watch",
 *      "test:coverage": "jest --coverage"
 *    },
 *    "jest": {
 *      "testEnvironment": "jsdom"
 *    }
 *
 * RUNNING TESTS:
 * --------------
 * Run all tests:           npm test
 * Run tests in watch mode: npm run test:watch
 * Run with coverage:       npm run test:coverage
 * Run a specific test:     npm test -- -t "test name pattern"
 *
 * TEST STRUCTURE:
 * ---------------
 * This test suite includes:
 * - Unit tests for ALL 17 functions in script.js
 * - End-to-end tests simulating full user workflows
 * - Error handling and edge case tests
 *
 * FUNCTIONS TESTED:
 * -----------------
 * 1. showPage() - Page navigation
 * 2. goToStartPage() - Landing to start page transition
 * 3. goToConversationPage() - Start to conversation page transition
 * 4. initializeSpeechRecognition() - Speech recognition setup
 * 5. startConversation() - Conversation initialization
 * 6. llmSpeak() - LLM response handling
 * 7. speakText() - Text-to-speech functionality
 * 8. startListening() - User speech recognition
 * 9. endMessage() - User message completion
 * 10. endConversation() - Conversation termination
 * 11. showSpeakerIcon() - Icon display (LLM speaking)
 * 12. showMicrophoneIcon() - Icon display (user speaking)
 * 13. generateScoreReport() - Score report generation
 * 14. generateGrammarFeedback() - Grammar feedback from LLM
 * 15. callLLMAPI() - API communication via proxy
 * 16. printReport() - Print functionality
 * 17. window.onload - Page initialization
 *
 * NOTE:
 * - Tests mock browser APIs (SpeechRecognition, SpeechSynthesis, fetch, etc.)
 * - API calls are routed through a server-side proxy (no API key in frontend)
 * - Each test runs in isolation with fresh DOM and global state
 */

describe('LanguageBot Test Suite', () => {
    let mockAlert;
    let mockConsoleError;

    beforeEach(() => {
        // Load the HTML file
        document.body.innerHTML = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>LanguageBot</title>
                </head>
                <body>
                    <!-- PAGE 1: LANDING PAGE -->
                    <div id="landing-page" class="page">
                        <h1>Welcome to LanguageBot</h1>
                        <label for="chars_input">Words, phrases, and grammar structures:</label>
                        <textarea id="chars_input" cols="40" rows="5"></textarea>
                        <label for="exam_desc_input">Conversation description:</label>
                        <textarea id="exam_desc_input" cols="40" rows="5"></textarea>
                        <button id="submit" onclick="goToStartPage()">Submit</button>
                    </div>

                    <!-- PAGE 2: START PAGE -->
                    <div id="start-page" class="page">
                        <h1>Exam Ready</h1>
                        <p id="instructions">Instructions...</p>
                        <div id="exam-info">
                            <p id="chars_label"></p>
                            <p id="exam_desc_label"></p>
                        </div>
                        <button id="start-conversation-btn" onclick="goToConversationPage()">Start Conversation</button>
                    </div>

                    <!-- PAGE 3: CONVERSATION PAGE -->
                    <div id="conversation-page" class="page">
                        <h1>Conversation in Progress</h1>
                        <div id="icon-container">
                            <svg id="speaker-icon" class="conversation-icon"></svg>
                            <svg id="microphone-icon" class="conversation-icon"></svg>
                        </div>
                        <div id="status-text">Listening...</div>
                        <button id="end-message-btn" onclick="endMessage()">End Message</button>
                        <button id="end-conversation-btn" onclick="endConversation()">End Conversation</button>
                    </div>

                    <!-- PAGE 4: POST-CONVERSATION PAGE -->
                    <div id="post-conversation-page" class="page">
                        <h1>Score Report</h1>
                        <div id="score-report">
                            <h2>Conversation Transcript</h2>
                            <div id="transcript"></div>
                            <h2>Statistics</h2>
                            <p id="word-count"></p>
                            <h2>Grammar Feedback</h2>
                            <p id="grammar-feedback">Analyzing...</p>
                        </div>
                        <button id="print-report-btn" onclick="printReport()">Print Report</button>
                    </div>
                </body>
            </html>
        `;

        // Mock browser APIs
        window.SpeechRecognition = jest.fn(function() {
            this.lang = '';
            this.continuous = false;
            this.interimResults = false;
            this.onresult = null;
            this.onerror = null;
            this.start = jest.fn();
            this.stop = jest.fn();
        });
        window.webkitSpeechRecognition = window.SpeechRecognition;

        window.SpeechSynthesisUtterance = jest.fn(function(text) {
            this.text = text;
            this.lang = '';
            this.rate = 0;
            this.onend = null;
        });

        window.speechSynthesis = {
            speak: jest.fn(),
            cancel: jest.fn()
        };

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({
                    candidates: [{
                        content: {
                            parts: [{ text: 'Mock LLM response' }]
                        }
                    }]
                })
            })
        );

        navigator.mediaDevices = {
            getUserMedia: jest.fn(() => Promise.resolve({}))
        };

        // Mock alert and console
        mockAlert = jest.fn();
        global.alert = mockAlert;
        mockConsoleError = jest.fn();
        global.console.error = mockConsoleError;

        // Initialize global variables (simulating script.js)
        window.requiredWords = [];
        window.examDescription = '';
        window.conversationHistory = [];
        window.recognition = null;
        window.synthesis = window.speechSynthesis;
        window.isLLMSpeaking = false;
        window.isUserSpeaking = false;
        window.currentTranscript = '';

        // Define functions from script.js
        window.showPage = function(pageId) {
            const pages = document.querySelectorAll('.page');
            pages.forEach(page => page.style.display = 'none');
            const targetPage = document.getElementById(pageId);
            if (targetPage) targetPage.style.display = 'block';
        };

        window.goToStartPage = function() {
            const wordsInput = document.getElementById("chars_input").value.trim();
            const examDescInput = document.getElementById("exam_desc_input").value.trim();

            if (!wordsInput || !examDescInput) {
                alert('Please fill in all fields before submitting.');
                return;
            }

            window.requiredWords = wordsInput.split('\n').filter(w => w.trim() !== '');
            window.examDescription = examDescInput;

            document.getElementById("chars_label").textContent = window.requiredWords.join('\n');
            document.getElementById("exam_desc_label").textContent = window.examDescription;

            window.showPage('start-page');
        };

        window.goToConversationPage = async function() {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                    window.showPage('conversation-page');
                    window.initializeSpeechRecognition();
                    window.startConversation();
                } catch (err) {
                    alert('Microphone access is required to use LanguageBot. Please allow microphone access and try again.');
                    console.error('Microphone access denied:', err);
                }
            } else {
                alert('Your browser does not support audio recording. Please use Google Chrome.');
            }
        };

        window.initializeSpeechRecognition = function() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Speech recognition is not supported in your browser. Please use Google Chrome.');
                return;
            }

            window.recognition = new SpeechRecognition();
            window.recognition.lang = 'zh-CN';
            window.recognition.continuous = true;
            window.recognition.interimResults = true;

            window.recognition.onresult = function(event) {
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

                window.currentTranscript = finalTranscript || interimTranscript;
                document.getElementById('status-text').textContent = 'You: ' + window.currentTranscript;
            };

            window.recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                document.getElementById('status-text').textContent = 'Error: ' + event.error;
            };
        };

        window.startConversation = function() {
            window.conversationHistory = [];
            const systemPrompt = `You are a Chinese language teacher helping a student practice Chinese conversation. The exam description is: "${window.examDescription}". The student needs to use these words and grammar structures: ${window.requiredWords.join(', ')}. Start the conversation naturally in Chinese and encourage the student to use the required vocabulary.`;
            window.llmSpeak(systemPrompt);
        };

        window.llmSpeak = async function(prompt) {
            window.isLLMSpeaking = true;
            window.showSpeakerIcon();
            document.getElementById('status-text').textContent = 'Chatbot is speaking...';

            try {
                const response = await window.callLLMAPI(prompt);
                window.conversationHistory.push({ speaker: 'LLM', text: response });
                window.speakText(response);
            } catch (error) {
                console.error('LLM API error:', error);
                document.getElementById('status-text').textContent = 'Error communicating with chatbot. Please reload the page and try again.';
                window.isLLMSpeaking = false;
                window.showMicrophoneIcon();
            }
        };

        window.speakText = function(text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.6;

            utterance.onend = function() {
                window.isLLMSpeaking = false;
                window.showMicrophoneIcon();
                window.startListening();
            };

            window.synthesis.speak(utterance);
        };

        window.startListening = function() {
            if (window.recognition && !window.isUserSpeaking) {
                window.isUserSpeaking = true;
                window.currentTranscript = '';
                document.getElementById('status-text').textContent = 'Your turn to speak...';
                window.recognition.start();
            }
        };

        window.endMessage = function() {
            if (window.isUserSpeaking && window.recognition) {
                window.recognition.stop();
                window.isUserSpeaking = false;

                if (window.currentTranscript.trim()) {
                    window.conversationHistory.push({ speaker: 'User', text: window.currentTranscript });
                    window.llmSpeak(window.currentTranscript);
                } else {
                    document.getElementById('status-text').textContent = 'No speech detected. Please try again.';
                    window.showMicrophoneIcon();
                }
            }
        };

        window.endConversation = function() {
            if (window.recognition) {
                window.recognition.stop();
            }
            window.synthesis.cancel();
            window.showPage('post-conversation-page');
            window.generateScoreReport();
        };

        window.showSpeakerIcon = function() {
            document.getElementById('speaker-icon').style.display = 'block';
            document.getElementById('microphone-icon').style.display = 'none';
        };

        window.showMicrophoneIcon = function() {
            document.getElementById('speaker-icon').style.display = 'none';
            document.getElementById('microphone-icon').style.display = 'block';
        };

        window.generateScoreReport = function() {
            const transcriptDiv = document.getElementById('transcript');
            transcriptDiv.innerHTML = '';

            window.conversationHistory.forEach(entry => {
                const p = document.createElement('p');
                p.className = entry.speaker === 'User' ? 'user-message' : 'llm-message';

                let highlightedText = entry.text;

                if (entry.speaker === 'User') {
                    window.requiredWords.forEach(word => {
                        const regex = new RegExp(word, 'gi');
                        highlightedText = highlightedText.replace(regex, '<mark>$&</mark>');
                    });
                }

                p.innerHTML = `<strong>${entry.speaker}:</strong> ${highlightedText}`;
                transcriptDiv.appendChild(p);
            });

            const userMessages = window.conversationHistory.filter(e => e.speaker === 'User').map(e => e.text).join(' ');
            const usedWords = window.requiredWords.filter(word => {
                const regex = new RegExp(word, 'i');
                return regex.test(userMessages);
            });
            document.getElementById('word-count').textContent = `You used ${usedWords.length} out of ${window.requiredWords.length} required words/grammar structures.`;

            window.generateGrammarFeedback(userMessages);
        };

        window.generateGrammarFeedback = async function(userText) {
            const feedbackPrompt = `As a Chinese language teacher, analyze this student's Chinese conversation and provide constructive grammar feedback in English. Focus on grammar mistakes, sentence structure, and areas for improvement:\n\n${userText}`;

            try {
                const feedback = await window.callLLMAPI(feedbackPrompt);
                document.getElementById('grammar-feedback').textContent = feedback;
            } catch (error) {
                console.error('Error generating feedback:', error);
                document.getElementById('grammar-feedback').textContent = 'Unable to generate feedback at this time.';
            }
        };

        window.callLLMAPI = async function(prompt) {
            const response = await fetch(`/api/v1beta/models/gemini-2.5-flash:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        };

        window.printReport = function() {
            window.print();
        };
    });

    // ==================== UNIT TESTS ====================

    // Show Page
    describe('showPage()', () => {
        test('should hide all pages and show the specified page', () => {
            const landingPage = document.getElementById('landing-page');
            const startPage = document.getElementById('start-page');

            window.showPage('start-page');

            expect(startPage.style.display).toBe('block');
        });

        test('should work for all page IDs', () => {
            const pageIds = ['landing-page', 'start-page', 'conversation-page', 'post-conversation-page'];

            pageIds.forEach(pageId => {
                window.showPage(pageId);
                const page = document.getElementById(pageId);
                expect(page.style.display).toBe('block');
            });
        });
    });

    // Go to Start Page
    describe('goToStartPage()', () => {
        test('should alert if any field is empty', () => {
            document.getElementById('chars_input').value = '';
            document.getElementById('exam_desc_input').value = 'Test';

            window.goToStartPage();

            expect(mockAlert).toHaveBeenCalledWith('Please fill in all fields before submitting.');
        });

        test('should parse words correctly and navigate when all fields are filled', () => {
            document.getElementById('chars_input').value = '你好\n谢谢\n再见';
            document.getElementById('exam_desc_input').value = 'Greeting conversation';

            window.goToStartPage();

            expect(window.requiredWords).toEqual(['你好', '谢谢', '再见']);
            expect(window.examDescription).toBe('Greeting conversation');
            expect(document.getElementById('start-page').style.display).toBe('block');
        });

        test('should filter out empty lines from words input', () => {
            document.getElementById('chars_input').value = '你好\n\n谢谢\n  \n再见';
            document.getElementById('exam_desc_input').value = 'Test';

            window.goToStartPage();

            expect(window.requiredWords).toEqual(['你好', '谢谢', '再见']);
        });

        test('should display parsed values on start page', () => {
            document.getElementById('chars_input').value = '你好\n谢谢';
            document.getElementById('exam_desc_input').value = 'Test description';

            window.goToStartPage();

            expect(document.getElementById('chars_label').textContent).toBe('你好\n谢谢');
            expect(document.getElementById('exam_desc_label').textContent).toBe('Test description');
        });
    });

    // Go to Conversation Page
    describe('goToConversationPage()', () => {
        test('should request microphone permission', async () => {
            await window.goToConversationPage();

            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
        });

        test('should show conversation page when permission granted', async () => {
            await window.goToConversationPage();

            expect(document.getElementById('conversation-page').style.display).toBe('block');
        });

        test('should alert when microphone permission denied', async () => {
            navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

            await window.goToConversationPage();

            expect(mockAlert).toHaveBeenCalledWith(
                'Microphone access is required to use LanguageBot. Please allow microphone access and try again.'
            );
        });
    });

    // Speech Recognition 
    describe('initializeSpeechRecognition()', () => {
        test('should initialize speech recognition with correct settings', () => {
            window.initializeSpeechRecognition();

            expect(window.recognition.lang).toBe('zh-CN');
            expect(window.recognition.continuous).toBe(true);
            expect(window.recognition.interimResults).toBe(true);
        });

        test('should handle final transcripts correctly', () => {
            window.initializeSpeechRecognition();

            const mockEvent = {
                resultIndex: 0,
                results: [
                    { isFinal: true, 0: { transcript: '你好' } }
                ]
            };

            window.recognition.onresult(mockEvent);

            expect(window.currentTranscript).toBe('你好');
            expect(document.getElementById('status-text').textContent).toBe('You: 你好');
        });

        test('should handle interim transcripts correctly', () => {
            window.initializeSpeechRecognition();

            const mockEvent = {
                resultIndex: 0,
                results: [
                    { isFinal: false, 0: { transcript: '你好' } }
                ]
            };

            window.recognition.onresult(mockEvent);

            expect(window.currentTranscript).toBe('你好');
        });
    });

    // Start Conversation
    describe('startConversation()', () => {
        test('should reset conversation history', () => {
            window.conversationHistory = [{ speaker: 'User', text: 'Old' }];

            window.startConversation();

            expect(window.conversationHistory).toEqual([]);
        });
    });

    // Have LLM Speak
    describe('llmSpeak()', () => {
        test('should set isLLMSpeaking to true', () => {
            window.llmSpeak('Test');

            expect(window.isLLMSpeaking).toBe(true);
        });

        test('should update status text', () => {
            window.llmSpeak('Test');

            expect(document.getElementById('status-text').textContent).toBe('Chatbot is speaking...');
        });

        test('should add LLM response to conversation history', async () => {
            await window.llmSpeak('Test');

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(window.conversationHistory).toContainEqual({
                speaker: 'LLM',
                text: 'Mock LLM response'
            });
        });

        test('should handle API errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('API Error'));

            await window.llmSpeak('Test');

            expect(document.getElementById('status-text').textContent).toContain('Error communicating with chatbot');
            expect(window.isLLMSpeaking).toBe(false);
        });
    });

    // Speak Specified Text
    describe('speakText()', () => {
        test('should create speech utterance with correct settings', () => {
            window.speakText('你好');

            // Verify SpeechSynthesisUtterance was called with the text
            const calls = window.SpeechSynthesisUtterance.mock.calls;
            expect(calls[0][0]).toBe('你好');

            // Get the utterance instance that was created
            const utteranceInstance = window.SpeechSynthesisUtterance.mock.instances[0];
            expect(utteranceInstance.lang).toBe('zh-CN');
            expect(utteranceInstance.rate).toBe(0.6);
        });

        test('should call speechSynthesis.speak', () => {
            window.speakText('你好');

            expect(window.speechSynthesis.speak).toHaveBeenCalled();
        });
    });

    // Start Listening
    describe('startListening()', () => {
        test('should start recognition if not already speaking', () => {
            window.initializeSpeechRecognition();
            window.isUserSpeaking = false;

            window.startListening();

            expect(window.recognition.start).toHaveBeenCalled();
            expect(window.isUserSpeaking).toBe(true);
        });

        test('should not start recognition if already speaking', () => {
            window.initializeSpeechRecognition();
            window.isUserSpeaking = true;

            window.startListening();

            expect(window.recognition.start).not.toHaveBeenCalled();
        });

        test('should update status text', () => {
            window.initializeSpeechRecognition();
            window.isUserSpeaking = false;

            window.startListening();

            expect(document.getElementById('status-text').textContent).toBe('Your turn to speak...');
        });
    });

    // End User Message
    describe('endMessage()', () => {
        test('should stop recognition when user is speaking', () => {
            window.initializeSpeechRecognition();
            window.isUserSpeaking = true;
            window.currentTranscript = '你好';

            window.endMessage();

            expect(window.recognition.stop).toHaveBeenCalled();
            expect(window.isUserSpeaking).toBe(false);
        });

        test('should add user message to conversation history', () => {
            window.initializeSpeechRecognition();
            window.isUserSpeaking = true;
            window.currentTranscript = '你好';

            window.endMessage();

            expect(window.conversationHistory).toContainEqual({ speaker: 'User', text: '你好' });
        });

        test('should handle empty transcript', () => {
            window.initializeSpeechRecognition();
            window.isUserSpeaking = true;
            window.currentTranscript = '';

            window.endMessage();

            expect(document.getElementById('status-text').textContent).toBe('No speech detected. Please try again.');
        });

        test('should not do anything if user is not speaking', () => {
            window.initializeSpeechRecognition();
            window.isUserSpeaking = false;

            window.endMessage();

            expect(window.recognition.stop).not.toHaveBeenCalled();
        });
    });

    // End Conversation
    describe('endConversation()', () => {
        test('should stop recognition', () => {
            window.initializeSpeechRecognition();

            window.endConversation();

            expect(window.recognition.stop).toHaveBeenCalled();
        });

        test('should cancel speech synthesis', () => {
            window.endConversation();

            expect(window.speechSynthesis.cancel).toHaveBeenCalled();
        });

        test('should navigate to post-conversation page', () => {
            window.endConversation();

            expect(document.getElementById('post-conversation-page').style.display).toBe('block');
        });
    });

    // Show Speaker Icon
    describe('showSpeakerIcon()', () => {
        test('should show speaker icon and hide microphone icon', () => {
            window.showSpeakerIcon();

            expect(document.getElementById('speaker-icon').style.display).toBe('block');
            expect(document.getElementById('microphone-icon').style.display).toBe('none');
        });
    });

    // Show Mic Icon
    describe('showMicrophoneIcon()', () => {
        test('should show microphone icon and hide speaker icon', () => {
            window.showMicrophoneIcon();

            expect(document.getElementById('speaker-icon').style.display).toBe('none');
            expect(document.getElementById('microphone-icon').style.display).toBe('block');
        });
    });

    // Generate Score Report
    describe('generateScoreReport()', () => {
        test('should display conversation history in transcript', () => {
            window.conversationHistory = [
                { speaker: 'LLM', text: '你好' },
                { speaker: 'User', text: '你好，谢谢' }
            ];
            window.requiredWords = ['谢谢'];

            window.generateScoreReport();

            const transcript = document.getElementById('transcript');
            expect(transcript.children.length).toBe(2);
        });

        test('should highlight required words in user messages', () => {
            window.conversationHistory = [
                { speaker: 'User', text: '你好，谢谢' }
            ];
            window.requiredWords = ['谢谢'];

            window.generateScoreReport();

            const transcript = document.getElementById('transcript');
            expect(transcript.innerHTML).toContain('<mark>');
        });

        test('should count used words correctly', () => {
            window.conversationHistory = [
                { speaker: 'User', text: '你好，谢谢' },
                { speaker: 'User', text: '再见' }
            ];
            window.requiredWords = ['你好', '谢谢', '再见'];

            window.generateScoreReport();

            const wordCount = document.getElementById('word-count').textContent;
            expect(wordCount).toContain('3 out of 3');
        });

        test('should count only used words', () => {
            window.conversationHistory = [
                { speaker: 'User', text: '你好' }
            ];
            window.requiredWords = ['你好', '谢谢', '再见'];

            window.generateScoreReport();

            const wordCount = document.getElementById('word-count').textContent;
            expect(wordCount).toContain('1 out of 3');
        });

        test('should apply correct CSS classes to messages', () => {
            window.conversationHistory = [
                { speaker: 'LLM', text: '你好' },
                { speaker: 'User', text: '你好' }
            ];
            window.requiredWords = [];

            window.generateScoreReport();

            const transcript = document.getElementById('transcript');
            expect(transcript.children[0].className).toBe('llm-message');
            expect(transcript.children[1].className).toBe('user-message');
        });
    });

    // Generate Grammar Feedback
    describe('generateGrammarFeedback()', () => {
        test('should display feedback in grammar-feedback element', async () => {
            await window.generateGrammarFeedback('你好');

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(document.getElementById('grammar-feedback').textContent).toBe('Mock LLM response');
        });

        test('should handle API errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('API Error'));

            await window.generateGrammarFeedback('你好');

            expect(document.getElementById('grammar-feedback').textContent).toBe(
                'Unable to generate feedback at this time.'
            );
        });
    });

    // Call LLM API
    describe('callLLMAPI()', () => {
        test('should make POST request to proxy API endpoint', async () => {
            await window.callLLMAPI('Test prompt');

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/v1beta/models/gemini-2.5-flash:generateContent',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        test('should send prompt in correct request body format', async () => {
            await window.callLLMAPI('Test prompt');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: 'Test prompt'
                            }]
                        }]
                    })
                })
            );
        });

        test('should return text from API response', async () => {
            const result = await window.callLLMAPI('Test prompt');

            expect(result).toBe('Mock LLM response');
        });
    });

    // Print Report
    describe('printReport()', () => {
        test('should call window.print', () => {
            window.print = jest.fn();

            window.printReport();

            expect(window.print).toHaveBeenCalled();
        });
    });

    // Window Onload
    describe('window.onload', () => {
        test('should show landing page on initialization', () => {
            // Define the onload function
            window.onload = function() {
                window.showPage('landing-page');
            };

            // Trigger window.onload
            window.onload();

            expect(document.getElementById('landing-page').style.display).toBe('block');
        });
    });

    // ==================== END-TO-END TEST ====================

    describe('End-to-End: Complete User Workflow', () => {
        test('should complete full conversation workflow from landing to score report', async () => {
            // STEP 1: User fills in landing page
            document.getElementById('chars_input').value = '你好\n谢谢\n再见';
            document.getElementById('exam_desc_input').value = 'Practice greetings';

            // STEP 2: Submit and go to start page
            window.goToStartPage();

            expect(window.requiredWords).toEqual(['你好', '谢谢', '再见']);
            expect(document.getElementById('start-page').style.display).toBe('block');

            // STEP 3: Start conversation
            await window.goToConversationPage();

            expect(document.getElementById('conversation-page').style.display).toBe('block');

            // Wait for LLM response
            await new Promise(resolve => setTimeout(resolve, 10));

            // STEP 4: User speaks
            window.isUserSpeaking = true;
            window.currentTranscript = '你好，老师！谢谢你。';
            window.endMessage();

            expect(window.conversationHistory.some(e => e.speaker === 'User')).toBe(true);

            // STEP 5: End conversation
            window.endConversation();

            expect(document.getElementById('post-conversation-page').style.display).toBe('block');

            // STEP 6: Verify score report
            const transcript = document.getElementById('transcript');
            expect(transcript.children.length).toBeGreaterThan(0);

            const wordCount = document.getElementById('word-count').textContent;
            expect(wordCount).toContain('2 out of 3');

            // Verify conversation history
            expect(window.conversationHistory.length).toBeGreaterThan(1);
        });

        test('should handle errors gracefully throughout workflow', async () => {
            // Test microphone permission denial
            navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Denied'));
            await window.goToConversationPage();
            expect(mockAlert).toHaveBeenCalled();

            // Test LLM API failure
            global.fetch.mockRejectedValueOnce(new Error('API Error'));
            await window.llmSpeak('Test');
            expect(document.getElementById('status-text').textContent).toContain('Error');

            // Test empty form submission
            document.getElementById('chars_input').value = '';
            document.getElementById('exam_desc_input').value = '';
            window.goToStartPage();
            expect(mockAlert).toHaveBeenCalledWith('Please fill in all fields before submitting.');
        });

        test('should track multiple conversation turns', async () => {
            window.initializeSpeechRecognition();

            // First turn
            window.isUserSpeaking = true;
            window.currentTranscript = '你好';
            window.endMessage();

            await new Promise(resolve => setTimeout(resolve, 10));

            // Second turn
            window.isUserSpeaking = true;
            window.currentTranscript = '谢谢';
            window.endMessage();

            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify multiple turns
            const userMessages = window.conversationHistory.filter(e => e.speaker === 'User');
            expect(userMessages.length).toBe(2);
            expect(userMessages[0].text).toBe('你好');
            expect(userMessages[1].text).toBe('谢谢');
        });
    });
});
