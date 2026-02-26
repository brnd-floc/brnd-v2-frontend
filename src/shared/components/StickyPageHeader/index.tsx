import React from 'react';
import classNames from 'clsx';

import styles from './StickyPageHeader.module.scss';

type StickyHeaderTone = 'default' | 'subtle';
type StickyHeaderPadding = 'none' | 'sm' | 'md';

interface StickyPageHeaderProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly tone?: StickyHeaderTone;
  readonly paddingY?: StickyHeaderPadding;
}

function StickyPageHeader({
  children,
  className,
  tone = 'default',
  paddingY = 'none',
}: StickyPageHeaderProps) {
  return (
    <div
      className={classNames(
        styles.layout,
        styles[`tone-${tone}`],
        styles[`padding-${paddingY}`],
        className
      )}
    >
      {children}
    </div>
  );
}

export default StickyPageHeader;
