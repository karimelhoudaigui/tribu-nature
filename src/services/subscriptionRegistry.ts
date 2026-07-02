export type SubscriptionListener = () => void;
export type SubscriptionDisconnect = () => void | Promise<void>;
export type SubscriptionConnector = (notify: SubscriptionListener) => SubscriptionDisconnect;

type RegistryEntry = {
  listeners: Set<SubscriptionListener>;
  disconnect: SubscriptionDisconnect;
};

export function createSubscriptionRegistry() {
  const entries = new Map<string, RegistryEntry>();

  return {
    subscribe(key: string, listener: SubscriptionListener, connect: SubscriptionConnector) {
      let entry = entries.get(key);
      if (!entry) {
        const listeners = new Set<SubscriptionListener>();
        entry = {
          listeners,
          disconnect: connect(() => listeners.forEach((current) => current()))
        };
        entries.set(key, entry);
      }
      entry.listeners.add(listener);

      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const current = entries.get(key);
        if (!current) return;
        current.listeners.delete(listener);
        if (current.listeners.size === 0) {
          entries.delete(key);
          void current.disconnect();
        }
      };
    },
    size() {
      return entries.size;
    }
  };
}
