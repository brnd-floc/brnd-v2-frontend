import Typography from "@/components/Typography";
import Logo from "@/assets/images/logo.svg";

import styles from "./ShareView.module.scss";

export function ShareHeaderSection() {
  return (
    <>
      <div>
        <div className={styles.center}>
          <img src={Logo} className={styles.logo} alt="Logo" />
        </div>
      </div>
      <div className={styles.container}>
        <Typography
          size={18}
          lineHeight={24}
          variant={"druk"}
          weight={"wide"}
          className={styles.title}
        >
          You just created your podium!
        </Typography>
      </div>
    </>
  );
}
