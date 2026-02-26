// Types
import { ModalsIds } from '../types';

// Modals
import { ErrorModal } from './ErrorModal';
import { BottomAlertModal } from './BottomAlertModal';
import { ShareBrandModal } from './ShareBrandModal';
import { PerksModal } from './PerksModal';
import { PodiumDetailModal } from './PodiumDetailModal';
import { FeedPodiumDetailModal } from './FeedPodiumDetailModal';
import { TransactionErrorModal } from './TransactionErrorModal';

export const modals = {
  [ModalsIds.ERROR]: ErrorModal,
  [ModalsIds.BOTTOM_ALERT]: BottomAlertModal,
  [ModalsIds.SHARE_BRAND]: ShareBrandModal,
  [ModalsIds.PERKS]: PerksModal,
  [ModalsIds.PODIUM_DETAIL]: PodiumDetailModal,
  [ModalsIds.FEED_PODIUM_DETAIL]: FeedPodiumDetailModal,
  [ModalsIds.TRANSACTION_ERROR]: TransactionErrorModal,
};

