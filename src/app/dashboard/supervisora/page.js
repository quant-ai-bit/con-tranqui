"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function SupervisoraPage() {
  const spanishToDateString = (str) => {
    if (!str) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const months = {
      enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
      julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12"
    };

    const clean = str.toLowerCase().replace(/del/g, "de").replace(/\s+/g, " ");
    
    // Case 1: with year (e.g., "28 de enero de 2026")
    const matchWithYear = clean.match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/);
    if (matchWithYear) {
      const day = matchWithYear[1].padStart(2, "0");
      const month = months[matchWithYear[2]];
      const year = matchWithYear[3];
      if (month) return `${year}-${month}-${day}`;
    }

    // Case 2: without year (e.g., "19 de febrero")
    const matchNoYear = clean.match(/(\d{1,2})\s+de\s+([a-z]+)/);
    if (matchNoYear) {
      const day = matchNoYear[1].padStart(2, "0");
      const month = months[matchNoYear[2]];
      const year = "2026"; // default year for the contract
      if (month) return `${year}-${month}-${day}`;
    }

    return "";
  };

  const dateStringToSpanish = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    if (monthIdx >= 0 && monthIdx <= 11) {
      return `${day} de ${months[monthIdx]} de ${year}`;
    }
    return dateStr;
  };

  const [step, setStep] = useState(1); // 1: Form, 2: Preview, 3: Generating, 4: Download
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [month, setMonth] = useState(() => new Date().getMonth() + 1); // mes actual por defecto
  const [year, setYear] = useState(() => new Date().getFullYear()); // año actual por defecto

  const [supervisorName, setSupervisorName] = useState("LIZETH CANTILLO RAMIREZ");
  const [recipientName, setRecipientName] = useState("CRISTIAN DAVID TORO CALLE");
  const [recipientTitle, setRecipientTitle] = useState("Secretario de Desarrollo Económico y Competitividad");
  const [totalValue, setTotalValue] = useState(20000000);
  const [paymentsToDate, setPaymentsToDate] = useState(4000000);
  const [secopUrl, setSecopUrl] = useState("https://www.secop.gov.co/CO1ContractsManagement/Tendering/SalesContractEdit/View?docUniqueIdentifier=CO1.SLCNTR.16845144");
  const [novedades, setNovedades] = useState("Durante el presente período no se han presentado novedades o situaciones anormales que afecten el desarrollo del contrato.");
  const [startDateStr, setStartDateStr] = useState("2 De febrero del 2026");
  const [endDateStr, setEndDateStr] = useState("1 de Julio del 2026");
  const [plazoStr, setPlazoStr] = useState("5 meses");
  const [fechaContrato, setFechaContrato] = useState("28 de enero de 2026");
  const [nombreContratista, setNombreContratista] = useState("HAMILTON EDUARDO TELLO VILLA");
  const [ccContratista, setCcContratista] = useState("");
  const [estadoGarantias, setEstadoGarantias] = useState("n/a");
  const [matrizRiesgos, setMatrizRiesgos] = useState("Sin afectación.");
  const [tempSigSupervisor, setTempSigSupervisor] = useState("");

  // Preview editable state for scope narratives
  const [tempNarratives, setTempNarratives] = useState({});
  const [saving, setSaving] = useState(false);
  const [generatingNarratives, setGeneratingNarratives] = useState({});
  const [generatingAllNarratives, setGeneratingAllNarratives] = useState(false);

  const generateNarrative = async (scopeId) => {
    setGeneratingNarratives(prev => ({ ...prev, [scopeId]: true }));
    try {
      const res = await fetch(`/api/scopes/${scopeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, mode: "auto" }),
      });
      if (!res.ok) throw new Error("Error al generar la narrativa");
      const result = await res.json();
      if (result.success && result.narrativeText) {
        setTempNarratives(prev => ({ ...prev, [scopeId]: result.narrativeText }));
      }
    } catch (err) {
      alert(`No se pudo generar la narrativa: ${err.message}`);
    } finally {
      setGeneratingNarratives(prev => ({ ...prev, [scopeId]: false }));
    }
  };

  const generateAllNarratives = async () => {
    if (!data?.scopes) return;
    setGeneratingAllNarratives(true);
    try {
      for (const scope of data.scopes) {
        setGeneratingNarratives(prev => ({ ...prev, [scope.id]: true }));
        const res = await fetch(`/api/scopes/${scope.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month, year, mode: "auto" }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.narrativeText) {
            setTempNarratives(prev => ({ ...prev, [scope.id]: result.narrativeText }));
          }
        }
        setGeneratingNarratives(prev => ({ ...prev, [scope.id]: false }));
      }
    } catch (err) {
      alert("Error al generar todas las narrativas: " + err.message);
    } finally {
      setGeneratingAllNarratives(false);
    }
  };

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

  // Fetch dashboard/contract data
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

  // Sync tempNarratives with scope entries and autofill fields
  useEffect(() => {
    if (data?.scopes) {
      const initialNarratives = {};
      data.scopes.forEach((s) => {
        initialNarratives[s.id] = s.entry?.narrativeText || "";
      });
      setTempNarratives(initialNarratives);
    }

    if (data?.contract) {
      const c = data.contract;
      if (c.supervisor) setSupervisorName(c.supervisor);
      if (c.plazo) setPlazoStr(c.plazo);
      if (c.sigSupervisor) setTempSigSupervisor(c.sigSupervisor);

      // Format start date (prefer Spanish string field if present)
      if (c.fechaInicio) {
        setStartDateStr(c.fechaInicio);
      } else if (c.startDate) {
        const start = new Date(c.startDate);
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const day = start.getDate();
        const mText = months[start.getMonth()];
        const y = start.getFullYear();
        setStartDateStr(`${day} de ${mText} del ${y}`);
      }
      
      // Format end date (prefer Spanish string field if present)
      if (c.fechaTerminacion) {
        setEndDateStr(c.fechaTerminacion);
      } else if (c.endDate) {
        const end = new Date(c.endDate);
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const day = end.getDate();
        const mText = months[end.getMonth()];
        const y = end.getFullYear();
        setEndDateStr(`${day} de ${mText} del ${y}`);
      }

      if (c.fechaContrato) setFechaContrato(c.fechaContrato);
      if (c.nombreContratista) setNombreContratista(c.nombreContratista);
      if (c.ccContratista) setCcContratista(c.ccContratista);
      if (c.estadoGarantias) setEstadoGarantias(c.estadoGarantias);
      if (c.matrizRiesgos) setMatrizRiesgos(c.matrizRiesgos);

      // Financials
      const parseCurrency = (str) => {
        if (!str) return 0;
        const cleaned = str.replace(/[^0-9.-]+/g, "");
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };
      
      const total = parseCurrency(c.valorTotal) || 20000000;
      setTotalValue(total);

      if (c.pagosRealizados) {
        setPaymentsToDate(parseCurrency(c.pagosRealizados));
      } else {
        // Calculate execution month based on current month/year selection
        const mensual = parseCurrency(c.valorMensual) || 4000000;
        if (c.startDate) {
          const start = new Date(c.startDate);
          const startYear = start.getFullYear();
          const startMonth = start.getMonth() + 1;
          const diffMonths = (year - startYear) * 12 + (month - startMonth) + 1;
          const period = Math.max(1, Math.min(diffMonths, c.totalPeriodos || 5));
          setPaymentsToDate(period * mensual);
        } else {
          // Fallback offset calculations starting Feb 2026
          const diffMonths = (year - 2026) * 12 + (month - 2) + 1;
          const period = Math.max(1, Math.min(diffMonths, c.totalPeriodos || 5));
          setPaymentsToDate(period * mensual);
        }
      }
    }
  }, [data, month, year]);

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

  const handleSignatureFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Por favor carga un archivo de imagen válido (PNG, JPG, JPEG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempSigSupervisor(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    setStep(2); // Transition to editable preview
  };

  const handleSaveAndGenerate = async () => {
    setSaving(true);
    setError("");

    try {
      // 1. Save all modified narratives to the database
      const saveNarrativePromises = data.scopes.map((scope) => {
        const narrativeText = tempNarratives[scope.id] || "";
        return fetch(`/api/scopes/${scope.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            narrativeText,
            status: "confirmed",
            month,
            year,
          }),
        });
      });

      const saveResults = await Promise.all(saveNarrativePromises);
      const failedSave = saveResults.find((r) => !r.ok);
      if (failedSave) {
        throw new Error("Error al guardar una o más narrativas de los alcances");
      }

      // 2. Save contract metadata and supervisor signature
      const numTotal = parseFloat(totalValue) || 0;
      const numPaid = parseFloat(paymentsToDate) || 0;
      const numRemaining = numTotal - numPaid;
      const pctEjecucion = numTotal > 0 ? Math.round((numPaid / numTotal) * 100) : 0;
      const pctPorEjecutar = 100 - pctEjecucion;

      const formatColCurrency = (num) => {
        return "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(num);
      };

      const contractRes = await fetch("/api/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.contract.id,
          plazo: plazoStr,
          supervisor: supervisorName,
          valorTotal: formatColCurrency(numTotal),
          sigSupervisor: tempSigSupervisor,
          fechaInicio: startDateStr,
          fechaTerminacion: endDateStr,
          pagosRealizados: formatColCurrency(numPaid),
          saldoPendiente: formatColCurrency(numRemaining),
          porcentajeEjecucion: `${pctEjecucion}%`,
          porcentajePorEjecutar: `${pctPorEjecutar}%`,
          fechaContrato: fechaContrato,
          nombreContratista: nombreContratista,
          ccContratista: ccContratista,
          estadoGarantias: estadoGarantias,
          matrizRiesgos: matrizRiesgos,
        }),
      });

      if (!contractRes.ok) {
        const err = await contractRes.json();
        throw new Error(err.error || "Error al guardar los datos del contrato");
      }

      // Update local state
      setData((prev) => ({
        ...prev,
        contract: {
          ...prev.contract,
          plazo: plazoStr,
          supervisor: supervisorName,
          valorTotal: formatColCurrency(numTotal),
          sigSupervisor: tempSigSupervisor,
          fechaInicio: startDateStr,
          fechaTerminacion: endDateStr,
          pagosRealizados: formatColCurrency(numPaid),
          saldoPendiente: formatColCurrency(numRemaining),
          porcentajeEjecucion: `${pctEjecucion}%`,
          porcentajePorEjecutar: `${pctPorEjecutar}%`,
          fechaContrato: fechaContrato,
          nombreContratista: nombreContratista,
          ccContratista: ccContratista,
          estadoGarantias: estadoGarantias,
          matrizRiesgos: matrizRiesgos,
        },
        scopes: prev.scopes.map((scope) => ({
          ...scope,
          entry: {
            ...scope.entry,
            narrativeText: tempNarratives[scope.id],
            status: "confirmed",
          },
        })),
      }));

      setSaving(false);
      // Trigger Word compilation
      await triggerGeneration();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar los cambios de las narrativas");
      setSaving(false);
    }
  };

  const triggerGeneration = async () => {
    if (!data?.contract) return;

    setGenerating(true);
    setStep(3);

    const messages = [
      "Verificando datos financieros...",
      "Obteniendo narrativas de obligaciones del contratista...",
      "Creando estructura del informe de supervisión...",
      "Calculando porcentajes de ejecución...",
      "Compilando documento de Word...",
      "Generando firmas...",
      "Guardando archivo...",
    ];

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 14;
      if (p > 90) p = 90;
      setProgress(Math.round(p));
      const idx = Math.min(Math.floor(p / 13), messages.length - 1);
      setProgressMessage(messages[idx]);
    }, 500);

    try {
      const response = await fetch("/api/reports/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: data.contract.id,
          month,
          year,
          supervisorName,
          recipientName,
          recipientTitle,
          totalValue,
          paymentsToDate,
          secopUrl,
          novedades,
          startDateStr,
          endDateStr,
          plazoStr,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al generar informe de supervisión");
      }

      const result = await response.json();
      setDownloadUrl(result.downloadUrl);
      setFileName(result.fileName);
      setProgress(100);
      setProgressMessage("¡Informe de Supervisión generado!");

      setTimeout(() => {
        setGenerating(false);
        setStep(4);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
      setStep(2);
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
            <h1 className="main-title">Informe de Supervisión</h1>
            <p className="main-subtitle">No hay contratos configurados</p>
          </div>
        </div>
        <div className="card animate-in" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Primero necesitas configurar un contrato para poder generar el informe de supervisión.
          </p>
          <Link href="/dashboard/setup" className="btn btn-primary">
            🔧 Configurar contrato
          </Link>
        </div>
      </>
    );
  }

  const numericTotal = parseFloat(totalValue) || 20000000;
  const numericPaid = parseFloat(paymentsToDate) || 4000000;
  const numericRemaining = numericTotal - numericPaid;
  const executionPercent = Math.round((numericPaid / numericTotal) * 100) || 0;

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
          <h1 className="main-title">Informe de Supervisión</h1>
          <p className="main-subtitle">
            Generador del informe de ejecución del supervisor ({data.contract.contractNumber ? `Contrato No. ${data.contract.contractNumber}` : data.contract.title})
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
        {["Verificar Datos", "Vista Preliminar", "Generar", "Descargar"].map((label, i) => (
          <div
            key={i}
            className={`wizard-step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "completed" : ""}`}
          >
            <div className="wizard-step-circle">
              {step > i + 1 ? "✓" : ["👩‍💼", "📝", "🤖", "📥"][i]}
            </div>
            <span className="wizard-step-label">{label}</span>
            {i < 3 && <div className="wizard-step-line" />}
          </div>
        ))}
      </div>

      {/* Step 1: Form */}
      {step === 1 && (
        <form onSubmit={handleGenerate} className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            
            {/* Aspectos Generales del Contrato */}
            <div className="card animate-in">
              <div className="card-header">
                <span className="card-title">📋 Aspectos Generales del Contrato</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Nombre del Supervisor
                    </label>
                    <input
                      type="text"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Fecha del Contrato (Suscripción)
                    </label>
                    <input
                      type="date"
                      value={spanishToDateString(fechaContrato)}
                      onChange={(e) => setFechaContrato(dateStringToSpanish(e.target.value))}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Nombre del Contratista
                    </label>
                    <input
                      type="text"
                      value={nombreContratista}
                      onChange={(e) => setNombreContratista(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Identificación del Contratista (CC)
                    </label>
                    <input
                      type="text"
                      value={ccContratista}
                      onChange={(e) => setCcContratista(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Destinatario del Informe
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Cargo Destinatario
                    </label>
                    <input
                      type="text"
                      value={recipientTitle}
                      onChange={(e) => setRecipientTitle(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Plazo total
                    </label>
                    <input
                      type="text"
                      value={plazoStr}
                      onChange={(e) => setPlazoStr(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 5 meses"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={spanishToDateString(startDateStr)}
                      onChange={(e) => setStartDateStr(dateStringToSpanish(e.target.value))}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Fecha Terminación
                    </label>
                    <input
                      type="date"
                      value={spanishToDateString(endDateStr)}
                      onChange={(e) => setEndDateStr(dateStringToSpanish(e.target.value))}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Estado Financiero */}
            <div className="card animate-in">
              <div className="card-header">
                <span className="card-title">💰 Estado Financiero y Garantías</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Valor Total Contrato ($)
                    </label>
                    <input
                      type="number"
                      value={totalValue}
                      onChange={(e) => setTotalValue(parseInt(e.target.value) || 0)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Pagado a la fecha ($)
                    </label>
                    <input
                      type="number"
                      value={paymentsToDate}
                      onChange={(e) => setPaymentsToDate(parseInt(e.target.value) || 0)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Estado de las Garantías
                    </label>
                    <input
                      type="text"
                      value={estadoGarantias}
                      onChange={(e) => setEstadoGarantias(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Matriz de Riesgos
                    </label>
                    <input
                      type="text"
                      value={matrizRiesgos}
                      onChange={(e) => setMatrizRiesgos(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                {/* Ledger preview */}
                <div style={{
                  padding: "10px 14px", background: "rgba(255,255,255,0.03)", 
                  borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)",
                  fontSize: "0.8rem", display: "flex", justifyContent: "space-between"
                }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Saldo: </span>
                    <span style={{ fontWeight: 600 }}>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(numericRemaining)}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Ejecutado: </span>
                    <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>{executionPercent}%</span>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Enlace de SECOP II
                  </label>
                  <input
                    type="text"
                    value={secopUrl}
                    onChange={(e) => setSecopUrl(e.target.value)}
                    className="form-input"
                    placeholder="Deja vacío si deseas espacio en blanco"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Novedades o Situaciones Anormales
                  </label>
                  <textarea
                    value={novedades}
                    onChange={(e) => setNovedades(e.target.value)}
                    className="form-input"
                    rows={2}
                    required
                  />
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Signature Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">✍️ Firma del Supervisor(a)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Carga tu firma digital (PNG/JPG) para estamparla al final del informe.
                </p>
                {tempSigSupervisor && (
                  <div style={{ display: "inline-block", background: "#fff", padding: 8, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)", alignSelf: "flex-start" }}>
                    <img src={tempSigSupervisor} alt="Firma Supervisor" style={{ maxHeight: 60, maxWidth: 180 }} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureFile}
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Scopes Overview Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📝 Obligaciones a Incluir ({monthNames[month - 1]} {year})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.scopes?.map((scope) => (
                  <div key={scope.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-glass)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {scope.orderNumber}
                      </span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "250px" }}>
                        {scope.title}
                      </span>
                    </div>
                    <span className={`badge ${scope.entry?.status === "confirmed" ? "badge-complete" : "badge-pending"}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                      {scope.entry?.status === "confirmed" ? "✓ Narrativa Lista" : "○ Sin Narrativa"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
            📋 Ir a la vista preliminar del informe
          </button>
        </form>
      )}

      {/* Step 2: Editable Preview */}
      {step === 2 && (
        <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Vista Oficio */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">✉️ Estructura del Oficio de Supervisión</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha y Ciudad</label>
                  <input
                    type="text"
                    value={`Pereira, ${monthNames[month - 1]} del ${year}`}
                    className="form-input"
                    disabled
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Destinatario</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="form-input"
                    placeholder="Nombre del destinatario"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cargo Destinatario</label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    className="form-input"
                    placeholder="Cargo del destinatario"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre del Supervisor</label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="form-input"
                    placeholder="Supervisor"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0, marginTop: 12 }}>
                <label className="form-label">Asunto (Automático)</label>
                <div style={{ padding: "12px", background: "rgba(0,0,0,0.15)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Asunto: Informe de ejecución del contrato No. {data.contract.contractNumber || "N/A"} suscrito con {data.contract.user?.name || "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Aspectos Financieros y Novedades */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">💰 Datos Financieros e Información General</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label className="form-label">Plazo de ejecución</label>
                <input
                  type="text"
                  value={plazoStr}
                  onChange={(e) => setPlazoStr(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Fecha Inicio</label>
                <input
                  type="date"
                  value={spanishToDateString(startDateStr)}
                  onChange={(e) => setStartDateStr(dateStringToSpanish(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Fecha Fin</label>
                <input
                  type="date"
                  value={spanishToDateString(endDateStr)}
                  onChange={(e) => setEndDateStr(dateStringToSpanish(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Fecha del Contrato</label>
                <input
                  type="date"
                  value={spanishToDateString(fechaContrato)}
                  onChange={(e) => setFechaContrato(dateStringToSpanish(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Nombre Contratista</label>
                <input
                  type="text"
                  value={nombreContratista}
                  onChange={(e) => setNombreContratista(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Identificación Contratista</label>
                <input
                  type="text"
                  value={ccContratista}
                  onChange={(e) => setCcContratista(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Estado de Garantías</label>
                <input
                  type="text"
                  value={estadoGarantias}
                  onChange={(e) => setEstadoGarantias(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Matriz de Riesgos</label>
                <input
                  type="text"
                  value={matrizRiesgos}
                  onChange={(e) => setMatrizRiesgos(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              <div>
                <label className="form-label">Valor Total Contrato ($)</label>
                <input
                  type="number"
                  value={totalValue}
                  onChange={(e) => setTotalValue(parseInt(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Pagos realizados ($)</label>
                <input
                  type="number"
                  value={paymentsToDate}
                  onChange={(e) => setPaymentsToDate(parseInt(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label className="form-label">Enlace de SECOP II</label>
              <input
                type="text"
                value={secopUrl}
                onChange={(e) => setSecopUrl(e.target.value)}
                className="form-input"
                placeholder="Enlace SECOP II..."
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <label className="form-label">Novedades o Situaciones Anormales</label>
              <textarea
                value={novedades}
                onChange={(e) => setNovedades(e.target.value)}
                className="form-input"
                rows={3}
              />
            </div>
          </div>

          {/* Signature Card Step 2 */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">✍️ Firma del Supervisor(a)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tempSigSupervisor ? (
                <div style={{ display: "inline-block", background: "#fff", padding: 8, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)", alignSelf: "flex-start" }}>
                  <img src={tempSigSupervisor} alt="Firma Supervisor" style={{ maxHeight: 60, maxWidth: 180 }} />
                </div>
              ) : (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  No se ha cargado ninguna firma. El documento se generará con un espacio en blanco para firmar.
                </p>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureFile}
                style={{ fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* Narrativas de las Obligaciones */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <span className="card-title">📋 Narrativas de las Obligaciones del Contratista</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={generateAllNarratives}
                disabled={generatingAllNarratives || saving}
                style={{ fontSize: "0.75rem", padding: "6px 12px", background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-primary)", border: "1px solid rgba(99, 102, 241, 0.3)", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {generatingAllNarratives ? (
                  <>
                    <span className="wizard-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    Generando todas...
                  </>
                ) : (
                  "✨ Autogenerar todas desde actividades"
                )}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {data.scopes?.map((scope) => (
                <div key={scope.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {scope.orderNumber}
                      </span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{scope.title}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => generateNarrative(scope.id)}
                      disabled={generatingNarratives[scope.id] || generatingAllNarratives || saving}
                      style={{ color: "var(--accent-primary)", padding: "4px 10px", fontSize: "0.75rem", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.05)" }}
                    >
                      {generatingNarratives[scope.id] ? "⏳ Generando..." : "✨ Autogenerar"}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={tempNarratives[scope.id] || ""}
                    onChange={(e) => setTempNarratives(prev => ({ ...prev, [scope.id]: e.target.value }))}
                    className="form-input"
                    style={{ fontSize: "0.85rem", resize: "vertical", lineHeight: 1.6 }}
                    placeholder="Escribe la narrativa para esta obligación..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={saving}>
              ← Atrás
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleSaveAndGenerate} disabled={saving}>
              {saving ? "⏳ Guardando cambios..." : "⚡ Confirmar y Generar Word de Supervisión"}
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
            Compilando datos financieros, matriz de riesgos y narrativas mensuales en Word.
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
              ¡Informe de Supervisión creado con éxito!
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 8 }}>
              {fileName}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24 }}>
              Contiene el estado financiero detallado y el consolidado mensual de las {data.scopes?.length || 0} obligaciones del contratista.
            </p>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">📋 Informe de Supervisión</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                {monthNames[month - 1]} {year} · .docx
              </span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={handleDownload}
            >
              📥 Descargar Informe de Supervisión (.docx)
            </button>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href={`/dashboard?month=${month}&year=${year}`} className="btn btn-secondary" style={{ flex: 1, textAlign: "center" }}>
              ← Volver al Dashboard
            </Link>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => { setStep(1); setProgress(0); setDownloadUrl(null); }}
            >
              🔄 Generar otro informe
            </button>
          </div>
        </div>
      )}
    </>
  );
}
