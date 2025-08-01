import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:3000';

function URLShortenerPage() {
  const [urlForms, setUrlForms] = useState([
    { id: 1, url: '', validity: 30, shortcode: '', loading: false }
  ]);
  const [shortenedUrls, setShortenedUrls] = useState([]);
  const [errors, setErrors] = useState({});

  const validateUrl = (url) => {
    try {
      new URL(url);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  };

  const validateValidity = (validity) => {
    const num = parseInt(validity);
    if (isNaN(num) || num <= 0) {
      return 'Validity must be a positive integer';
    }
    return null;
  };

  const validateShortcode = (shortcode) => {
    if (shortcode && !/^[a-zA-Z0-9]{1,20}$/.test(shortcode)) {
      return 'Shortcode must be alphanumeric and up to 20 characters';
    }
    return null;
  };

  const addUrlForm = () => {
    if (urlForms.length < 5) {
      setUrlForms([
        ...urlForms,
        { 
          id: Date.now(), 
          url: '', 
          validity: 30, 
          shortcode: '', 
          loading: false 
        }
      ]);
    }
  };

  const removeUrlForm = (id) => {
    if (urlForms.length > 1) {
      setUrlForms(urlForms.filter(form => form.id !== id));
      const newErrors = { ...errors };
      delete newErrors[id];
      setErrors(newErrors);
    }
  };

  const updateForm = (id, field, value) => {
    setUrlForms(urlForms.map(form => 
      form.id === id ? { ...form, [field]: value } : form
    ));
    
    if (errors[id]?.[field]) {
      setErrors({
        ...errors,
        [id]: {
          ...errors[id],
          [field]: null
        }
      });
    }
  };

  const setFormLoading = (id, loading) => {
    setUrlForms(urlForms.map(form => 
      form.id === id ? { ...form, loading } : form
    ));
  };

  const shortenUrl = async (formData) => {
    const { id, url, validity, shortcode } = formData;

    const urlError = validateUrl(url);
    const validityError = validateValidity(validity);
    const shortcodeError = validateShortcode(shortcode);

    if (urlError || validityError || shortcodeError) {
      setErrors({
        ...errors,
        [id]: {
          url: urlError,
          validity: validityError,
          shortcode: shortcodeError
        }
      });
      return;
    }

    setFormLoading(id, true);

    try {
      const response = await fetch(`${API_BASE_URL}/shorturls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          validity: parseInt(validity),
          shortcode: shortcode || undefined
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        const newShortUrl = {
          id: Date.now(),
          originalUrl: url,
          shortLink: responseData.shortLink,
          expiry: responseData.expiry,
          createdAt: new Date().toISOString()
        };
        
        setShortenedUrls(previousUrls => [newShortUrl, ...previousUrls]);

        updateForm(id, 'url', '');
        updateForm(id, 'validity', 30);
        updateForm(id, 'shortcode', '');
        
        const updatedErrors = { ...errors };
        delete updatedErrors[id];
        setErrors(updatedErrors);
      } else {
        setErrors({
          ...errors,
          [id]: {
            general: responseData.message || 'Something went wrong while creating the short URL'
          }
        });
      }
    } catch {
      setErrors({
        ...errors,
        [id]: {
          general: 'Unable to connect to the server. Please check your connection and try again.'
        }
      });
    } finally {
      setFormLoading(id, false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="form-section">
        <h3>Enter URLs to Shorten</h3>
        <p style={{ color: '#6c757d', marginBottom: '20px' }}>
          Create short links for up to 5 URLs at once. Set custom expiration times and optional short codes.
        </p>
        
        {urlForms.map((form, index) => (
          <div key={form.id} className="url-form">
            <div className="form-row">
              <div className="form-group">
                <label>URL {index + 1}</label>
                <input
                  type="text"
                  placeholder="https://example.com/very-long-url"
                  value={form.url}
                  onChange={(e) => updateForm(form.id, 'url', e.target.value)}
                  className={errors[form.id]?.url ? 'error' : ''}
                  disabled={form.loading}
                />
                {errors[form.id]?.url && (
                  <div className="error-message">{errors[form.id].url}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>Validity (min)</label>
                <input
                  type="number"
                  value={form.validity}
                  onChange={(e) => updateForm(form.id, 'validity', e.target.value)}
                  className={errors[form.id]?.validity ? 'error' : ''}
                  disabled={form.loading}
                />
                {errors[form.id]?.validity && (
                  <div className="error-message">{errors[form.id].validity}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>Custom Code</label>
                <input
                  type="text"
                  placeholder="optional"
                  value={form.shortcode}
                  onChange={(e) => updateForm(form.id, 'shortcode', e.target.value)}
                  className={errors[form.id]?.shortcode ? 'error' : ''}
                  disabled={form.loading}
                />
                {errors[form.id]?.shortcode && (
                  <div className="error-message">{errors[form.id].shortcode}</div>
                )}
              </div>
              
              <div className="form-group">
                <button
                  className="btn btn-primary"
                  onClick={() => shortenUrl(form)}
                  disabled={!form.url || form.loading}
                >
                  {form.loading ? (
                    <>
                      <span className="loading"></span>
                      Creating...
                    </>
                  ) : (
                    'Shorten'
                  )}
                </button>
              </div>
              
              {urlForms.length > 1 && (
                <div className="form-group">
                  <button
                    className="btn btn-danger"
                    onClick={() => removeUrlForm(form.id)}
                    disabled={form.loading}
                    title="Remove this URL"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            
            {errors[form.id]?.general && (
              <div className="alert error">
                {errors[form.id].general}
              </div>
            )}
          </div>
        ))}
        
        {urlForms.length < 5 && (
          <button
            className="btn btn-outline"
            onClick={addUrlForm}
          >
            + Add Another URL ({urlForms.length} of 5)
          </button>
        )}
      </div>

      {shortenedUrls.length > 0 && (
        <div className="results-section">
          <h3>Your Shortened URLs</h3>
          
          {shortenedUrls.map((item) => (
            <div key={item.id} className="result-card">
              <div className="original-url">
                <strong>Original:</strong> {item.originalUrl}
              </div>
              
              <div className="short-url">
                <a 
                  href={item.shortLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {item.shortLink}
                </a>
                
                <div className="action-buttons">
                  <button
                    className="icon-btn"
                    onClick={() => copyToClipboard(item.shortLink)}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => window.open(item.shortLink, '_blank')}
                    title="Open link"
                  >
                    🔗
                  </button>
                </div>
              </div>
              
              <div className="meta-info">
                <span className="tag success">
                  Expires: {formatDate(item.expiry)}
                </span>
                <span className="tag">
                  Created: {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default URLShortenerPage;
