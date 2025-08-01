import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3000';

function StatisticsPage() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/statistics`);
      const data = await response.json();
      
      if (response.ok) {
        setStatistics(data);
      } else {
        setError(data.message || 'Failed to fetch statistics');
      }
    } catch {
      setError('Network error. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedAnalytics = async (shortcode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shorturls/${shortcode}`);
      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        console.error('Failed to fetch detailed analytics:', data.message);
        return null;
      }
    } catch {
      console.error('Network error fetching analytics');
      return null;
    }
  };

  const toggleRowExpansion = async (shortcode) => {
    if (expandedRows[shortcode]) {
      setExpandedRows({ ...expandedRows, [shortcode]: null });
    } else {
      const analytics = await fetchDetailedAnalytics(shortcode);
      setExpandedRows({ ...expandedRows, [shortcode]: analytics });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) <= new Date();
  };

  useEffect(() => {
    fetchStatistics();
    
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <span className="loading"></span>
        Loading statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert error">
        {error}
      </div>
    );
  }

  const activeUrls = statistics?.urls?.filter(url => !isExpired(url.expiryDate)).length || 0;
  const expiredUrls = statistics?.urls?.filter(url => isExpired(url.expiryDate)).length || 0;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total URLs</h4>
          <div className="number">{statistics?.totalUrls || 0}</div>
        </div>
        
        <div className="stat-card">
          <h4>Total Clicks</h4>
          <div className="number">{statistics?.totalClicks || 0}</div>
        </div>
        
        <div className="stat-card">
          <h4>Active URLs</h4>
          <div className="number">{activeUrls}</div>
        </div>
        
        <div className="stat-card">
          <h4>Expired URLs</h4>
          <div className="number">{expiredUrls}</div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Short URL</th>
              <th>Original URL</th>
              <th>Total Clicks</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {statistics?.urls?.map((url) => {
              const expired = isExpired(url.expiryDate);
              const shortcode = url.shortLink.split('/').pop();
              const isExpanded = expandedRows[shortcode];
              
              return (
                <React.Fragment key={url.shortcode}>
                  <tr>
                    <td>
                      <a 
                        href={url.shortLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontFamily: 'monospace',
                          color: '#667eea',
                          fontWeight: 'bold',
                          textDecoration: 'none'
                        }}
                      >
                        {url.shortLink}
                      </a>
                    </td>
                    
                    <td>
                      <div style={{ 
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {url.originalUrl}
                      </div>
                    </td>
                    
                    <td>
                      <span className={`tag ${url.totalClicks > 0 ? 'success' : ''}`}>
                        {url.totalClicks}
                      </span>
                    </td>
                    
                    <td>
                      <div>{formatDate(url.createdAt)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                        {new Date(url.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    
                    <td>
                      <div>{formatDate(url.expiryDate)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                        {new Date(url.expiryDate).toLocaleTimeString()}
                      </div>
                    </td>
                    
                    <td>
                      <span className={`tag ${expired ? 'danger' : 'success'}`}>
                        {expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    
                    <td>
                      <button
                        className="icon-btn"
                        onClick={() => toggleRowExpansion(shortcode)}
                        disabled={url.totalClicks === 0}
                        title="View detailed analytics"
                      >
                        {isExpanded ? '−' : '+'}
                      </button>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr>
                      <td colSpan="7">
                        <AnalyticsDetails analytics={isExpanded} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {(!statistics?.urls || statistics.urls.length === 0) && (
          <div className="empty-state">
            <h3>No URLs Found</h3>
            <p>No URLs have been shortened yet. Go to the URL Shortener tab to create some!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsDetails({ analytics }) {
  if (!analytics || !analytics.clicks || analytics.clicks.length === 0) {
    return (
      <div className="analytics-details">
        <p style={{ color: '#6c757d' }}>No click data available.</p>
      </div>
    );
  }

  return (
    <div className="analytics-details">
      <h4 style={{ marginBottom: '20px' }}>Click Analytics</h4>
      
      <div className="analytics-grid">
        <div>
          <h5 style={{ marginBottom: '15px' }}>
            Recent Clicks ({analytics.clicks.length} total)
          </h5>
          
          <div className="click-list">
            {analytics.clicks.slice(0, 10).map((click, index) => (
              <div key={index} className="click-item">
                <div className="click-time">
                  {new Date(click.timestamp).toLocaleString()}
                </div>
                <div className="click-details">
                  <div><strong>IP:</strong> {click.ip || 'Unknown'}</div>
                  <div><strong>Referrer:</strong> {click.referrer || 'Direct'}</div>
                  <div><strong>Location:</strong> {click.geolocation || 'Unknown'}</div>
                </div>
              </div>
            ))}
          </div>
          
          {analytics.clicks.length > 10 && (
            <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '10px' }}>
              Showing latest 10 clicks out of {analytics.clicks.length} total.
            </p>
          )}
        </div>
        
        <div>
          <h5 style={{ marginBottom: '15px' }}>Summary</h5>
          
          <div style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e9ecef' }}>
              <strong>Total Clicks:</strong> {analytics.totalClicks}
            </div>
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e9ecef' }}>
              <strong>Original URL:</strong>
              <div style={{ wordBreak: 'break-all', color: '#6c757d', fontSize: '0.9rem' }}>
                {analytics.originalUrl}
              </div>
            </div>
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e9ecef' }}>
              <strong>Created:</strong> {new Date(analytics.createdAt).toLocaleString()}
            </div>
            <div>
              <strong>Expires:</strong> {new Date(analytics.expiryDate).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsPage;
