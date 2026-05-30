import { useState } from 'react';
import AppNav from './components/AppNav';
import CompareToast from './components/CompareToast';
import ErrorBoundary from './components/ErrorBoundary';
import { useCompareList } from './hooks/useCompareList';
import { useStarData } from './hooks/useStarData';
import ComparePage from './pages/ComparePage';
import HomePage from './pages/HomePage';

export default function App() {
  const [page, setPage] = useState('home');
  const starData = useStarData();
  const compare = useCompareList();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 font-sans">
        <AppNav
          activePage={page}
          onNavigate={setPage}
          compareCount={compare.items.length}
        />
        {page === 'home' ? (
          <HomePage starData={starData} compare={compare} />
        ) : (
          <ComparePage starData={starData} compare={compare} />
        )}
        <CompareToast toast={compare.toast} onDismiss={compare.dismissToast} />
      </div>
    </ErrorBoundary>
  );
}
