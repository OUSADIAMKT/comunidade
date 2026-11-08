/** Monta o link wa.me (Brasil) com mensagem pré-formatada. Retorna null sem telefone válido. */
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

export function messageToProfessional(opts: { professionalName: string; companyName: string; subject: string | null }) {
  const first = opts.professionalName.split(" ")[0];
  return (
    `Olá, ${first}! Aqui é da ${opts.companyName}. Deu match pelo Creators da Amazônia 🎉` +
    (opts.subject ? ` Quero conversar sobre "${opts.subject}".` : " Vamos conversar sobre um trabalho?")
  );
}

export function messageToCompany(opts: { professionalName: string; companyName: string; subject: string | null }) {
  return (
    `Olá, equipe da ${opts.companyName}! Aqui é ${opts.professionalName}. Deu match pelo Creators da Amazônia 🎉` +
    (opts.subject ? ` Vamos falar sobre "${opts.subject}"?` : " Vamos conversar sobre o trabalho?")
  );
}
