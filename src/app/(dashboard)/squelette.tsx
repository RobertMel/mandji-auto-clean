// src/app/(dashboard)/squelette.tsx
// Aperçu affiché pendant le chargement d'un onglet (retour visuel immédiat).
export default function Squelette({ lignes = 4 }: { lignes?: number }) {
  return (
    <main className="max-w-4xl px-6 py-10 mx-auto" aria-busy="true" aria-label="Chargement">
      <div className="w-40 h-7 mb-8 rounded-lg bg-gray-100 animate-pulse" />
      <div className="grid gap-4 mb-8 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: lignes }, (_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />
        ))}
      </div>
    </main>
  );
}
