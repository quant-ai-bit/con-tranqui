"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const DEFAULT_PROMPT = `Eres un experto en redacción de informes mensuales de contratos de prestación de servicios con entidades gubernamentales en Colombia.

Tu tarea es generar el texto narrativo para un alcance específico de un informe de actividades mensual.

CONTEXTO:
- Obligación contractual: {SCOPE_TITLE}
- Mes del informe: {MONTH}/{YEAR}
- Descripción del contratista de lo que hizo: {DESCRIPTION}

INSTRUCCIONES:
1. Escribe en tercera persona formal (ej: "El contratista realizó...", "Se llevó a cabo...").
2. Usa un tono institucional, profesional y preciso.
3. Incluye la fecha del periodo (mes/año).
4. Estructura el texto con: Actividad realizada → Propósito → Resultado logrado.
5. El texto debe ser un párrafo de 100-200 palabras.
6. NO inventes datos específicos que no estén en la descripción.
7. Si la descripción es vaga, genera un texto general coherente con la obligación.

Responde ÚNICAMENTE con el texto narrativo, sin títulos ni encabezados.`;

export default function ConfigPage() {
  const { data: session, update: updateSession } = useSession();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("contratista");
  const [customPrompt, setCustomPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {

    if (session?.user) {
      setUserName(session.user.name || "");
      const role = session.user.role;
      setUserRole(role === "supervisor" ? "administrador" : (role || "contratista"));
    }

    if (typeof window !== "undefined") {
      const savedPrompt = localStorage.getItem("contratoia_custom_prompt");
      if (savedPrompt) {
        setCustomPrompt(savedPrompt);
      } else {
        setCustomPrompt(DEFAULT_PROMPT);
      }

      const savedKey = localStorage.getItem("contratoia_gemini_key");
      if (savedKey) {
        setApiKey(savedKey);
      }
    }
  }, [session]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/user/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, role: userRole }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar perfil");
      }

      const data = await res.json();
      setSuccessMsg("¡Perfil actualizado con éxito!");

      // Update NextAuth session client-side
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: userName,
          role: userRole,
        }
      });
      
      // Reload page to refresh layouts/sidebar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePromptSettings = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("contratoia_custom_prompt", customPrompt);
      localStorage.setItem("contratoia_gemini_key", apiKey);
      setSuccessMsg("¡Configuración de IA guardada en el navegador!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleRestorePrompt = () => {
    if (window.confirm("¿Seguro que deseas restaurar el prompt predeterminado?")) {
      setCustomPrompt(DEFAULT_PROMPT);
    }
  };

  return (
    <>
      <div className="main-header">
        <div>
          <h1 className="main-title">Configuración</h1>
          <p className="main-subtitle">Personaliza tu perfil, roles y el motor de generación con Inteligencia Artificial.</p>
        </div>
      </div>

      {successMsg && (
        <div className="wizard-error animate-in" style={{ backgroundColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981", marginBottom: 20 }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="wizard-error animate-in" style={{ marginBottom: 20 }}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }} className="stagger">
        
        {/* Profile and Role Section */}
        <div className="card animate-in">
          <div className="card-header">
            <span className="card-title">👤 Perfil y Rol</span>
          </div>
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Nombre completo
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="form-input"
                placeholder="Hamilton Eduardo Tello Villa"
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Rol en la Plataforma
              </label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="form-input"
              >
                <option value="contratista">Contratista (Carga evidencias y narrativas)</option>
                <option value="administrador">Administrador (Evalúa y aprueba entregables)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              {loading ? "Guardando..." : "Guardar Perfil"}
            </button>
          </form>
        </div>

        {/* AI Generator Settings */}
        {(userRole === "administrador" || userRole === "admin" || userRole === "supervisor") && (
          <div className="card animate-in">
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <span className="card-title">🤖 Configuración de IA (Gemini)</span>
              <button
                onClick={handleRestorePrompt}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "0.75rem", padding: "4px 8px" }}
              >
                Restaurar Prompt
              </button>
            </div>
            <form onSubmit={handleSavePromptSettings} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Clave API de Gemini (Opcional - Desarrollo)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="form-input"
                  placeholder="AIzaSy..."
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                  Si se deja vacía, se utilizará la clave configurada en el servidor (.env) o el generador de pruebas.
                </span>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Instrucciones del Prompt (Sistema)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="form-input"
                  rows={12}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical" }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary">
                💾 Guardar Configuración de IA
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
