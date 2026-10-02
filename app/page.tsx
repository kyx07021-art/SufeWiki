import { Wiki } from '@/components/wiki';
import { listSections } from '@/lib/wiki-store';
export const dynamic = 'force-dynamic';
export default async function Page() { return <Wiki initialSections={await listSections()} />; }
