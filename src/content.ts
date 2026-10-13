// ALL user-visible copy lives here. Product team: review before launch.
// `*text*` in a title renders as the brand's Newsreader-italic accent (<em>).
import type { PartId } from './scene/registry';

export type ChapterId =
  | 'exploded' | 'assemble' | 'speaking' | 'hearing' | 'thinking' | 'knowledge' | 'acting' | 'assembled';

export interface ChapterCopy {
  id: ChapterId;
  /** Scroll length in svh (desktop; portrait × 0.8). The last chapter also pays the 100svh sticky tail. */
  len: number;
  eyebrow?: string;
  /** Eyebrow square colour (brand token name); also tints the spotlight behind the Double. */
  dot?: string;
  title?: string;
  /**
   * Where the Double stands in landscape. The copy (and the beat's demo card) takes the other half,
   * so the Double crosses the screen between beats. Portrait always centres it.
   */
  stage: 'center' | 'left' | 'right';
}

export const CONTENT = {
  meta: {
    skip: 'Skip',
    posterAlt: "The Double, TheDouble.ai's AI agent mascot",
    // demo page only: stand-ins for the homepage sections around this one
    fillerAbove: { title: 'Your AI Double *talks & acts for you,* across channels.' },
    fillerBelow: { title: 'A new way *to interact with you.*' },
  },

  // Headline only: one eyebrow + one title per chapter. The story opens exploded, scrolling assembles
  // it, then the Double crosses the screen beat by beat (left, right, left…) while each capability
  // plays on the other half (product feedback 2026-10-13).
  chapters: [
    { id: 'exploded', len: 170, stage: 'center', eyebrow: 'The Double · Exploded view', dot: 'cobalt', title: 'Every Double starts *in pieces.*' },
    { id: 'assemble', len: 190, stage: 'center', eyebrow: 'Assembly', dot: 'lime-edge', title: 'Piece by piece, *it comes together.*' },
    { id: 'speaking', len: 150, stage: 'left', eyebrow: '01 · Speaking', dot: 'bubblegum', title: 'Talks in *your voice.*' },
    { id: 'hearing', len: 140, stage: 'right', eyebrow: '02 · Hearing', dot: 'lime-edge', title: 'Listens *in real time.*' },
    { id: 'thinking', len: 140, stage: 'left', eyebrow: '03 · Thinking', dot: 'grape', title: 'Thinks *before it answers.*' },
    { id: 'knowledge', len: 150, stage: 'right', eyebrow: '04 · Knowledge', dot: 'amber', title: 'Learns from *what you know.*' },
    { id: 'acting', len: 160, stage: 'left', eyebrow: '05 · Acting', dot: 'tangerine', title: 'Then it *gets things done.*' },
    { id: 'assembled', len: 190, stage: 'center', eyebrow: 'Ready when you are', dot: 'lime-edge', title: 'Meet *your Double.*' },
  ] as ChapterCopy[],

  cta: {
    primary: { label: 'Build your Double', href: 'https://thedouble.ai/auth/signup' },
    secondary: { label: 'Book a demo', href: 'https://thedouble.ai/demo' },
  },

  diagramTitle: 'THE DOUBLE — EXPLODED VIEW ASSEMBLY DIAGRAM',
  diagramTitleBold: 'THE DOUBLE',

  /** Opening diagram labels (drawn by default): the five capabilities, each on the part that does it. */
  callouts: [
    { part: 'screen', title: 'Speaking', sub: 'Face screen · talks in your voice' },
    { part: 'patchL', title: 'Hearing', sub: 'Sensory patches · listens in real time' },
    { part: 'chassis', title: 'Thinking', sub: 'Main board · reasons before replying' },
    { part: 'memory', title: 'Knowledge', sub: 'Memory · PDFs, sites, docs' },
    { part: 'clawL', title: 'Acting', sub: 'Pincer claws · books, updates, sends' },
  ] as { part: PartId; title: string; sub?: string }[],

  /** Beat overlays (projected beside the part that just snapped on). Icons come from overlay/icons.ts. */
  speaking: {
    label: 'Speaking',
    icon: 'audio-lines',
    voice: 'Your voice · cloned',
    lines: [
      "Hi Priya! I'm Alex's Double.",
      'Want me to walk you through pricing?',
    ],
  },
  hearing: {
    label: 'Hearing',
    icon: 'mic',
    transcript: 'Can we book a demo for Thursday afternoon?',
    detected: [
      { k: 'Intent', v: 'Book a demo' },
      { k: 'When', v: 'Thu · PM' },
    ],
  },
  thinking: {
    label: 'Thinking',
    icon: 'brain',
    steps: [
      'Understand the request',
      'Check Alex’s calendar',
      'Pick the best slot',
      'Draft a friendly reply',
    ],
  },
  knowledge: {
    label: 'Knowledge',
    icon: 'book-open',
    counter: 'sources learned',
    sources: [
      { icon: 'file-text', kind: 'pdf', title: 'Pricing-2026.pdf', meta: 'PDF · 12 pages' },
      { icon: 'globe', kind: 'web', title: 'thedouble.ai', meta: 'Website · 48 pages' },
      { icon: 'file-text', kind: 'pdf', title: 'Onboarding-guide.pdf', meta: 'PDF · 30 pages' },
      { icon: 'youtube', kind: 'app', title: 'Product demo', meta: 'YouTube · 14 min' },
      { icon: 'notion', kind: 'app', title: 'Sales playbook', meta: 'Notion' },
      { icon: 'googledocs', kind: 'app', title: 'FAQ', meta: 'Google Docs' },
      { icon: 'linkedin', kind: 'app', title: 'Alex Rivera', meta: 'LinkedIn profile' },
    ],
  },
  acting: {
    label: 'Acting',
    icon: 'sparkles',
    actions: [
      { app: 'googlecalendar', text: 'Booked demo · Thu 3:00 PM' },
      { app: 'gmail', text: 'Sent the confirmation' },
      { app: 'hubspot', text: 'Created deal · Acme Corp' },
      { app: 'googlesheets', text: 'Lead status → Qualified' },
      { app: 'slack', text: 'Pinged #sales' },
      { app: 'salesforce', text: 'Logged the call' },
      { app: 'calendly', text: 'Shared a booking link' },
      { app: 'zapier', text: '100+ more apps' },
    ],
  },
};

export type Content = typeof CONTENT;
