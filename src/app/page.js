import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  
  // Auto-redirect if already logged in
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 0%, #0d1527 0%, var(--bg-primary) 70%)",
      color: "var(--text-primary)",
      overflowX: "hidden",
      position: "relative"
    }}>
      
      {/* Decorative Glowing Blobs */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "15%",
        width: "350px",
        height: "350px",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        top: "40%",
        right: "10%",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Navbar */}
      <header style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
        zIndex: 10
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: "36px",
            height: "36px",
            background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            boxShadow: "0 4px 15px var(--accent-glow)"
          }}>
            📄
          </div>
          <span style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #fff 40%, var(--text-accent) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Tu Tranqui
          </span>
        </Link>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" className="btn btn-secondary btn-sm" style={{ padding: "8px 18px", fontSize: "0.85rem" }}>
            Iniciar Sesión
          </Link>
          <Link href="/login?mode=register" className="btn btn-primary btn-sm" style={{ padding: "8px 18px", fontSize: "0.85rem" }}>
            Registrarse
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "80px 20px 60px",
        textAlign: "center",
        position: "relative",
        zIndex: 10
      }}>
        <div className="animate-in stagger">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            color: "var(--text-accent)",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: 600,
            marginBottom: 24
          }}>
            🚀 Prototipo V2 con IA Generativa
          </div>
          
          <h1 style={{
            fontSize: "clamp(2.25rem, 5vw, 4rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: 20,
            background: "linear-gradient(to right, #ffffff, #a5b4fc, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Tus informes de actividades,<br />con total tranquilidad.
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "var(--text-secondary)",
            maxWidth: "680px",
            margin: "0 auto 36px",
            lineHeight: 1.6
          }}>
            La plataforma copiloto diseñada para contratistas del Estado colombiano (Alcaldías y Gobernaciones). Gestiona tus bitácoras diarias por IA y genera tus informes mensuales oficiales en Word, PDF y Excel en segundos.
          </p>

          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap"
          }}>
            <Link href="/login" className="btn btn-primary btn-lg" style={{ minWidth: "180px" }}>
              Comenzar Gratis
            </Link>
            <a href="#beneficios" className="btn btn-secondary btn-lg" style={{ minWidth: "180px" }}>
              Ver Beneficios
            </a>
          </div>
        </div>
      </section>

      {/* Main Features Banner */}
      <section id="beneficios" style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "60px 20px 100px",
        position: "relative",
        zIndex: 10
      }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>¿Por qué usar Tu Tranqui?</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Automatizamos la burocracia para que te enfoques en lo que realmente importa.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24
        }} className="stagger">
          
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              width: "44px",
              height: "44px",
              background: "rgba(99, 102, 241, 0.15)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem"
            }}>
              🤖
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Carga y Extracción IA</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Arrastra tu contrato o informe anterior (PDF o Word). Nuestro sistema analiza el texto, identifica tus metas y obligaciones específicas y las organiza estructuradamente de forma automática.
            </p>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              width: "44px",
              height: "44px",
              background: "rgba(6, 182, 212, 0.15)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem"
            }}>
              💬
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Copiloto de IA Conversacional</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Un chat interactivo con contexto completo de tus obligaciones contractuales. Te sugiere de forma proactiva qué actividades semanales registrar y te permite crearlas rápidamente desde las sugerencias.
            </p>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              width: "44px",
              height: "44px",
              background: "rgba(16, 185, 129, 0.15)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem"
            }}>
              📦
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Exportación Multiformato</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Genera con un solo clic tus informes mensuales oficiales en múltiples formatos editables y formales: Word (.docx), PDF (.pdf) con diseño institucional y Excel (.xlsx) para control cronológico.
            </p>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              width: "44px",
              height: "44px",
              background: "rgba(245, 158, 11, 0.15)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem"
            }}>
              📋
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Control de Bitácoras</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Lleva un registro preciso de tus bitácoras de actividades diarias asociadas a cada alcance, adjunta tus evidencias y mantén el control de tus tareas completadas o pendientes en un solo lugar.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border-glass)",
        background: "rgba(10, 14, 26, 0.6)",
        backdropFilter: "blur(20px)"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: "1.2rem" }}>📄</div>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Tu Tranqui</span>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            © 2026 Tu Tranqui. Todos los derechos reservados. Diseñado para simplificar la gestión pública.
          </span>
        </div>
      </footer>

    </div>
  );
}
