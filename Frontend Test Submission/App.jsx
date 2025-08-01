import React, { useState } from 'react';
import URLShortenerPage from './components/URLShortenerPage';
import StatisticsPage from './components/StatisticsPage';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('shortener');

  return (
    <div className="app">
      <header className="header">
        <h1>URL Shortener</h1>
        <p>Transform long URLs into short, manageable links with detailed analytics</p>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'shortener' ? 'active' : ''}`}
          onClick={() => setActiveTab('shortener')}
        >
          URL Shortener
        </button>
        <button 
          className={`tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'shortener' && <URLShortenerPage />}
        {activeTab === 'statistics' && <StatisticsPage />}
      </div>
    </div>
  );
}

export default App;
