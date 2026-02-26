// Dependencies
import React from "react";
import sdk from "@farcaster/miniapp-sdk";

// Types
import { BaseModalProps, TransactionErrorModalData } from "../../types";

// StyleSheet
import styles from "./TransactionErrorModal.module.scss";

// Components
import Typography from "@/components/Typography";
import Button from "@/components/Button";

// Assets
import BrndLogo from "@/shared/assets/images/logo.svg?react";

const DEV_FID = 16098; // @jpfraneto

export const TransactionErrorModal: React.FC<
  BaseModalProps<TransactionErrorModalData>
> = ({ error, route, timestamp, transactionType, additionalInfo, handleClose }) => {
  const handleContactDev = () => {
    sdk.haptics.selectionChanged();
    // Open cast composer with error details to mention the dev
    sdk.actions.composeCast({
      text: `@jpfraneto BRND miniapp error:\n\nRoute: ${route}\nTime: ${timestamp}\n${transactionType ? `Type: ${transactionType}\n` : ""}Error: ${error.slice(0, 200)}${error.length > 200 ? "..." : ""}`,
    });
  };

  const handleViewDevProfile = () => {
    sdk.haptics.selectionChanged();
    sdk.actions.viewProfile({ fid: DEV_FID });
  };

  return (
    <div className={styles.layout}>
      <div className={styles.modal}>
        {/* Header with logo */}
        <div className={styles.header}>
          <BrndLogo className={styles.logo} />
          <Typography
            variant="druk"
            weight="wide"
            size={14}
            lineHeight={18}
            className={styles.appName}
          >
            BRND MINIAPP
          </Typography>
        </div>

        {/* Error title */}
        <div className={styles.titleSection}>
          <Typography
            variant="druk"
            weight="wide"
            size={18}
            lineHeight={22}
            className={styles.title}
          >
            TRANSACTION ERROR
          </Typography>
        </div>

        {/* Instructions */}
        <div className={styles.instructions}>
          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.instructionText}
          >
            Take a screenshot and DC it to @jpfraneto please
          </Typography>
        </div>

        {/* Error details */}
        <div className={styles.errorDetails}>
          <div className={styles.detailRow}>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              className={styles.detailLabel}
            >
              ROUTE
            </Typography>
            <Typography
              variant="geist"
              weight="regular"
              size={12}
              className={styles.detailValue}
            >
              {route}
            </Typography>
          </div>

          <div className={styles.detailRow}>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              className={styles.detailLabel}
            >
              TIMESTAMP
            </Typography>
            <Typography
              variant="geist"
              weight="regular"
              size={12}
              className={styles.detailValue}
            >
              {timestamp}
            </Typography>
          </div>

          {transactionType && (
            <div className={styles.detailRow}>
              <Typography
                variant="geist"
                weight="medium"
                size={12}
                className={styles.detailLabel}
              >
                TX TYPE
              </Typography>
              <Typography
                variant="geist"
                weight="regular"
                size={12}
                className={styles.detailValue}
              >
                {transactionType}
              </Typography>
            </div>
          )}

          <div className={styles.errorSection}>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              className={styles.detailLabel}
            >
              ERROR
            </Typography>
            <div className={styles.errorBox}>
              <Typography
                variant="geist"
                weight="regular"
                size={11}
                lineHeight={14}
                className={styles.errorText}
              >
                {error}
              </Typography>
            </div>
          </div>

          {additionalInfo && Object.keys(additionalInfo).length > 0 && (
            <div className={styles.additionalSection}>
              <Typography
                variant="geist"
                weight="medium"
                size={12}
                className={styles.detailLabel}
              >
                ADDITIONAL INFO
              </Typography>
              <div className={styles.errorBox}>
                <Typography
                  variant="geist"
                  weight="regular"
                  size={11}
                  lineHeight={14}
                  className={styles.errorText}
                >
                  {JSON.stringify(additionalInfo, null, 2)}
                </Typography>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            caption="Cast Error to @jpfraneto"
            onClick={handleContactDev}
            className={styles.contactButton}
          />
          <Button
            variant="underline"
            caption="View @jpfraneto Profile"
            onClick={handleViewDevProfile}
          />
          <Button
            variant="underline"
            caption="Close"
            onClick={handleClose}
          />
        </div>
      </div>
    </div>
  );
};
