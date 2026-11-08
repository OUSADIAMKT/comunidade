"use client";
import { MapPin } from "lucide-react";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion } from "@/components/shared/accordion";
import { Field, NativeSelect } from "@/components/shared/select";
import { createClient } from "@/lib/supabase/client";
import { AMAZON_POLES, MAX_UPLOAD_BYTES, MIN_SCORE_TO_PUBLISH, NICHES, UFS, WORK_MODALITIES, formatBRL } from "@/lib/constants";
import { saveProfile, type FormState } from "../actions";

type Category = { id: string; name: string };
type Mine = { category_id: string; is_primary: boolean; experience_years: number };
/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = {
  userId: string;
  score: number;
  categories: Category[];
  mine: Mine[];
  profile: any;
  me: { full_name: string; avatar_url: string; phone: string };
  priv: { pix_key: string; cpf_cnpj: string; birth_date: string };
};

const initial: FormState = { ok: false };

export function ProfileForm({ userId, score, categories, mine, profile, me, priv }: Props) {
  const [state, action, pending] = useActionState(saveProfile, initial);
  const [selected, setSelected] = useState<string[]>(mine.map((m) => m.category_id));
  const [primary, setPrimary] = useState(mine.find((m) => m.is_primary)?.category_id ?? mine[0]?.category_id ?? "");
  const [avatar, setAvatar] = useState(me.avatar_url);
  const [uploadErr, setUploadErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [niches, setNiches] = useState<string[]>(profile.niches ?? []);
  const [pv, setPv] = useState({
    name: me.full_name, headline: profile.headline ?? "", city: profile.city, uf: profile.state_uf,
    price: Number(profile.starting_price ?? 0), username: profile.username,
  });
  const liveScore = state.score ?? score;

  function toggleCategory(id: string) {
    const next = selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id];
    setSelected(next);
    if (!next.includes(primary)) setPrimary(next[0] ?? "");
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    if (!file.type.startsWith("image/")) return setUploadErr("Envie uma imagem (JPG, PNG ou WebP).");
    if (file.size > MAX_UPLOAD_BYTES) return setUploadErr("Arquivo acima de 50 MB.");
    setUploading(true);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadErr("Falha no envio da foto.");
    setAvatar(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
  }

  const published = liveScore >= MIN_SCORE_TO_PUBLISH;
  const track = (name: keyof typeof pv, v: string | number) => setPv((p) => ({ ...p, [name]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <form action={action} noValidate className="space-y-3">
        <input type="hidden" name="avatar_url" value={avatar} />

        <div className="rounded-xl border p-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>Perfil {liveScore}% completo</span>
            <span className={published ? "text-floresta" : "text-amarelo"}>
              {published ? "Pode publicar pacotes e se candidatar" : `Faltam itens (mínimo ${MIN_SCORE_TO_PUBLISH}%)`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-muted" role="progressbar" aria-valuenow={liveScore} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-all" style={{ width: `${liveScore}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Obrigatórios: foto, bio, 1+ categoria, cidade/UF, WhatsApp e 1+ item no portfólio.
          </p>
        </div>

        <Accordion title="1. Dados básicos e especialidades" defaultOpen>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar} alt="Sua foto" className="size-16 rounded-full object-cover" /> : <div className="size-16 rounded-full bg-muted" aria-hidden />}
            <div className="space-y-1">
              <label htmlFor="avatar" className="text-sm font-medium">Foto de perfil</label>
              <Input id="avatar" type="file" accept="image/*" onChange={onAvatar} disabled={uploading} />
              {uploading && <p className="text-xs">Enviando...</p>}
              {!uploading && avatar && avatar !== me.avatar_url && (
                <p className="text-xs font-medium text-amarelo" role="status">Foto enviada. Clique em Salvar no fim da página para aplicar.</p>
              )}
              {uploadErr && <p className="text-xs text-destructive" role="alert">{uploadErr}</p>}
            </div>
          </div>
          <Field label="Nome" htmlFor="full_name">
            <Input id="full_name" name="full_name" defaultValue={me.full_name} onChange={(e) => track("name", e.target.value)} />
          </Field>
          <Field label="@usuário" htmlFor="username" hint="Endereço do seu Mídia Kit: /c/seu_usuario">
            <Input id="username" name="username" defaultValue={profile.username} onChange={(e) => track("username", e.target.value)} />
          </Field>
          <Field label="Título do perfil" htmlFor="headline">
            <Input id="headline" name="headline" defaultValue={profile.headline ?? ""} placeholder="UGC Creator | Social Media de Eventos | IA Ferramenteiro" onChange={(e) => track("headline", e.target.value)} />
          </Field>
          <Field label="Bio" htmlFor="bio">
            <Textarea id="bio" name="bio" rows={4} defaultValue={profile.bio ?? ""} />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Categorias (marque quantas quiser)</legend>
            <div className="space-y-2">
              {categories.map((c) => {
                const on = selected.includes(c.id);
                const exp = mine.find((m) => m.category_id === c.id)?.experience_years ?? 1;
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-2 text-sm">
                    <label className="flex min-w-48 flex-1 items-center gap-2">
                      <input type="checkbox" name="categories" value={c.id} checked={on} onChange={() => toggleCategory(c.id)} />
                      {c.name}
                    </label>
                    {on && (
                      <>
                        <label className="flex items-center gap-1">
                          <input type="radio" name="primary_category" value={c.id} checked={primary === c.id} onChange={() => setPrimary(c.id)} />
                          principal
                        </label>
                        <label className="flex items-center gap-1">
                          anos
                          <Input name={`exp_${c.id}`} type="number" min={1} max={60} defaultValue={exp} className="h-7 w-16" aria-label={`Anos de experiência em ${c.name}`} />
                        </label>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Nichos de afinidade</legend>
            <div className="flex flex-wrap gap-2">
              {NICHES.map((n) => {
                const on = niches.includes(n);
                return (
                  <label key={n} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                    <input type="checkbox" name="niches" value={n} checked={on} className="sr-only"
                      onChange={() => setNiches(on ? niches.filter((x) => x !== n) : [...niches, n])} />
                    {n}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preço inicial (a partir de R$)" htmlFor="starting_price">
              <Input id="starting_price" name="starting_price" type="number" min={0} step="0.01" defaultValue={profile.starting_price ?? 0} onChange={(e) => track("price", Number(e.target.value))} />
            </Field>
            <Field label="Modalidade" htmlFor="work_modality">
              <NativeSelect id="work_modality" name="work_modality" defaultValue={profile.work_modality}>
                {Object.entries(WORK_MODALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="is_available" defaultChecked={profile.is_available} /> Disponível para novos trabalhos</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_public" defaultChecked={profile.is_public} /> Perfil público (aparece na vitrine)</label>
          </div>
        </Accordion>

        <Accordion title="2. Localização e contato">
          <div className="grid grid-cols-3 gap-3">
            <Field label="UF" htmlFor="state_uf">
              <NativeSelect id="state_uf" name="state_uf" defaultValue={profile.state_uf} onChange={(e) => track("uf", e.target.value)}>
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </NativeSelect>
            </Field>
            <div className="col-span-2">
              <Field label="Cidade" htmlFor="city">
                <Input id="city" name="city" defaultValue={profile.city} onChange={(e) => track("city", e.target.value)} />
              </Field>
            </div>
          </div>
          <Field label="Polo territorial amazônico (opcional)" htmlFor="amazon_territory_pole">
            <NativeSelect id="amazon_territory_pole" name="amazon_territory_pole" defaultValue={profile.amazon_territory_pole ?? ""}>
              <option value="">Não se aplica</option>
              {AMAZON_POLES.map((p) => <option key={p}>{p}</option>)}
            </NativeSelect>
          </Field>
          <Field label="WhatsApp com DDD" htmlFor="phone" hint="Fica oculto: só é liberado à empresa após o match mútuo.">
            <Input id="phone" name="phone" inputMode="tel" defaultValue={me.phone} placeholder="93999999999" />
          </Field>
        </Accordion>

        <Accordion title="3. Redes sociais">
          {(["instagram", "tiktok", "youtube", "pinterest"] as const).map((net) => (
            <div key={net} className="grid grid-cols-[1fr_140px] gap-3">
              <Field label={`${net[0].toUpperCase()}${net.slice(1)} (@usuário)`} htmlFor={`${net}_handle`}>
                <Input id={`${net}_handle`} name={`${net}_handle`} defaultValue={profile[`${net}_handle`] ?? ""} />
              </Field>
              <Field label="Seguidores" htmlFor={`${net}_followers`}>
                <Input id={`${net}_followers`} name={`${net}_followers`} type="number" min={0} defaultValue={profile[`${net}_followers`] ?? 0} />
              </Field>
            </div>
          ))}
        </Accordion>

        <Accordion title="4. Recebimento e dados privados" hint="visível só para você">
          <p className="text-xs text-muted-foreground">
            Estes dados ficam em uma tabela protegida (LGPD) e nunca aparecem na vitrine ou no Mídia Kit.
          </p>
          <Field label="Chave Pix" htmlFor="pix_key">
            <Input id="pix_key" name="pix_key" defaultValue={priv.pix_key} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CPF ou CNPJ" htmlFor="cpf_cnpj">
              <Input id="cpf_cnpj" name="cpf_cnpj" inputMode="numeric" defaultValue={priv.cpf_cnpj} />
            </Field>
            <Field label="Data de nascimento do titular (18+)" htmlFor="birth_date">
              <Input id="birth_date" name="birth_date" type="date" defaultValue={priv.birth_date} />
            </Field>
          </div>
        </Accordion>

        <div aria-live="polite" className="min-h-6 text-sm">
          {state.error && <p className="text-destructive" role="alert">{state.error}</p>}
          {state.ok && state.message && <p className="text-floresta">{state.message}</p>}
        </div>
        <Button type="submit" disabled={pending || uploading}>{pending ? "Salvando..." : "Salvar perfil"}</Button>
      </form>

      <aside className="h-fit rounded-xl border p-4 lg:sticky lg:top-4" aria-label="Pré-visualização do cartão público">
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Seu cartão público</p>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatar ? <img src={avatar} alt="" className="size-14 rounded-full object-cover" /> : <div className="size-14 rounded-full bg-muted" aria-hidden />}
          <div>
            <p className="font-semibold">{pv.name || "Seu nome"}</p>
            <p className="text-xs text-muted-foreground">@{pv.username}</p>
          </div>
        </div>
        <p className="mt-3 text-sm">{pv.headline || "Seu título aparece aqui"}</p>
        <p className="mt-1 text-xs text-muted-foreground"><MapPin className="mr-1 inline size-3" aria-hidden="true" />{pv.city || "Cidade"} — {pv.uf}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {categories.filter((c) => selected.includes(c.id)).map((c) => (
            <span key={c.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{c.name}</span>
          ))}
        </div>
        <p className="mt-3 text-sm font-medium">A partir de {formatBRL(pv.price)}</p>
        <a href={`/c/${profile.username}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline">
          Ver Mídia Kit público
        </a>
      </aside>
    </div>
  );
}
