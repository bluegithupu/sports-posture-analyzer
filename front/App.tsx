import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { AnalysisHistory } from './components/AnalysisHistory';

const App: React.FC = () => {

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 font-sans">
        <Header />
        <Navigation />

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<AnalysisHistory />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;