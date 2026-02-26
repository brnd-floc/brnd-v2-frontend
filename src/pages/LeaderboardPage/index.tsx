import React from 'react';
import { Routes, Route } from 'react-router-dom';

// StyleSheet
import styles from './LeaderboardPage.module.scss';

// Components
import AppLayout from '../../shared/layouts/AppLayout';
import TabNavigator from '@/components/TabNavigator';
import LeaderboardFeed from './partials/LeaderboardFeed';

// Hocs
import withProtectionRoute from '@/hocs/withProtectionRoute';
import BrandHeader from '@/shared/components/BrandHeader';
import Typography from '@/shared/components/Typography';

export type LeaderboardSeason = 'all' | 's1' | 's2';

function LeaderboardPage(): React.ReactNode {
  return (
    <AppLayout>
      <div className={styles.body}>
        <div className={styles.header}>
          <BrandHeader showBackButton={false} />

          <div className={styles.pageTitle}>
            <Typography variant="druk" weight="wide" className={styles.titleText}>
              Leaderboard
            </Typography>
            <div className={styles.titleUnderline} />
          </div>

          <div className={styles.seasonTabs}>
            <TabNavigator
              tabs={[
                {
                  label: 'All Time',
                  path: '/leaderboard',
                },
                {
                  label: 'S1',
                  path: '/leaderboard/s1',
                },
                {
                  label: 'S2',
                  path: '/leaderboard/s2',
                },
              ]}
            />
          </div>
        </div>
        <Routes>
          <Route path="/" element={<LeaderboardFeed season="all" />} />
          <Route path="/s1" element={<LeaderboardFeed season="s1" />} />
          <Route path="/s2" element={<LeaderboardFeed season="s2" />} />
        </Routes>
      </div>
    </AppLayout>
  );
}

export default withProtectionRoute(LeaderboardPage, 'only-connected');
