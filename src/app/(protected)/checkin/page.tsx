"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, ClipboardCheck, Phone, Search, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { usePortal } from "@/components/portal-provider";
import { formatDate, getUniqueCounselorCount, normalize } from "@/lib/utils";

export default function CheckinPage() {
  const { config, counselors, events, checkins, toggleCheckin, markChurchCheckins } = usePortal();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [search, setSearch] = useState("");
  const [churchFilter, setChurchFilter] = useState("all");

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId("");
      return;
    }

    if (!selectedEventId || !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const churches = useMemo(
    () => Array.from(new Set(counselors.map((counselor) => counselor.iglesia))).filter(Boolean).sort(),
    [counselors],
  );

  const filteredCounselors = useMemo(() => {
    const normalizedSearch = normalize(search);

    return counselors.filter((counselor) => {
      const matchesSearch = normalizedSearch
        ? normalize(counselor.nombre).includes(normalizedSearch)
        : true;
      const matchesChurch = churchFilter === "all" ? true : counselor.iglesia === churchFilter;

      return matchesSearch && matchesChurch;
    });
  }, [churchFilter, counselors, search]);

  const currentEvent = events.find((event) => event.id === selectedEventId);
  const currentEventCheckins = checkins.filter((checkin) => checkin.eventId === selectedEventId);
  const checkedCounselorIds = new Set(currentEventCheckins.map((checkin) => checkin.counselorId));
  const visibleCheckedCount = filteredCounselors.filter((counselor) => checkedCounselorIds.has(counselor.id)).length;
  const overallCheckedCount = getUniqueCounselorCount(currentEventCheckins);

  const backgroundStyle = config.backgroundImage
    ? {
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.7)), url(${config.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage:
          "linear-gradient(135deg, rgba(49, 46, 129, 0.95), rgba(37, 99, 235, 0.88))",
      };

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] p-8 text-white shadow-2xl" style={backgroundStyle}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-100">
              Registro principal
            </p>
            <h2 className="mt-3 text-3xl font-bold">Check-In de consejeros</h2>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100/90">
              Busca consejeros, filtra por iglesia y marca asistencia para el evento activo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-3xl bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-sm text-indigo-100">Asistencia visible</p>
              <p className="mt-2 text-3xl font-bold">
                {visibleCheckedCount}/{filteredCounselors.length}
              </p>
            </article>
            <article className="rounded-3xl bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-sm text-indigo-100">Total del evento</p>
              <p className="mt-2 text-3xl font-bold">
                {overallCheckedCount}/{counselors.length}
              </p>
            </article>
          </div>
        </div>
      </header>

      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.2fr,1fr,1fr]">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Evento</span>
          <select
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          >
            {events.length ? null : <option value="">Sin eventos disponibles</option>}
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.nombre} · {formatDate(event.fecha)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Buscar por nombre</span>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej. María López"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Filtrar por iglesia</span>
          <select
            value={churchFilter}
            onChange={(event) => setChurchFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
          >
            <option value="all">Todas las iglesias</option>
            {churches.map((church) => (
              <option key={church} value={church}>
                {church}
              </option>
            ))}
          </select>
        </label>
      </section>

      {churchFilter !== "all" && selectedEventId ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-700 shadow-sm">
          <div>
            <p className="font-semibold">Acción masiva disponible</p>
            <p>Marca a todos los consejeros de {churchFilter} para este evento.</p>
          </div>
          <button
            type="button"
            onClick={() => markChurchCheckins(churchFilter, selectedEventId)}
            className="rounded-full bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
          >
            Marcar todos de esta iglesia
          </button>
        </section>
      ) : null}

      {!events.length ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Crea un evento para comenzar"
          description="Ve al panel de administración y registra al menos un evento antes de usar el check-in."
        />
      ) : !counselors.length ? (
        <EmptyState
          icon={Users}
          title="Carga consejeros desde CSV"
          description="Importa tu archivo de consejeros en la sección Admin para empezar a registrar asistencia."
        />
      ) : (
        <section className="space-y-4">
          {currentEvent ? (
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{currentEvent.nombre}</h3>
                  <p className="text-sm text-slate-500">{formatDate(currentEvent.fecha)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                  {currentEvent.descripcion || "Sin descripción"}
                </span>
              </div>
            </article>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCounselors.map((counselor) => {
              const isCheckedIn = checkedCounselorIds.has(counselor.id);

              return (
                <article
                  key={counselor.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{counselor.nombre}</h3>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                        <Building2 className="h-4 w-4" />
                        {counselor.iglesia || "Sin iglesia"}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="h-4 w-4" />
                        {counselor.telefono || "Sin teléfono"}
                      </p>
                    </div>
                    {isCheckedIn ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                        Registrado
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={!selectedEventId}
                    onClick={() => toggleCheckin(counselor.id, selectedEventId)}
                    className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isCheckedIn
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {isCheckedIn ? "Quitar check-in" : "Marcar check-in"}
                  </button>
                </article>
              );
            })}
          </div>

          {!filteredCounselors.length ? (
            <EmptyState
              icon={Search}
              title="No hay resultados"
              description="Ajusta la búsqueda o cambia el filtro de iglesia para encontrar consejeros."
            />
          ) : null}
        </section>
      )}
    </main>
  );
}
