# AI Integration Testing Guide

This guide provides step-by-step instructions for testing the AI integration in CertFlow.

## Prerequisites

Before testing, ensure you have:
- The application running locally (`npm run dev`)
- Access to at least one AI provider (API key or local setup)

## Testing Phases

### Phase 1: Mock Provider Testing (No Setup Required)

**Purpose:** Verify basic functionality without external dependencies.

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Navigate to AI Tutor**
   - Open http://localhost:3000/tutor
   - Verify you see "Mock Provider (Demo)" badge (yellow)
   - Verify demo mode banner is displayed

3. **Test basic chat**
   - Type a message: "What is machine learning?"
   - Press Enter or click Send
   - Verify you receive a pre-defined response
   - Verify the response appears in the chat history

4. **Test loading states**
   - Send another message
   - Verify the input is disabled during loading
   - Verify the send button shows loading state

**Expected Results:**
- ✅ Mock provider works without configuration
- ✅ Messages are sent and received
- ✅ Loading states are visible
- ✅ No errors in console

---

### Phase 2: OpenAI Integration Testing

**Prerequisites:**
- OpenAI API key (get from https://platform.openai.com/api-keys)

#### 2.1 Configuration

1. **Navigate to Settings**
   - Go to http://localhost:3000/settings
   - Select "OpenAI" from provider dropdown

2. **Enter API Key**
   - Paste your OpenAI API key
   - Select a model (e.g., "gpt-3.5-turbo")
   - Verify the key is saved (check localStorage in DevTools)

3. **Return to Tutor**
   - Navigate back to /tutor
   - Verify the status badge shows "OpenAI" (green)
   - Verify the banner shows "AI Tutor Active: Using OpenAI (gpt-3.5-turbo)"

#### 2.2 Basic Functionality

1. **Test simple query**
   - Ask: "Explain supervised learning in 2 sentences"
   - Verify you receive a real AI response
   - Verify the response is contextually relevant

2. **Test conversation context**
   - Follow up: "Give me an example"
   - Verify the AI understands the context from previous message
   - Verify conversation history is maintained

3. **Test certification-specific query**
   - Ask: "What topics are covered in AWS Machine Learning certification?"
   - Verify the response is relevant to the certification

#### 2.3 Error Handling

1. **Test invalid API key**
   - Go to Settings
   - Enter an invalid key (e.g., "sk-invalid")
   - Return to Tutor and send a message
   - **Expected:** Error message about invalid API key
   - **Expected:** Retry button appears

2. **Test retry functionality**
   - Click the "Retry" button
   - **Expected:** Same error (key still invalid)
   - **Expected:** Retry counter decrements (e.g., "Retry (1 left)")

3. **Test max retries**
   - Keep clicking retry until max attempts reached
   - **Expected:** "Maximum retries reached" message
   - **Expected:** No retry button visible

4. **Test rate limiting** (if applicable)
   - Send many requests quickly
   - **Expected:** Rate limit error message with guidance

#### 2.4 Model Switching

1. **Switch to GPT-4**
   - Go to Settings
   - Change model to "gpt-4"
   - Return to Tutor
   - Send a complex query
   - Verify the response quality/style matches GPT-4

2. **Verify model persistence**
   - Refresh the page
   - Verify the selected model is still active

---

### Phase 3: Anthropic (Claude) Integration Testing

**Prerequisites:**
- Anthropic API key (get from https://console.anthropic.com/)

#### 3.1 Configuration

1. **Switch to Anthropic**
   - Go to Settings
   - Select "Anthropic (Claude)" from dropdown
   - Enter your Anthropic API key
   - Select a model (e.g., "claude-3-sonnet-20240229")

2. **Verify configuration**
   - Return to Tutor
   - Verify status badge shows "Anthropic (Claude)"
   - Verify active AI banner

#### 3.2 Functionality Testing

1. **Test basic query**
   - Ask: "Explain the difference between classification and regression"
   - Verify Claude's response style (typically more detailed)

2. **Test long-form response**
   - Ask: "Write a detailed explanation of neural networks"
   - Verify Claude handles longer responses well

3. **Test context window**
   - Have a multi-turn conversation (5+ messages)
   - Verify context is maintained throughout

---

### Phase 4: Google AI (Gemini) Integration Testing

**Prerequisites:**
- Google AI API key (get from https://makersuite.google.com/app/apikey)

#### 4.1 Configuration

1. **Switch to Google AI**
   - Go to Settings
   - Select "Google AI (Gemini)"
   - Enter your Google AI API key
   - Select "gemini-pro" model

2. **Verify configuration**
   - Return to Tutor
   - Verify status badge shows "Google AI (Gemini)"

#### 4.2 Functionality Testing

1. **Test basic query**
   - Ask: "What is feature engineering?"
   - Verify Gemini's response

2. **Test multimodal capabilities** (if supported)
   - Test with complex queries
   - Verify response quality

---

### Phase 5: Ollama (Local) Integration Testing

**Prerequisites:**
- Ollama installed locally (https://ollama.ai/)
- At least one model pulled (e.g., `ollama pull llama2`)

#### 5.1 Setup

1. **Start Ollama**
   ```bash
   ollama serve
   ```

2. **Verify Ollama is running**
   ```bash
   curl http://localhost:11434/api/tags
   ```

#### 5.2 Configuration

1. **Switch to Ollama**
   - Go to Settings
   - Select "Ollama (Local)"
   - No API key required
   - Enter model name (e.g., "llama2")
   - Optionally set custom base URL if not default

2. **Verify configuration**
   - Return to Tutor
   - Verify status badge shows "Ollama (Local)"
   - Verify banner shows active without API key requirement

#### 5.3 Functionality Testing

1. **Test local inference**
   - Ask: "What is machine learning?"
   - Verify response from local model
   - Note: Response time may be slower depending on hardware

2. **Test offline capability**
   - Disconnect from internet
   - Send a message
   - Verify it still works (truly local)

3. **Test different models**
   - Switch to another model (e.g., "mistral")
   - Verify model switching works

---

### Phase 6: Cross-Provider Testing

**Purpose:** Verify seamless switching between providers.

1. **Switch between providers**
   - Start with OpenAI, send a message
   - Switch to Anthropic, send a message
   - Switch to Google AI, send a message
   - Switch to Ollama, send a message
   - Switch back to Mock

2. **Verify state management**
   - Each switch should maintain its own configuration
   - No cross-contamination of settings
   - Chat history persists across switches

3. **Test rapid switching**
   - Switch providers multiple times quickly
   - Verify no race conditions or errors

---

### Phase 7: Edge Cases and Error Scenarios

#### 7.1 Network Issues

1. **Test offline behavior**
   - Disconnect internet (except for Ollama)
   - Try to send a message
   - **Expected:** Network error message
   - **Expected:** Retry button appears

2. **Test slow network**
   - Throttle network in DevTools
   - Send a message
   - Verify loading state persists
   - Verify eventual response or timeout

#### 7.2 Invalid Configurations

1. **Test missing API key**
   - Select a provider that requires API key
   - Don't enter a key
   - Try to send a message
   - **Expected:** "API Key Required" error

2. **Test invalid model**
   - Enter a non-existent model name
   - Try to send a message
   - **Expected:** "Model Not Available" error

3. **Test malformed base URL** (for Ollama)
   - Enter invalid URL (e.g., "not-a-url")
   - Try to send a message
   - **Expected:** Network or connection error

#### 7.3 Quota and Limits

1. **Test quota exceeded** (if you have a limited account)
   - Use up your quota
   - Try to send a message
   - **Expected:** "Quota Exceeded" error with guidance

2. **Test rate limiting**
   - Send many requests rapidly
   - **Expected:** Rate limit error after threshold

---

### Phase 8: User Experience Testing

#### 8.1 Loading States

1. **Verify loading indicators**
   - Input disabled during request
   - Send button shows loading spinner
   - "Thinking..." text appears

2. **Verify loading duration**
   - Different providers have different response times
   - Ensure UI remains responsive

#### 8.2 Error Messages

1. **Verify error clarity**
   - Each error type shows specific guidance
   - Links to Settings work correctly
   - Markdown formatting renders properly

2. **Verify error recovery**
   - After fixing configuration, errors should resolve
   - Retry functionality should work

#### 8.3 Accessibility

1. **Keyboard navigation**
   - Tab through all interactive elements
   - Enter key sends messages
   - Shift+Enter creates new line

2. **Screen reader testing** (if possible)
   - Verify ARIA labels are present
   - Verify messages are announced

---

### Phase 9: Performance Testing

1. **Test long conversations**
   - Have a conversation with 20+ messages
   - Verify performance doesn't degrade
   - Verify scroll behavior

2. **Test large responses**
   - Ask for a very detailed explanation
   - Verify large text renders correctly
   - Verify no UI freezing

3. **Test rapid messaging**
   - Send multiple messages quickly
   - Verify queue handling
   - Verify no race conditions

---

### Phase 10: Persistence Testing

1. **Test localStorage persistence**
   - Configure a provider
   - Refresh the page
   - Verify settings are restored

2. **Test chat history persistence**
   - Have a conversation
   - Refresh the page
   - **Note:** Currently chat history is NOT persisted (by design)
   - Verify fresh start after refresh

3. **Test settings migration**
   - Clear localStorage
   - Verify app defaults to mock provider
   - Verify no errors

---

## Automated Testing

Run the full test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- app/tutor/__tests__/page.test.tsx
```

**Expected Results:**
- All tests should pass
- Coverage should be >80% for critical paths

---

## Common Issues and Solutions

### Issue: "API Key Required" error even with key set

**Solution:**
1. Check localStorage in DevTools (Application > Local Storage)
2. Verify the key is stored correctly
3. Try clearing localStorage and re-entering the key
4. Verify the key format matches provider requirements

### Issue: Ollama connection refused

**Solution:**
1. Verify Ollama is running: `ollama serve`
2. Check the base URL in settings (default: http://localhost:11434)
3. Verify firewall isn't blocking the connection
4. Try: `curl http://localhost:11434/api/tags`

### Issue: Rate limit errors

**Solution:**
1. Wait a few minutes before retrying
2. Check your provider's rate limits
3. Consider upgrading your plan
4. Use a different provider temporarily

### Issue: Slow responses

**Solution:**
1. For Ollama: Check your hardware specs
2. For API providers: Check your internet connection
3. Try a smaller/faster model
4. Check provider status pages

---

## Testing Checklist

Use this checklist to ensure comprehensive testing:

### Basic Functionality
- [ ] Mock provider works without configuration
- [ ] Can send and receive messages
- [ ] Loading states display correctly
- [ ] Chat history displays properly

### Provider Configuration
- [ ] Can switch between providers
- [ ] Settings persist after refresh
- [ ] API keys are stored securely
- [ ] Model selection works

### OpenAI Integration
- [ ] Can connect with valid API key
- [ ] Receives real AI responses
- [ ] Context is maintained
- [ ] Model switching works

### Anthropic Integration
- [ ] Can connect with valid API key
- [ ] Claude responses are received
- [ ] Long-form responses work

### Google AI Integration
- [ ] Can connect with valid API key
- [ ] Gemini responses are received
- [ ] Model selection works

### Ollama Integration
- [ ] Can connect to local Ollama
- [ ] No API key required
- [ ] Local inference works
- [ ] Works offline

### Error Handling
- [ ] Invalid API key shows error
- [ ] Missing API key shows error
- [ ] Rate limit error displays
- [ ] Network error displays
- [ ] Retry button appears
- [ ] Max retries message shows

### User Experience
- [ ] Keyboard shortcuts work
- [ ] Responsive on mobile
- [ ] Dark mode works
- [ ] Accessibility features work

### Performance
- [ ] Long conversations work
- [ ] Large responses render
- [ ] No memory leaks
- [ ] Smooth scrolling

---

## Reporting Issues

If you encounter issues during testing:

1. **Check the browser console** for errors
2. **Check the network tab** for failed requests
3. **Verify your configuration** in Settings
4. **Try a different provider** to isolate the issue
5. **Check provider status pages** for outages

---

## Next Steps After Testing

Once testing is complete:

1. **Document any issues found**
2. **Verify all critical paths work**
3. **Test on different browsers** (Chrome, Firefox, Safari)
4. **Test on different devices** (desktop, tablet, mobile)
5. **Consider adding more automated tests** for edge cases found

---

## Success Criteria

The AI integration is considered successful when:

✅ All 5 providers work correctly
✅ Error handling is clear and helpful
✅ Settings persist correctly
✅ No console errors during normal use
✅ Performance is acceptable
✅ User experience is smooth
✅ All automated tests pass

---

**Happy Testing! 🧪**