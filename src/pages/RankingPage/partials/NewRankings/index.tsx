// Components
import BrandsList from '@/components/BrandsList';

// StyleSheet
import styles from './NewRankings.module.scss';

function NewRankings() {
  return (
    <div className={styles.layout}>
      <BrandsList
        isFinderEnabled={false}
        config={{
          order: 'new',
          limit: 50,
        }}
      />
    </div>
  );
}

export default NewRankings;