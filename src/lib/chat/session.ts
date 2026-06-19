type SessionState = {
  isGenerating: boolean;
  pendingUserMessages: string[];
};

const session: SessionState = {
  isGenerating: false,
  pendingUserMessages: [],
};

export function getChatSession() {
  return session;
}

export function queueUserMessage(text: string) {
  if (session.isGenerating) {
    session.pendingUserMessages.push(text);
    return true;
  }
  return false;
}

export function drainPendingMessages() {
  const pending = [...session.pendingUserMessages];
  session.pendingUserMessages = [];
  return pending;
}

export function setGenerating(value: boolean) {
  session.isGenerating = value;
}
