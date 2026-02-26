import Button from "@/components/Button";
import LoaderIndicator from "@/shared/components/LoaderIndicator";
import styles from "./AlreadySharedView.module.scss";

type AlreadySharedClaimActionProps = {
  buttonCaption: string;
  isLoading: boolean;
  buttonDisabled: boolean;
  onClaim: () => void;
};

export function AlreadySharedClaimAction({
  buttonCaption,
  isLoading,
  buttonDisabled,
  onClaim,
}: AlreadySharedClaimActionProps) {
  return (
    <Button
      caption={buttonCaption}
      className={styles.button}
      iconLeft={isLoading ? <LoaderIndicator size={16} /> : undefined}
      onClick={onClaim}
      disabled={buttonDisabled}
    />
  );
}
