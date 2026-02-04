import Dashboard from '@/components/Dashboard';
import { fetchOdds, fetchArbitrage } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const oddsData = await fetchOdds();
  const arbitrageData = await fetchArbitrage();
  return <Dashboard oddsData={oddsData} arbitrageData={arbitrageData} />;
}
