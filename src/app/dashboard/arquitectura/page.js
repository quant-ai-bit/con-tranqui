"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ArquitecturaPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetch("/api/system-stats")
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Error al obtener las estadísticas");
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="wizard-spinner" />
      </div>
    );
  }

  if (error) {
    const isForbidden = error.toLowerCase().includes("prohibido") || error.toLowerCase().includes("requiere");
    return (
      <div className="card animate-in" style={{ textAlign: "center", padding: "48px 24px", margin: "40px auto", maxWidth: "500px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "12px", color: "var(--text-primary)" }}>
          {isForbidden ? "Acceso Restringido" : "Error de Conexión"}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "24px", lineHeight: "1.5" }}>
          {error}
        </p>
        <Link href="/dashboard" className="btn btn-primary btn-sm">
          📊 Volver al Dashboard
        </Link>
      </div>
    );
  }

  const { stats, users, infrastructure } = data;

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      
      {/* HEADER */}
      <div className="main-header">
        <div>
          <h1 className="main-title">Arquitectura y Almacenamiento del Sistema</h1>
          <p className="main-subtitle">Detalle técnico del flujo de datos, almacenamiento de archivos e infraestructura en Vercel</p>
        </div>
      </div>

      {/* ANSWER BOXES (EXPLICACIÓN PARA EL USUARIO) */}
      <div className="card" style={{ borderLeft: "4px solid var(--accent-indigo)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "16px", color: "#f3f4f6", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>💡</span> Respuestas Clave de Almacenamiento
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          
          {/* FAQ 1 */}
          <div 
            onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
            style={{ 
              background: "rgba(255,255,255,0.02)", 
              padding: "16px", 
              borderRadius: "8px", 
              border: "1px solid var(--border-glass)",
              cursor: "pointer",
              transition: "background 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--accent-indigo)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                👤 ¿Dónde se lleva el registro de los usuarios nuevos?
              </h3>
              <span style={{ 
                fontSize: "0.8rem", 
                color: "var(--text-muted)", 
                transition: "transform 0.2s ease", 
                transform: expandedFaq === 1 ? "rotate(180deg)" : "rotate(0deg)" 
              }}>
                ▼
              </span>
            </div>
            {expandedFaq === 1 && (
              <p style={{ 
                fontSize: "0.88rem", 
                color: "var(--text-secondary)", 
                lineHeight: "1.5", 
                marginTop: "12px", 
                borderTop: "1px solid rgba(255,255,255,0.05)", 
                paddingTop: "12px",
                animation: "fadeIn 0.2s ease"
              }}>
                Todos los usuarios nuevos se registran mediante la ruta API <code style={{ color: "#a5b4fc" }}>POST /api/auth/register</code>. Sus credenciales se guardan de forma permanente en la tabla/modelo <strong>User</strong> de la base de datos relacional PostgreSQL provista por <strong>Neon</strong>. Las contraseñas se encriptan de forma segura utilizando la librería <strong>bcryptjs</strong> con un factor de costo de 10.
              </p>
            )}
          </div>

          {/* FAQ 2 */}
          <div 
            onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
            style={{ 
              background: "rgba(255,255,255,0.02)", 
              padding: "16px", 
              borderRadius: "8px", 
              border: "1px solid var(--border-glass)",
              cursor: "pointer",
              transition: "background 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--accent-indigo)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                📁 ¿En dónde se guardan los archivos que los usuarios suben a la plataforma?
              </h3>
              <span style={{ 
                fontSize: "0.8rem", 
                color: "var(--text-muted)", 
                transition: "transform 0.2s ease", 
                transform: expandedFaq === 2 ? "rotate(180deg)" : "rotate(0deg)" 
              }}>
                ▼
              </span>
            </div>
            {expandedFaq === 2 && (
              <p style={{ 
                fontSize: "0.88rem", 
                color: "var(--text-secondary)", 
                lineHeight: "1.5", 
                marginTop: "12px", 
                borderTop: "1px solid rgba(255,255,255,0.05)", 
                paddingTop: "12px",
                animation: "fadeIn 0.2s ease"
              }}>
                Los archivos físicos de evidencias (como PDFs, imágenes y audios) se suben directamente a la nube en <strong>Vercel Blob Storage</strong> (un almacén de objetos de alto rendimiento de Vercel). En la base de datos relacional de Neon, en la tabla <strong>Evidence</strong>, se guarda únicamente el registro con metadatos del archivo y su enlace público directo de descarga (URL que inicia con <code style={{ color: "#a5b4fc" }}>https://*.public.blob.vercel-storage.com/...</code>).
              </p>
            )}
          </div>

          {/* FAQ 3 */}
          <div 
            onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
            style={{ 
              background: "rgba(255,255,255,0.02)", 
              padding: "16px", 
              borderRadius: "8px", 
              border: "1px solid var(--border-glass)",
              cursor: "pointer",
              transition: "background 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--accent-indigo)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                📄 ¿Dónde se guardan los archivos de informes y los anexos?
              </h3>
              <span style={{ 
                fontSize: "0.8rem", 
                color: "var(--text-muted)", 
                transition: "transform 0.2s ease", 
                transform: expandedFaq === 3 ? "rotate(180deg)" : "rotate(0deg)" 
              }}>
                ▼
              </span>
            </div>
            {expandedFaq === 3 && (
              <p style={{ 
                fontSize: "0.88rem", 
                color: "var(--text-secondary)", 
                lineHeight: "1.5", 
                marginTop: "12px", 
                borderTop: "1px solid rgba(255,255,255,0.05)", 
                paddingTop: "12px",
                animation: "fadeIn 0.2s ease"
              }}>
                <strong>Anexos:</strong> Se generan <strong>dinámicamente en tiempo de ejecución (en memoria)</strong> en formato Word (.docx) utilizando la librería <strong>docx</strong>. No se guardan de forma persistente en el servidor; el usuario los descarga al vuelo directamente de la base de datos y de Vercel Blob.<br /><br />
                <strong>Informes:</strong> Se compilan programáticamente y se guardan temporalmente en la carpeta local <code style={{ color: "#a5b4fc" }}>/reports</code> del servidor Next.js, y se registra su estado y ruta en la tabla <strong>Report</strong> de PostgreSQL. Dado que el sistema de archivos de Vercel es efímero, el control permanente se hace mediante la base de datos y el enlace de Drive unificado que se le asocia.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* METRICS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "500" }}>Usuarios Registrados</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-primary)" }}>{stats.totalUsers}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>● Activos en la DB</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "500" }}>Contratos Configurados</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-primary)" }}>{stats.totalContracts}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--accent-indigo)" }}>📊 Proyectos vigentes</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "500" }}>Evidencias Subidas (Vercel Blob)</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-primary)" }}>{stats.totalEvidences}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total: {formatSize(stats.totalEvidenceSize)}</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "500" }}>Informes Generados</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-primary)" }}>{stats.totalReports}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--accent-indigo)" }}>📝 Actividades y Supervisión</span>
        </div>

      </div>

      {/* DIAGRAMA VISUAL DE ARQUITECTURA */}
      <div className="card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "20px", color: "var(--text-primary)" }}>
          🌐 Flujo de Datos e Infraestructura Vercel
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "12px 0" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: "16px", flexWrap: "wrap" }}>
            
            {/* FRONTEND CLIENT */}
            <div style={{ flex: "1 1 200px", background: "rgba(99, 102, 241, 0.05)", border: "1px dashed var(--accent-indigo)", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>💻</div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "4px" }}>Cliente / Navegador</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Interfaz del contratista y supervisor. Envía formularios, sube archivos y solicita la descarga de informes.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "1.5rem" }}>⇄</div>

            {/* SERVERLESS SERVER */}
            <div style={{ flex: "1 1 220px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-glass)", padding: "16px", borderRadius: "12px", textAlign: "center", position: "relative" }}>
              <span className="badge badge-complete" style={{ position: "absolute", top: "8px", right: "8px", fontSize: "0.65rem" }}>NodeJS</span>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚡</div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "4px" }}>Servidor Next.js (Vercel)</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Rutas de API, control de acceso con NextAuth, generación de archivos Word (.docx) y empaquetamiento ZIP en memoria.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "1.5rem" }}>⇄</div>

            {/* NEON DB */}
            <div style={{ flex: "1 1 200px", background: "rgba(16, 185, 129, 0.05)", border: "1px dashed var(--accent-emerald)", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🐘</div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "4px" }}>Neon PostgreSQL DB</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Registro de usuarios, obligaciones, bitácoras de actividades, metadatos y rutas de los archivos de evidencias.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "1.5rem" }}>⇄</div>

            {/* VERCEL BLOB */}
            <div style={{ flex: "1 1 200px", background: "rgba(244, 63, 94, 0.05)", border: "1px dashed var(--accent-rose)", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>☁️</div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "4px" }}>Vercel Blob Storage</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Almacena físicamente los archivos subidos. Retorna URLs públicas de alto rendimiento para su visualización y descarga.
              </p>
            </div>

          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", padding: "16px", borderRadius: "12px" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📦 Resumen de Recursos de Almacenamiento en Vercel
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <div>
                <strong>Base de datos (Neon):</strong> <code style={{ color: "#a5b4fc" }}>{infrastructure.database.provider}</code><br />
                {infrastructure.database.purpose}
              </div>
              <div>
                <strong>Almacenamiento de archivos (Vercel Blob):</strong> <code style={{ color: "#a5b4fc" }}>{infrastructure.fileStorage.provider}</code><br />
                {infrastructure.fileStorage.purpose}
              </div>
              <div>
                <strong>Informes y Anexos:</strong> <code style={{ color: "#a5b4fc" }}>{infrastructure.reportGeneration.provider}</code><br />
                {infrastructure.reportGeneration.purpose}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* GRID DETAILS (LEFT: FILE BREAKDOWN, RIGHT: USER REGISTER) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", flexWrap: "wrap" }}>
        
        {/* EVIDENCE FILE TYPES */}
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
            📊 Distribución de Archivos de Evidencias
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {Object.entries(stats.evidenceTypeDistribution).map(([type, count]) => {
              const percentage = stats.totalEvidences > 0 ? Math.round((count / stats.totalEvidences) * 100) : 0;
              const typeLabels = {
                image: "📸 Imágenes / Fotos",
                document: "📄 Documentos (PDF, Word)",
                text: "✏️ Textos Narrativos",
                audio: "🎵 Notas de Audio",
                other: "📁 Otros Archivos"
              };
              const colors = {
                image: "var(--accent-indigo)",
                document: "var(--accent-emerald)",
                text: "#fbbf24",
                audio: "var(--accent-rose)",
                other: "var(--text-muted)"
              };
              return (
                <div key={type} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{typeLabels[type] || type}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{count} ({percentage}%)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${percentage}%`, height: "100%", background: colors[type] || "var(--accent-indigo)", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* REGISTERED USERS TABLE */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
            👥 Usuarios Registrados en el Sistema
          </h2>
          
          <div style={{ overflowX: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-glass)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "8px 12px", fontWeight: "600" }}>Nombre</th>
                  <th style={{ padding: "8px 12px", fontWeight: "600" }}>Correo Electrónico</th>
                  <th style={{ padding: "8px 12px", fontWeight: "600" }}>Rol</th>
                  <th style={{ padding: "8px 12px", fontWeight: "600" }}>Archivos</th>
                  <th style={{ padding: "8px 12px", fontWeight: "600" }}>Última Actividad</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr 
                    key={u.id} 
                    onClick={() => setSelectedUser(u)}
                    style={{ 
                      borderBottom: "1px solid rgba(255,255,255,0.02)", 
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "background 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: "500", color: "var(--text-primary)" }}>{u.name || "Sin nombre"}</td>
                    <td style={{ padding: "10px 12px" }}>{u.email}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="badge" style={{ fontSize: "0.68rem", padding: "2px 6px", background: (u.role === "admin" || u.role === "administrador") ? "rgba(244,63,94,0.15)" : "rgba(99,102,241,0.15)", color: (u.role === "admin" || u.role === "administrador") ? "var(--accent-rose)" : "var(--accent-indigo)" }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: "600" }}>
                      📁 {u.stats?.totalEvidences || 0}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.78rem" }}>
                      {u.lastActive ? new Date(u.lastActive).toLocaleDateString("es-ES") : "Sin actividad"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div className="card" style={{
            width: "90%",
            maxWidth: "550px",
            maxHeight: "85vh",
            overflowY: "auto",
            border: "1px solid var(--border-glass)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            position: "relative",
            background: "#111827",
            padding: "24px",
            borderRadius: "12px"
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedUser(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "1.25rem",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <span className="badge" style={{ 
                background: (selectedUser.role === "admin" || selectedUser.role === "administrador") ? "rgba(244,63,94,0.15)" : "rgba(99,102,241,0.15)", 
                color: (selectedUser.role === "admin" || selectedUser.role === "administrador") ? "var(--accent-rose)" : "var(--accent-indigo)",
                marginBottom: "8px",
                fontSize: "0.7rem"
              }}>
                {selectedUser.role}
              </span>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--text-primary)", margin: "4px 0" }}>
                {selectedUser.name || "Sin nombre"}
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>{selectedUser.email}</p>
            </div>

            <hr style={{ border: "0", borderTop: "1px solid var(--border-glass)", margin: 0 }} />

            {/* General info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.82rem" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Fecha de Registro:</span>
                <p style={{ fontWeight: "500", color: "var(--text-primary)", marginTop: "4px", margin: 0 }}>
                  {new Date(selectedUser.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Última Actividad:</span>
                <p style={{ fontWeight: "500", color: "var(--accent-emerald)", marginTop: "4px", margin: 0 }}>
                  {selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleString("es-ES") : "Sin registro"}
                </p>
              </div>
            </div>

            {/* User Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Contratos</span>
                <div style={{ fontSize: "1.2rem", fontWeight: "750", color: "var(--text-primary)", marginTop: "4px" }}>{selectedUser.stats?.totalContracts || 0}</div>
              </div>
              <div style={{ textAlign: "center", borderLeft: "1px solid var(--border-glass)", borderRight: "1px solid var(--border-glass)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Evidencias</span>
                <div style={{ fontSize: "1.2rem", fontWeight: "750", color: "var(--text-primary)", marginTop: "4px" }}>{selectedUser.stats?.totalEvidences || 0}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Reportes</span>
                <div style={{ fontSize: "1.2rem", fontWeight: "750", color: "var(--text-primary)", marginTop: "4px" }}>{selectedUser.stats?.totalReports || 0}</div>
              </div>
            </div>

            {/* File Type Distribution */}
            <div>
              <h3 style={{ fontSize: "0.88rem", fontWeight: "650", marginBottom: "12px", color: "var(--text-primary)", marginTop: 0 }}>
                📊 Archivos cargados por tipo
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedUser.stats?.evidenceTypeDistribution && Object.entries(selectedUser.stats.evidenceTypeDistribution).map(([type, count]) => {
                  const percentage = selectedUser.stats.totalEvidences > 0 ? Math.round((count / selectedUser.stats.totalEvidences) * 100) : 0;
                  const typeLabels = {
                    image: "📸 Imágenes / Fotos",
                    document: "📄 Documentos (PDF, Word)",
                    text: "✏️ Textos Narrativos",
                    audio: "🎵 Notas de Audio",
                    other: "📁 Otros Archivos"
                  };
                  const colors = {
                    image: "var(--accent-indigo)",
                    document: "var(--accent-emerald)",
                    text: "#fbbf24",
                    audio: "var(--accent-rose)",
                    other: "var(--text-muted)"
                  };
                  if (count === 0) return null; // Only show types they actually uploaded
                  return (
                    <div key={type} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{typeLabels[type] || type}</span>
                        <span style={{ color: "var(--text-muted)" }}>{count} ({percentage}%)</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${percentage}%`, height: "100%", background: colors[type] || "var(--accent-indigo)", borderRadius: "3px" }} />
                      </div>
                    </div>
                  );
                })}
                {(!selectedUser.stats || selectedUser.stats.totalEvidences === 0) && (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                    No ha cargado ningún archivo aún.
                  </p>
                )}
              </div>
            </div>

            {/* Activity Log / Bitácora */}
            <div>
              <h3 style={{ fontSize: "0.88rem", fontWeight: "650", marginBottom: "12px", color: "var(--text-primary)", marginTop: 0 }}>
                📜 Registro de Actividades Recientes (Seguimiento)
              </h3>
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "10px", 
                maxHeight: "180px", 
                overflowY: "auto",
                paddingRight: "6px"
              }}>
                {selectedUser.activityLog && selectedUser.activityLog.length > 0 ? (
                  selectedUser.activityLog.map((log, index) => {
                    const icons = {
                      user: "👤",
                      contract: "📝",
                      evidence: "📁",
                      report: "📄",
                      activity: "⚡",
                      entry: "✏️"
                    };
                    return (
                      <div key={index} style={{ display: "flex", gap: "10px", fontSize: "0.78rem", alignItems: "flex-start", background: "rgba(255,255,255,0.01)", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.02)" }}>
                        <span style={{ flexShrink: 0, fontSize: "1rem" }}>{icons[log.type] || "🔹"}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: "1.3" }}>{log.description}</p>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block", marginTop: "3px" }}>
                            {new Date(log.date).toLocaleString("es-ES")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                    Sin actividades registradas.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
