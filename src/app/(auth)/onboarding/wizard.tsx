"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, NativeSelect } from "@/components/shared/select";
import { AMAZON_POLES, MIN_ACCOUNT_AGE, NICHES, UFS, UNDERAGE_MESSAGE, USERNAME_RE, WORK_MODALITIES, ageFromISODate } from "@/lib/constants";
import { completeOnboarding, type OnboardingInput } from "./actions";

type Category = { id: string; name: string; description: string | null };

function slugify(name: string) {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
}

const STEPS = ["Quem é você", "Onde você atua", "O que você oferece"];

export function OnboardingWizard({
  categories,
  defaultName,
  defaultPhone,
}: {
  categories: Category[];
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [d, setD] = useState<OnboardingInput>({
    username: slugify(defaultName),
    headline: "",
    categoryIds: [],
    primaryCategoryId: "",
    state_uf: "PA",
    city: "",
    amazon_territory_pole: "",
    work_modality: "HYBRID",
    phone: defaultPhone,
    birth_date: "",
    bio: "",
    niches: [],
    starting_price: 0,
  });
  const set = <K extends keyof OnboardingInput>(k: K, v: OnboardingInput[K]) => setD((p) => ({ ...p, [k]: v }));

  function toggleCategory(id: string) {
    setD((p) => {
      const has = p.categoryIds.includes(id);
      const categoryIds = has ? p.categoryIds.filter((c) => c !== id) : [...p.categoryIds, id];
      const primaryCategoryId = categoryIds.includes(p.primaryCategoryId) ? p.primaryCategoryId : (categoryIds[0] ?? "");
      return { ...p, categoryIds, primaryCategoryId };
    });
  }

  function validate(s: number) {
    if (s === 0) {
      if (!USERNAME_RE.test(d.username)) return "Usuário: 3 a 30 caracteres (a-z, 0-9 e _).";
      if (!d.categoryIds.length) return "Escolha pelo menos uma categoria.";
    }
    if (s === 1) {
      if (!d.city.trim()) return "Informe sua cidade.";
      const digits = d.phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) return "WhatsApp inválido. Use DDD + número.";
      const age = ageFromISODate(d.birth_date);
      if (age === null) return "Informe a data de nascimento do titular da conta.";
      if (age < MIN_ACCOUNT_AGE) return UNDERAGE_MESSAGE;
    }
    return "";
  }

  function next() {
    const e = validate(step);
    setError(e);
    if (!e) setStep(step + 1);
  }

  function finish() {
    const e = validate(0) || validate(1);
    if (e) return setError(e);
    setError("");
    startTransition(async () => {
      const res = await completeOnboarding(d);
      if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
      router.replace("/profissional/perfil");
      router.refresh();
    });
  }

  return (
    <Card className="surface w-full !ring-0">
      <CardHeader>
        <p className="eyebrow">Passo {step + 1} de {STEPS.length}</p>
        <CardTitle className="font-display text-2xl font-bold">{STEPS[step]}</CardTitle>
        <ol
          className="mt-3 flex items-center gap-2"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Passo ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
        >
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                aria-hidden
                className={
                  "grid size-7 shrink-0 rotate-45 place-items-center rounded-md border text-xs font-bold transition-colors " +
                  (i <= step ? "border-amarelo bg-amarelo text-[#1a1405]" : "border-border text-muted-foreground")
                }
              >
                <span className="-rotate-45">{i + 1}</span>
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className={"h-0.5 flex-1 rounded " + (i < step ? "bg-amarelo" : "bg-border")} />
              )}
            </li>
          ))}
        </ol>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 && (
          <>
            <Field label="Seu @usuário (endereço do Mídia Kit)" htmlFor="username" hint={`creators.com/c/${d.username || "seu_usuario"}`}>
              <Input id="username" value={d.username} onChange={(e) => set("username", e.target.value.toLowerCase())} />
            </Field>
            <Field label="Título do perfil" htmlFor="headline" hint="Ex: UGC Creator | Social Media de Eventos | IA Ferramenteiro">
              <Input id="headline" value={d.headline} onChange={(e) => set("headline", e.target.value)} />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Categorias (pode marcar várias)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm has-[:checked]:border-amarelo has-[:checked]:bg-amarelo/10">
                    <input type="checkbox" checked={d.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
            {d.categoryIds.length > 1 && (
              <Field label="Categoria principal" htmlFor="primary">
                <NativeSelect id="primary" value={d.primaryCategoryId} onChange={(e) => set("primaryCategoryId", e.target.value)}>
                  {categories.filter((c) => d.categoryIds.includes(c.id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="UF" htmlFor="uf">
                <NativeSelect id="uf" value={d.state_uf} onChange={(e) => set("state_uf", e.target.value)}>
                  {UFS.map((u) => <option key={u}>{u}</option>)}
                </NativeSelect>
              </Field>
              <div className="col-span-2">
                <Field label="Cidade" htmlFor="city">
                  <Input id="city" value={d.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
              </div>
            </div>
            <Field label="Polo territorial amazônico (opcional)" htmlFor="pole">
              <NativeSelect id="pole" value={d.amazon_territory_pole} onChange={(e) => set("amazon_territory_pole", e.target.value)}>
                <option value="">Não se aplica</option>
                {AMAZON_POLES.map((p) => <option key={p}>{p}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Modalidade de trabalho" htmlFor="mod">
              <NativeSelect id="mod" value={d.work_modality} onChange={(e) => set("work_modality", e.target.value as OnboardingInput["work_modality"])}>
                {Object.entries(WORK_MODALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </NativeSelect>
            </Field>
            <Field label="WhatsApp com DDD" htmlFor="phone" hint="Só é liberado para a empresa depois do match mútuo.">
              <Input id="phone" inputMode="tel" placeholder="93999999999" value={d.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Data de nascimento do titular" htmlFor="birth_date" hint="Só maiores de 18 anos. Se o talento for menor, o responsável legal faz o cadastro.">
              <Input id="birth_date" type="date" value={d.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Sobre você" htmlFor="bio">
              <Textarea id="bio" rows={4} value={d.bio} onChange={(e) => set("bio", e.target.value)} />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Nichos de afinidade</legend>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((n) => {
                  const on = d.niches.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("niches", on ? d.niches.filter((x) => x !== n) : [...d.niches, n])}
                      className={`rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field label="Preço inicial (a partir de R$)" htmlFor="price">
              <Input id="price" type="number" min={0} step="0.01" value={d.starting_price} onChange={(e) => set("starting_price", Number(e.target.value))} />
            </Field>
          </>
        )}

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" disabled={step === 0 || pending} onClick={() => { setError(""); setStep(step - 1); }}>
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>Continuar</Button>
          ) : (
            <Button type="button" onClick={finish} disabled={pending}>{pending ? "Salvando..." : "Concluir"}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
