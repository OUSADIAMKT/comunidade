"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { submitExam, type ExamResult } from "@/app/actions/escola";

type Question = { id: string; prompt: string; options: string[] };

export function ExamForm({ courseId, courseSlug, questions }: { courseId: string; courseSlug: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [pending, startTransition] = useTransition();
  const answered = Object.keys(answers).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (answered < questions.length) return setResult({ ok: false, error: "Responda todas as questões antes de enviar." });
    setResult(null);
    startTransition(async () => setResult(await submitExam(courseId, answers)));
  }

  if (result?.ok && result.passed) {
    return (
      <div className="space-y-3 rounded-xl border border-floresta bg-floresta/10 p-6 text-floresta" role="status">
        <h2 className="text-xl font-bold">Aprovado com {result.score}%!</h2>
        <p className="text-sm">Você acertou {result.correct} de {result.total} questões.</p>
        {result.certificateCode && (
          <Link href={`/certificado/${result.certificateCode}`} className="inline-flex h-10 items-center rounded-lg bg-green-700 px-5 text-sm font-medium text-white">
            Ver e imprimir meu certificado
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {result?.ok && !result.passed && (
        <div className="space-y-1 rounded-xl border border-amarelo/50 bg-amarelo/10 p-4 text-amarelo" role="status">
          <p className="font-semibold">Você fez {result.score}% — o mínimo é {result.passScore}%.</p>
          <p className="text-sm">
            Acertou {result.correct} de {result.total}. Revise as aulas e tente de novo em 5 minutos.{" "}
            <Link href={`/escola/${courseSlug}`} className="underline">Voltar ao curso</Link>
          </p>
        </div>
      )}
      {questions.map((q, i) => (
        <fieldset key={q.id} className="space-y-2 rounded-xl border p-4">
          <legend className="px-1 font-medium">{i + 1}. {q.prompt}</legend>
          {q.options.map((opt, oi) => (
            <label key={oi} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${answers[q.id] === oi ? "border-primary bg-muted" : ""}`}>
              <input type="radio" name={`q-${q.id}`} className="mt-1" checked={answers[q.id] === oi}
                onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
              <span>{opt}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {result && !result.ok && <p className="text-sm text-destructive" role="alert">{result.error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Corrigindo..." : "Enviar respostas"}</Button>
        <span className="text-sm text-muted-foreground">{answered}/{questions.length} respondidas</span>
      </div>
    </form>
  );
}
