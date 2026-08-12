import { Checkin, Counselor } from "@/types";

export function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function createId(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDate(date: string): string {
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
  }).format(new Date(`${date}T00:00:00`));
}

export function parseCounselorsCsv(content: string): Counselor[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [iglesia = "", nombre = "", telefono = "", edadRaw = ""] = line.split(",");
      const edadTrimmed = edadRaw.trim();
      const edad = edadTrimmed ? Number.parseInt(edadTrimmed, 10) : null;

      return {
        id: createId("counselor"),
        iglesia: iglesia.trim(),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        edad: Number.isNaN(edad) ? null : edad,
      };
    })
    .filter((counselor) => counselor.iglesia || counselor.nombre || counselor.telefono);
}

export function isLikelyFemale(fullName: string): boolean {
  const firstName = fullName.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  return firstName.endsWith("A");
}

export function getUniqueCounselorCount(checkins: Checkin[]): number {
  return new Set(checkins.map((checkin) => checkin.counselorId)).size;
}

export function getAttendanceFrequency(counselors: Counselor[], checkins: Checkin[]) {
  const eventCountByCounselor = new Map<string, Set<string>>();

  checkins.forEach((checkin) => {
    if (!eventCountByCounselor.has(checkin.counselorId)) {
      eventCountByCounselor.set(checkin.counselorId, new Set());
    }

    eventCountByCounselor.get(checkin.counselorId)?.add(checkin.eventId);
  });

  return counselors.reduce(
    (accumulator, counselor) => {
      const totalEvents = eventCountByCounselor.get(counselor.id)?.size ?? 0;

      if (totalEvents === 1) accumulator.once += 1;
      else if (totalEvents === 2) accumulator.twice += 1;
      else if (totalEvents >= 3) accumulator.threePlus += 1;
      else accumulator.never += 1;

      return accumulator;
    },
    { once: 0, twice: 0, threePlus: 0, never: 0 },
  );
}
