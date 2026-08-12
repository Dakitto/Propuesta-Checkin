export type Config = {
  siteName: string;
  backgroundImage: string;
};

export type Counselor = {
  id: string;
  iglesia: string;
  nombre: string;
  telefono: string;
  edad: number | null;
};

export type EventItem = {
  id: string;
  nombre: string;
  fecha: string;
  descripcion: string;
};

export type Checkin = {
  id: string;
  counselorId: string;
  eventId: string;
  timestamp: string;
};

export type SessionData = {
  username: string;
  role: "admin" | "checker";
  loggedInAt: string;
};
