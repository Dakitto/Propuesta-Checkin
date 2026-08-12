"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DEFAULT_CONFIG } from "@/lib/constants";
import { createId } from "@/lib/utils";
import { Checkin, Config, Counselor, EventItem, SessionData } from "@/types";

type PortalContextValue = {
  config: Config;
  counselors: Counselor[];
  events: EventItem[];
  checkins: Checkin[];
  session: SessionData | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  setConfig: (value: Config) => Promise<void>;
  importCounselors: (value: Counselor[]) => Promise<void>;
  clearCounselors: () => Promise<void>;
  addCounselor: (value: Omit<Counselor, "id">) => Promise<void>;
  updateCounselor: (value: Counselor) => Promise<void>;
  removeCounselor: (counselorId: string) => Promise<void>;
  addEvent: (value: Omit<EventItem, "id">) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  toggleCheckin: (counselorId: string, eventId: string) => Promise<void>;
  markChurchCheckins: (church: string, eventId: string) => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const PortalContext = createContext<PortalContextValue | null>(null);

type PortalSnapshot = {
  config: Config;
  counselors: Counselor[];
  events: EventItem[];
  checkins: Checkin[];
};

export function PortalProvider({ children }: PropsWithChildren) {
  const [config, setConfigState] = useState<Config>(DEFAULT_CONFIG);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [portalHydrated, setPortalHydrated] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);

  const hydrated = sessionHydrated && (session ? portalHydrated : true);

  const applySnapshot = useCallback((snapshot: PortalSnapshot) => {
    setConfigState({
      ...DEFAULT_CONFIG,
      ...snapshot.config,
    });
    setCounselors(snapshot.counselors);
    setEvents(snapshot.events);
    setCheckins(snapshot.checkins);
  }, []);

  const requestWithRetry = useCallback(
    async (input: RequestInfo | URL, init: RequestInit, fallbackMessage: string) => {
      let lastError: Error | null = null;

      for (const delayMs of [0, 300, 900]) {
        if (delayMs) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        try {
          const response = await fetch(input, init);
          if (!response.ok) {
            const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(errorBody?.message || fallbackMessage);
          }

          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(fallbackMessage);
        }
      }

      throw lastError ?? new Error(fallbackMessage);
    },
    [],
  );

  const loadSnapshot = useCallback(async () => {
    const response = await requestWithRetry(
      "/api/portal",
      {
        method: "GET",
        cache: "no-store",
      },
      "No se pudo cargar el estado del portal",
    );

    const snapshot = (await response.json()) as PortalSnapshot;
    applySnapshot(snapshot);
  }, [applySnapshot, requestWithRetry]);

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("No se pudo validar la sesión");
    }

    const data = (await response.json()) as { session: SessionData | null };
    setSession(data.session);
  }, []);

  const runAction = useCallback(
    async <T extends object | undefined>(action: string, payload?: T) => {
      const response = await requestWithRetry(
        "/api/portal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            payload === undefined
              ? { action }
              : {
                  action,
                  payload,
                },
          ),
        },
        "No se pudo guardar la informacion",
      );

      const snapshot = (await response.json()) as PortalSnapshot;
      applySnapshot(snapshot);
    },
    [applySnapshot, requestWithRetry],
  );

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await loadSession();
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setSessionHydrated(true);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [loadSession]);

  useEffect(() => {
    let active = true;

    if (!sessionHydrated) return;
    if (!session) {
      setPortalHydrated(false);
      return;
    }

    const run = async () => {
      try {
        await loadSnapshot();
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setPortalHydrated(true);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [loadSnapshot, session, sessionHydrated]);

  useEffect(() => {
    if (!session) return undefined;

    const intervalId = window.setInterval(() => {
      void loadSnapshot().catch(() => {
        // Polling keeps in-memory state fresh after temporary disconnections.
      });
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadSnapshot, session]);

  const setConfig = useCallback(
    async (value: Config) => {
      await runAction("setConfig", {
        config: {
          ...DEFAULT_CONFIG,
          ...value,
        },
      });
    },
    [runAction],
  );

  const importCounselors = useCallback(
    async (value: Counselor[]) => {
      await runAction("importCounselors", { counselors: value });
    },
    [runAction],
  );

  const clearCounselors = useCallback(() => {
    return runAction("clearCounselors");
  }, [runAction]);

  const addCounselor = useCallback(
    async (value: Omit<Counselor, "id">) => {
      await runAction("addCounselor", {
        counselor: {
          id: createId("counselor"),
          ...value,
        },
      });
    },
    [runAction],
  );

  const updateCounselor = useCallback(
    async (value: Counselor) => {
      await runAction("updateCounselor", {
        counselor: value,
      });
    },
    [runAction],
  );

  const removeCounselor = useCallback(
    async (counselorId: string) => {
      await runAction("removeCounselor", {
        counselorId,
      });
    },
    [runAction],
  );

  const addEvent = useCallback(
    async (value: Omit<EventItem, "id">) => {
      await runAction("addEvent", {
        event: {
          id: createId("event"),
          ...value,
        },
      });
    },
    [runAction],
  );

  const removeEvent = useCallback(
    async (eventId: string) => {
      await runAction("removeEvent", { eventId });
    },
    [runAction],
  );

  const toggleCheckin = useCallback(
    async (counselorId: string, eventId: string) => {
      await runAction("toggleCheckin", {
        counselorId,
        eventId,
      });
    },
    [runAction],
  );

  const markChurchCheckins = useCallback(
    async (church: string, eventId: string) => {
      await runAction("markChurchCheckins", {
        church,
        eventId,
      });
    },
    [runAction],
  );

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { session: SessionData };
    setSession(data.session);
    setPortalHydrated(false);
    await loadSnapshot();
    setPortalHydrated(true);
    return true;
  }, [loadSnapshot]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/session", {
      method: "DELETE",
    });
    setSession(null);
    setPortalHydrated(false);
  }, []);

  const value = useMemo<PortalContextValue>(
    () => ({
      config,
      counselors,
      events,
      checkins,
      session,
      hydrated,
      isAuthenticated: Boolean(session),
      setConfig,
      importCounselors,
      addCounselor,
      updateCounselor,
      removeCounselor,
      clearCounselors,
      addEvent,
      removeEvent,
      toggleCheckin,
      markChurchCheckins,
      login,
      logout,
    }),
    [
      addEvent,
      addCounselor,
      checkins,
      clearCounselors,
      config,
      counselors,
      events,
      hydrated,
      importCounselors,
      login,
      logout,
      markChurchCheckins,
      removeCounselor,
      removeEvent,
      session,
      setConfig,
      toggleCheckin,
      updateCounselor,
    ],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const context = useContext(PortalContext);

  if (!context) {
    throw new Error("usePortal debe usarse dentro de PortalProvider");
  }

  return context;
}
