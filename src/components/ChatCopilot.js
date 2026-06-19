"use client";
import { useState, useEffect, useRef } from "react";

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

export default function ChatCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: "¡Hola! Soy tu copiloto de IA de Tu Tranqui. Puedo ayudarte a planificar tu mes, redactar tus bitácoras de actividades o sugerirte evidencias de cumplimiento según los alcances de tu contrato. ¿Cómo te fue hoy en tus labores?"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [scopes, setScopes] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [hasContract, setHasContract] = useState(false);

  const messagesEndRef = useRef(null);

  // Sync selected period from URL params if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const m = parseInt(params.get("month"));
      const y = parseInt(params.get("year"));
      if (m >= 1 && m <= 12) setMonth(m);
      if (y >= 2000 && y <= 2100) setYear(y);
    }
  }, [open]);

  // Load contract scopes on mount/open
  useEffect(() => {
    if (!open) return;
    
    fetch(`/api/dashboard?month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => {
        if (data.contract) {
          setHasContract(true);
          setScopes(data.scopes || []);
        } else {
          setHasContract(false);
        }
      })
      .catch(err => console.error("Error loading scopes for chat copilot:", err));
  }, [open, month, year]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: inputText.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          month,
          year
        })
      });

      if (!response.ok) throw new Error("Error de red");
      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: data.response
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: "⚠️ Disculpa, he tenido un problema de conexión para procesar tu solicitud. Por favor intenta de nuevo en unos momentos."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCreate = async (title, scopeOrder) => {
    const targetScope = scopes.find(s => s.orderNumber === scopeOrder);
    if (!targetScope) {
      alert(`No se encontró el Alcance ${scopeOrder} en tu contrato.`);
      return;
    }

    const systemLoadingId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        id: systemLoadingId,
        sender: "system",
        text: `⏳ Creando actividad: "${title}" en el Alcance ${scopeOrder}...`
      }
    ]);

    try {
      const response = await fetch(`/api/scopes/${targetScope.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date: formatDateToSpanish(getTodayDateString()),
          location: "Sugerido por Copiloto",
          month,
          year
        })
      });

      if (!response.ok) throw new Error("Error al crear la actividad");
      const data = await response.json();

      // Update loading message to success
      setMessages(prev => prev.map(msg =>
        msg.id === systemLoadingId
          ? { ...msg, text: `✅ Actividad "${title}" creada exitosamente en el Alcance ${scopeOrder}.` }
          : msg
      ));

      // Trigger a page reload or state refresh Event
      window.dispatchEvent(new CustomEvent("activity-created", { detail: data.activity }));
      
      // Also force router/page reload if needed
      if (typeof window !== "undefined") {
        // We trigger custom event that pages can listen to, or we reload the window after a brief delay
        setTimeout(() => {
          // If we are on the scope details or dashboard, reload to show new activity
          window.location.reload();
        }, 1000);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg =>
        msg.id === systemLoadingId
          ? { ...msg, text: `❌ Error al crear la actividad: ${error.message}` }
          : msg
      ));
    }
  };

  const parseMessageText = (text) => {
    // Regex for [Crear Actividad: "Title" | Alcance: X]
    const regex = /\[Crear Actividad:\s*["'«“]([^"']+)["'»”]\s*\|\s*Alcance:\s*(\d+)\]/gi;
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }
      
      const title = match[1];
      const scopeOrder = parseInt(match[2], 10);
      
      parts.push(
        <div key={matchIndex} style={{ margin: "10px 0" }}>
          <button
            type="button"
            onClick={() => handleQuickCreate(title, scopeOrder)}
            style={{
              background: "linear-gradient(135deg, var(--accent-primary) 0%, #4F46E5 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
              transition: "transform 0.15s, opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            ⚡ Crear Actividad (Alcance {scopeOrder})
          </button>
        </div>
      );
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 99,
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 30px var(--accent-glow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1) rotate(5deg)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1) rotate(0deg)"}
          title="Copiloto de IA (Chat)"
        >
          💬
        </button>
      )}

      {/* Slide-out Drawer */}
      <div style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "380px",
        maxWidth: "90vw",
        zIndex: 100,
        background: "rgba(10, 14, 26, 0.95)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid var(--border-glass)",
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: open ? "-10px 0 40px rgba(0,0,0,0.5)" : "none"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-glass)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.3rem" }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Copiloto Tu Tranqui</div>
              <div style={{ fontSize: "0.7rem", color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                En línea - Contextualizado
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "1.2rem",
              outline: "none"
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages Body */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          {messages.map((msg, index) => {
            const isBot = msg.sender === "bot";
            const isSystem = msg.sender === "system";
            
            return (
              <div
                key={msg.id || index}
                style={{
                  alignSelf: isBot ? "flex-start" : (isSystem ? "center" : "flex-end"),
                  maxWidth: isSystem ? "100%" : "85%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}
              >
                <div style={{
                  padding: isSystem ? "6px 12px" : "12px 16px",
                  borderRadius: isSystem ? "8px" : (isBot ? "0px 14px 14px 14px" : "14px 14px 0px 14px"),
                  fontSize: "0.85rem",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  background: isSystem 
                    ? "rgba(245, 158, 11, 0.08)"
                    : (isBot ? "var(--bg-glass)" : "linear-gradient(135deg, var(--accent-primary) 0%, #4F46E5 100%)"),
                  color: isSystem
                    ? "var(--warning)"
                    : "var(--text-primary)",
                  border: isSystem
                    ? "1px dashed rgba(245, 158, 11, 0.2)"
                    : (isBot ? "1px solid var(--border-glass)" : "none"),
                  boxShadow: !isBot && !isSystem ? "0 4px 12px var(--accent-glow)" : "none"
                }}>
                  {isBot ? parseMessageText(msg.text) : msg.text}
                </div>
                {!isSystem && (
                  <span style={{
                    fontSize: "0.65rem",
                    color: "var(--text-muted)",
                    textAlign: isBot ? "left" : "right",
                    padding: "0 4px"
                  }}>
                    {isBot ? "Copiloto" : "Tú"}
                  </span>
                )}
              </div>
            );
          })}
          
          {loading && (
            <div style={{ alignSelf: "flex-start", maxWidth: "85%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-glass)", border: "1px solid var(--border-glass)", borderRadius: "0px 14px 14px 14px" }}>
              <div className="wizard-spinner" style={{ width: 16, height: 16, borderSize: "2px", margin: 0 }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Analizando tu contrato...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Footer */}
        <form
          onSubmit={handleSend}
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-glass)",
            background: "rgba(17, 24, 39, 0.4)",
            display: "flex",
            gap: 10
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={hasContract ? "Escribe un mensaje..." : "Sube tu contrato primero..."}
            disabled={!hasContract || loading}
            style={{
              flex: 1,
              background: "var(--bg-glass)",
              border: "1px solid var(--border-glass)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--accent-primary)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-glass)"}
          />
          <button
            type="submit"
            disabled={!hasContract || !inputText.trim() || loading}
            style={{
              background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              boxShadow: "0 4px 15px var(--accent-glow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: (!hasContract || !inputText.trim() || loading) ? 0.5 : 1,
              pointerEvents: (!hasContract || !inputText.trim() || loading) ? "none" : "auto"
            }}
          >
            ➤
          </button>
        </form>
      </div>
    </>
  );
}
