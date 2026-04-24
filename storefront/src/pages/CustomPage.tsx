import { useParams } from 'react-router-dom';
import SEOHead from '../components/common/SEOHead';
import DynamicPage, { type PageBlock } from '../components/pages/DynamicPage';

/**
 * Tenant custom CMS page — fetched by `slug`.
 * Data fetch is wired up when the page-block CRUD endpoints land; until then
 * we render a friendly placeholder so the route resolves.
 */
export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>();

  const blocks: PageBlock[] = [
    { type: 'heading', content: slug || 'Page', subtitle: 'Custom tenant page' },
    { type: 'text', content: 'This page is managed by the restaurant via the block-builder CMS. Content will appear here once the tenant publishes it.' },
  ];

  return (
    <>
      <SEOHead title={`${slug} · Restaurant`} />
      <DynamicPage title={undefined} blocks={blocks} />
    </>
  );
}
