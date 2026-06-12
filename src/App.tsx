import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import Home from './pages/Home';

// Each lab route is a lazy-loaded chunk so the landing bundle stays small.
const Tokenizer = lazy(() => import('./pages/lab/Tokenizer'));
const OrderBook = lazy(() => import('./pages/lab/OrderBook'));
const Forecast = lazy(() => import('./pages/lab/Forecast'));
const Pipeline = lazy(() => import('./pages/lab/Pipeline'));
const Attention = lazy(() => import('./pages/lab/Attention'));
const Levenshtein = lazy(() => import('./pages/lab/Levenshtein'));
const Stocks = lazy(() => import('./pages/lab/Stocks'));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function DemoFallback() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24">
      <p className="font-mono text-sm text-muted">Loading demo…</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block font-mono text-sm text-live underline">
        Back to home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollManager />
      <Header />
      <main id="main">
        <Suspense fallback={<DemoFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lab/tokenizer" element={<Tokenizer />} />
            <Route path="/lab/orderbook" element={<OrderBook />} />
            <Route path="/lab/forecast" element={<Forecast />} />
            <Route path="/lab/pipeline" element={<Pipeline />} />
            <Route path="/lab/attention" element={<Attention />} />
            <Route path="/lab/levenshtein" element={<Levenshtein />} />
            <Route path="/lab/stocks" element={<Stocks />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
