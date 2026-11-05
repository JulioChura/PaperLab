/**
 * Notificaciones de PaperLab:
 * - Toasts dentro de la app (siempre, accesibles con aria-live).
 * - Notificaciones del sistema (Notification API + Service Worker) cuando el alumno las activa
 *   y la pestaña no está a la vista: logros, subidas de nivel y misión del día.
 */
import { useSyncExternalStore } from 'react';

export type ToastKind = 'achievement' | 'mission' | 'level' | 'xp' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  icon?: string;
  xp?: number;
}

type Listener = () => void;
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export function pushToast(t: Omit<Toast, 'id'>, ttl = 5200): number {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { ...t, id }];
  emit();
  window.setTimeout(() => dismissToast(id), ttl);
  return id;
}

export function dismissToast(id: number) {
  const before = toasts.length;
  toasts = toasts.filter((t) => t.id !== id);
  if (toasts.length !== before) emit();
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
}

// ------------------------------------------------------------------ notificaciones del sistema
export const nativeSupported = () => typeof window !== 'undefined' && 'Notification' in window;

let swReg: ServiceWorkerRegistration | null = null;

/** Registra el Service Worker mínimo que permite mostrar notificaciones en Android/Chrome. */
export async function registerNotificationWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    swReg = await navigator.serviceWorker.register('/sw.js');
  } catch {
    swReg = null;
  }
}

export async function requestNativePermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!nativeSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function showNative(title: string, body?: string, tag = 'paperlab'): Promise<boolean> {
  if (!nativeSupported() || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = { body, tag, icon: '/favicon.svg', badge: '/favicon.svg' };
  try {
    const reg = swReg ?? (await navigator.serviceWorker?.getRegistration?.()) ?? null;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/** Toast siempre; además notificación del sistema si están activadas y la pestaña está oculta (o `force`). */
export function notify(t: Omit<Toast, 'id'>, opts: { native?: boolean; force?: boolean } = {}) {
  pushToast(t);
  if (opts.native && (opts.force || document.visibilityState !== 'visible')) {
    void showNative(`${t.icon ? `${t.icon} ` : ''}${t.title}`, t.body);
  }
}
