"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icon";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  searchable?: boolean;
};

export function Dropdown({ label, value, options, onChange, searchable = false }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => !q || o.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn btn-ghost"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", justifyContent: "space-between", color: value ? "var(--ink)" : "var(--ink-3)" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || label}
        </span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          {searchable && (
            <div style={{ padding: 8, borderBottom: "1px solid var(--line)" }}>
              <input
                className="input"
                placeholder="Suchen..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ padding: "6px 10px", fontSize: 12.5 }}
              />
            </div>
          )}
          <div style={{ padding: 4 }}>
            <button
              className="nav-item"
              onClick={() => { onChange(""); setOpen(false); setQ(""); }}
              style={{ padding: "7px 10px", fontSize: 13, color: value === "" ? "var(--ink)" : "var(--ink-3)" }}
            >
              Alle
            </button>
            {filtered.map((o) => (
              <button
                key={o}
                className="nav-item"
                onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                style={{ padding: "7px 10px", fontSize: 13, fontWeight: value === o ? 500 : 400 }}
              >
                {value === o && <Icon name="check" size={13} />}
                <span style={{ marginLeft: value === o ? 0 : 19 }}>{o}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
