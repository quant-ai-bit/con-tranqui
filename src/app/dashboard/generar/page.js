"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function stripHtml(html) {
  if (!html) return "";
  let text = html
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/<[^>]*>/g, "");
  return text.replace(/\s+/g, " ").trim();
}

export default function GenerarPage() {
  const [step, setStep] = useState(1); // 1: Verify, 2: Preview, 3: Generating, 4: Download
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Contract metadata states
  const [tempContractTitle, setTempContractTitle] = useState("");
  const [tempContractNumber, setTempContractNumber] = useState("");
  const [tempEntity, setTempEntity] = useState("");
  const [tempContractorName, setTempContractorName] = useState("");
  const [tempObjeto, setTempObjeto] = useState("");
  const [tempPlazo, setTempPlazo] = useState("");
  const [tempValorTotal, setTempValorTotal] = useState("");
  const [tempValorMensual, setTempValorMensual] = useState("");
  const [tempProyecto, setTempProyecto] = useState("");
  const [tempSupervisor, setTempSupervisor] = useState("");
  const [tempDependencia, setTempDependencia] = useState("");
  const [tempCcContratista, setTempCcContratista] = useState("");
  const [tempTotalPeriodos, setTempTotalPeriodos] = useState(5);
  const [tempNameCoordinador, setTempNameCoordinador] = useState("LUZ ADRIANA MONTOYA ZULUAGA");
  const [tempNameAbogado, setTempNameAbogado] = useState("ORLYANA MARIN PEREZ");

  // Base64 Signature states
  const [tempSigContratista, setTempSigContratista] = useState("");
  const [tempSigSupervisor, setTempSigSupervisor] = useState("");
  const [tempSigCoordinador, setTempSigCoordinador] = useState("");
  const [tempSigAbogado, setTempSigAbogado] = useState("");

  // Report-level states
  const [driveLink, setDriveLink] = useState("");
  const [periodoActual, setPeriodoActual] = useState("");
  const [periodoTexto, setPeriodoTexto] = useState("");

  // Scope specific observations & activities
  const [tempObservations, setTempObservations] = useState({});
  const [tempActivities, setTempActivities] = useState({});
  
  // Disclaimer state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [month, setMonth] = useState(() => new Date().getMonth() + 1); // mes actual por defecto
  const [year, setYear] = useState(() => new Date().getFullYear()); // año actual por defecto
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  // Helper to generate dynamic period range text
  const getDefaultPeriodoTexto = (m, y) => {
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const nextMonthIdx = m === 12 ? 0 : m;
    const nextYear = m === 12 ? y + 1 : y;
    return `2 de ${months[m-1]} del ${y} al 1 de ${months[nextMonthIdx]} del ${nextYear}`;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const m = parseInt(params.get("month"));
      const y = parseInt(params.get("year"));
      if (m >= 1 && m <= 12) setMonth(m);
      if (y >= 2000 && y <= 2100) setYear(y);
    }
  }, []);

  // Fetch dashboard data
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

  // Sync preview form state with fetched data
  useEffect(() => {
    if (data?.contract) {
      setTempContractTitle(data.contract.title || "");
      setTempContractNumber(data.contract.contractNumber || "");
      setTempEntity(data.contract.entity || "");
      setTempContractorName(data.contract.user?.name || "");
      setTempObjeto(data.contract.objeto || "");
      setTempPlazo(data.contract.plazo || "");
      setTempValorTotal(data.contract.valorTotal || "");
      setTempValorMensual(data.contract.valorMensual || "");
      setTempProyecto(data.contract.proyecto || "");
      setTempSupervisor(data.contract.supervisor || "");
      setTempDependencia(data.contract.dependencia || "");
      setTempCcContratista(data.contract.ccContratista || "");
      setTempTotalPeriodos(data.contract.totalPeriodos || 5);
      setTempNameCoordinador(data.contract.nameCoordinador || "LUZ ADRIANA MONTOYA ZULUAGA");
      setTempNameAbogado(data.contract.nameAbogado || "ORLYANA MARIN PEREZ");
      
      // Signatures
      setTempSigContratista(data.contract.sigContratista || "");
      setTempSigSupervisor(data.contract.sigSupervisor || "");
      setTempSigCoordinador(data.contract.sigCoordinador || "");
      setTempSigAbogado(data.contract.sigAbogado || "");

      // Default report values
      setPeriodoActual(`${month} de ${data.contract.totalPeriodos || 5}`);
      setPeriodoTexto(getDefaultPeriodoTexto(month, year));
      setDriveLink(""); // Start blank, let user fill

      const initialNarratives = {};
      const initialActivities = {};
      const initialObservations = {};
      
      data.scopes?.forEach((s) => {
        initialObservations[s.id] = s.entry?.observations || "";
        initialActivities[s.id] = s.activities?.map(act => {
          const purposeEv = act.evidences?.find(ev => ev.fileType === "text" && (ev.fileName.toLowerCase().includes("propósito") || ev.fileName.toLowerCase().includes("proposito")));
          const rawPurpose = purposeEv?.content || act.evidences?.find(ev => ev.fileType === "text")?.content || "";
          return {
            id: act.id,
            title: act.title,
            date: act.date || "",
            location: act.location || "",
            purpose: stripHtml(rawPurpose)
          };
        }) || [];
      });
      
      setTempActivities(initialActivities);
      setTempObservations(initialObservations);
    }
  }, [data]);

  const handlePeriodChange = (newMonth, newYear) => {
    setMonth(newMonth);
    setYear(newYear);
    setPeriodoTexto(getDefaultPeriodoTexto(newMonth, newYear));
    setPeriodoActual(`${newMonth} de ${tempTotalPeriodos || 5}`);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("month", newMonth);
      params.set("year", newYear);
      window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
  };

  const handleSignatureFile = (e, role) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Por favor carga un archivo de imagen válido (PNG, JPG, JPEG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      if (role === "contratista") setTempSigContratista(base64String);
      else if (role === "supervisor") setTempSigSupervisor(base64String);
      else if (role === "coordinadora") setTempSigCoordinador(base64String);
      else if (role === "abogada") setTempSigAbogado(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAndGenerate = async () => {
    if (!disclaimerAccepted) {
      setError("Debes aceptar la exención de responsabilidad antes de generar el informe.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 1. Save all contract metadata and signatures
      const contractRes = await fetch("/api/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.contract.id,
          title: tempContractTitle,
          contractNumber: tempContractNumber,
          entity: tempEntity,
          objeto: tempObjeto,
          plazo: tempPlazo,
          valorTotal: tempValorTotal,
          valorMensual: tempValorMensual,
          proyecto: tempProyecto,
          supervisor: tempSupervisor,
          dependencia: tempDependencia,
          ccContratista: tempCcContratista,
          totalPeriodos: parseInt(tempTotalPeriodos),
          nameCoordinador: tempNameCoordinador,
          nameAbogado: tempNameAbogado,
          sigContratista: tempSigContratista,
          sigSupervisor: tempSigSupervisor,
          sigCoordinador: tempSigCoordinador,
          sigAbogado: tempSigAbogado,
        }),
      });
      
      if (!contractRes.ok) {
        throw new Error("Error al guardar la información del contrato");
      }

      // 2. Save contractor name (user model)
      if (tempContractorName && tempContractorName !== (data?.contract?.user?.name || "")) {
        const userRes = await fetch("/api/user/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tempContractorName }),
        });
        if (!userRes.ok) {
          throw new Error("Error al guardar el nombre del contratista");
        }
      }

      // 3. Save activities and observations for each scope
      const savePromises = [];
      scopes.forEach((scope) => {
        // Save activities details
        const scopeActs = tempActivities[scope.id] || [];
        scopeActs.forEach((act) => {
          savePromises.push(
            fetch(`/api/scopes/${scope.id}/activities`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                activityId: act.id,
                title: act.title,
                date: act.date,
                location: act.location,
                purpose: act.purpose,
              }),
            })
          );
        });

        // Save observations
        savePromises.push(
          fetch(`/api/scopes/${scope.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              month,
              year,
              observations: tempObservations[scope.id] || "",
            }),
          })
        );
      });

      const saveResults = await Promise.all(savePromises);
      const failedSave = saveResults.find((r) => !r.ok);
      if (failedSave) {
        throw new Error("Error al guardar cambios de actividades u observaciones.");
      }

      setSaving(false);
      // Proceed to generate
      await handleGenerate();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar los cambios");
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!data?.contract) return;

    setGenerating(true);
    setStep(3);

    const messages = [
      "Verificando alcances y observaciones...",
      "Recopilando anexos y actividades...",
      "Generando tablas de datos contractuales...",
      "Construyendo documento Word oficial...",
      "Incrustando imágenes de firmas autorizadas...",
      "Formateando márgenes e interlineado...",
      "Finalizando informe...",
    ];

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 14;
      if (p > 90) p = 90;
      setProgress(Math.round(p));
      const idx = Math.min(Math.floor(p / 14), messages.length - 1);
      setProgressMessage(messages[idx]);
    }, 500);

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: data.contract.id,
          month,
          year,
          driveLink,
          periodoActual,
          periodoTexto,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al generar el informe.");
      }

      const result = await response.json();
      setDownloadUrl(result.downloadUrl);
      setFileName(result.fileName);
      setProgress(100);
      setProgressMessage("¡Informe generado exitosamente!");

      setTimeout(() => {
        setGenerating(false);
        setStep(4);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
      setStep(2); // Return to preview on error
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
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

  if (!data?.contract) {
    return (
      <>
        <div className="main-header">
          <div>
            <h1 className="main-title">Generar Informes</h1>
            <p className="main-subtitle">No hay contratos configurados</p>
          </div>
        </div>
        <div className="card animate-in" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Primero necesitas configurar un contrato y generar los textos de cada alcance.
          </p>
          <Link href="/dashboard/setup" className="btn btn-primary">
            🔧 Configurar contrato
          </Link>
        </div>
      </>
    );
  }

  const scopes = data.scopes || [];
  const confirmedCount = scopes.filter((s) => s.entry?.status === "confirmed").length;
  const missingFields = [
    { label: "Objeto", val: tempObjeto },
    { label: "Plazo", val: tempPlazo },
    { label: "Valor Total", val: tempValorTotal },
    { label: "Valor Mensual", val: tempValorMensual },
    { label: "Proyecto", val: tempProyecto },
    { label: "Supervisor", val: tempSupervisor },
    { label: "Dependencia", val: tempDependencia },
    { label: "Cédula", val: tempCcContratista },
    { label: "Link de Drive", val: driveLink }
  ].filter(f => !f.val);

  return (
    <>
      <div className="main-header" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <Link
            href={`/dashboard?month=${month}&year=${year}`}
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 8, display: "inline-flex" }}
          >
            ← Volver al Dashboard
          </Link>
          <h1 className="main-title">Generar Informes</h1>
          <p className="main-subtitle">
            <span>{tempContractNumber ? `Contrato ${tempContractNumber}` : tempContractTitle}</span>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={month}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value), year)}
              className="form-input"
              style={{ width: "auto", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}
              disabled={step > 1}
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
              disabled={step > 1}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="wizard-error animate-in" style={{ marginBottom: 16 }}>
          <span>⚠️</span> {error}
          <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Steps indicator */}
      <div className="wizard-stepper animate-in" style={{ marginBottom: 32 }}>
        {["Verificar", "Vista Preliminar", "Generar", "Descargar"].map((label, i) => (
          <div
            key={i}
            className={`wizard-step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "completed" : ""}`}
          >
            <div className="wizard-step-circle">
              {step > i + 1 ? "✓" : ["📋", "📝", "🤖", "📥"][i]}
            </div>
            <span className="wizard-step-label">{label}</span>
            {i < 3 && <div className="wizard-step-line" />}
          </div>
        ))}
      </div>

      {/* Step 1: Verify */}
      {step === 1 && (
        <div className="animate-in">
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">
                Resumen de alcances — {monthNames[month - 1]} {year}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {confirmedCount}/{scopes.length} confirmados
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {scopes.map((scope) => (
                <Link
                  key={scope.id}
                  href={`/dashboard/alcance/${scope.id}?month=${month}&year=${year}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "var(--bg-glass)",
                    borderRadius: "var(--radius-sm)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "all 0.15s ease",
                    border: "1px solid var(--border-glass)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                      {scope.orderNumber}
                    </span>
                    <span style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                      {scope.title}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span className={`badge ${
                      scope.entry?.status === "confirmed" ? "badge-complete" :
                      scope.entry?.narrativeText ? "badge-inprogress" :
                      "badge-pending"
                    }`}>
                      {scope.entry?.status === "confirmed" ? "✓ Confirmado" :
                       scope.entry?.narrativeText ? "◐ Generado" :
                       "○ Pendiente"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Documento a generar</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              background: "var(--bg-glass)", borderRadius: "var(--radius-sm)",
            }}>
              <span style={{ fontSize: "1.3rem" }}>📋</span>
              <span style={{ flex: 1, fontSize: "0.9rem" }}>Informe de Actividades (Formato Oficial)</span>
              <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)" }}>.docx</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%" }}
            onClick={() => setStep(2)}
            disabled={scopes.length === 0}
          >
            📋 Ir a la vista preliminar del informe
          </button>
        </div>
      )}

      {/* Step 2: Editable Preview Form */}
      {step === 2 && (
        <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Section A: Datos del Contrato */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📝 1. Información General del Contrato</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre del Contratista</label>
                <input
                  type="text"
                  value={tempContractorName}
                  onChange={(e) => setTempContractorName(e.target.value)}
                  className="form-input"
                  placeholder="Hamilton Eduardo Tello Villa"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cédula del Contratista</label>
                <input
                  type="text"
                  value={tempCcContratista}
                  onChange={(e) => setTempCcContratista(e.target.value)}
                  className="form-input"
                  placeholder="c.c. 9872319"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Número de Contrato</label>
                <input
                  type="text"
                  value={tempContractNumber}
                  onChange={(e) => setTempContractNumber(e.target.value)}
                  className="form-input"
                  placeholder="3227- 2026"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Entidad Contratante</label>
                <input
                  type="text"
                  value={tempEntity}
                  onChange={(e) => setTempEntity(e.target.value)}
                  className="form-input"
                  placeholder="Secretaría de Desarrollo..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Proyecto</label>
                <input
                  type="text"
                  value={tempProyecto}
                  onChange={(e) => setTempProyecto(e.target.value)}
                  className="form-input"
                  placeholder="Fortalecimiento del sector..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Dependencia</label>
                <input
                  type="text"
                  value={tempDependencia}
                  onChange={(e) => setTempDependencia(e.target.value)}
                  className="form-input"
                  placeholder="Dirección de Turismo..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Supervisor(a)</label>
                <input
                  type="text"
                  value={tempSupervisor}
                  onChange={(e) => setTempSupervisor(e.target.value)}
                  className="form-input"
                  placeholder="Nombre y cargo..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Plazo del Contrato</label>
                <input
                  type="text"
                  value={tempPlazo}
                  onChange={(e) => setTempPlazo(e.target.value)}
                  className="form-input"
                  placeholder="5 meses"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Valor Total del Contrato</label>
                <input
                  type="text"
                  value={tempValorTotal}
                  onChange={(e) => setTempValorTotal(e.target.value)}
                  className="form-input"
                  placeholder="20.000.000"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Valor del Periodo (Mensual)</label>
                <input
                  type="text"
                  value={tempValorMensual}
                  onChange={(e) => setTempValorMensual(e.target.value)}
                  className="form-input"
                  placeholder="4.000.000"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Total de Periodos</label>
                <input
                  type="number"
                  value={tempTotalPeriodos}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    setTempTotalPeriodos(val);
                    setPeriodoActual(`${month} de ${val}`);
                  }}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Título del Contrato (UI)</label>
                <input
                  type="text"
                  value={tempContractTitle}
                  onChange={(e) => setTempContractTitle(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label className="form-label">Objeto del Contrato</label>
              <textarea
                value={tempObjeto}
                onChange={(e) => setTempObjeto(e.target.value)}
                className="form-input"
                rows={3}
                placeholder="Prestación de servicios profesionales..."
              />
            </div>
          </div>

          {/* Section B: Detalles del Informe y Drive Link */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📅 Detalles del Informe de Actividades</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Informe de Actividades Nº</label>
                <input
                  type="text"
                  value={periodoActual}
                  onChange={(e) => setPeriodoActual(e.target.value)}
                  className="form-input"
                  placeholder="1 de 5"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Periodo Evaluado (Texto)</label>
                <input
                  type="text"
                  value={periodoTexto}
                  onChange={(e) => setPeriodoTexto(e.target.value)}
                  className="form-input"
                  placeholder="2 de febrero al 1 de marzo del 2026"
                />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label className="form-label">🔗 Link de Google Drive (Evidencias Unificadas)</label>
              <input
                type="text"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                className="form-input"
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </div>
          </div>

          {/* Section C: Firmas y Nombres de Responsables */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🗂️ Firmas de Responsables y Vo.Bo.</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              
              {/* Contratista */}
              <div style={{ background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>1. Contratista</span>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 8px 0" }}>{tempContractorName || "Hamilton Tello"}</p>
                {tempSigContratista && (
                  <div style={{ marginBottom: 8, background: "#fff", padding: 6, borderRadius: 4, display: "inline-block" }}>
                    <img src={tempSigContratista} alt="Firma Contratista" style={{ maxHeight: 50, maxWidth: 150 }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleSignatureFile(e, 'contratista')} style={{ fontSize: "0.75rem" }} />
              </div>

              {/* Supervisor */}
              <div style={{ background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>2. Supervisor(a)</span>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 8px 0" }}>{tempSupervisor || "Lizeth Cantillo"}</p>
                {tempSigSupervisor && (
                  <div style={{ marginBottom: 8, background: "#fff", padding: 6, borderRadius: 4, display: "inline-block" }}>
                    <img src={tempSigSupervisor} alt="Firma Supervisor" style={{ maxHeight: 50, maxWidth: 150 }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleSignatureFile(e, 'supervisor')} style={{ fontSize: "0.75rem" }} />
              </div>

              {/* Coordinadora */}
              <div style={{ background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>3. Vo.Bo. Coordinadora</span>
                <input
                  type="text"
                  value={tempNameCoordinador}
                  onChange={(e) => setTempNameCoordinador(e.target.value)}
                  className="form-input"
                  style={{ fontSize: "0.8rem", height: 28, marginBottom: 8 }}
                  placeholder="Nombre de la coordinadora"
                />
                {tempSigCoordinador && (
                  <div style={{ marginBottom: 8, background: "#fff", padding: 6, borderRadius: 4, display: "inline-block" }}>
                    <img src={tempSigCoordinador} alt="Firma Coordinadora" style={{ maxHeight: 50, maxWidth: 150 }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleSignatureFile(e, 'coordinadora')} style={{ fontSize: "0.75rem" }} />
              </div>

              {/* Abogada */}
              <div style={{ background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>4. Vo.Bo. Abogada Contratista</span>
                <input
                  type="text"
                  value={tempNameAbogado}
                  onChange={(e) => setTempNameAbogado(e.target.value)}
                  className="form-input"
                  style={{ fontSize: "0.8rem", height: 28, marginBottom: 8 }}
                  placeholder="Nombre de la abogada"
                />
                {tempSigAbogado && (
                  <div style={{ marginBottom: 8, background: "#fff", padding: 6, borderRadius: 4, display: "inline-block" }}>
                    <img src={tempSigAbogado} alt="Firma Abogada" style={{ maxHeight: 50, maxWidth: 150 }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleSignatureFile(e, 'abogada')} style={{ fontSize: "0.75rem" }} />
              </div>

            </div>
          </div>

          {/* Section D: Desarrollo (Actividades y Observaciones) */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">✏️ 2. Desarrollo del Contrato (Actividades y Observaciones)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {scopes.map((scope) => {
                const scopeActs = tempActivities[scope.id] || [];
                return (
                  <div key={scope.id} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border-glass)", paddingBottom: 8 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {scope.orderNumber}
                      </span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{scope.title}</span>
                    </div>

                    {scopeActs.length === 0 ? (
                      <div style={{ background: "rgba(0,0,0,0.15)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.03)" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent-primary)", marginBottom: 8, display: "block" }}>
                          Narrativa del Alcance (Fallback)
                        </span>
                        <textarea
                          rows={3}
                          value={stripHtml(scope.entry?.narrativeText) || "Sin actividades registradas."}
                          disabled
                          className="form-input"
                          style={{ fontSize: "0.8rem", resize: "none", opacity: 0.7 }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {scopeActs.map((act, actIdx) => (
                          <div key={act.id} style={{ background: "rgba(0,0,0,0.15)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.03)" }}>
                            <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent-primary)", marginBottom: 8 }}>
                              Actividad {scope.orderNumber}.${actIdx + 1}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
                              <div>
                                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 2 }}>Título</label>
                                <input
                                  type="text"
                                  value={act.title}
                                  onChange={(e) => {
                                    const updated = [...scopeActs];
                                    updated[actIdx].title = e.target.value;
                                    setTempActivities(prev => ({ ...prev, [scope.id]: updated }));
                                  }}
                                  className="form-input"
                                  style={{ fontSize: "0.8rem", height: "32px" }}
                                />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 2 }}>Fecha</label>
                                <input
                                  type="text"
                                  value={act.date || ""}
                                  onChange={(e) => {
                                    const updated = [...scopeActs];
                                    updated[actIdx].date = e.target.value;
                                    setTempActivities(prev => ({ ...prev, [scope.id]: updated }));
                                  }}
                                  className="form-input"
                                  style={{ fontSize: "0.8rem", height: "32px" }}
                                />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 2 }}>Lugar</label>
                                <input
                                  type="text"
                                  value={act.location || ""}
                                  onChange={(e) => {
                                    const updated = [...scopeActs];
                                    updated[actIdx].location = e.target.value;
                                    setTempActivities(prev => ({ ...prev, [scope.id]: updated }));
                                  }}
                                  className="form-input"
                                  style={{ fontSize: "0.8rem", height: "32px" }}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 2 }}>Propósito (Narrativa)</label>
                              <textarea
                                rows={2}
                                value={act.purpose}
                                onChange={(e) => {
                                    const updated = [...scopeActs];
                                    updated[actIdx].purpose = e.target.value;
                                    setTempActivities(prev => ({ ...prev, [scope.id]: updated }));
                                }}
                                className="form-input"
                                style={{ fontSize: "0.8rem", resize: "vertical" }}
                                placeholder="Propósito..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scope specific observations */}
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                        Observaciones del Alcance {scope.orderNumber}
                      </label>
                      <textarea
                        rows={2}
                        value={tempObservations[scope.id] || ""}
                        onChange={(e) => {
                          setTempObservations(prev => ({ ...prev, [scope.id]: e.target.value }));
                        }}
                        className="form-input"
                        style={{ fontSize: "0.8rem", resize: "vertical" }}
                        placeholder="Ingresa observaciones específicas sobre este alcance en este periodo (opcional)..."
                      />
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* WARNING ABOUT MISSING FIELDS */}
          {missingFields.length > 0 && (
            <div style={{
              padding: 12, background: "rgba(245,158,11,0.1)",
              borderRadius: "var(--radius-sm)", fontSize: "0.8rem",
              color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)",
            }}>
              ⚠️ <strong>Información faltante en el contrato o informe:</strong> {missingFields.map(f => f.label).join(", ")}. 
              El informe se puede generar, pero estos campos aparecerán vacíos o como N/A.
            </div>
          )}

          {/* LIABILITY DISCLAIMER CARD */}
          <div style={{
            padding: 16,
            background: "rgba(99,102,241,0.06)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(99,102,241,0.25)",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}>
            <h4 style={{ color: "var(--accent-primary)", fontSize: "0.9rem", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              ⚠️ Exención de Responsabilidad sobre Información y Firmas
            </h4>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
              La plataforma ContratoIA es una herramienta tecnológica de acompañamiento y facilitación en la estructuración de informes. 
              <strong> Cada contratista es el único y exclusivo responsable</strong> de la validez, veracidad y legitimidad de los datos provistos, así como de las imágenes de las firmas cargadas para los respectivos firmantes. La plataforma no realiza validación jurídica ni firma en representación de ningún funcionario, y queda exenta de toda responsabilidad civil, administrativa o penal derivada del contenido o uso de los informes generados.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer", fontWeight: 600, color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                style={{ cursor: "pointer", width: 15, height: 15 }}
              />
              <span>Acepto y declaro bajo mi responsabilidad que las firmas e información ingresada son válidas y legítimas.</span>
            </label>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={saving}>
              ← Atrás
            </button>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={handleSaveAndGenerate} 
              disabled={saving || !disclaimerAccepted}
              style={{ opacity: (!disclaimerAccepted || saving) ? 0.6 : 1, cursor: (!disclaimerAccepted) ? "not-allowed" : "pointer" }}
            >
              {saving ? "⏳ Guardando cambios..." : "⚡ Confirmar y Generar Informe Word"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === 3 && (
        <div className="card animate-in" style={{ textAlign: "center", padding: 48 }}>
          <div className="wizard-loading-icon" style={{ margin: "0 auto 24px" }}>
            <div className="wizard-spinner" />
          </div>
          <h2 style={{ fontSize: "1.15rem", marginBottom: 8 }}>
            {progressMessage || "Generando informe..."}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 24 }}>
            Procesando {scopes.length} alcances, anexos y construyendo tablas oficiales
          </p>
          <div className="progress-bar-container" style={{ height: 8, maxWidth: 400, margin: "0 auto" }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%`, transition: "width 0.3s ease" }} />
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 8 }}>
            {progress}%
          </div>
        </div>
      )}

      {/* Step 4: Download */}
      {step === 4 && (
        <div className="animate-in">
          <div className="card" style={{ textAlign: "center", padding: 48, marginBottom: 24 }}>
            <div style={{ fontSize: "4rem", marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 8 }}>
              ¡Informe generado exitosamente!
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 8 }}>
              {fileName}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24 }}>
              Con {scopes.length} alcances, observaciones y firmas autorizadas
            </p>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">📋 Descargar Informe de Actividades</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                {monthNames[month - 1]} {year} · .docx
              </span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={handleDownload}
            >
              📥 Descargar documento Word (.docx)
            </button>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href={`/dashboard?month=${month}&year=${year}`} className="btn btn-secondary" style={{ flex: 1, textAlign: "center" }}>
              ← Volver al Dashboard
            </Link>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => { setStep(1); setProgress(0); setDownloadUrl(null); setDisclaimerAccepted(false); }}
            >
              🔄 Generar otro informe
            </button>
          </div>
        </div>
      )}
    </>
  );
}
