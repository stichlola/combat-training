import React from "react";
import { Flame, Check, Trash2 } from "lucide-react";
import { exMode } from "../lib/exercises";
import { tr } from "../lib/i18n";

/* ---------------- Mini menu azioni di una serie (riscaldamento / elimina) ----------------
   Si apre al tap sul chip numero/"W" della serie, posizionato vicino al punto toccato. */
export function SetMenu({ pos, isTime, warmup, onToggleWarmup, onDelete, onClose }) {
  const W = 200, H = isTime ? 56 : 100;
  const left = Math.min(Math.max(8, pos.x - W / 2), window.innerWidth - W - 8);
  const top = Math.min(Math.max(8, pos.y + 10), window.innerHeight - H - 8);
  return (
    <>
      <div className="setmenu-back" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="setmenu cham" style={{ left, top }}>
        {!isTime && (
          <button onClick={() => { onToggleWarmup(); onClose(); }}>
            <Flame size={13} color="#ffd76a" />
            <span className="grow">{tr("Serie di riscaldamento")}</span>
            {warmup && <Check size={13} color="#ffd76a" />}
          </button>
        )}
        <button className="danger" onClick={() => { onDelete(); onClose(); }}>
          <Trash2 size={13} /> {tr("Elimina serie")}
        </button>
      </div>
    </>
  );
}

/* Esercizi isometrici "a tenuta": si misurano in secondi, non in ripetizioni.
   Copre tutti i plank e le tenute statiche; exMode() risolve la modalità anche
   per schede create prima dell'introduzione di mode:"hold". */
