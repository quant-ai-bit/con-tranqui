"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

function ActivityEvidenceItem({ evidence, onDelete, onUpdate, onSelectVersion }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(evidence.fileName);
  const [editedContent, setEditedContent] = useState(evidence.content || "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(evidence.selectedText || "original");

  useEffect(() => {
    if (evidence.selectedText) {
      setActiveTab(evidence.selectedText);
    }
  }, [evidence.selectedText]);

  const hasAi = evidence.fileType === "text" && evidence.aiContent && evidence.aiContent.trim() !== "";

  const getFileIcon = (fileType) => {
    if (fileType === "image") return "🖼️";
    if (fileType === "audio") return "🎵";
    if (fileType === "pdf") return "📕";
    if (fileType === "text") return "📝";
    return "📄";
  };

  const handleSave = async () => {
    if (!editedTitle.trim()) return;
    setSaving(true);
    try {
      await onUpdate(evidence.id, editedContent, editedTitle);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px",
        background: "rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        border: "1px solid var(--accent-primary)",
        position: "relative"
      }} className="animate-in">
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>Editar Título</label>
          <input
            className="form-input"
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            style={{ fontSize: "0.85rem", height: "38px", padding: "6px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>Editar Contenido</label>
          <div style={{ background: "#fff", color: "#000", borderRadius: "8px", overflow: "hidden" }}>
            <ReactQuill
              theme="snow"
              value={editedContent}
              onChange={setEditedContent}
              style={{ height: "120px", marginBottom: "42px" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button 
            onClick={() => {
              setIsEditing(false);
              setEditedTitle(evidence.fileName);
              setEditedContent(evidence.content || "");
            }} 
            className="btn btn-ghost btn-sm"
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: "12px",
      background: "rgba(255, 255, 255, 0.05)",
      borderRadius: "8px",
      border: "1px solid var(--border-glass)",
      position: "relative"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {getFileIcon(evidence.fileType)} {evidence.fileName}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {evidence.fileType === "text" && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setIsEditing(true);
                setEditedContent(activeTab === "ai" ? (evidence.aiContent || "") : (evidence.originalContent || evidence.content || ""));
              }}
              style={{ color: "var(--accent-primary)", padding: "2px 8px", fontSize: "0.75rem" }}
            >
              ✏️ Editar
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onDelete(evidence.id)}
            style={{ color: "var(--error)", padding: "2px 8px", fontSize: "0.75rem" }}
          >
            ✕ Eliminar
          </button>
        </div>
      </div>
      {evidence.fileType === "text" ? (
        hasAi ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {/* Tabs Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: 6
            }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("original")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: activeTab === "original" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: activeTab === "original" ? "var(--text-primary)" : "var(--text-muted)",
                    border: "none",
                    outline: "none"
                  }}
                >
                  📝 Texto Original
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ai")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: activeTab === "ai" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                    color: activeTab === "ai" ? "#A5B4FC" : "var(--text-muted)",
                    border: activeTab === "ai" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  ✨ Mejorado con IA
                </button>
              </div>

              {/* Approval status / Action */}
              <div>
                {(evidence.selectedText || "original") === activeTab ? (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.7rem",
                    color: "#34D399",
                    background: "rgba(52, 211, 153, 0.12)",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    fontWeight: 600,
                    border: "1px solid rgba(52, 211, 153, 0.25)"
                  }}>
                    ✓ Aprobado para Anexo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectVersion && onSelectVersion(evidence.id, activeTab)}
                    style={{
                      fontSize: "0.7rem",
                      color: "#fff",
                      background: "linear-gradient(135deg, var(--accent-primary) 0%, #4F46E5 100%)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      outline: "none",
                      transition: "opacity 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = 0.9}
                    onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                  >
                    Aprobar esta versión
                  </button>
                )}
              </div>
            </div>

            {/* Content box */}
            <div 
              style={{ 
                fontSize: "0.8rem", 
                background: "rgba(0,0,0,0.3)", 
                padding: 10, 
                borderRadius: 6,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                border: activeTab === "ai" ? "1px dashed rgba(99, 102, 241, 0.2)" : "1px solid transparent"
              }} 
              dangerouslySetInnerHTML={{ __html: activeTab === "ai" ? evidence.aiContent : (evidence.originalContent || evidence.content) }} 
            />
            {evidence.filePath && (
              <div style={{ marginTop: 8 }}>
                <a
                  href={evidence.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.75rem", color: "var(--accent-primary)", textDecoration: "underline" }}
                >
                  📥 Descargar Archivo Word Original
                </a>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div 
              style={{ 
                fontSize: "0.8rem", 
                background: "rgba(0,0,0,0.3)", 
                padding: 10, 
                borderRadius: 6,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap"
              }} 
              dangerouslySetInnerHTML={{ __html: evidence.content }} 
            />
            {evidence.filePath && (
              <div>
                <a
                  href={evidence.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.75rem", color: "var(--accent-primary)", textDecoration: "underline" }}
                >
                  📥 Descargar Archivo Word Original
                </a>
              </div>
            )}
          </div>
        )
      ) : (
        evidence.filePath && (
          <a
            href={evidence.filePath}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.75rem", color: "var(--accent-primary)", textDecoration: "underline" }}
          >
            Ver Archivo Adjunto
          </a>
        )
      )}
    </div>
  );
}

function ActivityCard({ activity, onUploadEvidence, onDeleteEvidence, onUpdateEvidence, onDeleteActivity, onSelectVersion, onToggleComplete }) {
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState("text"); // text, image, file
  const [textContent, setTextContent] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleCreateEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceTitle.trim()) return;
    
    setUploading(true);
    try {
      if (evidenceType === "text") {
        if (!textContent.trim()) {
          alert("Por favor ingresa el contenido de texto");
          setUploading(false);
          return;
        }
        await onUploadEvidence(activity.id, [], true, textContent, evidenceTitle);
        setTextContent("");
      } else {
        if (files.length === 0) {
          alert("Por favor selecciona al menos un archivo");
          setUploading(false);
          return;
        }
        await onUploadEvidence(activity.id, files, false, null, evidenceTitle);
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      setEvidenceTitle("");
      setShowAddEvidence(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card animate-in" style={{
      marginBottom: 24,
      border: "1px solid var(--border-glass)",
      borderLeft: activity.completed ? "4px solid #10B981" : "4px solid #F87171",
      transition: "border-left 0.3s ease"
    }}>
      {/* Activity Header Info */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 12,
        borderBottom: "1px solid var(--border-glass)",
        paddingBottom: 16,
        marginBottom: 16
      }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            🚀 {activity.title}
          </h4>
          <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              📍 <strong>Lugar:</strong> {activity.location || "No especificado"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              📅 <strong>Fecha:</strong> {activity.date || "No especificada"}
            </span>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => onToggleComplete(activity.id, !activity.completed)}
            style={{
              fontSize: "0.75rem",
              padding: "6px 12px",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
              background: activity.completed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.1)",
              color: activity.completed ? "#34D399" : "#F87171",
              borderColor: activity.completed ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
              outline: "none"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = activity.completed ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = activity.completed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.1)";
            }}
          >
            {activity.completed ? "✓ Completada" : "⚠ Incompleta"}
          </button>
          <a
            href={`/api/activities/${activity.id}/annex`}
            className="btn btn-primary btn-sm"
            style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", borderColor: "transparent" }}
          >
            📥 Descargar Anexo
          </a>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onDeleteActivity(activity.id)}
            style={{ color: "var(--error)" }}
          >
            🗑️ Eliminar Actividad
          </button>
        </div>
      </div>

      {/* Evidences List */}
      <div style={{ marginBottom: 16 }}>
        <h5 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          📌 Evidencias de la Actividad
          {!showAddEvidence && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddEvidence(true)}
              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
            >
              + Agregar Evidencia
            </button>
          )}
        </h5>

        {activity.evidences.length === 0 ? (
          <p style={{ fontStyle: "italic", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            No hay evidencias asociadas a esta actividad. Añade el Propósito (texto) y registros fotográficos.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activity.evidences.map(ev => (
              <ActivityEvidenceItem
                key={ev.id}
                evidence={ev}
                onDelete={(evId) => onDeleteEvidence(activity.id, evId)}
                onUpdate={(evId, content, title) => onUpdateEvidence(activity.id, evId, content, title)}
                onSelectVersion={(evId, selectedText) => onSelectVersion(activity.id, evId, selectedText)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Evidence Panel */}
      {showAddEvidence && (
        <form onSubmit={handleCreateEvidence} style={{
          background: "rgba(0,0,0,0.2)",
          padding: "16px",
          borderRadius: "8px",
          border: "1px dashed var(--border-glass)",
          marginTop: 16
        }} className="animate-in">
          <h6 style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "var(--text-primary)" }}>Nueva Evidencia</h6>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>Título / Nombre</label>
              <input
                className="form-input"
                type="text"
                placeholder="Ej: Propósito de la visita"
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
                required
                style={{ fontSize: "0.85rem", height: "42px", padding: "8px 12px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>Tipo de Evidencia</label>
              <select
                className="form-input"
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                style={{ fontSize: "0.85rem", height: "42px", padding: "8px 12px", width: "100%" }}
              >
                <option value="text">Texto Narrativo</option>
                <option value="image">Registro Fotográfico (Imagen)</option>
                <option value="file">Archivo de Soporte (PDF/Doc)</option>
              </select>
            </div>
          </div>

          {evidenceType === "text" ? (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>Contenido</label>
              <div style={{ background: "#fff", color: "#000", borderRadius: "8px", overflow: "hidden" }}>
                <ReactQuill
                  theme="snow"
                  value={textContent}
                  onChange={setTextContent}
                  style={{ height: "120px", marginBottom: "42px" }}
                />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>Archivos</label>
              <input
                type="file"
                multiple={evidenceType === "image"}
                accept={evidenceType === "image" ? "image/*" : ".pdf,.docx,.doc"}
                onChange={handleFileChange}
                ref={fileInputRef}
                style={{ display: "none" }}
                required
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  background: "var(--bg-glass)",
                  border: "1px dashed var(--border-glass)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  minHeight: "42px",
                  transition: "all var(--transition-fast)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                  e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.06)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-glass)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span style={{ fontSize: "0.8rem", color: files.length > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {files.length > 0 
                    ? `${files.length} archivo(s) seleccionado(s): ${files.map(f => f.name).join(", ")}`
                    : "Seleccionar archivo(s)..."
                  }
                </span>
                <span className="btn btn-secondary btn-sm" style={{ pointerEvents: "none", margin: 0, padding: "4px 10px" }}>
                  📂 Buscar
                </span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
              {uploading ? "⏳ Subiendo..." : "✓ Guardar Evidencia"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowAddEvidence(false);
                setFiles([]);
                setTextContent("");
              }}
              disabled={uploading}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToSpanish = (dateStr) => {
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
  return `${day} de ${months[monthIdx]} de ${year}`;
};

export default function AlcancePage() {
  const params = useParams();
  const scopeId = params.id;

  const [scope, setScope] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Activity form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(getTodayDateString());
  const [newLocation, setNewLocation] = useState("");
  const [creating, setCreating] = useState(false);

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

  const fetchScopeAndActivities = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Scope
      const scopeRes = await fetch(`/api/scopes/${scopeId}?month=${month}&year=${year}`);
      if (!scopeRes.ok) throw new Error("Error al cargar la información del alcance");
      const scopeData = await scopeRes.json();
      setScope(scopeData.scope);

      // 2. Fetch Activities for this scope month
      const actRes = await fetch(`/api/scopes/${scopeId}/activities?month=${month}&year=${year}`);
      if (!actRes.ok) throw new Error("Error al cargar las actividades");
      const actData = await actRes.json();
      setActivities(actData.activities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scopeId, month, year]);

  useEffect(() => {
    fetchScopeAndActivities();
  }, [fetchScopeAndActivities]);

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

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/scopes/${scopeId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          date: formatDateToSpanish(newDate),
          location: newLocation,
          month,
          year
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear la actividad");
      }

      const data = await res.json();
      setActivities((prev) => [...prev, data.activity]);
      setNewTitle("");
      setNewDate(getTodayDateString());
      setNewLocation("");
      setShowCreateModal(false);
      
      setSuccessMsg("¡Actividad creada con éxito! Ahora puedes agregar evidencias.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta actividad y todas sus evidencias físicas asociadas?")) return;

    try {
      const res = await fetch(`/api/scopes/${scopeId}/activities?activityId=${activityId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }

      setActivities((prev) => prev.filter(act => act.id !== activityId));
      setSuccessMsg("Actividad eliminada correctamente.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadEvidence = async (activityId, files, isText, textContent, evidenceTitle) => {
    try {
      const formData = new FormData();
      formData.append("month", String(month));
      formData.append("year", String(year));
      formData.append("activityId", activityId);
      formData.append("fileName", evidenceTitle);
      
      if (isText) {
        formData.append("isText", "true");
        formData.append("content", textContent);
      } else {
        files.forEach((f) => formData.append("files", f));
      }

      const res = await fetch(`/api/scopes/${scopeId}/evidence`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Error al subir evidencia");
      const data = await res.json();

      // Update activities list with the new evidence
      setActivities((prev) => prev.map(act => {
        if (act.id === activityId) {
          return {
            ...act,
            evidences: [...act.evidences, ...data.evidences]
          };
        }
        return act;
      }));

      setSuccessMsg("Evidencia guardada.");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEvidence = async (activityId, evidenceId) => {
    try {
      const res = await fetch(`/api/scopes/${scopeId}/evidence?evidenceId=${evidenceId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Error al eliminar la evidencia");

      // Update activities list removing deleted evidence
      setActivities((prev) => prev.map(act => {
        if (act.id === activityId) {
          return {
            ...act,
            evidences: act.evidences.filter(ev => ev.id !== evidenceId)
          };
        }
        return act;
      }));

      setSuccessMsg("Evidencia eliminada.");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateEvidence = async (activityId, evidenceId, newContent, newTitle) => {
    try {
      const res = await fetch(`/api/scopes/${scopeId}/evidence`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceId,
          content: newContent,
          fileName: newTitle
        })
      });

      if (!res.ok) throw new Error("Error al actualizar la evidencia");
      const data = await res.json();

      // Update activities list with updated evidence
      setActivities((prev) => prev.map(act => {
        if (act.id === activityId) {
          return {
            ...act,
            evidences: act.evidences.map(ev => ev.id === evidenceId ? data.evidence : ev)
          };
        }
        return act;
      }));

      setSuccessMsg("Evidencia actualizada con éxito.");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectTextVersion = async (activityId, evidenceId, selectedText) => {
    try {
      const res = await fetch(`/api/scopes/${scopeId}/evidence`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceId,
          selectedText
        })
      });

      if (!res.ok) throw new Error("Error al seleccionar la versión del texto");
      const data = await res.json();

      // Update activities list with updated evidence
      setActivities((prev) => prev.map(act => {
        if (act.id === activityId) {
          return {
            ...act,
            evidences: act.evidences.map(ev => ev.id === evidenceId ? data.evidence : ev)
          };
        }
        return act;
      }));

      setSuccessMsg(`Versión ${selectedText === "ai" ? "mejorada por IA" : "original"} aprobada para el anexo.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleComplete = async (activityId, completed) => {
    try {
      const res = await fetch(`/api/scopes/${scopeId}/activities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          completed
        })
      });

      if (!res.ok) throw new Error("Error al actualizar el estado de la actividad");
      const data = await res.json();

      setActivities((prev) => prev.map(act => {
        if (act.id === activityId) {
          return {
            ...act,
            completed: data.activity.completed
          };
        }
        return act;
      }));

      setSuccessMsg(completed ? "Actividad marcada como completada." : "Actividad marcada como incompleta.");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}><div className="wizard-spinner" /></div>;
  }

  if (!scope) {
    return <div className="wizard-error animate-in"><span>⚠️</span> Alcance no encontrado</div>;
  }

  return (
    <>
      <div className="main-header" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <Link href={`/dashboard?month=${month}&year=${year}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 8, display: "inline-flex" }}>← Volver al Dashboard</Link>
          <h1 className="main-title">Alcance {scope.orderNumber}</h1>
          <p className="main-subtitle">{scope.title}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={month} onChange={(e) => handlePeriodChange(parseInt(e.target.value), year)} className="form-input" style={{ width: "auto", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}>
              {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => handlePeriodChange(month, parseInt(e.target.value))} className="form-input" style={{ width: "auto", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", height: "36px" }}>
              {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
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

      {successMsg && (
        <div className="wizard-step-indicator animate-in" style={{ marginBottom: 16, background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#10B981", padding: "12px 16px", borderRadius: 8, display: "flex", alignItems: "center" }}>
          <span>🔔 {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}>✕</button>
        </div>
      )}

      {/* Activities Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.25rem", fontWeight: 700 }}>
          Actividades Realizadas ({activities.length})
        </h3>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ background: "linear-gradient(135deg, var(--accent-primary) 0%, #4F46E5 100%)" }}
        >
          + Crear Actividad
        </button>
      </div>

      {/* Create Activity Form (Modal/Collapsible style) */}
      {showCreateModal && (
        <div style={{
          background: "var(--bg-glass)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-glass)",
          padding: "24px",
          borderRadius: "var(--radius-lg)",
          marginBottom: 24,
        }} className="animate-in">
          <h4 style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>Nueva Actividad para el Alcance</h4>
          <form onSubmit={handleCreateActivity}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 6 }}>Título de la Actividad</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ej: Reunión con Raul Murillo Gerente Ukumari y María Ceneida"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 6 }}>Fecha</label>
                  <input
                    className="form-input"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 6 }}>Lugar</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ej: Ukumarí"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? "Creando..." : "Crear Actividad"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activities Grid */}
      {activities.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", border: "1px dashed var(--border-glass)" }}>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontStyle: "italic" }}>
            No hay actividades registradas para este alcance en el mes seleccionado.
            Haz clic en "Crear Actividad" para comenzar a documentar.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onUploadEvidence={handleUploadEvidence}
              onDeleteEvidence={handleDeleteEvidence}
              onUpdateEvidence={handleUpdateEvidence}
              onDeleteActivity={handleDeleteActivity}
              onSelectVersion={handleSelectTextVersion}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}
    </>
  );
}
