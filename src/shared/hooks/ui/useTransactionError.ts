import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useModal, ModalsIds } from "@/shared/hooks/ui/useModal";

interface ShowTransactionErrorOptions {
  error: Error | string | unknown;
  transactionType?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Hook to show a detailed transaction error modal for debugging purposes.
 * Displays error information with route, timestamp, and instructions to contact the developer.
 */
export const useTransactionError = () => {
  const { openModal } = useModal();
  const location = useLocation();

  const showTransactionError = useCallback(
    ({ error, transactionType, additionalInfo }: ShowTransactionErrorOptions) => {
      // Extract error message
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
        // Include stack trace if available
        if (error.stack) {
          errorMessage += `\n\nStack: ${error.stack.split("\n").slice(0, 3).join("\n")}`;
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          errorMessage = String(error);
        }
      }

      // Get current timestamp in readable format
      const timestamp = new Date().toISOString();

      // Get current route
      const route = location.pathname + location.search;

      openModal(ModalsIds.TRANSACTION_ERROR, {
        error: errorMessage,
        route,
        timestamp,
        transactionType,
        additionalInfo,
      });
    },
    [openModal, location]
  );

  return { showTransactionError };
};

/**
 * Utility function to wrap async transaction functions with error handling.
 * Use this to automatically show error modal when a transaction fails.
 *
 * @example
 * ```tsx
 * const { showTransactionError } = useTransactionError();
 *
 * const handleMint = async () => {
 *   try {
 *     await mintPodium(brandIds);
 *   } catch (error) {
 *     showTransactionError({
 *       error,
 *       transactionType: "Mint Podium",
 *       additionalInfo: { brandIds }
 *     });
 *   }
 * };
 * ```
 */
export default useTransactionError;
