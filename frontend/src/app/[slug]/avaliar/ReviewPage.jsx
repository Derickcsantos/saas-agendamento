"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ImagePlus, LoaderCircle, Star, X } from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ReviewPage({ slug }) {
  const token = useSearchParams().get("token") || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const preview = useMemo(() => media ? URL.createObjectURL(media) : null, [media]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!token) { setError("Link de avaliação incompleto."); setLoading(false); return; }
      try {
        const response = await fetch(`${API}/api/reviews/${slug}/${token}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Avaliação indisponível");
        setData(body);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [slug, token]);

  const chooseMedia = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(file.type)) return toast.error("Formato não suportado.");
    if (file.size > 25 * 1024 * 1024) return toast.error("O arquivo deve ter no máximo 25 MB.");
    setMedia(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (rating === null) return toast.info("Escolha uma nota de 0 a 5.");
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("rating", String(rating));
      form.append("description", description.trim());
      if (media) form.append("media", media);
      const response = await fetch(`${API}/api/reviews/${slug}/${token}`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar");
      setCoupon(body.coupon || null);
      setData((current) => ({ ...current, submitted: true, review: body.review }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Screen><LoaderCircle className="h-8 w-8 animate-spin text-slate-500" /><p className="mt-4 text-sm text-slate-500">Preparando sua experiência…</p></Screen>;
  if (error) return <Screen><div className="max-w-md text-center"><div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600"><X /></div><h1 className="text-2xl font-semibold text-slate-900">Link indisponível</h1><p className="mt-3 text-slate-500">{error}</p></div></Screen>;

  const strong = data.palette?.strong_color || "#5E3BEE";
  const organization = data.organization;
  const clientFirstName = data.appointment?.client_name?.trim().split(/\s+/)[0] || "Cliente";

  if (data.submitted) return (
    <Screen background={data.palette?.background_color_main}>
      <div className="w-full max-w-lg rounded-3xl border border-slate-200/70 bg-white p-7 text-center shadow-[0_24px_80px_-28px_rgba(15,23,42,.28)] sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ backgroundColor: strong }}><Check /></div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Obrigado pela avaliação.</h1>
        <p className="mt-3 leading-relaxed text-slate-500">{clientFirstName}, sua experiência ajuda a {organization.name} a evoluir.</p>
        {(coupon || data.coupon) && <Coupon coupon={coupon || data.coupon} strong={strong} />}
      </div>
    </Screen>
  );

  return (
    <main className="min-h-screen px-4 py-8 sm:py-14" style={{ background: `radial-gradient(circle at top, ${strong}14, transparent 42%), #f8fafc` }}>
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-center gap-3">
          {organization.logo_organization ? <img src={organization.logo_organization} alt="" className="h-11 w-11 rounded-2xl border border-white object-cover shadow-sm" /> : <div className="grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold text-white" style={{ backgroundColor: strong }}>{organization.name.slice(0, 2).toUpperCase()}</div>}
          <span className="font-semibold tracking-tight text-slate-900">{organization.name}</span>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_28px_90px_-36px_rgba(15,23,42,.32)]">
          <div className="h-1.5" style={{ backgroundColor: strong }} />
          <form onSubmit={submit} className="p-6 sm:p-10">
            <p className="text-sm font-medium" style={{ color: strong }}>Sua experiência importa</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Como foi seu atendimento, {clientFirstName}?</h1>
            <p className="mt-3 leading-relaxed text-slate-500">Compartilhe sua opinião com transparência. Leva menos de um minuto.</p>

            <fieldset className="mt-9">
              <legend className="text-sm font-medium text-slate-700">Sua nota</legend>
              <div className="mt-3 flex flex-wrap items-center gap-2" onMouseLeave={() => setHovered(null)}>
                <button type="button" onClick={() => setRating(0)} className={`mr-1 rounded-full border px-3 py-2 text-xs font-medium transition ${rating === 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>0</button>
                {[1,2,3,4,5].map((value) => <button key={value} type="button" aria-label={`${value} estrelas`} onMouseEnter={() => setHovered(value)} onFocus={() => setHovered(value)} onBlur={() => setHovered(null)} onClick={() => setRating(value)} className="rounded-xl p-1.5 transition hover:-translate-y-0.5"><Star className="h-9 w-9" fill={value <= (hovered ?? rating ?? 0) ? strong : "transparent"} color={value <= (hovered ?? rating ?? 0) ? strong : "#cbd5e1"} strokeWidth={1.7} /></button>)}
                <span className="ml-2 text-sm text-slate-500">{rating === null ? "Selecione" : `${rating} de 5`}</span>
              </div>
            </fieldset>

            <label className="mt-8 block text-sm font-medium text-slate-700" htmlFor="review-description">Conte um pouco mais <span className="font-normal text-slate-400">(opcional)</span></label>
            <textarea id="review-description" maxLength={2000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que mais gostou? Há algo que podemos melhorar?" className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-slate-900 outline-none transition focus:bg-white focus:ring-2" style={{ "--tw-ring-color": `${strong}35` }} />
            <p className="mt-1 text-right text-xs text-slate-400">{description.length}/2000</p>

            <div className="mt-7">
              <p className="text-sm font-medium text-slate-700">Foto ou vídeo <span className="font-normal text-slate-400">(opcional)</span></p>
              {!media ? <label className="mt-3 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-7 text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-50"><ImagePlus className="h-5 w-5" /> Adicionar foto ou vídeo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => chooseMedia(e.target.files?.[0])} /></label> : <div className="relative mt-3 overflow-hidden rounded-2xl bg-slate-950">{media.type.startsWith("video/") ? <video src={preview} controls className="max-h-80 w-full object-contain" /> : <img src={preview} alt="Prévia do anexo" className="max-h-80 w-full object-contain" />}<button type="button" onClick={() => setMedia(null)} aria-label="Remover arquivo" className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur"><X className="h-4 w-4" /></button></div>}
              <p className="mt-2 text-xs text-slate-400">JPG, PNG, WEBP, MP4, WEBM ou MOV · até 25 MB</p>
            </div>

            <button disabled={submitting || rating === null} className="mt-9 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0" style={{ backgroundColor: strong }}>{submitting ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Enviando…</> : "Enviar avaliação"}</button>
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">Uma avaliação por atendimento. Seus dados são tratados com segurança.</p>
          </form>
        </section>
      </div>
    </main>
  );
}

function Screen({ children, background = "#f8fafc" }) { return <main className="grid min-h-screen place-items-center px-5" style={{ background }}>{<div className="text-center">{children}</div>}</main>; }

function Coupon({ coupon, strong }) {
  const copy = async () => { await navigator.clipboard.writeText(coupon.code); toast.success("Cupom copiado!"); };
  return <div className="mt-7 rounded-2xl border border-dashed p-5 text-left" style={{ borderColor: `${strong}70`, backgroundColor: `${strong}08` }}><p className="text-xs font-semibold uppercase tracking-[.18em]" style={{ color: strong }}>Seu presente</p><p className="mt-2 font-medium text-slate-800">{coupon.description || coupon.name || "Cupom de agradecimento"}</p><button onClick={copy} className="mt-4 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 font-mono text-lg font-bold tracking-wider text-slate-900 shadow-sm"><span>{coupon.code}</span><Copy className="h-4 w-4 text-slate-400" /></button>{coupon.valid_until && <p className="mt-2 text-xs text-slate-500">Válido até {new Date(coupon.valid_until).toLocaleDateString("pt-BR")}</p>}</div>;
}
