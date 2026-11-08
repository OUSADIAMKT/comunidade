/** Linhas de rio decorativas (traço animado). Use dentro de um elemento `relative overflow-hidden`. */
export function RiverArt({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full opacity-60 ${className}`}
      viewBox="0 0 800 220"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path d="M0 150c120-50 200 50 320 0s220-50 330 0 110 25 150 5" stroke="#18a5c9" strokeOpacity=".55" strokeWidth="1.5" className="rio-corrente" />
      <path d="M0 180c120-50 200 50 320 0s220-50 330 0 110 25 150 5" stroke="#3fd08f" strokeOpacity=".5" strokeWidth="1.5" />
      <path d="M0 210c120-50 200 50 320 0s220-50 330 0 110 25 150 5" stroke="#ffc61a" strokeOpacity=".4" strokeWidth="1.5" className="rio-corrente" />
    </svg>
  );
}
