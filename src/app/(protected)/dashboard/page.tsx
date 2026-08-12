"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, CalendarRange, ChartPie, Users, VenusAndMars } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { usePortal } from "@/components/portal-provider";
import { StatCard } from "@/components/stat-card";
import {
  formatDate,
  getAttendanceFrequency,
  getUniqueCounselorCount,
  isLikelyFemale,
} from "@/lib/utils";

export default function DashboardPage() {
  const { counselors, events, checkins } = usePortal();
  const [selectedEventId, setSelectedEventId] = useState("all");

  useEffect(() => {
    if (selectedEventId !== "all" && !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId("all");
    }
  }, [events, selectedEventId]);

  const relevantCheckins = useMemo(
    () =>
      selectedEventId === "all"
        ? checkins
        : checkins.filter((checkin) => checkin.eventId === selectedEventId),
    [checkins, selectedEventId],
  );

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const totalCounselors = counselors.length;
  const totalCheckedIn = getUniqueCounselorCount(relevantCheckins);
  const attendedIds = useMemo(
    () => new Set(relevantCheckins.map((checkin) => checkin.counselorId)),
    [relevantCheckins],
  );
  const attendancePercentage = totalCounselors
    ? ((totalCheckedIn / totalCounselors) * 100).toFixed(1)
    : "0.0";

  const byChurch = useMemo(() => {
    const grouped = new Map<string, { total: number; checked: number }>();

    counselors.forEach((counselor) => {
      const key = counselor.iglesia || "Sin iglesia";
      const current = grouped.get(key) ?? { total: 0, checked: 0 };
      current.total += 1;
      if (attendedIds.has(counselor.id)) current.checked += 1;
      grouped.set(key, current);
    });

    return [...grouped.entries()]
      .map(([church, values]) => ({
        church,
        ...values,
        percentage: values.total ? (values.checked / values.total) * 100 : 0,
      }))
      .sort((left, right) => right.checked - left.checked || left.church.localeCompare(right.church));
  }, [attendedIds, counselors]);

  const genderStats = useMemo(() => {
    return counselors.reduce(
      (accumulator, counselor) => {
        const isFemale = isLikelyFemale(counselor.nombre);
        if (isFemale) {
          accumulator.female.total += 1;
          if (attendedIds.has(counselor.id)) accumulator.female.attended += 1;
        } else {
          accumulator.male.total += 1;
          if (attendedIds.has(counselor.id)) accumulator.male.attended += 1;
        }
        return accumulator;
      },
      {
        female: { total: 0, attended: 0 },
        male: { total: 0, attended: 0 },
      },
    );
  }, [attendedIds, counselors]);

  const attendanceFrequency = useMemo(() => getAttendanceFrequency(counselors, checkins), [checkins, counselors]);

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Dashboard</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Resumen de asistencia</h2>
            <p className="mt-2 text-sm text-slate-500">
              Consulta estadísticas generales, desglose por iglesia y frecuencia histórica de asistencia.
            </p>
          </div>

          <label className="block min-w-[280px]">
            <span className="mb-2 block text-sm font-medium text-slate-700">Evento a analizar</span>
            <select
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            >
              <option value="all">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.nombre} · {formatDate(event.fecha)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedEvent ? (
          <p className="mt-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
            Evento seleccionado: {selectedEvent.nombre}
          </p>
        ) : null}
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total de consejeros"
          value={String(totalCounselors)}
          description="Base completa cargada desde CSV"
          icon={Users}
        />
        <StatCard
          title="Check-ins registrados"
          value={String(totalCheckedIn)}
          description="Consejeros únicos con asistencia"
          icon={BarChart3}
        />
        <StatCard
          title="Porcentaje asistido"
          value={`${attendancePercentage}%`}
          description="Relación entre asistentes y base total"
          icon={ChartPie}
        />
        <StatCard
          title="Eventos creados"
          value={String(events.length)}
          description="Disponibles para seguimiento"
          icon={CalendarRange}
        />
      </section>

      {!counselors.length ? (
        <EmptyState
          icon={Users}
          title="Sin datos para analizar"
          description="Carga consejeros y registra asistencia para generar estadísticas útiles."
        />
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Desglose por iglesia</h3>
                  <p className="text-sm text-slate-500">Totales, registrados y porcentaje de asistencia.</p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Iglesia</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Check-in</th>
                      <th className="px-4 py-3 font-medium">Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {byChurch.map((church) => (
                      <tr key={church.church}>
                        <td className="px-4 py-4 font-medium text-slate-900">{church.church}</td>
                        <td className="px-4 py-4">{church.total}</td>
                        <td className="px-4 py-4">{church.checked}</td>
                        <td className="px-4 py-4">{church.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-pink-50 p-3 text-pink-600">
                  <VenusAndMars className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Estimación por género</h3>
                  <p className="text-sm text-slate-500">Heurística simple basada en el primer nombre.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-pink-50 p-5">
                  <p className="text-sm font-medium text-pink-700">Mujeres estimadas</p>
                  <p className="mt-2 text-3xl font-bold text-pink-900">{genderStats.female.total}</p>
                  <p className="mt-2 text-sm text-pink-700">Con check-in: {genderStats.female.attended}</p>
                </div>
                <div className="rounded-3xl bg-sky-50 p-5">
                  <p className="text-sm font-medium text-sky-700">Hombres estimados</p>
                  <p className="mt-2 text-3xl font-bold text-sky-900">{genderStats.male.total}</p>
                  <p className="mt-2 text-sm text-sky-700">Con check-in: {genderStats.male.attended}</p>
                </div>
              </div>
            </article>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Frecuencia histórica de asistencia</h3>
                <p className="text-sm text-slate-500">Conteo por cantidad total de eventos atendidos.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Nunca asistieron</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{attendanceFrequency.never}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Asistieron 1 vez</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{attendanceFrequency.once}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Asistieron 2 veces</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{attendanceFrequency.twice}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Asistieron 3+ veces</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{attendanceFrequency.threePlus}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
