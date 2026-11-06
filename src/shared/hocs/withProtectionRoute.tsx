// Dependencies
import React from 'react';
import { Navigate } from 'react-router-dom';

// Hooks
import { useAuth } from '@/hooks/auth';

// Components
import LoaderIndicator from '../components/LoaderIndicator';
import Button from '../components/Button';
import Typography from '../components/Typography';

const withProtectionRoute = (
  WrappedComponent: React.ComponentType,
  permission: 'always' | 'only-connected' | 'only-disconnected'
): React.ComponentType => {
  return (props) => {
    const { isLoading, data, isPending, error, refetch } = useAuth();

    if (!data && error) {
      return <>
        <Typography>{error.message}</Typography>
        <Button caption="Retry loading my account" disabled={isLoading}
          onClick={() => { void refetch().catch(() => undefined); }} />
      </>;
    }

    // Keep the current screen mounted during recovery, preserving its pending vote/claim.
    if (!data && (isLoading || isPending || permission === 'only-connected')) {
      return <LoaderIndicator variant={'fullscreen'} />;
    } else {
      if (!data && permission === 'only-connected') {
        return <Navigate to="/login" />;
      }

      if (data && permission === 'only-disconnected') {
        return <Navigate to={'/'} />;
      }
    }

    return (
      <>
        <WrappedComponent {...props} />
      </>
    );
  };
};

export default withProtectionRoute;
