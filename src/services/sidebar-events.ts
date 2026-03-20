/** Minimal event bus to signal the sidebar to refetch documents. */
type Listener = () => void;
const listeners = new Set<Listener>();

export const sidebarEvents = {
  onRefresh(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emitRefresh() {
    listeners.forEach(fn => fn());
  },
};
