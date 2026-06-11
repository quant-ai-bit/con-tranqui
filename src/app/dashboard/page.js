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

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [month, setMonth] = useState(() => new Date().getMonth() + 1); // mes actual por defecto
  const [year, setYear] = useState(() => new Date().getFullYear()); // año actual por defecto

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

  const handleDeleteContract = async () => {
    if (!data?.contract) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar este contrato y toda su información asociada (alcances, evidencias e informes)? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts?id=${data.contract.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al eliminar el contrato");
      }

      window.location.reload();
    } catch (err) {
      alert(err.message || "Error al eliminar el contrato");
      setLoading(false);
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

  // If no contract configured yet, show setup prompt
  if (!data?.contract) {
    return (
      <>
        <div className="main-header">
          <div>
            <h1 className="main-title">Dashboard</h1>
            <p className="main-subtitle">No hay contratos configurados aún</p>
          </div>
        </div>
        <div className="card animate-in" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>📄</div>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>
            Configura tu primer contrato
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
            Sube tu documento contractual y la IA extraerá automáticamente los alcances
            para empezar a gestionar tus informes mensuales.
          </p>
          <Link href="/dashboard/setup" className="btn btn-primary btn-lg">
            🔧 Configurar contrato
          </Link>
        </div>
      </>
    );
  }

  const { contract, scopes, stats } = data;
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <>
      <div className="main-header" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="main-title">Dashboard</h1>
          <p className="main-subtitle" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>{contract.contractNumber ? `Contrato ${contract.contractNumber}` : contract.title}</span>
            {contract.entity && <span style={{ opacity: 0.6 }}>· {contract.entity}</span>}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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

          <Link href={`/dashboard/generar?month=${month}&year=${year}`} className="btn btn-primary btn-sm" style={{ height: "36px", display: "inline-flex", alignItems: "center" }}>
            ⚡ Generar Informe
          </Link>

          <button onClick={handleDeleteContract} className="btn btn-secondary btn-sm" style={{ height: "36px", display: "inline-flex", alignItems: "center", borderColor: "rgba(239, 68, 68, 0.4)", color: "#ef4444" }}>
            🗑️ Eliminar Contrato
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger">
        <div className="stat-card animate-in">
          <div className="stat-icon indigo">📋</div>
          <div className="stat-value">{stats.totalScopes}</div>
          <div className="stat-label">Alcances totales</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{stats.completedScopes}/{stats.totalScopes}</div>
          <div className="stat-label">Alcances completados</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon cyan">📎</div>
          <div className="stat-value">{stats.totalEvidences}</div>
          <div className="stat-label">Evidencias cargadas</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon amber">📈</div>
          <div className="stat-value">{stats.avgProgress}%</div>
          <div className="stat-label">Progreso mensual</div>
        </div>
      </div>

      {/* Overall progress */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Progreso general — {monthNames[month - 1]} {year}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {stats.avgProgress}% completado
          </span>
        </div>
        <div className="progress-bar-container" style={{ height: 10 }}>
          <div
            className={`progress-bar-fill ${stats.avgProgress === 100 ? "complete" : ""}`}
            style={{ width: `${stats.avgProgress}%` }}
          />
        </div>
      </div>

      {/* Alcances grid */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Alcances del contrato</h2>
      </div>

      <div className="alcance-grid stagger">
        {scopes.map((scope) => (
          <Link
            key={scope.id}
            href={`/dashboard/alcance/${scope.id}?month=${month}&year=${year}`}
            className="alcance-card animate-in"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="alcance-number">Alcance {scope.orderNumber}</span>
              <StatusBadge status={scope.status} />
            </div>
            <div className="alcance-title">{scope.title}</div>
            <div className="progress-bar-container" style={{ marginBottom: "16px" }}>
              <div
                className={`progress-bar-fill ${scope.progress === 100 ? "complete" : ""}`}
                style={{ width: `${scope.progress}%` }}
              />
            </div>

            <div className="evidence-list">
              {scope.activities.map((act) => (
                <div key={act.id} className="evidence-item completed">
                  <span className="evidence-icon">✓</span>
                  <span className="evidence-name">{act.title}</span>
                </div>
              ))}
              {scope.activities.length === 0 && (
                <div className="evidence-item pending">
                  <span className="evidence-icon">○</span>
                  <span className="evidence-name">Sin actividades registradas</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
