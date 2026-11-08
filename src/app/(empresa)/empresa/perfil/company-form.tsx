"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/select";
import { createClient } from "@/lib/supabase/client";
import { AMAZON_POLES, MAX_UPLOAD_BYTES, NICHES, UFS } from "@/lib/constants";
import type { FormState } from "@/lib/form-state";
import { saveCompanyProfile } from "../actions";

const SECTORS = ["Bioeconomia & Cosméticos", "Comércio Local", "Turismo", "Gastronomia", "Indústria", "Startup / Tecnologia", "Agência", ...NICHES];
const initial: FormState = { ok: false };

/* eslint-disable @typescript-eslint/no-explicit-any */
export function CompanyForm({ userId, company, phone }: { userId: string; company: any | null; phone: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (prev: FormState, fd: FormData) => {
      const res = await saveCompanyProfile(prev, fd);
      if (res.ok) router.refresh();
      return res;
    },
    initial,
  );
  const [logo, setLogo] = useState<string>(company?.logo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    if (!file.type.startsWith("image/")) return setUploadErr("Envie uma imagem.");
    if (file.size > MAX_UPLOAD_BYTES) return setUploadErr("Arquivo acima de 50 MB.");
    setUploading(true);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadErr("Falha no envio do logo.");
    setLogo(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={action} noValidate className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{company ? "Perfil da empresa" : "Cadastre sua empresa"}</h1>
        {!company && <p className="text-sm text-muted-foreground">Preencha os dados abaixo para encontrar profissionais e publicar oportunidades.</p>}
      </div>
      <input type="hidden" name="logo_url" value={logo} />

      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt="Logo da empresa" className="size-16 rounded-lg object-cover" /> : <div className="size-16 rounded-lg bg-muted" aria-hidden />}
        <div className="space-y-1">
          <label htmlFor="logo" className="text-sm font-medium">Logo</label>
          <Input id="logo" type="file" accept="image/*" onChange={onLogo} disabled={uploading} />
          {uploadErr && <p className="text-xs text-destructive" role="alert">{uploadErr}</p>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Razão social / nome" htmlFor="company_name"><Input id="company_name" name="company_name" defaultValue={company?.company_name} /></Field>
        <Field label="Nome fantasia" htmlFor="trade_name"><Input id="trade_name" name="trade_name" defaultValue={company?.trade_name ?? ""} /></Field>
        <Field label="CNPJ (opcional)" htmlFor="cnpj"><Input id="cnpj" name="cnpj" inputMode="numeric" defaultValue={company?.cnpj ?? ""} /></Field>
        <Field label="Setor / nicho" htmlFor="sector_niche">
          <NativeSelect id="sector_niche" name="sector_niche" defaultValue={company?.sector_niche ?? ""}>
            <option value="">Selecione...</option>
            {SECTORS.map((n) => <option key={n}>{n}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Sobre a empresa" htmlFor="description"><Textarea id="description" name="description" rows={3} defaultValue={company?.description ?? ""} /></Field>
      <Field
        label="WhatsApp da empresa (com DDD)"
        htmlFor="phone"
        hint="Obrigatório. Só é mostrado ao profissional depois do match dos dois lados, para ele poder te chamar."
      >
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(93) 99999-9999" defaultValue={phone} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Site" htmlFor="website_url"><Input id="website_url" name="website_url" type="url" placeholder="https://" defaultValue={company?.website_url ?? ""} /></Field>
        <Field label="Instagram (@)" htmlFor="instagram_handle"><Input id="instagram_handle" name="instagram_handle" defaultValue={company?.instagram_handle ?? ""} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="UF" htmlFor="state_uf">
          <NativeSelect id="state_uf" name="state_uf" defaultValue={company?.state_uf ?? "PA"}>{UFS.map((u) => <option key={u}>{u}</option>)}</NativeSelect>
        </Field>
        <div className="col-span-2"><Field label="Cidade" htmlFor="city"><Input id="city" name="city" defaultValue={company?.city ?? ""} /></Field></div>
      </div>
      <Field label="Polo territorial amazônico (opcional)" htmlFor="amazon_territory_pole">
        <NativeSelect id="amazon_territory_pole" name="amazon_territory_pole" defaultValue={company?.amazon_territory_pole ?? ""}>
          <option value="">Não se aplica</option>
          {AMAZON_POLES.map((p) => <option key={p}>{p}</option>)}
        </NativeSelect>
      </Field>

      <div aria-live="polite" className="min-h-6 text-sm">
        {state.error && <p className="text-destructive" role="alert">{state.error}</p>}
        {state.ok && <p className="text-floresta">{state.message}</p>}
      </div>
      <Button type="submit" disabled={pending || uploading}>{pending ? "Salvando..." : company ? "Salvar" : "Cadastrar empresa"}</Button>
    </form>
  );
}
