"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  ImageIcon,
  Pencil,
  Save,
  Settings2,
  TableProperties,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { usePortal } from "@/components/portal-provider";
import { formatDate, parseCounselorsCsv } from "@/lib/utils";
import { Config } from "@/types";

const tabs = [
  { id: "configuracion", label: "Configuración", icon: Settings2 },
  { id: "consejeros", label: "Consejeros", icon: TableProperties },
  { id: "eventos", label: "Eventos", icon: CalendarPlus },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AdminPage() {
  const {
    config,
    counselors,
    events,
    setConfig,
    importCounselors,
    clearCounselors,
    updateCounselor,
    removeCounselor,
    addEvent,
    removeEvent,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<TabId>("configuracion");
  const [configForm, setConfigForm] = useState<Config>(config);
  const [eventForm, setEventForm] = useState({ nombre: "", fecha: "", descripcion: "" });
  const [editingCounselorId, setEditingCounselorId] = useState<string | null>(null);
  const [counselorEditForm, setCounselorEditForm] = useState({
    iglesia: "",
    nombre: "",
    telefono: "",
    edad: "",
  });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setConfigForm(config);
  }, [config]);

  const counselorsCountText = useMemo(
    () => `${counselors.length} consejero${counselors.length === 1 ? "" : "s"} cargado${counselors.length === 1 ? "" : "s"}`,
    [counselors.length],
  );

  const handleConfigSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await setConfig(configForm);
      setFeedback("Configuración guardada correctamente.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    }
  };

  const handleBackgroundUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

    setConfigForm((previous) => ({
      ...previous,
      backgroundImage: dataUrl,
    }));
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const parsedCounselors = parseCounselorsCsv(content);
    try {
      await importCounselors(parsedCounselors);
      setFeedback(`Se cargaron ${parsedCounselors.length} consejeros y se reiniciaron los check-ins.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudieron importar los consejeros.");
    }
    event.target.value = "";
  };

  const handleEventSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!eventForm.nombre.trim() || !eventForm.fecha) {
      setFeedback("Completa el nombre y la fecha del evento.");
      return;
    }

    try {
      await addEvent({
        nombre: eventForm.nombre.trim(),
        fecha: eventForm.fecha,
        descripcion: eventForm.descripcion.trim(),
      });
      setEventForm({ nombre: "", fecha: "", descripcion: "" });
      setFeedback("Evento creado correctamente.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear el evento.");
    }
  };

  const startEditingCounselor = (counselor: (typeof counselors)[number]) => {
    setEditingCounselorId(counselor.id);
    setCounselorEditForm({
      iglesia: counselor.iglesia,
      nombre: counselor.nombre,
      telefono: counselor.telefono,
      edad: counselor.edad === null ? "" : String(counselor.edad),
    });
  };

  const cancelEditingCounselor = () => {
    setEditingCounselorId(null);
    setCounselorEditForm({
      iglesia: "",
      nombre: "",
      telefono: "",
      edad: "",
    });
  };

  const handleCounselorUpdate = async (counselorId: string) => {
    const nombre = counselorEditForm.nombre.trim();
    const iglesia = counselorEditForm.iglesia.trim();
    const telefono = counselorEditForm.telefono.trim();
    const edadRaw = counselorEditForm.edad.trim();

    if (!nombre || !iglesia) {
      setFeedback("Nombre e iglesia son obligatorios para actualizar el consejero.");
      return;
    }

    const edad = edadRaw ? Number.parseInt(edadRaw, 10) : null;
    if (edad !== null && Number.isNaN(edad)) {
      setFeedback("La edad del consejero debe ser un número válido.");
      return;
    }

    try {
      await updateCounselor({
        id: counselorId,
        nombre,
        iglesia,
        telefono,
        edad,
      });
      setFeedback("Consejero actualizado correctamente.");
      cancelEditingCounselor();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar el consejero.");
    }
  };

  const handleCounselorDelete = async (counselorId: string, counselorName: string) => {
    try {
      await removeCounselor(counselorId);
      setFeedback(`Se eliminó el consejero \"${counselorName}\".`);
      if (editingCounselorId === counselorId) {
        cancelEditingCounselor();
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar el consejero.");
    }
  };

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Administración</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Gestiona tu portal</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Configura el nombre del sitio, importa consejeros desde CSV y administra los eventos disponibles.
        </p>
      </header>

      <section className="flex flex-wrap gap-3">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </section>

      {feedback ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </section>
      ) : null}

      {activeTab === "configuracion" ? (
        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <form onSubmit={handleConfigSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Personalización del portal</h3>
              <p className="mt-1 text-sm text-slate-500">
                Cambia el nombre del sitio y la imagen de fondo del portal.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Nombre del sitio</span>
              <input
                value={configForm.siteName}
                onChange={(event) =>
                  setConfigForm((previous) => ({ ...previous, siteName: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Imagen de fondo para check-in</p>
                  <p className="text-sm text-slate-500">Se guarda en la base de datos para todos los usuarios.</p>
                </div>
              </div>

              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
                <Upload className="h-4 w-4" />
                Subir imagen
                <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
              </label>

              {configForm.backgroundImage ? (
                <div className="mt-4 space-y-3">
                  <div
                    className="h-40 rounded-[1.5rem] bg-cover bg-center"
                    style={{ backgroundImage: `url(${configForm.backgroundImage})` }}
                  />
                  <button
                    type="button"
                    onClick={() => setConfigForm((previous) => ({ ...previous, backgroundImage: "" }))}
                    className="text-sm font-medium text-rose-600"
                  >
                    Quitar imagen actual
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Guardar configuración
            </button>
          </form>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Vista previa rápida</h3>
            <p className="mt-2 text-sm text-slate-500">Así se mostrará el portal en navegación y login.</p>
            <div className="mt-6 rounded-[2rem] bg-slate-900 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Portal</p>
              <h4 className="mt-3 text-2xl font-bold">{configForm.siteName}</h4>
              <p className="mt-2 text-sm text-indigo-100">Acceso autenticado por variables de entorno.</p>
            </div>
          </aside>
        </section>
      ) : null}

      {activeTab === "consejeros" ? (
        <section className="space-y-6">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Carga masiva por CSV</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Formato esperado: <span className="font-medium text-slate-700">IGLESIAS,NOMBRE,TELEFONO,EDAD</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
                  <Upload className="h-4 w-4" />
                  Importar CSV
                  <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await clearCounselors();
                      setFeedback("Se eliminaron todos los consejeros y sus check-ins.");
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : "No se pudieron eliminar los consejeros.");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpiar todo
                </button>
              </div>
            </div>
          </article>

          {counselors.length ? (
            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Consejeros cargados</h3>
                  <p className="text-sm text-slate-500">{counselorsCountText}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Iglesia</th>
                      <th className="px-6 py-3 font-medium">Nombre</th>
                      <th className="px-6 py-3 font-medium">Teléfono</th>
                      <th className="px-6 py-3 font-medium">Edad</th>
                      <th className="px-6 py-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {counselors.map((counselor) => {
                      const isEditing = editingCounselorId === counselor.id;

                      return (
                        <tr key={counselor.id}>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                value={counselorEditForm.iglesia}
                                onChange={(event) =>
                                  setCounselorEditForm((previous) => ({
                                    ...previous,
                                    iglesia: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                              />
                            ) : (
                              counselor.iglesia
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {isEditing ? (
                              <input
                                value={counselorEditForm.nombre}
                                onChange={(event) =>
                                  setCounselorEditForm((previous) => ({
                                    ...previous,
                                    nombre: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                              />
                            ) : (
                              counselor.nombre
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                value={counselorEditForm.telefono}
                                onChange={(event) =>
                                  setCounselorEditForm((previous) => ({
                                    ...previous,
                                    telefono: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                              />
                            ) : (
                              counselor.telefono || "—"
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                value={counselorEditForm.edad}
                                onChange={(event) =>
                                  setCounselorEditForm((previous) => ({
                                    ...previous,
                                    edad: event.target.value,
                                  }))
                                }
                                className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                              />
                            ) : (
                              counselor.edad ?? "—"
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleCounselorUpdate(counselor.id);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditingCounselor}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditingCounselor(counselor)}
                                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleCounselorDelete(counselor.id, counselor.nombre);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ) : (
            <EmptyState
              icon={TableProperties}
              title="Aún no hay consejeros cargados"
              description="Importa un archivo CSV para visualizar y administrar tu directorio de consejeros."
            />
          )}
        </section>
      ) : null}

      {activeTab === "eventos" ? (
        <section className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <form onSubmit={handleEventSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Crear evento</h3>
              <p className="mt-2 text-sm text-slate-500">Agrega nuevos eventos disponibles para el check-in.</p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Nombre del evento</span>
              <input
                value={eventForm.nombre}
                onChange={(event) => setEventForm((previous) => ({ ...previous, nombre: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                placeholder="Congreso de Consejeros"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Fecha</span>
              <input
                type="date"
                value={eventForm.fecha}
                onChange={(event) => setEventForm((previous) => ({ ...previous, fecha: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Descripción</span>
              <textarea
                value={eventForm.descripcion}
                onChange={(event) =>
                  setEventForm((previous) => ({ ...previous, descripcion: event.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                placeholder="Descripción breve del evento"
              />
            </label>

            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Crear evento
            </button>
          </form>

          <div className="space-y-4">
            {events.length ? (
              events.map((event) => (
                <article key={event.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{event.nombre}</h3>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(event.fecha)}</p>
                      <p className="mt-3 text-sm text-slate-600">{event.descripcion || "Sin descripción"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await removeEvent(event.id);
                          setFeedback(`Se eliminó el evento \"${event.nombre}\".`);
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : "No se pudo eliminar el evento.");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                icon={CalendarPlus}
                title="No hay eventos creados"
                description="Crea tu primer evento para habilitar el check-in desde el panel principal."
              />
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
