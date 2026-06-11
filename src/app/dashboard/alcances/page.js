"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function StatusBadge({ status }) {
  const map = {
    complete: { label: "✓ Completo", cls: "badge-complete" },
    inprogress: { label: "◐ En progreso", cls: "badge-inprogress" },
    pending: { label: "○ Pendiente", cls: "badge-pending" },
  };
  const s = map[status] || map.pending;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export default function AlcancesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [month, setMonth] = useState(() => new Date().getMonth() + 1); // mes actual por defecto
  const [year, setYear] = useState(() => new Date().getFullYear()); // año actual por defecto
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const m = parseInt(params.get("month"));
      const y = parseInt(params.get("year"));
      if (m >= 1 && m <= 12) setMonth(m);
      if (y >= 2000 && y <= 2100) setYear(y);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?month=${month}&year=${year}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [month, year]);

  const handlePeriodChange = (newMonth, newYear) => {
    setMonth(newMonth);
    setYear(newYear);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("month", newMonth);
      params.set("year", newYear);
      window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
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
        <span>⚠️</span> Error al cargar: {error}
      </div>
    );
  }

  if (!data?.contract) {
    return (
      <>
        <div className="main-header">
          <div>
            <h1 className="main-title">Obligaciones y Alcances</h1>
            <p className="main-subtitle">No hay contratos configurados aún</p>
          </div>
        </div>
        <div className="card animate-in" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Configura tu contrato para ver las obligaciones asociadas.
          </p>
          <Link href="/dashboard/setup" className="btn btn-primary">
            🔧 Configurar contrato
          </Link>
        </div>
      </>
    );
  }

  const { contract, scopes } = data;

  return (
    <>
      <div className="main-header" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="main-title">Obligaciones y Alcances</h1>
          <p className="main-subtitle">
            Gestión detallada y avance de compromisos para {contract.contractNumber ? `Contrato No. ${contract.contractNumber}` : contract.title}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Period selector */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={month}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value), year)}
              className="form-input"
              style={{ width: "auto", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => handlePeriodChange(month, parseInt(e.target.value))}
              className="form-input"
              style={{ width: "auto", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card animate-in" style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="scopes-table" style={{ width: "100%", borderCollapse: "collapse", textLeft: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-glass)", background: "rgba(255,255,255,0.02)" }}>
                <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "60px" }}>No.</th>
                <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Obligación Contractual</th>
                <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "140px" }}>Estado Mes</th>
                <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "200px" }}>Soportes Creados</th>
                <th style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", width: "110px", textAlign: "right" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {scopes.map((scope) => (
                <tr 
                  key={scope.id} 
                  style={{ borderBottom: "1px solid var(--border-glass)", transition: "background 0.15s ease" }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "16px 20px", fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-primary)", verticalAlign: "top" }}>
                    {scope.orderNumber}
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 4 }}>
                      {scope.title}
                    </div>
                    {scope.description && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {scope.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                    <StatusBadge status={scope.status} />
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                    <div style={{ fontSize: "0.8rem", marginBottom: 6, fontWeight: 500 }}>
                      📋 {scope.evidenceCount} subida(s)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {scope.activities.map((act) => (
                        <div 
                          key={act.id} 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 6, 
                            fontSize: "0.75rem", 
                            color: "#10b981" 
                          }}
                        >
                          <span style={{ fontSize: "0.85rem" }}>●</span>
                          <span>
                            {act.title}
                          </span>
                        </div>
                      ))}
                      {scope.activities.length === 0 && (
                        <div 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 6, 
                            fontSize: "0.75rem", 
                            color: "#ef4444" 
                          }}
                        >
                          <span style={{ fontSize: "0.85rem" }}>○</span>
                          <span>
                            Sin actividades registradas
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right", verticalAlign: "top" }}>
                    <Link 
                      href={`/dashboard/alcance/${scope.id}?month=${month}&year=${year}`} 
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    >
                      ✏️ Gestionar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
