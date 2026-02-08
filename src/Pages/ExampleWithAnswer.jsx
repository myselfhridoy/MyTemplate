import React, { useState, useEffect } from 'react';
import CQWithAnswer from '../Components/CQWithAnswer/CQWithAnswer';
import { MathJaxContext } from 'better-react-mathjax';

function ExampleWithAnswer() {
  const [cqData, setCqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          'https://corsproxy.io/?url=' + encodeURIComponent('https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/testanswer.json'),
          {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
          throw new Error('Empty response data');
        }
        setCqData(data);
      } catch (err) {
        setError(err?.message || 'Unknown error');
        setCqData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-error">Error: {error}</div>;
  if (!cqData) return <div className="text-center py-8">No data found</div>;
  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: { inlineMath: [['$', '$'], ['\(', '\)']] }
    }}>
      <div className="container mx-auto p-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        {Array.isArray(cqData) && cqData.map((item, idx) => (
          <CQWithAnswer key={idx} data={{...item, index: idx}} />
        ))}
      </div>
    </MathJaxContext>
  );
}

export default ExampleWithAnswer;
