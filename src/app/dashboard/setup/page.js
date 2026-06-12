"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STEPS = [
  { number: 1, title: "Subir documento", icon: "📄" },
  { number: 2, title: "Extracción IA", icon: "🤖" },
  { number: 3, title: "Revisar alcances", icon: "✏️" },
  { number: 4, title: "Guardar", icon: "✅" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [inputMode, setInputMode] = useState("file"); // "file" or "paste"
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [editableScopes, setEditableScopes] = useState([]);
  const [contractTitle, setContractTitle] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [entity, setEntity] = useState("");
  const [objeto, setObjeto] = useState("");
  const [plazo, setPlazo] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [ccContratista, setCcContratista] = useState("");
  const [fechaContrato, setFechaContrato] = useState("");
  const [nombreContratista, setNombreContratista] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTerminacion, setFechaTerminacion] = useState("");
  const [pagosRealizados, setPagosRealizados] = useState("");
  const [saldoPendiente, setSaldoPendiente] = useState("");
  const [porcentajeEjecucion, setPorcentajeEjecucion] = useState("");
  const [porcentajePorEjecutar, setPorcentajePorEjecutar] = useState("");
  const [estadoGarantias, setEstadoGarantias] = useState("");
  const [matrizRiesgos, setMatrizRiesgos] = useState("");
  const [detectedFields, setDetectedFields] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef(null);

  // Helper functions for date conversion
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

  // Helper to render contract fields with detection and error alerts
  const renderContractField = (id, label, value, setter, placeholder, isTextArea = false, isDate = false) => {
    const isDetected = detectedFields[id];
    const hasError = validationErrors[id];
    
    return (
      <div className="form-group" style={{ marginBottom: 0 }} id={`field-${id}`}>
        <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>{label} *</span>
          {isDetected === false && (
            <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
              ⚠️ No detectado
            </span>
          )}
        </label>
        {isTextArea ? (
          <textarea
            className="form-input animate-in"
            rows={3}
            value={value}
            onChange={(e) => {
              setter(e.target.value);
              if (validationErrors[id]) {
                setValidationErrors(prev => {
                  const copy = { ...prev };
                  delete copy[id];
                  return copy;
                });
              }
            }}
            placeholder={placeholder}
            style={{
              borderColor: hasError ? "rgb(239, 68, 68)" : (isDetected === false ? "rgba(245, 158, 11, 0.4)" : ""),
              resize: "vertical"
            }}
          />
        ) : isDate ? (
          <input
            type="date"
            className="form-input animate-in"
            value={spanishToDateString(value)}
            onChange={(e) => {
              setter(dateStringToSpanish(e.target.value));
              if (validationErrors[id]) {
                setValidationErrors(prev => {
                  const copy = { ...prev };
                  delete copy[id];
                  return copy;
                });
              }
            }}
            style={{
              borderColor: hasError ? "rgb(239, 68, 68)" : (isDetected === false ? "rgba(245, 158, 11, 0.4)" : "")
            }}
          />
        ) : (
          <input
            className="form-input animate-in"
            value={value}
            onChange={(e) => {
              setter(e.target.value);
              if (validationErrors[id]) {
                setValidationErrors(prev => {
                  const copy = { ...prev };
                  delete copy[id];
                  return copy;
                });
              }
            }}
            placeholder={placeholder}
            style={{
              borderColor: hasError ? "rgb(239, 68, 68)" : (isDetected === false ? "rgba(245, 158, 11, 0.4)" : "")
            }}
          />
        )}
        {hasError && (
          <span style={{ fontSize: "0.75rem", color: "rgb(239, 68, 68)", marginTop: 4, display: "block" }}>
            {hasError}
          </span>
        )}
      </div>
    );
  };

  // --- FILE HANDLING ---
  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Formato no soportado. Usa PDF, Word (.docx) o texto plano.");
      return;
    }
    setError("");
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragover(false);
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  // --- TEXT EXTRACTION FROM FILE ---
  const extractTextFromFile = useCallback(async (fileObj) => {
    if (fileObj.type === "text/plain") {
      return await fileObj.text();
    }
    // For PDF/Word, read raw text (server will handle parsing in production)
    const text = await fileObj.text();
    return text;
  }, []);

  // --- STEP 1 → STEP 2: EXTRACT SCOPES ---
  const handleExtract = useCallback(async () => {
    setError("");
    setLoading(true);
    setStep(2);

    const messages = [
      "Leyendo el documento...",
      "Analizando estructura del contrato...",
      "Identificando obligaciones específicas...",
      "Extrayendo alcances con IA...",
      "Deduciendo evidencias requeridas...",
      "Finalizando extracción...",
    ];

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 92) progress = 92;
      setLoadingProgress(Math.round(progress));
      const msgIndex = Math.min(
        Math.floor(progress / 18),
        messages.length - 1
      );
      setLoadingMessage(messages[msgIndex]);
    }, 800);

    try {
      const formData = new FormData();
      if (inputMode === "paste") {
        const textBlob = new Blob([pastedText], { type: "text/plain" });
        formData.append("file", textBlob, "texto_pegado.txt");
      } else if (file) {
        formData.append("file", file);
      } else {
        throw new Error("No se ha seleccionado ningún archivo o texto.");
      }

      const response = await fetch("/api/extract-scopes", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error en la extracción");
      }

      const data = await response.json();
      setContractTitle(data.contractTitle || "");
      setContractNumber(data.contractNumber || "");
      setEntity(data.entity || "");
      setObjeto(data.objeto || "");
      setPlazo(data.plazo || "");
      setValorTotal(data.valorTotal || "");
      setCcContratista(data.ccContratista || "");
      setFechaContrato(data.fechaContrato || "");
      setNombreContratista(data.nombreContratista || "");
      setFechaInicio(data.fechaInicio || "");
      setFechaTerminacion(data.fechaTerminacion || "");
      setPagosRealizados(data.pagosRealizados || "");
      setSaldoPendiente(data.saldoPendiente || "");
      setPorcentajeEjecucion(data.porcentajeEjecucion || "");
      setPorcentajePorEjecutar(data.porcentajePorEjecutar || "");
      setEstadoGarantias(data.estadoGarantias || "");
      setMatrizRiesgos(data.matrizRiesgos || "");
      
      // Track which fields were successfully detected (non-empty strings)
      setDetectedFields({
        contractTitle: !!data.contractTitle && data.contractTitle.trim().length > 0,
        contractNumber: !!data.contractNumber && data.contractNumber.trim().length > 0,
        entity: !!data.entity && data.entity.trim().length > 0,
        objeto: !!data.objeto && data.objeto.trim().length > 0,
        plazo: !!data.plazo && data.plazo.trim().length > 0,
        valorTotal: !!data.valorTotal && data.valorTotal.trim().length > 0,
        ccContratista: !!data.ccContratista && data.ccContratista.trim().length > 0,
        fechaContrato: !!data.fechaContrato && data.fechaContrato.trim().length > 0,
        nombreContratista: !!data.nombreContratista && data.nombreContratista.trim().length > 0,
        fechaInicio: !!data.fechaInicio && data.fechaInicio.trim().length > 0,
        fechaTerminacion: !!data.fechaTerminacion && data.fechaTerminacion.trim().length > 0,
        pagosRealizados: !!data.pagosRealizados && data.pagosRealizados.trim().length > 0,
        saldoPendiente: !!data.saldoPendiente && data.saldoPendiente.trim().length > 0,
        porcentajeEjecucion: !!data.porcentajeEjecucion && data.porcentajeEjecucion.trim().length > 0,
        porcentajePorEjecutar: !!data.porcentajePorEjecutar && data.porcentajePorEjecutar.trim().length > 0,
        estadoGarantias: !!data.estadoGarantias && data.estadoGarantias.trim().length > 0,
        matrizRiesgos: !!data.matrizRiesgos && data.matrizRiesgos.trim().length > 0,
      });

      setEditableScopes(
        (data.scopes || []).map((s, i) => ({
          ...s,
          orderNumber: s.orderNumber || i + 1,
          _editing: false,
          _expanded: false,
        }))
      );

      setLoadingProgress(100);
      setLoadingMessage("¡Extracción completada!");

      setTimeout(() => {
        setStep(3);
        setLoading(false);
      }, 600);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || "Error al extraer los alcances");
      setStep(1);
      setLoading(false);
    }
  }, [file, pastedText, inputMode]);

  // --- SCOPE EDITING ---
  const updateScope = useCallback((index, field, value) => {
    setEditableScopes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }, []);

  const toggleExpand = useCallback((index) => {
    setEditableScopes((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, _expanded: !s._expanded } : s
      )
    );
  }, []);

  const removeScope = useCallback((index) => {
    setEditableScopes((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((s, i) => ({ ...s, orderNumber: i + 1 }));
    });
  }, []);

  const addScope = useCallback(() => {
    setEditableScopes((prev) => [
      ...prev,
      {
        orderNumber: prev.length + 1,
        title: "",
        description: "",
        requiredEvidences: [],
        _editing: true,
        _expanded: true,
      },
    ]);
  }, []);

  const addEvidence = useCallback((scopeIndex) => {
    setEditableScopes((prev) =>
      prev.map((s, i) =>
        i === scopeIndex
          ? { ...s, requiredEvidences: [...s.requiredEvidences, ""] }
          : s
      )
    );
  }, []);

  const updateEvidence = useCallback((scopeIndex, evIndex, value) => {
    setEditableScopes((prev) =>
      prev.map((s, i) =>
        i === scopeIndex
          ? {
              ...s,
              requiredEvidences: s.requiredEvidences.map((ev, j) =>
                j === evIndex ? value : ev
              ),
            }
          : s
      )
    );
  }, []);

  const removeEvidence = useCallback((scopeIndex, evIndex) => {
    setEditableScopes((prev) =>
      prev.map((s, i) =>
        i === scopeIndex
          ? {
              ...s,
              requiredEvidences: s.requiredEvidences.filter(
                (_, j) => j !== evIndex
              ),
            }
          : s
      )
    );
  }, []);

  // --- STEP 3 → STEP 4: SAVE ---
  const handleSave = useCallback(async () => {
    // Validate all required contract metadata fields
    const errors = {};
    if (!contractTitle || !contractTitle.trim()) errors.contractTitle = "El título del contrato es requerido.";
    if (!contractNumber || !contractNumber.trim()) errors.contractNumber = "El número de contrato es requerido.";
    if (!entity || !entity.trim()) errors.entity = "La entidad contratante es requerida.";
    if (!fechaContrato || !fechaContrato.trim()) errors.fechaContrato = "La fecha de suscripción es requerida.";
    if (!nombreContratista || !nombreContratista.trim()) errors.nombreContratista = "El nombre del contratista es requerido.";
    if (!ccContratista || !ccContratista.trim()) errors.ccContratista = "La identificación (CC) del contratista es requerida.";
    if (!objeto || !objeto.trim()) errors.objeto = "El objeto del contrato es requerido.";
    if (!plazo || !plazo.trim()) errors.plazo = "El plazo de ejecución es requerido.";
    if (!fechaInicio || !fechaInicio.trim()) errors.fechaInicio = "La fecha de inicio es requerida.";
    if (!fechaTerminacion || !fechaTerminacion.trim()) errors.fechaTerminacion = "La fecha de terminación es requerida.";
    if (!valorTotal || !valorTotal.trim()) errors.valorTotal = "El valor total es requerido.";
    if (!pagosRealizados || !pagosRealizados.trim()) errors.pagosRealizados = "Los pagos realizados son requeridos.";
    if (!saldoPendiente || !saldoPendiente.trim()) errors.saldoPendiente = "El saldo pendiente es requerido.";
    if (!porcentajeEjecucion || !porcentajeEjecucion.trim()) errors.porcentajeEjecucion = "El porcentaje de ejecución es requerido.";
    if (!porcentajePorEjecutar || !porcentajePorEjecutar.trim()) errors.porcentajePorEjecutar = "El porcentaje por ejecutar es requerido.";
    if (!estadoGarantias || !estadoGarantias.trim()) errors.estadoGarantias = "El estado de garantías es requerido.";
    if (!matrizRiesgos || !matrizRiesgos.trim()) errors.matrizRiesgos = "La matriz de riesgos es requerida.";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError("Por favor completa toda la información básica requerida del contrato para finalizar la configuración.");
      // Scroll to first error field
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(`field-${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (editableScopes.length === 0) {
      setError("Agrega al menos un alcance.");
      return;
    }
    const emptyScopes = editableScopes.filter((s) => !s.title.trim());
    if (emptyScopes.length > 0) {
      setError("Hay alcances sin título. Por favor, complétalos.");
      return;
    }

    setValidationErrors({});
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: contractTitle,
          contractNumber: contractNumber,
          entity: entity,
          sourceFileName: file?.name || "texto_pegado",
          objeto,
          plazo,
          valorTotal,
          ccContratista,
          fechaContrato,
          nombreContratista,
          fechaInicio,
          fechaTerminacion,
          pagosRealizados,
          saldoPendiente,
          porcentajeEjecucion,
          porcentajePorEjecutar,
          estadoGarantias,
          matrizRiesgos,
          scopes: editableScopes.map((s) => ({
            orderNumber: s.orderNumber,
            title: s.title,
            description: s.description || null,
            requiredEvidences: s.requiredEvidences.filter(
              (ev) => typeof ev === "string" && ev.trim()
            ),
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al guardar");
      }

      setSaved(true);
      setStep(4);
    } catch (err) {
      setError(err.message || "Error al guardar el contrato");
    } finally {
      setSaving(false);
    }
  }, [
    contractTitle,
    contractNumber,
    entity,
    objeto,
    plazo,
    valorTotal,
    ccContratista,
    fechaContrato,
    nombreContratista,
    fechaInicio,
    fechaTerminacion,
    pagosRealizados,
    saldoPendiente,
    porcentajeEjecucion,
    porcentajePorEjecutar,
    estadoGarantias,
    matrizRiesgos,
    editableScopes,
    file,
  ]);

  // --- RENDER ---
  return (
    <>
      <div className="main-header">
        <div>
          <Link
            href="/dashboard"
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 8, display: "inline-flex" }}
          >
            ← Volver al Dashboard
          </Link>
          <h1 className="main-title">Configurar Contrato</h1>
          <p className="main-subtitle">
            Sube tu documento y la IA extraerá automáticamente los alcances
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="wizard-stepper animate-in">
        {STEPS.map((s, i) => (
          <div
            key={s.number}
            className={`wizard-step ${step === s.number ? "active" : ""} ${
              step > s.number ? "completed" : ""
            }`}
          >
            <div className="wizard-step-circle">
              {step > s.number ? "✓" : s.icon}
            </div>
            <span className="wizard-step-label">{s.title}</span>
            {i < STEPS.length - 1 && <div className="wizard-step-line" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="wizard-error animate-in">
          <span>⚠️</span> {error}
          <button
            onClick={() => setError("")}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ============ STEP 1: Upload ============ */}
      {step === 1 && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">📄 Documento base</span>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            Sube el contrato, informe de actividades u otro documento que
            contenga las obligaciones del contratista. La IA lo analizará para
            extraer los alcances automáticamente.
          </p>

          {/* Input mode toggle */}
          <div className="wizard-input-toggle">
            <button
              className={`wizard-toggle-btn ${
                inputMode === "file" ? "active" : ""
              }`}
              onClick={() => setInputMode("file")}
            >
              📁 Subir archivo
            </button>
            <button
              className={`wizard-toggle-btn ${
                inputMode === "paste" ? "active" : ""
              }`}
              onClick={() => setInputMode("paste")}
            >
              📋 Pegar texto
            </button>
          </div>

          {inputMode === "file" ? (
            <div
              className={`upload-zone ${dragover ? "dragover" : ""} ${
                file ? "has-file" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragover(true);
              }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="upload-zone-file">
                  <div className="upload-zone-icon">
                    {file.type.includes("pdf") ? "📕" : "📘"}
                  </div>
                  <div
                    className="upload-zone-text"
                    style={{ fontWeight: 600 }}
                  >
                    {file.name}
                  </div>
                  <div className="upload-zone-hint">
                    {(file.size / 1024).toFixed(1)} KB ·{" "}
                    {file.type.split("/").pop().toUpperCase()}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <>
                  <div className="upload-zone-icon">📤</div>
                  <div className="upload-zone-text">
                    Arrastra tu archivo aquí o haz clic para seleccionar
                  </div>
                  <div className="upload-zone-hint">
                    PDF, Word (.docx) o texto plano (.txt)
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            <textarea
              className="form-input"
              rows={12}
              placeholder="Pega aquí el texto del contrato, informe de actividades o documento con las obligaciones del contratista..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              style={{
                resize: "vertical",
                lineHeight: 1.7,
                fontFamily: "inherit",
              }}
            />
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ marginTop: 24, width: "100%" }}
            onClick={handleExtract}
            disabled={
              (inputMode === "file" && !file) ||
              (inputMode === "paste" && pastedText.trim().length < 50)
            }
          >
            🤖 Analizar con IA y extraer alcances
          </button>
        </div>
      )}

      {/* ============ STEP 2: Loading ============ */}
      {step === 2 && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <div className="wizard-loading">
            <div className="wizard-loading-icon">
              <div className="wizard-spinner" />
            </div>
            <h3 style={{ marginBottom: 8, fontSize: "1.1rem" }}>
              {loadingMessage || "Procesando documento..."}
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                marginBottom: 24,
              }}
            >
              Gemini está analizando tu documento para identificar las
              obligaciones del contrato
            </p>
            <div
              className="progress-bar-container"
              style={{ height: 8, maxWidth: 400, margin: "0 auto" }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  width: `${loadingProgress}%`,
                  transition: "width 0.5s ease-out",
                }}
              />
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                marginTop: 8,
              }}
            >
              {loadingProgress}%
            </p>
          </div>
        </div>
      )}

      {/* ============ STEP 3: Review ============ */}
      {step === 3 && (
        <>
          {/* Warning banner if there are missing/undetected fields */}
          {Object.keys(detectedFields).length > 0 && Object.values(detectedFields).some(v => !v) && (
            <div className="wizard-error animate-in" style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.3)", color: "#f59e0b", marginBottom: 20, padding: "12px 16px" }}>
              <span>⚠️</span> Algunas informaciones básicas del contrato no pudieron ser extraídas automáticamente del documento. Por favor, complétalas manualmente para finalizar la configuración.
            </div>
          )}

          {/* Aspectos Generales Card */}
          <div className="card animate-in" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">📋 Aspectos Generales del Contrato</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {renderContractField("contractTitle", "Título del contrato", contractTitle, setContractTitle, "Ej: Contrato de Prestación de Servicios - Turismo")}
              {renderContractField("contractNumber", "Número del contrato", contractNumber, setContractNumber, "Ej: 3227")}
              {renderContractField("fechaContrato", "Fecha del contrato (Suscripción)", fechaContrato, setFechaContrato, "Ej: 28 de enero de 2026", false, true)}
              {renderContractField("entity", "Entidad contratante", entity, setEntity, "Ej: Secretaría de Desarrollo Económico y Competitividad")}
              {renderContractField("nombreContratista", "Nombre del contratista", nombreContratista, setNombreContratista, "Ej: HAMILTON EDUARDO TELLO VILLA")}
              {renderContractField("ccContratista", "Identificación del contratista (CC)", ccContratista, setCcContratista, "Ej: 1.234.567.890")}
              {renderContractField("plazo", "Plazo de ejecución", plazo, setPlazo, "Ej: 5 meses")}
              {renderContractField("fechaInicio", "Fecha de inicio", fechaInicio, setFechaInicio, "Ej: 2 de febrero del 2026", false, true)}
              {renderContractField("fechaTerminacion", "Fecha de terminación", fechaTerminacion, setFechaTerminacion, "Ej: 1 de julio del 2026", false, true)}
            </div>
            <div style={{ marginTop: 16 }}>
              {renderContractField("objeto", "Objeto del contrato", objeto, setObjeto, "Ej: PRESTACIÓN DE SERVICIOS PROFESIONALES EN LA SECRETARÍA DE DESARROLLO ECONÓMICO...", true)}
            </div>
          </div>

          {/* Estado Financiero Card */}
          <div className="card animate-in" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">💰 Estado Financiero y Garantías</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {renderContractField("valorTotal", "Valor total del contrato o convenio", valorTotal, setValorTotal, "Ej: $20.000.000")}
              {renderContractField("pagosRealizados", "Pagos realizados a la fecha", pagosRealizados, setPagosRealizados, "Ej: $4.000.000")}
              {renderContractField("saldoPendiente", "Saldo pendiente por ejecutar", saldoPendiente, setSaldoPendiente, "Ej: $16.000.000")}
              {renderContractField("porcentajeEjecucion", "Porcentaje de ejecución", porcentajeEjecucion, setPorcentajeEjecucion, "Ej: 20%")}
              {renderContractField("porcentajePorEjecutar", "Porcentaje por ejecutar", porcentajePorEjecutar, setPorcentajePorEjecutar, "Ej: 80%")}
              {renderContractField("estadoGarantias", "Estado de las garantías", estadoGarantias, setEstadoGarantias, "Ej: n/a")}
              {renderContractField("matrizRiesgos", "Matriz de riesgos", matrizRiesgos, setMatrizRiesgos, "Ej: Sin afectación.")}
            </div>
          </div>

          {/* Scopes list */}
          <div className="card animate-in" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">
                📋 Alcances extraídos ({editableScopes.length})
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={addScope}
              >
                + Agregar alcance
              </button>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                marginBottom: 20,
              }}
            >
              Revisa, edita o elimina los alcances que la IA extrajo. Puedes
              agregar nuevos manualmente.
            </p>

            <div className="wizard-scopes-list">
              {editableScopes.map((scope, index) => (
                <div key={index} className="wizard-scope-item">
                  <div
                    className="wizard-scope-header"
                    onClick={() => toggleExpand(index)}
                  >
                    <div className="wizard-scope-number">
                      {scope.orderNumber}
                    </div>
                    <div className="wizard-scope-title-area">
                      {scope._editing || !scope.title ? (
                        <input
                          className="form-input"
                          value={scope.title}
                          onChange={(e) =>
                            updateScope(index, "title", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Escribe la obligación/alcance..."
                          style={{ fontSize: "0.85rem" }}
                        />
                      ) : (
                        <span className="wizard-scope-text">
                          {scope.title}
                        </span>
                      )}
                    </div>
                    <div className="wizard-scope-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateScope(
                            index,
                            "_editing",
                            !scope._editing
                          );
                        }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeScope(index);
                        }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                      <span
                        className="wizard-scope-chevron"
                        style={{
                          transform: scope._expanded
                            ? "rotate(90deg)"
                            : "rotate(0)",
                        }}
                      >
                        ›
                      </span>
                    </div>
                  </div>

                  {scope._expanded && (
                    <div className="wizard-scope-body">
                      {(scope.description || scope._editing) && (
                        <div
                          className="form-group"
                          style={{ marginBottom: 12 }}
                        >
                          <label className="form-label">Descripción</label>
                          <textarea
                            className="form-input"
                            rows={2}
                            value={scope.description || ""}
                            onChange={(e) =>
                              updateScope(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            style={{
                              resize: "vertical",
                              fontSize: "0.85rem",
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <label className="form-label">
                          Evidencias requeridas (
                          {scope.requiredEvidences.length})
                        </label>
                        {scope.requiredEvidences.map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            className="wizard-evidence-row"
                          >
                            <span className="wizard-evidence-bullet">
                              •
                            </span>
                            <input
                              className="form-input"
                              value={
                                typeof ev === "string"
                                  ? ev
                                  : ev.name || ""
                              }
                              onChange={(e) =>
                                updateEvidence(
                                  index,
                                  evIdx,
                                  e.target.value
                                )
                              }
                              placeholder="Tipo de evidencia..."
                              style={{ fontSize: "0.8rem", flex: 1 }}
                            />
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                removeEvidence(index, evIdx)
                              }
                              style={{ padding: "4px 8px" }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => addEvidence(index)}
                          style={{
                            marginTop: 4,
                            fontSize: "0.75rem",
                          }}
                        >
                          + Agregar evidencia
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => {
                setStep(1);
                setEditableScopes([]);
              }}
            >
              ← Volver a subir
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "⏳ Guardando..."
                : "✅ Guardar contrato"}
            </button>
          </div>
        </>
      )}

      {/* ============ STEP 4: Success ============ */}
      {step === 4 && saved && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <div className="wizard-success">
            <div className="wizard-success-icon">🎉</div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8 }}>
              ¡Contrato configurado con éxito!
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                maxWidth: 500,
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              Se guardaron{" "}
              <strong>{editableScopes.length} alcances</strong> para
              el contrato <strong>&ldquo;{contractTitle}&rdquo;</strong>.
              Ya puedes comenzar a cargar evidencias y generar informes
              mensuales.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
              }}
            >
              <Link
                href="/dashboard"
                className="btn btn-primary btn-lg"
              >
                📊 Ir al Dashboard
              </Link>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setPastedText("");
                  setEditableScopes([]);
                  setContractTitle("");
                  setContractNumber("");
                  setEntity("");
                  setObjeto("");
                  setPlazo("");
                  setValorTotal("");
                  setCcContratista("");
                  setFechaContrato("");
                  setNombreContratista("");
                  setFechaInicio("");
                  setFechaTerminacion("");
                  setPagosRealizados("");
                  setSaldoPendiente("");
                  setPorcentajeEjecucion("");
                  setPorcentajePorEjecutar("");
                  setEstadoGarantias("");
                  setMatrizRiesgos("");
                  setDetectedFields({});
                  setValidationErrors({});
                  setSaved(false);
                }}
              >
                + Configurar otro contrato
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
