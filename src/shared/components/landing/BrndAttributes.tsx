import styles from './BrndAttributes.module.scss';

interface AttributeCardProps {
    title: string
    description: string
}

const AttributeCard = ({ title, description }: AttributeCardProps) => (
  <div className={styles.attributeCard}>
    <div className={styles.attributeContent}>
      <h3 className={styles.attributeTitle}>
        {title}
      </h3>
      <p className={styles.attributeDescription}>
        {description}
      </p>
    </div>
  </div>
);

interface MediaSlotProps {
    src?: string
    type?: 'video' | 'image'
    alt?: string
}

const MediaSlot = ({ src, type = 'image', alt = '' }: MediaSlotProps) => (
  <div className={styles.mediaSlot}>
    {src ? (
      type === 'video' ? (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          className={styles.mediaContent}
        />
      ) : (
        <img src={src} alt={alt} className={styles.mediaContent} loading="lazy" />
      )
    ) : null}
  </div>
);

const attributes = {
  archive: {
    title: 'A Living Archive\nof Onchain Brands',
    description: 'BRND is more than a snapshot—it\'s a growing history of brand activity and evolution. By archiving user podiums, votes, and brand movements, BRND builds an ongoing record for the whole ecosystem. Brands are given space to evolve, and community contributions are preserved as a testament to creative progress in Web3 design and strategy.'
  },
  research: {
    title: 'A Research\nEngine for Brands',
    description: 'BRND redefines brand discovery, acting as a real-time research tool where users actively vote for their favorite onchain brands using $BRND tokens. Each podium and vote collected in the miniapp fuels a dynamic archive—curating not just assets, but lived interactions and continually updating insight into brand attention and relevance.'
  },
  catalyst: {
    title: 'A Catalyst\nfor Inspiration',
    description: 'By connecting users, creators, and founders, BRND provides constant inspiration—the pulse of what\'s trending, shifting, and admired. It\'s not just about what\'s new; it\'s about showing changes over time, giving historical context to every brand that enters the leaderboard and spotlighting the creative energy that drives Web3 innovation.'
  }
};

export const BrndAttributes = () => {
  return (
    <section className={styles.section}>
      {/* Title */}
      <div className={styles.titleContainer}>
        <h2 className={styles.title}>
                    BRND ATTRIBUTES
        </h2>
      </div>

      {/* Grid Layout - Single column mobile, 3 cols desktop */}
      <div className={styles.grid}>
        {/* Row 1 */}
        {/* Archive - Black */}
        <div className={styles.gridItem}>
          <AttributeCard
            title={attributes.archive.title}
            description={attributes.archive.description}
          />
        </div>

        {/* Media 1 - White */}
        <div className={styles.gridItemWhite}>
          <MediaSlot src="/images/BRND%20-%20V2%20-1.jpg" alt="BRND attributes media 1" />
        </div>

        {/* Research - Black */}
        <div className={styles.gridItem}>
          <AttributeCard
            title={attributes.research.title}
            description={attributes.research.description}
          />
        </div>

        {/* Row 2 */}
        {/* Media 2 - White */}
        <div className={styles.gridItemWhite}>
          <MediaSlot src="/images/BRND%20-%20V2%20-%202.jpg" alt="BRND attributes media 2" />
        </div>

        {/* Catalyst - Black */}
        <div className={styles.gridItem}>
          <AttributeCard
            title={attributes.catalyst.title}
            description={attributes.catalyst.description}
          />
        </div>

        {/* Media 3 - White */}
        <div className={styles.gridItemWhite}>
          <MediaSlot src="/images/BRND%20-%20V2%20-%203.jpg" alt="BRND attributes media 3" />
        </div>
      </div>
    </section>
  );
};
