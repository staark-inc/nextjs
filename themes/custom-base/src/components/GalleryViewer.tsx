"use client";
import { useRef, useState } from "react";

type Image = { src: string; alt: string; width: number; height: number; caption: string };
export function GalleryViewer({ items, columns, label }: { items: Image[]; columns: number; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const openedFrom = useRef(0);
  const [selected, setSelected] = useState(0);
  const current = items[selected];
  function move(amount: number) { setSelected(index => (index + amount + items.length) % items.length); }
  if (!items.length) return <p className="cb-gallery__empty">Inga bilder ännu.</p>;
  return <>
    <div className={`cb-gallery cb-gallery--${columns}`}>
      {items.map((item, index) => <figure key={index}><button type="button" ref={element => { triggers.current[index] = element; }} aria-label={`Visa bild: ${item.alt}`} aria-haspopup="dialog" onClick={() => { openedFrom.current = index; setSelected(index); dialog.current?.showModal(); }}><img src={item.src} alt={item.alt} width={item.width} height={item.height} loading="lazy" /></button>{item.caption ? <figcaption>{item.caption}</figcaption> : null}</figure>)}
    </div>
    <dialog ref={dialog} className="cb-lightbox" aria-label={label} onClose={() => triggers.current[openedFrom.current]?.focus()} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
      <div className="cb-lightbox__bar"><span aria-live="polite">{selected + 1} / {items.length}</span><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Stäng galleri">Stäng ×</button></div>
      {current ? <figure><img src={current.src} alt={current.alt} width={current.width} height={current.height} /><figcaption aria-live="polite">{current.caption || current.alt}</figcaption></figure> : null}
      {items.length > 1 ? <div className="cb-lightbox__controls"><button type="button" onClick={() => move(-1)}>← Föregående</button><button type="button" onClick={() => move(1)}>Nästa →</button></div> : null}
    </dialog>
  </>;
}
