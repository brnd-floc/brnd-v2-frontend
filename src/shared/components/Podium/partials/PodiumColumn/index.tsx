// Dependencies
import classNames from "clsx";

// StyleSheet
import styles from "./PodiumColumn.module.scss";

// Components
import Typography from "@/components/Typography";

// Assets
import Podium1Icon from "@/shared/assets/icons/podium-1.svg?react";
import Podium2Icon from "@/shared/assets/icons/podium-2.svg?react";
import Podium3Icon from "@/shared/assets/icons/podium-3.svg?react";
import BRNDIcon from "@/shared/assets/icons/brnd-podium-icon.svg?react";

// Hooks
import { Brand } from "@/hooks/brands";

interface PodiumColumnProps {
  variant: "primary" | "secondary";
  position: number;
  selected?: Brand;
  onClick?: () => void;
}

export default function PodiumColumn({
  variant,
  selected,
  position,
  onClick,
}: Readonly<PodiumColumnProps>) {
  const getPositionIcon = () => {
    if (position === 1) {
      return <Podium1Icon />;
    } else if (position === 2) {
      return <Podium2Icon />;
    } else if (position === 3) {
      return <Podium3Icon />;
    }
  };
  return (
    <div
      className={classNames(
        styles.body,
        styles[variant],
        selected && styles.selected
      )}
    >
      {selected ? (
        onClick ? (
          <button className={styles.field} onClick={onClick}>
            <div className={styles.image}>
              <img src={selected.imageUrl} alt={selected.name} />
            </div>
            <Typography
              variant={"geist"}
              textAlign={"center"}
              className={styles.name}
              size={14}
              weight={"bold"}
            >
              {selected.name}
            </Typography>
          </button>
        ) : (
          <div className={styles.field}>
            <div className={styles.image}>
              <img src={selected.imageUrl} alt={selected.name} />
            </div>
            <Typography
              variant={"geist"}
              textAlign={"center"}
              className={styles.name}
              size={14}
              weight={"bold"}
            >
              {selected.name}
            </Typography>
          </div>
        )
      ) : onClick ? (
        <button className={styles.brand} onClick={onClick}>
          <BRNDIcon />
        </button>
      ) : (
        <div className={styles.brand}>
          <BRNDIcon />
        </div>
      )}
      <div className={styles.positionIconContainer}>
        <div className={styles.positionIcon}>{getPositionIcon()}</div>
      </div>
    </div>
  );
}
