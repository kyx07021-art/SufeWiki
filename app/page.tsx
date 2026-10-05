import { Wiki } from '@/components/wiki';
import { countTodayEdits, listSections } from '@/lib/wiki-store';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const [sections, todayEdits] = await Promise.all([listSections(), countTodayEdits()]);
  return <Wiki initialSections={sections} todayEdits={todayEdits} />;
}
