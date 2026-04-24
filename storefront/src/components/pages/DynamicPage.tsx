import type { ReactNode } from 'react';

export interface PageBlock {
  type: 'heading' | 'text' | 'image' | 'cta';
  content?: string;
  subtitle?: string;
  image_url?: string;
  alt?: string;
  href?: string;
  cta_text?: string;
}

interface DynamicPageProps {
  title?: string;
  blocks: PageBlock[];
}

/**
 * Block-builder renderer for tenant custom pages.
 * Page definitions come from the CMS; this component is fed `blocks` and
 * outputs a sequence of plain semantic sections.
 */
export default function DynamicPage({ title, blocks }: DynamicPageProps) {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {title && <h1 className="text-3xl font-extrabold text-brand-text">{title}</h1>}
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </article>
  );
}

function Block({ block }: { block: PageBlock }): ReactNode {
  switch (block.type) {
    case 'heading':
      return (
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-text">{block.content}</h2>
          {block.subtitle && <p className="text-brand-text-muted mt-1">{block.subtitle}</p>}
        </section>
      );
    case 'text':
      return <p className="text-brand-text leading-relaxed whitespace-pre-line">{block.content}</p>;
    case 'image':
      return block.image_url ? (
        <img src={block.image_url} alt={block.alt || ''} className="w-full rounded-lg" />
      ) : null;
    case 'cta':
      return block.href && block.cta_text ? (
        <div>
          <a
            href={block.href}
            className="inline-flex bg-brand-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90"
          >
            {block.cta_text}
          </a>
        </div>
      ) : null;
    default:
      return null;
  }
}
