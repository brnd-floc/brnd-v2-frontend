type LogArg = unknown;
type LogMeta = Record<string, unknown> | undefined;

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: LogArg[]) => {
    if (!isDev || args.length === 0) {
      return;
    }

    console.warn('[debug]', ...args);
  },
  warn: (...args: LogArg[]) => {
    console.warn(...args);
  },
  error: (...args: LogArg[]) => {
    console.error(...args);
  },
};

export const logFeatureError = ({
  feature,
  action,
  error,
  meta,
}: {
  feature: string;
  action: string;
  error: unknown;
  meta?: LogMeta;
}) => {
  const baseMessage = `[${feature}] ${action}`;
  if (meta) {
    logger.error(baseMessage, error, meta);
    return;
  }
  logger.error(baseMessage, error);
};
