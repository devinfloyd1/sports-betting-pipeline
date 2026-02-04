import Dashboard from '@/components/Dashboard';
import { fetchOdds, fetchArbitrage } from '@/lib/api';

export const revalidate = 30; // Revalidate every 30 seconds

export default async function Home() {
  const oddsData = await fetchOdds();
  const arbitrageData = await fetchArbitrage();

  return <Dashboard oddsData={oddsData} arbitrageData={arbitrageData} />;
}
