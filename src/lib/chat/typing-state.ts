const typingStates = new Map<string, boolean>();
const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export function setUserTyping(userId: string, typing: boolean) {
  typingStates.set(userId, typing);
  const existingTimeout = typingTimeouts.get(userId);
  if (existingTimeout) clearTimeout(existingTimeout);

  if (typing) {
    const timeout = setTimeout(() => {
      typingStates.set(userId, false);
    }, 4000);
    typingTimeouts.set(userId, timeout);
  }
}

export function isUserTyping(userId: string) {
  return typingStates.get(userId) ?? false;
}
