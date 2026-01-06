import React, { Component, ReactNode } from 'react';
import sdk from '@farcaster/miniapp-sdk';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  screenshotTaken: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private visibilityHandler: (() => void) | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      screenshotTaken: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      screenshotTaken: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo: JSON.stringify(errorInfo, null, 2),
    });

    this.setupScreenshotDetection();
  }

  setupScreenshotDetection = () => {
    if (typeof document === 'undefined') return;

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && document.hidden === false) {
        setTimeout(() => {
          this.setState({ screenshotTaken: true });
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);

    const keyHandler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.code === 'KeyS' || e.key === 's' || e.key === 'S')
      ) {
        this.setState({ screenshotTaken: true });
      }
    };

    document.addEventListener('keydown', keyHandler);

    return () => {
      if (this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler);
      }
      document.removeEventListener('keydown', keyHandler);
    };
  };

  componentWillUnmount() {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  handleViewProfile = async () => {
    try {
      await sdk.actions.viewProfile({ fid: 16098 });
    } catch (error) {
      console.error('Failed to open profile:', error);
    }
  };

  handleGoBack = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      screenshotTaken: false,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: '20px',
            fontFamily: 'monospace',
            fontSize: '14px',
            overflow: 'auto',
            zIndex: 10000,
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#ff6b6b', marginBottom: '10px' }}>
              Something went wrong
            </h2>
            <p style={{ marginBottom: '20px', lineHeight: '1.4' }}>
              An unexpected error occurred. Please take a screenshot of this screen and send it to{' '}
              <strong>jpfraneto.eth - fid 16098</strong>
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '15px',
              borderRadius: '5px',
              marginBottom: '20px',
              border: '1px solid #555',
            }}
          >
            <h3 style={{ color: '#ffd93d', marginBottom: '10px' }}>Error Details:</h3>
            <div style={{ marginBottom: '15px' }}>
              <strong>Error:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#ff9999' }}>
                {this.state.error?.message}
              </pre>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Stack:</strong>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '12px',
                  color: '#ccc',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                {this.state.error?.stack}
              </pre>
            </div>
            {this.state.errorInfo && (
              <div>
                <strong>Component Stack:</strong>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '12px',
                    color: '#ccc',
                    maxHeight: '150px',
                    overflow: 'auto',
                  }}
                >
                  {this.state.errorInfo}
                </pre>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleGoBack}
              style={{
                backgroundColor: '#666',
                color: '#fff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Go Back
            </button>

            {this.state.screenshotTaken && (
              <button
                onClick={this.handleViewProfile}
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '5px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Contact jpfraneto.eth
              </button>
            )}
          </div>

          {this.state.screenshotTaken && (
            <p style={{ marginTop: '15px', color: '#4ade80', fontSize: '12px' }}>
              ✓ Screenshot detected! You can now contact the developer.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}