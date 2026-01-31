"use client";

import { useRouter, useSearchParams } from "next/navigation";

type AEOption = {
  id: string;
  name: string;
  email: string;
};

export function AESelector(props: { 
  aes: AEOption[]; 
  selectedAEId: string | null;
  currentView: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newAEId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (newAEId) {
      params.set("ae", newAEId);
    } else {
      params.delete("ae");
    }
    
    // Preserve view parameter
    if (props.currentView && props.currentView !== "qtd") {
      params.set("view", props.currentView);
    }
    
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="ae-selector" className="text-sm text-zinc-600">
        Viewing as:
      </label>
      <select
        id="ae-selector"
        value={props.selectedAEId ?? ""}
        onChange={handleChange}
        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-sm text-zinc-900"
      >
        <option value="">My Dashboard</option>
        {props.aes.map((ae) => (
          <option key={ae.id} value={ae.id}>
            {ae.name || ae.email}
          </option>
        ))}
      </select>
    </div>
  );
}
