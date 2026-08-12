"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Check, ClipboardCheck, Phone, Search, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { usePortal } from "@/components/portal-provider";
import { formatDate, getUniqueCounselorCount, normalize } from "@/lib/utils";

export default function CheckinPage() {
  const { config, counselors, events, checkins, toggleCheckin, markChurchCheckins, addCounselor } =
    usePortal();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [search, setSearch] = useState("");
  const [churchFilter, setChurchFilter] = useState("all");
  const [churchFilterInput, setChurchFilterInput] = useState("Todas las iglesias");
  const [showAddCounselorForm, setShowAddCounselorForm] = useState(false);
  const [counselorForm, setCounselorForm] = useState({
    nombre: "",
    telefono: "",
    edad: "",
    churchMode: "existing" as "existing" | "new",
    churchExisting: "",
    churchNew: "",
  });
  const [manualCounselorFeedback, setManualCounselorFeedback] = useState("");

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

  useEffect(() => {
    setCounselorForm((previous) => {
      if (!churches.length) {
        return {
          ...previous,
          churchMode: "new",
          churchExisting: "",
        };
      }

      return {
        ...previous,
        churchExisting: previous.churchExisting || churches[0],
      };
    });
  }, [churches]);

  useEffect(() => {
    if (churchFilter === "all") {
      setChurchFilterInput("Todas las iglesias");
      return;
    }

    setChurchFilterInput(churchFilter);
  }, [churchFilter]);

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

  const handleAddCounselor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombre = counselorForm.nombre.trim();
    const telefono = counselorForm.telefono.trim();
    const edadRaw = counselorForm.edad.trim();
    const iglesia =
      counselorForm.churchMode === "existing"
        ? counselorForm.churchExisting.trim()
        : counselorForm.churchNew.trim();

    if (!nombre) {
      setManualCounselorFeedback("Escribe el nombre del consejero.");
      return;
    }

    if (!iglesia) {
      setManualCounselorFeedback("Selecciona una iglesia existente o escribe una nueva.");
      return;
    }

    const parsedAge = edadRaw ? Number.parseInt(edadRaw, 10) : null;
    if (parsedAge !== null && Number.isNaN(parsedAge)) {
      setManualCounselorFeedback("La edad debe ser un número válido.");
      return;
    }

    try {
      await addCounselor({
        nombre,
        telefono,
        iglesia,
        edad: parsedAge,
      });
    } catch (error) {
      setManualCounselorFeedback(
        error instanceof Error ? error.message : "No se pudo agregar el consejero.",
      );
      return;
    }

    setCounselorForm((previous) => ({
      ...previous,
      nombre: "",
      telefono: "",
      edad: "",
      churchExisting: churches.includes(iglesia) ? iglesia : previous.churchExisting,
      churchNew: "",
      churchMode: churches.includes(iglesia) ? "existing" : "new",
    }));
    setManualCounselorFeedback(`Consejero "${nombre}" agregado correctamente.`);
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
          <div className="space-y-2">
            <input
              list="church-filter-list"
              value={churchFilterInput}
              onChange={(event) => {
                const value = event.target.value;
                setChurchFilterInput(value);

                if (!value || value === "Todas las iglesias") {
                  setChurchFilter("all");
                  return;
                }

                const matchedChurch = churches.find((church) => church === value);
                setChurchFilter(matchedChurch ?? "all");
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              placeholder="Escribe para buscar iglesia"
            />
            <datalist id="church-filter-list">
              <option value="Todas las iglesias" />
              {churches.map((church) => (
                <option key={church} value={church} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500">Escribe y elige una iglesia de la lista para filtrar.</p>
          </div>
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
            onClick={async () => {
              try {
                await markChurchCheckins(churchFilter, selectedEventId);
              } catch (error) {
                setManualCounselorFeedback(
                  error instanceof Error
                    ? error.message
                    : "No se pudo completar la acción masiva de check-in.",
                );
              }
            }}
            className="rounded-full bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
          >
            Marcar todos de esta iglesia
          </button>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold text-slate-900">Agregar consejero manualmente</h3>
            <p className="text-sm text-slate-500">
              Si no aparece en la lista, regístralo aquí y quedará disponible para check-in.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCounselorForm((previous) => !previous)}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            {showAddCounselorForm ? "Ocultar formulario" : "Añadir nuevo consejero"}
          </button>
        </div>

        {showAddCounselorForm ? (
          <form onSubmit={handleAddCounselor} className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Nombre</span>
            <input
              value={counselorForm.nombre}
              onChange={(event) =>
                setCounselorForm((previous) => ({ ...previous, nombre: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              placeholder="Nombre completo"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Teléfono</span>
            <input
              value={counselorForm.telefono}
              onChange={(event) =>
                setCounselorForm((previous) => ({ ...previous, telefono: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              placeholder="Ej. 3001234567"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Edad (opcional)</span>
            <input
              value={counselorForm.edad}
              onChange={(event) =>
                setCounselorForm((previous) => ({ ...previous, edad: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              placeholder="Ej. 28"
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium text-slate-700">Iglesia</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setCounselorForm((previous) => ({
                    ...previous,
                    churchMode: "existing",
                    churchExisting: previous.churchExisting || churches[0] || "",
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  counselorForm.churchMode === "existing"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Elegir existente
              </button>
              <button
                type="button"
                onClick={() =>
                  setCounselorForm((previous) => ({
                    ...previous,
                    churchMode: "new",
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  counselorForm.churchMode === "new"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Escribir nueva
              </button>
            </div>

            {counselorForm.churchMode === "existing" ? (
              <div className="space-y-2">
                <input
                  list="existing-churches-list"
                  value={counselorForm.churchExisting}
                  onChange={(event) =>
                    setCounselorForm((previous) => ({ ...previous, churchExisting: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  placeholder="Escribe para buscar iglesia"
                />
                <datalist id="existing-churches-list">
                  {churches.map((church) => (
                    <option key={church} value={church} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500">
                  Escribe el nombre para filtrar sugerencias y selecciona la iglesia correcta.
                </p>
              </div>
            ) : (
              <input
                value={counselorForm.churchNew}
                onChange={(event) =>
                  setCounselorForm((previous) => ({ ...previous, churchNew: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                placeholder="Nombre de la iglesia"
              />
            )}
          </fieldset>

          <div className="flex items-end lg:col-span-2">
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Agregar consejero
            </button>
          </div>
          </form>
        ) : null}

        {manualCounselorFeedback ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {manualCounselorFeedback}
          </p>
        ) : null}
      </section>

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
                    onClick={async () => {
                      try {
                        await toggleCheckin(counselor.id, selectedEventId);
                      } catch (error) {
                        setManualCounselorFeedback(
                          error instanceof Error ? error.message : "No se pudo guardar el check-in.",
                        );
                      }
                    }}
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
