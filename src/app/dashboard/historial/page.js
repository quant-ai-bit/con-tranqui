"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function HistorialPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typeFilter, setTypeFilter] = useState("all"); // all, activities, supervision
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const fetchReports = () => {
    setLoading(true);
    fetch("/api/reports")
      .then((res) => {
        if (!res.ok) throw new Error("Error al obtener los informes");
        return res.json();
      })
      .then((data) => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReports();
  }, []);


  const handleDownload = (filePath) => {
    if (!filePath) return;
    const fileName = filePath.split("/").pop();
    const downloadUrl = `/api/reports/download?file=${encodeURIComponent(fileName)}`;
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="wizard-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="wizard-error animate-in">
        <span>⚠️</span> Error al cargar el historial: {error}
        <button onClick={fetchReports} className="btn btn-secondary btn-sm" style={{ marginLeft: 16 }}>Reintentar</button>
      </div>
    );
  }

  // Filtering logic
  const filteredReports = reports.filter((report) => {
    if (typeFilter !== "all" && report.type !== typeFilter) return false;
    if (monthFilter !== "all" && report.month !== parseInt(monthFilter)) return false;
    if (yearFilter !== "all" && report.year !== parseInt(yearFilter)) return false;
    return true;
  });

  // Extract unique years and months from reports for the select filters
  const uniqueYears = [...new Set(reports.map((r) => r.year))].sort((a, b) => b - a);
  const uniqueMonths = [...new Set(reports.map((r) => r.month))].sort((a, b) => a - b);

  return (
    <>
      <div className="main-header" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="main-title">Historial de Informes</h1>
          <p className="main-subtitle">Consulta, visualiza y descarga los informes mensuales de actividades y de supervisión generados.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card animate-in" style={{ marginBottom: 24, padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Tipo de informe</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-input"
              style={{ width: "auto", minWidth: "160px", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}
            >
              <option value="all">Todos los informes</option>
              <option value="activities">Informe de Actividades</option>
              <option value="supervision">Informe de Supervisión</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Año</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="form-input"
              style={{ width: "auto", minWidth: "100px", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}
            >
              <option value="all">Todos</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Mes</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="form-input"
              style={{ width: "auto", minWidth: "120px", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}
            >
              <option value="all">Todos</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>{monthNames[m - 1]}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => { setTypeFilter("all"); setMonthFilter("all"); setYearFilter("all"); }}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 20, fontSize: "0.8rem" }}
          >
            Limpiar filtros
          </button>

          {monthFilter !== "all" && yearFilter !== "all" && filteredReports.length > 0 && (
            <a 
              href={`/api/reports/download-all?contractId=${filteredReports[0].contractId}&month=${monthFilter}&year=${yearFilter}`}
              download
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 20, height: "36px", display: "inline-flex", alignItems: "center", background: "rgba(99, 102, 241, 0.1)", borderColor: "rgba(99, 102, 241, 0.4)", color: "var(--text-primary)", gap: "6px" }}
            >
              📦 Descargar Todo el Período (.ZIP)
            </a>
          )}
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="card animate-in" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>📁</div>
          <h3 style={{ fontSize: "1.1rem", marginBottom: 8 }}>No se encontraron informes</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 20, maxWidth: 400, margin: "0 auto" }}>
            Aún no has generado informes de este tipo o período. Ve a las secciones de generación de informes para empezar.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <Link href="/dashboard/generar" className="btn btn-primary btn-sm">
              ⚡ Generar Actividades
            </Link>
            <Link href="/dashboard/supervisora" className="btn btn-secondary btn-sm">
              👩‍💼 Generar Supervisión
            </Link>
          </div>
        </div>
      ) : (
        <div className="card animate-in" style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textLeft: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-glass)", background: "rgba(255,255,255,0.02)" }}>
                  <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Nombre de Archivo</th>
                  <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "200px" }}>Tipo de Informe</th>
                  <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "140px" }}>Periodo</th>
                  <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "160px" }}>Fecha Generación</th>
                  <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "120px", textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const fileDisplayName = report.filePath ? report.filePath.split("/").pop() : "Informe sin nombre";
                  const dateFormatted = report.generatedAt 
                    ? new Date(report.generatedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "N/A";
                  return (
                    <tr 
                      key={report.id} 
                      style={{ borderBottom: "1px solid var(--border-glass)", transition: "background 0.15s ease" }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "1.2rem" }}>
                            {report.type === "supervision" ? "👩‍💼" : "📄"}
                          </span>
                          <span style={{ color: "var(--text-primary)" }}>{fileDisplayName}</span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: "0.85rem" }}>
                        <span className={`badge ${report.type === "supervision" ? "badge-inprogress" : "badge-complete"}`} style={{ 
                          backgroundColor: report.type === "supervision" ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.15)",
                          color: report.type === "supervision" ? "var(--accent-primary)" : "#10b981",
                        }}>
                          {report.type === "supervision" ? "Informe de Supervisión" : "Informe de Actividades"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {monthNames[report.month - 1]} {report.year}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {dateFormatted}
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <button
                          onClick={() => handleDownload(report.filePath)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                        >
                          📥 Descargar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
