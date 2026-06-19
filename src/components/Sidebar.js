"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Alcances", href: "/dashboard/alcances", icon: "📋" },
  { label: "Informe de Actividades", href: "/dashboard/generar", icon: "📝", badge: "IA" },
  { label: "Informe de Supervisión", href: "/dashboard/supervisora", icon: "👩‍💼", badge: "IA" },
  { label: "Historial", href: "/dashboard/historial", icon: "📁" },
];

const navSecondary = [
  { label: "Configurar Contrato", href: "/dashboard/setup", icon: "🔧" },
  { label: "Arquitectura y Sistema", href: "/dashboard/arquitectura", icon: "🌐" },
  { label: "Configuración", href: "/dashboard/config", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openMenus, setOpenMenus] = useState({});

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const isParentActive = (item) => {
    if (!item.children) return false;
    return item.children.some((child) => isActive(child.href));
  };

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Auto-open submenus when a child is active
  const isMenuOpen = (item) => {
    if (openMenus[item.label] !== undefined) return openMenus[item.label];
    return isParentActive(item);
  };

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="sidebar-logo">
        <div className="sidebar-logo-icon">📄</div>
        <span className="sidebar-logo-text">Tu Tranqui</span>
      </Link>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Principal</div>
        {navItems.map((item) =>
          item.children ? (
            <div key={item.label} className="nav-group">
              <button
                className={`nav-link nav-link-expandable ${isParentActive(item) ? "active" : ""}`}
                onClick={() => toggleMenu(item.label)}
                type="button"
              >
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className="nav-link-badge">{item.badge}</span>
                )}
                <span className={`nav-chevron ${isMenuOpen(item) ? "open" : ""}`}>
                  ‹
                </span>
              </button>
              <div className={`nav-submenu ${isMenuOpen(item) ? "open" : ""}`}>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`nav-link nav-sublink ${isActive(child.href) ? "active" : ""}`}
                  >
                    <span className="nav-link-icon">{child.icon}</span>
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="nav-link-icon">{item.icon}</span>
              {item.label}
              {item.badge && (
                <span className="nav-link-badge">{item.badge}</span>
              )}
            </Link>
          )
        )}

        <div className="nav-section-title">Administración</div>
        {navSecondary
          .filter((item) => {
            if (item.href === "/dashboard/arquitectura") {
              return session?.user?.role === "administrador" || session?.user?.role === "admin" || session?.user?.role === "supervisor";
            }
            return true;
          })
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="nav-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
      </nav>

      <div className="sidebar-footer">
        {session?.user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
            <div className="sidebar-user" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                <div className="sidebar-avatar">
                  {session.user.image ? (
                    <img src={session.user.image} alt={session.user.name || "User"} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    (session.user.name || session.user.email || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="sidebar-user-info" style={{ overflow: "hidden" }}>
                  <div className="sidebar-user-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {session.user.name || "Usuario"}
                  </div>
                  <div className="sidebar-user-role" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {session.user.email}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn btn-ghost btn-sm"
                title="Cerrar sesión"
                style={{ padding: "4px 8px" }}
              >
                🚪
              </button>
            </div>
            
            {/* Indicador de Rama y Versión */}
            <div style={{ 
              fontSize: "0.68rem", 
              color: "var(--text-muted)", 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2px 4px",
              borderTop: "1px solid rgba(255,255,255,0.03)",
              paddingTop: "6px"
            }}>
              <span>Rama: <strong style={{ color: "var(--accent-indigo)" }}>{process.env.VERCEL_GIT_COMMIT_REF || "desarrollo"}</strong></span>
              {process.env.VERCEL_GIT_COMMIT_SHA && (
                <span title={process.env.VERCEL_GIT_COMMIT_SHA}>
                  SHA: {process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Cargando...</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
