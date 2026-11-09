import { ChangesCard } from './ChangesCard';
import { FeedCard } from './FeedCard';
import { GitHubCard } from './GitHubCard';
import styles from './HomePage.module.css';
import { RemindersCard } from './RemindersCard';
import { TodayCard } from './TodayCard';
import { OpportunitiesCard } from './OpportunitiesCard';
import { VideosCard } from './VideosCard';

/** Ana Sayfa: independent cards; each loads its own data, so one failing never hides another. */
export function HomePage() {
  return (
    <>
      <h1 className={styles.title}>Ana Sayfa</h1>
      <div className={styles.grid}>
        <TodayCard />
        <ChangesCard />
        <RemindersCard />
        <GitHubCard />
        <VideosCard />
        <OpportunitiesCard />
        <FeedCard />
      </div>
    </>
  );
}
