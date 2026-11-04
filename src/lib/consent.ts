"use client";

import { useSyncExternalStore } from "react";

// The visitor's answer to the cookie banner, kept in localStorage. The Google
// tag only loads on "granted", so nothing is set before they say yes.
const KEY = "consent.v1";

export type ConsentChoice = "granted" | "denied";

// null = they haven't answered yet, which is what shows the banner.
let choice: ConsentChoice | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

// try/catch because localStorage can throw (private mode, blocked cookies). Then
// the answer only lasts until the next page load, and the banner asks again.
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "granted" || saved === "denied") choice = saved;
  } catch {
    choice = null;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

// Consent withdrawn in another tab: the tag running here can only be stopped by
// reloading, same as in resetConsent().
function handleStorage(event: StorageEvent) {
  if (event.key !== KEY) return;
  if (choice === "granted" && event.newValue !== "granted") location.reload();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  hydrate();
  return choice;
}

// Server render and the first client render: act as if they said no, so there's
// no banner flash for someone who already answered, and no tag before we know.
function getServerSnapshot(): ConsentChoice | null {
  return "denied";
}

export function useConsent() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setConsent(next: ConsentChoice) {
  choice = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Unavailable storage: the in-memory answer still holds for this page.
  }
  notify();
}

// Google's _gcl_* cookies sit on the site's domain, or on the host on localhost.
function deleteAdCookies() {
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (!name.startsWith("_gcl")) continue;
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`;
  }
}

// The footer's „Бисквитки“ link: forget the answer so the banner asks again.
// This withdraws consent straight away, and a tag that's already running can
// only be stopped by reloading the page.
export function resetConsent() {
  hydrate();
  const tagIsRunning = choice === "granted";

  choice = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing saved to remove.
  }
  deleteAdCookies();

  if (tagIsRunning) location.reload();
  else notify();
}
