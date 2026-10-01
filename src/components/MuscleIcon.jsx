import React from "react";

/* ---------------- Icone gruppo muscolare ----------------
   SVG a linea in stile lucide (24×24, stroke currentColor): la sagoma è a
   contorno, il muscolo allenato è pieno. Usate in libreria esercizi, popup
   di selezione e info esercizio al posto delle lettere/glifi. */
const TORSO = "M6.5 8Q12 6.6 17.5 8L18.5 12Q18 16.5 15.8 21H8.2Q6 16.5 5.5 12Z";
const HEAD = <circle cx="12" cy="3.6" r="2.1" />;
const ARM = "M9.8 8L10.5 12.5C12.5 9.5 18 9.5 21 13.5M4.2 8L3.5 16Q3.5 20 7.5 20H21";
const FIST = <rect x="3.5" y="2.5" width="7" height="5.5" rx="2.5" />;

const PATHS = {
  Petto: (
    <>
      {HEAD}
      <path d={TORSO} />
      <path className="mi-fill" d="M7.4 9.9Q9.7 9.2 11.3 9.7V13.2Q9.2 14.3 7.4 13Z" />
      <path className="mi-fill" d="M16.6 9.9Q14.3 9.2 12.7 9.7V13.2Q14.8 14.3 16.6 13Z" />
    </>
  ),
  Dorso: (
    <>
      {HEAD}
      <path d={TORSO} />
      <path d="M12 8.3V20" />
      <path className="mi-fill" d="M7.3 10.4Q9.4 10.4 11 12V16.6Q9.3 17 8.6 18.8Q7.3 15 7.3 10.4Z" />
      <path className="mi-fill" d="M16.7 10.4Q14.6 10.4 13 12V16.6Q14.7 17 15.4 18.8Q16.7 15 16.7 10.4Z" />
    </>
  ),
  Spalle: (
    <>
      {HEAD}
      <path d="M8.5 8H15.5L16.5 21H7.5Z" />
      <circle className="mi-fill" cx="6.2" cy="10" r="2.6" />
      <circle className="mi-fill" cx="17.8" cy="10" r="2.6" />
      <path d="M4.2 12.4L3.8 19M19.8 12.4L20.2 19" />
    </>
  ),
  Bicipiti: (
    <>
      {FIST}
      <path d={ARM} />
      <path className="mi-fill" d="M10.5 12.5C12.5 9.5 18 9.5 21 13.5C17.5 15.6 13.5 15.6 10.5 12.5Z" />
    </>
  ),
  Tricipiti: (
    <>
      {FIST}
      <path d={ARM} />
      <path className="mi-fill" d="M8 20C11.5 16.6 17 16.2 21 17V20Z" />
    </>
  ),
  Gambe: (
    <>
      <path d="M6 3H18" />
      <path d="M6.5 3Q6 9 7.5 13L7.8 21H10.2L10.6 13Q11.8 8 11.8 3" />
      <path d="M17.5 3Q18 9 16.5 13L16.2 21H13.8L13.4 13Q12.2 8 12.2 3" />
      <path className="mi-fill" d="M7.2 4.6Q7 9 8.2 12H10.4Q11.2 8.6 11.2 4.6Z" />
      <path className="mi-fill" d="M16.8 4.6Q17 9 15.8 12H13.6Q12.8 8.6 12.8 4.6Z" />
    </>
  ),
  Core: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="4" />
      {[6.6, 10.2, 13.8].map((y) => (
        <React.Fragment key={y}>
          <rect className="mi-fill" x="8.6" y={y} width="2.8" height="2.8" rx="0.8" />
          <rect className="mi-fill" x="12.6" y={y} width="2.8" height="2.8" rx="0.8" />
        </React.Fragment>
      ))}
    </>
  ),
  Cardio: (
    <>
      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
      <path d="M3.2 12H8.5L10 9L12 15L13.5 12H20.8" />
    </>
  ),
  Altro: (
    <>
      <path d="M6.5 6.5 17.5 17.5M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7" />
    </>
  ),
};

export function MuscleIcon({ group, size = 18, strokeWidth = 1.7, style }) {
  return (
    <svg className="muscle-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      {PATHS[group] || PATHS.Altro}
    </svg>
  );
}
