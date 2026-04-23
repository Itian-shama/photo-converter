import { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('sketch');
  const fileInputRef = useRef(null);
  
  // Vanta background
  const [vantaEffect, setVantaEffect] = useState(null);
  const appRef = useRef(null);

  useEffect(() => {
    if (!vantaEffect && appRef.current && window.VANTA) {
      setVantaEffect(window.VANTA.HALO({
        el: appRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        xOffset: 0.1,
        yOffset: 0.1,
        size: 1.5,
      }));
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    }
  }, [vantaEffect]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOriginalImage(URL.createObjectURL(file));
    setResultImage(null);
  };

  const processImage = async () => {
    if (!originalImage) return;
    
    setIsLoading(true);
    setResultImage(null);

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);

    let endpoint = '/api/sketch';
    if (activeMode === 'remove-bg') endpoint = '/api/remove-bg';
    if (activeMode === 'anime') endpoint = '/api/anime';
    if (activeMode === 'painting') endpoint = '/api/painting';

    try {
      const BACKEND_URL = 'http://localhost:5000';
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const blob = await response.blob();
        setResultImage(URL.createObjectURL(blob));
      } else {
        console.error("Failed to process image");
      }
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div ref={appRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}></div>
      <div className="app-wrapper" style={{ minHeight: '100vh', width: '100vw', padding: '2rem', boxSizing: 'border-box', overflowX: 'hidden', position: 'relative' }}>
      <div className="app-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', background: 'rgba(255, 255, 255, 0.85)', borderRadius: '20px', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', position: 'relative', zIndex: 1 }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Creative Studio</h1>
      <p className="subtitle" style={{ textAlign: 'center', color: '#555', marginBottom: '2rem' }}>Art Filter Engine & Background Removal</p>

      <div className="options">
        <div 
          className={`option-btn ${activeMode === 'sketch' ? 'active' : ''}`}
          onClick={() => { setActiveMode('sketch'); setResultImage(null); }}
        >
          <span style={{ fontSize: '1.5rem' }}>✏️</span>
          Pencil Sketch
        </div>
        <div 
          className={`option-btn ${activeMode === 'anime' ? 'active' : ''}`}
          onClick={() => { setActiveMode('anime'); setResultImage(null); }}
        >
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          Anime Art
        </div>
        <div 
          className={`option-btn ${activeMode === 'painting' ? 'active' : ''}`}
          onClick={() => { setActiveMode('painting'); setResultImage(null); }}
        >
          <span style={{ fontSize: '1.5rem' }}>🎨</span>
          Painting
        </div>
        <div 
          className={`option-btn ${activeMode === 'remove-bg' ? 'active' : ''}`}
          onClick={() => { setActiveMode('remove-bg'); setResultImage(null); }}
        >
          <span style={{ fontSize: '1.5rem' }}>✂️</span>
          Remove Background
        </div>
      </div>

      <div 
        className="upload-area" 
        onClick={() => fileInputRef.current.click()}
        style={{ padding: '2rem', cursor: 'pointer', border: '2px dashed #ccc', borderRadius: '12px', textAlign: 'center', marginTop: '2rem' }}
      >
        <div className="upload-icon" style={{ fontSize: '3rem' }}>📸</div>
        <h3>Click to Upload Photo</h3>
        <p>Supports JPG, PNG</p>
      </div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload} 
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      {(originalImage) && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button 
            className="convert-btn" 
            onClick={processImage}
            disabled={isLoading}
            style={{ padding: '1rem 2rem', fontSize: '1.2rem', background: '#ff7b54', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {isLoading ? 'Processing...' : `Apply ${activeMode === 'sketch' ? 'Sketch Effect' : activeMode === 'anime' ? 'Anime Effect' : activeMode === 'painting' ? 'Painting Effect' : 'Background Removal'}`}
          </button>
        </div>
      )}

      {(originalImage || isLoading || resultImage) && (
        <div className="result-area" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
          {originalImage && (
            <div style={{ flex: '1', minWidth: '250px' }}>
              <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Original</h3>
              <img src={originalImage} alt="Original" className="result-image" style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '12px' }} />
            </div>
          )}
          
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '1', minWidth: '250px' }}>
              <div className="loader"></div>
              <span style={{ marginLeft: '10px' }}>Applying magic filters...</span>
            </div>
          )}
          
          {resultImage && !isLoading && (
            <div style={{ flex: '1', minWidth: '250px' }}>
              <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Result</h3>
              <div style={{ 
                background: activeMode === 'remove-bg' ? 'repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%) 50% / 20px 20px' : 'transparent', 
                borderRadius: '12px',
                display: 'inline-block',
                width: '100%'
              }}>
                <img src={resultImage} alt="Result" className="result-image" style={{ marginBottom: 0, display: 'block', width: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '12px' }} />
              </div>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <a href={resultImage} download={activeMode === 'remove-bg' ? "no-bg.png" : `${activeMode}.jpg`} className="download-btn" style={{ textDecoration: 'none', color: '#ff7b54', fontWeight: 'bold' }}>
                  Download Result
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
    </>
  );
}

export default App;
