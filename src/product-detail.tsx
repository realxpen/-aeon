import type {Product,NegotiationResult} from './marketplace'
import './product-detail.css'

type Props={product:Product;deal?:NegotiationResult;onBack:()=>void;onApprove?:()=>void;alternatives?:Product[];onSelectAlternative?:(product:Product)=>void}

export default function ProductDetail({product,deal,onBack,onApprove,alternatives=[],onSelectAlternative}:Props){
 const finalPrice=deal?.acceptedPrice??product.price
 return <div className="product-detail-page" role="dialog" aria-modal="true">
  <div className="product-detail-shell">
   <header className="product-detail-head"><button className="detail-back" onClick={onBack}>← Back to review</button><span className="journey-kicker">AEON · MARKETPLACE PRODUCT</span><span className="detail-source">LIVE MARKETPLACE DATA</span></header>
   <main className="product-detail-content">
    <section className="product-detail-hero">
     <div className="product-detail-art"><span>AEON</span><strong>{product.category.toUpperCase()}</strong><small>{product.id}</small></div>
     <div className="product-detail-summary"><div className="product-detail-meta"><span>{product.category}</span><span>★ {product.rating}</span><span>{product.stock} in stock</span></div><h1>{product.name}</h1><p className="detail-merchant">Sold by <strong>{product.merchant}</strong> · {product.negotiable?'Negotiable':'Fixed price'}</p><div className="detail-price"><span>{deal?'NEGOTIATED PRICE':'LISTED PRICE'}</span><strong>₦{finalPrice.toLocaleString()}</strong>{product.originalPrice>finalPrice&&<del>₦{product.originalPrice.toLocaleString()}</del>}</div>{deal&&<p className="detail-saving">AEON negotiated ₦{deal.saving.toLocaleString()} in savings.</p>}
      <div className="detail-actions"><button className="tactile-button" onClick={onBack}>Keep reviewing</button>{onApprove&&<button className="tactile-button primary-action" onClick={onApprove}>Approve this deal →</button>}</div>
     </div>
    </section>
    {alternatives.length>0&&<section className="detail-alternatives"><span className="journey-kicker">ALTERNATIVES</span><h2>Prefer another option?</h2><p>These are other matching marketplace products within your current constraints.</p><div className="detail-alternative-list">{alternatives.map(a=><button key={a.id} onClick={()=>onSelectAlternative?.(a)}><div><b>{a.name}</b><small>★ {a.rating} · {a.stock} in stock · {a.negotiable?'Negotiable':'Fixed price'}</small></div><strong>₦{a.price.toLocaleString()}</strong><i>›</i></button>)}</div></section>}
    <section className="detail-grid"><article><span>MISSION FIT</span><strong>{Math.round((product.performance+product.audio)/2)}%</strong><p>Performance and audio signals used by AEON when evaluating this marketplace candidate.</p></article><article><span>PERFORMANCE</span><strong>{product.performance}/100</strong><p>Mission performance signal.</p></article><article><span>AUDIO</span><strong>{product.audio}/100</strong><p>Audio quality signal.</p></article><article><span>AVAILABILITY</span><strong>{product.stock}</strong><p>Units currently represented in the marketplace.</p></article></section>
    {deal?.transcript?.length?<section className="detail-transcript"><div><span className="journey-kicker">NEGOTIATION RECORD</span><h2>How AEON reached this offer</h2></div>{deal.transcript.map((m,i)=><div className="detail-message" key={`${m.round}-${i}`}><span>{m.speaker}</span><p>{m.text}</p>{m.price!==undefined&&<b>₦{m.price.toLocaleString()}</b>}</div>)}</section>:null}
   </main>
  </div>
 </div>
}
