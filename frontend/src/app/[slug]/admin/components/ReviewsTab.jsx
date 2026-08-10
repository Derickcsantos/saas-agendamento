"use client";

import { useEffect, useState } from "react";
import { ImageIcon, LoaderCircle, MessageSquareQuote, Star } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function ReviewsTab({ org, palette }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/admin/${org.slug_organization}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Erro ao carregar avaliações");
        setData(body);
      })
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [org.slug_organization]);

  if (loading) return <div className="grid min-h-80 place-items-center"><LoaderCircle className="animate-spin text-slate-400" /></div>;
  if (error) return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-rose-700">{error}</div>;

  const strong = palette?.strong_color || "#5E3BEE";
  return <div className="space-y-6">
    <div><p className="text-sm font-medium" style={{ color: strong }}>Voz do cliente</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Avaliações</h2><p className="mt-1 text-sm text-slate-500">Acompanhe a percepção dos clientes após cada atendimento.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Nota média</p><div className="mt-2 flex items-end gap-3"><strong className="text-4xl text-slate-950">{Number(data.average || 0).toFixed(1)}</strong><span className="mb-1 text-sm text-slate-400">de 5</span></div><div className="mt-3 flex gap-1">{[1,2,3,4,5].map((item) => <Star key={item} className="h-5 w-5" color={strong} fill={item <= Math.round(data.average) ? strong : "transparent"} />)}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Total recebido</p><strong className="mt-2 block text-4xl text-slate-950">{data.total}</strong><p className="mt-3 text-sm text-slate-400">Uma avaliação por agendamento</p></div>
    </div>
    {!data.reviews.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><MessageSquareQuote className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-4 font-semibold text-slate-800">Nenhuma avaliação ainda</h3><p className="mt-2 text-sm text-slate-500">Ative os convites em Configurações para começar.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{data.reviews.map((review) => <article key={review.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{review.appointments?.client_name || "Cliente"}</p><p className="mt-0.5 text-xs text-slate-400">{review.appointments?.services?.name || "Atendimento"} · {new Date(review.created_at).toLocaleDateString("pt-BR")}</p></div><div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{review.rating}</div></div>{review.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{review.description}</p> : <p className="mt-4 text-sm italic text-slate-400">Sem comentário.</p>}</div>{review.media_url && <a href={review.media_url} target="_blank" rel="noreferrer" className="block border-t border-slate-100 bg-slate-50">{review.media_type === "video" ? <video src={review.media_url} controls preload="metadata" className="max-h-72 w-full object-contain" /> : <img src={review.media_url} alt="Mídia da avaliação" loading="lazy" className="max-h-72 w-full object-cover" />}</a>}</article>)}</div>}
  </div>;
}
