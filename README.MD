# LanguageBot

LanguageBot is a website that allows you to practice having Chinese conversations with an LLM.

A live version of LanguageBot can be accessed at [LanguageBot website](https://ryaalbr.github.io/LanguageBot/index.html).

## Installation

If you want to run LanguageBot locally, first clone the github repo:
```
git clone https://github.com/ryaalbr/LanguageBot.git
```
Then, run the webapp on localhost:
```
python3 -m http.server 8000
```

## How to Use

You will need a Gemini API Key in order to use LanguageBot. To get one, go to [Google AI Studio](https://aistudio.google.com/app/apikey). 

### Landing Page

On the landing page, type in your API key, the vocabulary you want to use, and the description of the conversation you want to have. Click the "Submit" button once you have filled out all of the required information.

The API key will be used to access the model gemini-2.5-flash, and the description you type in will be used to prompt the model on what it should talk about.

### Start Page

This page will tell you the instructions for the conversation. Click the "Start Conversation" button when you are ready to converse.

### Conversation Page

Pay attention to what the LLM is saying and respond back. When you are done responding to the LLM, click the "End Message" button. Your responses will be transcribed and prompted into the model, to which the model will reply.

Make sure to use the required vocabulary throughout your entire conversation. Once you are done conversing, click the "End Conversation" button.

### Report Page

After your conversation, you will be given a report on your performance. This report will include a transcript of your conversation, a score denoting how much of the desired vocabulary you used, and written grammar feedback from an LLM. 

## Next Steps/Issues

- Send report to email
- Settings for language level
- Expand to other languages (Japanese, Spanish)
- Account setup
- Creating exam links