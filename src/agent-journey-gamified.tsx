import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Product, NegotiationResult } from './marketplace'
import { catalog, negotiate } from './marketplace'
import ProductDetail from './product-detail'
import WebMCPObservabilityPanel from './webmcp-observability-panel'
import './phase16-gamified-journey.css'
import './phase16-gamified-journey-overrides.css'

type Basket = { products: Product[]; deals: NegotiationResult[]; total: number; saving: number }
type Props = { phase: string; running: boolean; approved: boolean; products: Product[]; proposal: Basket | null; goal?: string; budget?: number }

const stages = [
  ['SEARCHING', 'SEARCH'],
  ['ANALYZING', 'EVALUATE'],
  ['NEGOTIATING', 'NEGOTIATE'],
  ['CONSTITUTION CHECK', 'GOVERN'],
  ['HUMAN APPROVAL', 'APPROVAL'],
  ['EXECUTION RELEASED', 'EXECUTE'],
] as const

const descriptions = [
  'Searching the marketplace',
  'Evaluating mission-fit options',
  'Negotiating with seller agents',
  'Checking your constitution',
  'Review and approve the proposed deal',
  'Executing the approved transaction',
]

function phaseIndex(value: string) {
  const index = stages.findIndex(([name]) => name === value)
  return index >= 0 ? index : value === 'NO COMPLIANT DEAL' ? 3 : 0
}

function playTick() {
  try {
    const Audio = window.AudioContext || (window as any).webkitAudioContext
    if (!Audio) return
    const context = new Audio()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(560, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(760, context.currentTime + 0.07)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.012)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.12)
  } catch {}
}

type CardProps = { index: number; title: string; state: string; current: boolean; depth: number; children?: ReactNode; onOpen: () => void }
function JourneyCard({ index, title, state, current, depth, children, onOpen }: CardProps) {
  return (
    <article className={`stage-stack-card ${current ? 'current' : ''} ${state === 'done' ? 'completed' : ''} stack-depth-${Math.min(depth, 5)}`} role="listitem">
      <button className="stage-card-head" onClick={() => { playTick(); onOpen() }} aria-expanded={current}>
        <span className="stage-number">{state === 'done' ? '✓' : String(index + 1).padStart(2, '0')}</span>
        <span className="stage-copy"><span>STAGE {String(index + 1).padStart(2, '0')}</span><strong>{title}</strong></span>
        <span className="stage-state">{state === 'done' ? 'DONE' : current ? 'ACTIVE' : 'READY'}</span>
        <span className="stage-chevron">›</span>
      </button>
      {current && <div className="stage-card-body">{children}</div>}
    </article>
  )
}

export default function AgentJourneyGamified({ phase, running, approved, products, proposal, budget = 0 }: Props) {
  const target = approved ? 5 : phaseIndex(phase)
  const [open, setOpen] = useState(0)
  const [detail, setDetail] = useState<{ product: Product; deal?: NegotiationResult } | null>(null)
  const [basketReview, setBasketReview] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [working, setWorking] = useState<Basket | null>(proposal)
  const [negotiationProduct, setNegotiationProduct] = useState(0)
  const [negotiationMessage, setNegotiationMessage] = useState(-1)
  const [negotiationDone, setNegotiationDone] = useState(false)
  const [negotiationSession, setNegotiationSession] = useState<{ product: Product; deal: NegotiationResult }[]>([])

  // A proposal object can be updated by the trace layer while the same mission is running.
  // Never treat those object updates as a new mission or restart the six-card journey.
  useEffect(() => {
    if (!proposal) return
    setWorking(current => current ?? proposal)
    if (negotiationSession.length === 0) {
      const session = proposal.products.map((product, index) => ({ product, deal: proposal.deals[index] })).filter(item => Boolean(item.deal?.transcript?.length)) as { product: Product; deal: NegotiationResult }[]
      setNegotiationSession(session)
    }
  }, [proposal, negotiationSession.length])

  const currentBasket = working ?? proposal
  const reviewProducts = currentBasket?.products ?? products

  const alternatives = useMemo(() => {
    const ids = new Set(reviewProducts.map(product => product.id))
    const categories = new Set(reviewProducts.map(product => product.category))
    return catalog.filter(product => !ids.has(product.id) && categories.has(product.category) && (!budget || product.price <= budget)).sort((a, b) => b.rating - a.rating).slice(0, 5)
  }, [reviewProducts, budget])

  // Mission phase may advance in the background, but it is never allowed to pull the UI
  // away from NEGOTIATE. The six-card journey controls its own presentation state.
  useEffect(() => {
    if (approved || declined || open === 2) return
    if (open < 2 && target > open) setOpen(value => Math.min(value + 1, 2))
  }, [target, open, approved, declined])

  // NEGOTIATE is a hard lock. The only unlock signal is the end of every displayed seller
  // transcript in the frozen negotiation session. No parent phase or generic timer can skip it.
  useEffect(() => {
    if (open !== 2 || negotiationDone) return
    if (negotiationSession.length === 0) return
    const thread = negotiationSession[negotiationProduct]
    if (!thread) return
    const transcript = thread.deal.transcript
    if (negotiationMessage < transcript.length - 1) {
      const timer = window.setTimeout(() => {
        setNegotiationMessage(value => value + 1)
        playTick()
      }, 1800)
      return () => window.clearTimeout(timer)
    }
    if (negotiationProduct < negotiationSession.length - 1) {
      const timer = window.setTimeout(() => {
        setNegotiationProduct(value => value + 1)
        setNegotiationMessage(-1)
        playTick()
      }, 1200)
      return () => window.clearTimeout(timer)
    }
    // The transcript is now fully rendered. This is the explicit completion signal.
    setNegotiationDone(true)
  }, [open, negotiationProduct, negotiationMessage, negotiationSession, negotiationDone])

  // Do not move until NEGOTIATE has explicitly completed.
  useEffect(() => {
    if (open === 2 && negotiationDone && !approved && !declined) setOpen(3)
  }, [open, negotiationDone, approved, declined])

  // GOVERN is also signal-driven. In particular, target >= 4 is NOT sufficient to jump
  // directly into approval while governance is still being rendered.
  useEffect(() => {
    if (open !== 3 || approved || declined) return
    if (phase === 'HUMAN APPROVAL') setOpen(4)
  }, [phase, open, approved, declined])

  // Once the user is at approval, external running/phase updates cannot move the card.
  useEffect(() => {
    if (approved && open !== 5) setOpen(5)
  }, [approved, open])

  const replaceProduct = (oldId: string, next: Product) => {
    if (!currentBasket) return
    const index = currentBasket.products.findIndex(product => product.id === oldId)
    if (index < 0) return
    const deal = negotiate(next, budget)
    const ps = [...currentBasket.products]
    const ds = [...currentBasket.deals]
    ps[index] = next
    ds[index] = deal
    setWorking({ products: ps, deals: ds, total: ds.reduce((s, d) => s + d.acceptedPrice, 0), saving: ds.reduce((s, d) => s + d.saving, 0) })
    playTick()
  }

  const removeProduct = (id: string) => {
    if (!currentBasket) return
    const index = currentBasket.products.findIndex(product => product.id === id)
    if (index < 0) return
    const ps = currentBasket.products.filter(product => product.id !== id)
    const ds = currentBasket.deals.filter((_, i) => i !== index)
    setWorking({ products: ps, deals: ds, total: ds.reduce((s, d) => s + d.acceptedPrice, 0), saving: ds.reduce((s, d) => s + d.saving, 0) })
    playTick()
  }

  const addAlternative = (product: Product) => {
    const deal = negotiate(product, budget)
    const ps = [...(currentBasket?.products ?? []), product]
    const ds = [...(currentBasket?.deals ?? []), deal]
    setWorking({ products: ps, deals: ds, total: ds.reduce((s, d) => s + d.acceptedPrice, 0), saving: ds.reduce((s, d) => s + d.saving, 0) })
    playTick()
  }

  const openProduct = (product: Product) => {
    const index = currentBasket?.products.findIndex(item => item.id === product.id) ?? -1
    setDetail({ product, deal: index >= 0 ? currentBasket?.deals[index] : undefined })
    playTick()
  }

  const approve = () => {
    playTick()
    window.dispatchEvent(new CustomEvent('aeon:approve-mission', { detail: working ?? proposal }))
  }

  const decline = () => {
    playTick()
    setDeclined(true)
    setOpen(4)
    window.dispatchEvent(new CustomEvent('aeon:decline-mission', { detail: working ?? proposal }))
  }

  const visibleTranscript = negotiationSession[negotiationProduct]?.deal.transcript.slice(0, Math.max(0, negotiationMessage + 1)) ?? []

  return (
    <section className="gamified-journey">
      <div className="journey-top">
        <div><span className="journey-kicker">AEON · AGENT JOURNEY</span><h2>{approved ? 'Execution released.' : declined ? 'Purchase not approved.' : phase === 'NO COMPLIANT DEAL' ? 'Mission paused.' : running ? 'Agent is working…' : 'Deal ready.'}</h2><p>{descriptions[open] ?? 'Agent journey'}</p></div>
        <div className="journey-signal"><span className="journey-orb" />{open === 4 && !approved && !declined ? 'YOUR DECISION' : declined ? 'DECLINED' : running ? 'LIVE' : 'OBSERVING'}</div>
      </div>

      <div className="stage-stack" role="list">
        {stages.map(([phaseName, label], index) => {
          const done = index < open || (index === 5 && approved)
          const current = index === open
          const depth = Math.min(Math.abs(index - open), 5)
          return <JourneyCard key={phaseName} index={index} title={label} state={done ? 'done' : current ? 'active' : 'ready'} current={current} depth={depth} onOpen={() => setOpen(index)}>
            {index === 0 && <><p>AEON is scanning the connected marketplace for products that match the mission.</p><div className="search-pills">{products.slice(0, 5).map(product => <button className="search-pill" key={product.id} onClick={() => openProduct(product)}><span className="mini-orb">✦</span><div><b>{product.name}</b><small>{product.category} · ₦{product.price.toLocaleString()}</small></div></button>)}</div></>}
            {index === 1 && <><p>Comparing mission fit, price, availability and your stated priorities.</p><div className="thinking-bars"><i/><i/><i/></div></>}
            {index === 2 && <><p>AEON negotiates separately with each seller agent. Watch the conversation unfold in real time.</p>{negotiationSession.length ? <div className="negotiation-live-stage"><div className="negotiation-live-meta"><span>SELLER {negotiationProduct + 1} OF {negotiationSession.length}</span><b>{negotiationSession[negotiationProduct]?.product.name}</b><i>{negotiationDone ? 'CONVERSATION COMPLETE' : 'LIVE CONVERSATION'}</i></div><div className="live-chat-window">{visibleTranscript.map((message, j) => <div className={`thread-message live-message ${message.speaker.toLowerCase().replace(/\s+/g, '-')} ${j === visibleTranscript.length - 1 ? 'message-new' : ''}`} key={`${message.round}-${j}`}><small>{message.speaker} · ROUND {message.round}</small><p>{message.text}</p>{message.price !== undefined && <b>₦{message.price.toLocaleString()}</b>}</div>)}{!negotiationDone && <div className="typing-indicator"><span/><span/><span/>{negotiationMessage % 2 === 0 ? 'Seller agent is typing…' : 'AEON is typing…'}</div>}</div><div className="negotiation-progress">{negotiationSession.map((thread, j) => <span key={thread.product.id} className={j < negotiationProduct ? 'done' : j === negotiationProduct ? 'active' : ''}>{j + 1}</span>)}</div></div> : <div className="chat-preview"><div className="chat-bubble">Waiting for seller-agent negotiation to start…</div></div>}</>}
            {index === 3 && <><p>Checking every proposed total against your mission authority before asking for permission.</p><div className="offer-line"><span>CONSTITUTION</span><strong>{currentBasket && budget > 0 && currentBasket.total > budget ? 'BLOCKED' : 'COMPLIANT'}</strong></div></>}
            {index === 4 && <>{declined ? <div className="decline-state"><strong>Deal declined by you.</strong><p>AEON has not authorized or executed any purchase.</p></div> : <><p>AEON has stopped. Review the exact recommendation. You can remove items, swap alternatives, inspect products, or decline. Nothing is purchased until you approve.</p><div className="review-summary"><strong>{reviewProducts.length === 1 ? 'Review 1 product' : `${reviewProducts.length} products in proposed basket`}</strong><small>{reviewProducts.length > 1 ? 'Remove, replace or inspect any item before approving.' : 'Inspect the primary recommendation or switch to an alternative.'}</small></div><div className="journey-actions">{reviewProducts.length > 1 && <button className="tactile-button" onClick={() => setBasketReview(true)}>Review basket</button>}{reviewProducts.length === 1 && <button className="tactile-button" onClick={() => openProduct(reviewProducts[0])}>Review product</button>}<button className="tactile-button primary-action" onClick={approve}>Approve deal →</button><button className="tactile-button danger-action" onClick={decline}>Don't approve</button></div></>}</>}
            {index === 5 && <><p>The approved proposal is authorized for execution.</p><div className="offer-line"><span>EXECUTION</span><strong>{approved ? 'RELEASED' : 'LOCKED'}</strong></div></>}
          </JourneyCard>
        })}
      </div>

      <div className="journey-observability"><WebMCPObservabilityPanel /></div>
      <div className="stack-nav" aria-label="Journey navigation">{stages.map(([, label], index) => <button key={label} className={index === open ? 'active' : ''} onClick={() => { playTick(); setOpen(index) }} aria-label={`View ${label}`}>{index + 1}</button>)}</div>
      <div className="stack-foot">The active stage is centered and focused. The next stages remain visible behind it; tap a visible card to peek.</div>

      {detail && <ProductDetail product={detail.product} deal={detail.deal} alternatives={alternatives} onSelectAlternative={product => { const oldId = detail.product.id; replaceProduct(oldId, product); setDetail({ product, deal: negotiate(product, budget) }) }} onBack={() => setDetail(null)} onApprove={open === 4 && !declined ? approve : undefined} />}

      {basketReview && currentBasket && <div className="basket-review-page" role="dialog" aria-modal="true"><div className="basket-review-shell"><header className="basket-review-head"><button className="detail-back" onClick={() => setBasketReview(false)}>← Back to mission</button><span className="journey-kicker">AEON · BASKET REVIEW</span></header><div className="basket-review-content"><div className="basket-review-hero"><span className="journey-kicker">PROPOSED BASKET</span><h1>{currentBasket.products.length} {currentBasket.products.length === 1 ? 'product' : 'products'}</h1><p>This is your editable purchase proposal. Nothing is authorized yet.</p></div><div className="basket-review-list">{currentBasket.products.map((product, index) => <div className="basket-review-row" key={product.id}><button className="basket-row-main" onClick={() => { setBasketReview(false); openProduct(product) }}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{product.name}</b><small>{product.category} · {product.merchant}</small></div><strong>₦{currentBasket.deals[index]?.acceptedPrice.toLocaleString() ?? product.price.toLocaleString()}</strong><i>›</i></button><button className="basket-remove" onClick={() => removeProduct(product.id)} aria-label={`Remove ${product.name}`}>Remove</button><div className="basket-alts">{catalog.filter(alternative => alternative.category === product.category && alternative.id !== product.id && !currentBasket.products.some(item => item.id === alternative.id) && (!budget || alternative.price <= budget)).slice(0, 3).map(alternative => <button key={alternative.id} onClick={() => replaceProduct(product.id, alternative)}>Switch to {alternative.name} · ₦{alternative.price.toLocaleString()}</button>)}</div></div>)}</div>{alternatives.length > 0 && <section className="basket-add"><span className="journey-kicker">AVAILABLE ALTERNATIVES</span><h3>Add another option</h3><div>{alternatives.map(alternative => <button key={alternative.id} onClick={() => addAlternative(alternative)}><b>{alternative.name}</b><small>₦{alternative.price.toLocaleString()} · ★ {alternative.rating}</small></button>)}</div></section>}<div className="basket-review-total"><span>Current total</span><strong>₦{currentBasket.total.toLocaleString()}</strong>{currentBasket.saving > 0 && <small>Saving ₦{currentBasket.saving.toLocaleString()}</small>}</div><div className="journey-actions"><button className="tactile-button" onClick={() => setBasketReview(false)}>Keep reviewing</button><button className="tactile-button primary-action" disabled={currentBasket.products.length === 0 || Boolean(budget && currentBasket.total > budget)} onClick={approve}>Approve deal →</button><button className="tactile-button danger-action" onClick={() => { setBasketReview(false); decline() }}>Don't approve</button></div></div></div></div>}
    </section>
  )
}
