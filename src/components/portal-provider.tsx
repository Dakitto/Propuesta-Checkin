"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { DEFAULT_CONFIG, STORAGE_KEYS } from "@/lib/constants";
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
  setConfig: (value: Config) => void;
  importCounselors: (value: Counselor[]) => void;
  clearCounselors: () => void;
  addEvent: (value: Omit<EventItem, "id">) => void;
  removeEvent: (eventId: string) => void;
  toggleCheckin: (counselorId: string, eventId: string) => void;
  markChurchCheckins: (church: string, eventId: string) => void;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: PropsWithChildren) {
  const [storedConfig, setStoredConfig, configHydrated] = useLocalStorage<Config>(
    STORAGE_KEYS.config,
    DEFAULT_CONFIG,
  );
  const [counselors, setCounselors, counselorsHydrated] = useLocalStorage<Counselor[]>(
    STORAGE_KEYS.counselors,
    [],
  );
  const [events, setEvents, eventsHydrated] = useLocalStorage<EventItem[]>(
    STORAGE_KEYS.events,
    [],
  );
  const [checkins, setCheckins, checkinsHydrated] = useLocalStorage<Checkin[]>(
    STORAGE_KEYS.checkins,
    [],
  );
  const [session, setSession, sessionHydrated] = useLocalStorage<SessionData | null>(
    STORAGE_KEYS.session,
    null,
  );

  const config = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      ...storedConfig,
    }),
    [storedConfig],
  );

  const hydrated =
    configHydrated && counselorsHydrated && eventsHydrated && checkinsHydrated && sessionHydrated;

  const setConfig = useCallback(
    (value: Config) => {
      setStoredConfig({
        ...DEFAULT_CONFIG,
        ...value,
      });
    },
    [setStoredConfig],
  );

  const importCounselors = useCallback(
    (value: Counselor[]) => {
      setCounselors(value);
      setCheckins([]);
    },
    [setCheckins, setCounselors],
  );

  const clearCounselors = useCallback(() => {
    setCounselors([]);
    setCheckins([]);
  }, [setCheckins, setCounselors]);

  const addEvent = useCallback(
    (value: Omit<EventItem, "id">) => {
      setEvents((previousEvents) => [
        {
          id: createId("event"),
          ...value,
        },
        ...previousEvents,
      ]);
    },
    [setEvents],
  );

  const removeEvent = useCallback(
    (eventId: string) => {
      setEvents((previousEvents) => previousEvents.filter((event) => event.id !== eventId));
      setCheckins((previousCheckins) =>
        previousCheckins.filter((checkin) => checkin.eventId !== eventId),
      );
    },
    [setCheckins, setEvents],
  );

  const toggleCheckin = useCallback(
    (counselorId: string, eventId: string) => {
      setCheckins((previousCheckins) => {
        const existingCheckin = previousCheckins.find(
          (checkin) => checkin.counselorId === counselorId && checkin.eventId === eventId,
        );

        if (existingCheckin) {
          return previousCheckins.filter((checkin) => checkin.id !== existingCheckin.id);
        }

        return [
          ...previousCheckins,
          {
            id: createId("checkin"),
            counselorId,
            eventId,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    },
    [setCheckins],
  );

  const markChurchCheckins = useCallback(
    (church: string, eventId: string) => {
      setCheckins((previousCheckins) => {
        const existingCounselorIds = new Set(
          previousCheckins
            .filter((checkin) => checkin.eventId === eventId)
            .map((checkin) => checkin.counselorId),
        );

        const newCheckins = counselors
          .filter((counselor) => counselor.iglesia === church)
          .filter((counselor) => !existingCounselorIds.has(counselor.id))
          .map((counselor) => ({
            id: createId("checkin"),
            counselorId: counselor.id,
            eventId,
            timestamp: new Date().toISOString(),
          }));

        return [...previousCheckins, ...newCheckins];
      });
    },
    [counselors, setCheckins],
  );

  const login = useCallback(
    (username: string, password: string) => {
      const isValid = username === config.username && password === config.password;

      if (isValid) {
        setSession({
          username,
          loggedInAt: new Date().toISOString(),
        });
      }

      return isValid;
    },
    [config.password, config.username, setSession],
  );

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

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
      removeEvent,
      session,
      setConfig,
      toggleCheckin,
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
