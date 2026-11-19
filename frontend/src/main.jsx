import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('CampusPulse render error:', error);
  }

  render() {
    if (this.state.error) {
      return <main style={{ maxWidth: 760, margin: '12vh auto', padding: 32, fontFamily: 'system-ui, sans-serif', color: '#182019', background: '#fff', border: '1px solid #e6e8e4' }}>
        <p style={{ color: '#647443', fontSize: 12, letterSpacing: 2 }}>CAMPUSPULSE · RENDER ERROR</p>
        <h1 style={{ fontSize: 30 }}>The page hit a frontend error.</h1>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, background: '#f4f5ed', fontSize: 13 }}>{String(this.state.error?.stack || this.state.error)}</pre>
        <p>Copy the error above to diagnose the failing module.</p>
      </main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>,
);
