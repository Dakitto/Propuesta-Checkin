import { Config } from "@/types";

export const STORAGE_KEYS = {
  config: "checkin-config",
  counselors: "checkin-counselors",
  events: "checkin-events",
  checkins: "checkin-checkins",
  session: "checkin-session",
} as const;

export const DEFAULT_CONFIG: Config = {
  siteName: "Portal de Check-In",
  backgroundImage: "",
  username: "admin",
  password: "checkin2024",
};
