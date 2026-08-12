import { NextResponse } from "next/server";

import { DEFAULT_CONFIG } from "@/lib/constants";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { Checkin, Config, Counselor, EventItem } from "@/types";

type ConfigRow = {
  id: number;
  site_name: string;
  background_image: string;
  username: string;
  password: string;
};

type CounselorRow = {
  id: string;
  iglesia: string;
  nombre: string;
  telefono: string;
  edad: number | null;
};

type EventRow = {
  id: string;
  nombre: string;
  fecha: string;
  descripcion: string;
};

type CheckinRow = {
  id: string;
  counselor_id: string;
  event_id: string;
  timestamp: string;
};

type PortalSnapshot = {
  config: Config;
  counselors: Counselor[];
  events: EventItem[];
  checkins: Checkin[];
};

type PortalActionBody =
  | { action: "setConfig"; payload: { config: Config } }
  | { action: "importCounselors"; payload: { counselors: Counselor[] } }
  | { action: "clearCounselors" }
  | { action: "addCounselor"; payload: { counselor: Omit<Counselor, "id"> & { id?: string } } }
  | { action: "updateCounselor"; payload: { counselor: Counselor } }
  | { action: "removeCounselor"; payload: { counselorId: string } }
  | { action: "addEvent"; payload: { event: Omit<EventItem, "id"> & { id?: string } } }
  | { action: "removeEvent"; payload: { eventId: string } }
  | { action: "toggleCheckin"; payload: { counselorId: string; eventId: string } }
  | { action: "markChurchCheckins"; payload: { church: string; eventId: string } };

const mapConfigRow = (row: ConfigRow | null): Config => {
  if (!row) return DEFAULT_CONFIG;

  return {
    siteName: row.site_name,
    backgroundImage: row.background_image,
    username: row.username,
    password: row.password,
  };
};

const mapEventRows = (rows: EventRow[]): EventItem[] =>
  rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    fecha: row.fecha,
    descripcion: row.descripcion,
  }));

const mapCheckinRows = (rows: CheckinRow[]): Checkin[] =>
  rows.map((row) => ({
    id: row.id,
    counselorId: row.counselor_id,
    eventId: row.event_id,
    timestamp: row.timestamp,
  }));

async function ensureConfigRow() {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("app_config")
    .select("id")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { error: upsertError } = await supabase.from("app_config").upsert(
      {
        id: 1,
        site_name: DEFAULT_CONFIG.siteName,
        background_image: DEFAULT_CONFIG.backgroundImage,
        username: DEFAULT_CONFIG.username,
        password: DEFAULT_CONFIG.password,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      throw upsertError;
    }
  }
}

async function fetchSnapshot(): Promise<PortalSnapshot> {
  const supabase = getSupabaseAdminClient();

  await ensureConfigRow();

  const [{ data: configRow, error: configError }, { data: counselorRows, error: counselorsError }, { data: eventRows, error: eventsError }, { data: checkinRows, error: checkinsError }] = await Promise.all([
    supabase
      .from("app_config")
      .select("id,site_name,background_image,username,password")
      .eq("id", 1)
      .maybeSingle<ConfigRow>(),
    supabase
      .from("counselors")
      .select("id,iglesia,nombre,telefono,edad")
      .order("nombre", { ascending: true })
      .returns<CounselorRow[]>(),
    supabase
      .from("events")
      .select("id,nombre,fecha,descripcion")
      .order("fecha", { ascending: false })
      .returns<EventRow[]>(),
    supabase
      .from("checkins")
      .select("id,counselor_id,event_id,timestamp")
      .returns<CheckinRow[]>(),
  ]);

  if (configError) throw configError;
  if (counselorsError) throw counselorsError;
  if (eventsError) throw eventsError;
  if (checkinsError) throw checkinsError;

  return {
    config: mapConfigRow(configRow),
    counselors: counselorRows ?? [],
    events: mapEventRows(eventRows ?? []),
    checkins: mapCheckinRows(checkinRows ?? []),
  };
}

async function executeAction(body: PortalActionBody) {
  const supabase = getSupabaseAdminClient();

  switch (body.action) {
    case "setConfig": {
      const config = body.payload.config;
      const { error } = await supabase.from("app_config").upsert(
        {
          id: 1,
          site_name: config.siteName,
          background_image: config.backgroundImage,
          username: config.username,
          password: config.password,
        },
        { onConflict: "id" },
      );

      if (error) throw error;
      break;
    }

    case "importCounselors": {
      const { error: clearCheckinsError } = await supabase.from("checkins").delete().neq("id", "");
      if (clearCheckinsError) throw clearCheckinsError;

      const { error: clearCounselorsError } = await supabase.from("counselors").delete().neq("id", "");
      if (clearCounselorsError) throw clearCounselorsError;

      if (body.payload.counselors.length) {
        const rows = body.payload.counselors.map((counselor) => ({
          id: counselor.id,
          iglesia: counselor.iglesia,
          nombre: counselor.nombre,
          telefono: counselor.telefono,
          edad: counselor.edad,
        }));

        const { error: insertError } = await supabase.from("counselors").insert(rows);
        if (insertError) throw insertError;
      }
      break;
    }

    case "clearCounselors": {
      const { error: clearCheckinsError } = await supabase.from("checkins").delete().neq("id", "");
      if (clearCheckinsError) throw clearCheckinsError;

      const { error: clearCounselorsError } = await supabase.from("counselors").delete().neq("id", "");
      if (clearCounselorsError) throw clearCounselorsError;
      break;
    }

    case "addCounselor": {
      const counselor = body.payload.counselor;
      const { error } = await supabase.from("counselors").insert({
        id: counselor.id,
        iglesia: counselor.iglesia,
        nombre: counselor.nombre,
        telefono: counselor.telefono,
        edad: counselor.edad,
      });

      if (error) throw error;
      break;
    }

    case "updateCounselor": {
      const { counselor } = body.payload;
      const { error } = await supabase
        .from("counselors")
        .update({
          iglesia: counselor.iglesia,
          nombre: counselor.nombre,
          telefono: counselor.telefono,
          edad: counselor.edad,
        })
        .eq("id", counselor.id);

      if (error) throw error;
      break;
    }

    case "removeCounselor": {
      const { counselorId } = body.payload;
      const { error } = await supabase.from("counselors").delete().eq("id", counselorId);

      if (error) throw error;
      break;
    }

    case "addEvent": {
      const event = body.payload.event;
      const { error } = await supabase.from("events").insert({
        id: event.id,
        nombre: event.nombre,
        fecha: event.fecha,
        descripcion: event.descripcion,
      });

      if (error) throw error;
      break;
    }

    case "removeEvent": {
      const { eventId } = body.payload;

      const { error: deleteCheckinsError } = await supabase
        .from("checkins")
        .delete()
        .eq("event_id", eventId);
      if (deleteCheckinsError) throw deleteCheckinsError;

      const { error: deleteEventError } = await supabase.from("events").delete().eq("id", eventId);
      if (deleteEventError) throw deleteEventError;
      break;
    }

    case "toggleCheckin": {
      const { counselorId, eventId } = body.payload;
      const { data: existing, error: existingError } = await supabase
        .from("checkins")
        .select("id")
        .eq("counselor_id", counselorId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        const { error: deleteError } = await supabase.from("checkins").delete().eq("id", existing.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from("checkins").insert({
          counselor_id: counselorId,
          event_id: eventId,
          timestamp: new Date().toISOString(),
        });

        if (insertError) throw insertError;
      }
      break;
    }

    case "markChurchCheckins": {
      const { church, eventId } = body.payload;

      const { data: churchCounselors, error: churchError } = await supabase
        .from("counselors")
        .select("id")
        .eq("iglesia", church);
      if (churchError) throw churchError;

      const counselorIds = (churchCounselors ?? []).map((item) => item.id);
      if (!counselorIds.length) break;

      const { data: existingCheckins, error: existingError } = await supabase
        .from("checkins")
        .select("counselor_id")
        .eq("event_id", eventId)
        .in("counselor_id", counselorIds);
      if (existingError) throw existingError;

      const existingIds = new Set((existingCheckins ?? []).map((item) => item.counselor_id));
      const rows = counselorIds
        .filter((counselorId) => !existingIds.has(counselorId))
        .map((counselorId) => ({
          counselor_id: counselorId,
          event_id: eventId,
          timestamp: new Date().toISOString(),
        }));

      if (rows.length) {
        const { error: insertError } = await supabase.from("checkins").insert(rows);
        if (insertError) throw insertError;
      }
      break;
    }

    default:
      throw new Error("Unsupported action");
  }
}

export async function GET() {
  try {
    const snapshot = await fetchSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PortalActionBody;
    await executeAction(body);
    const snapshot = await fetchSnapshot();

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
