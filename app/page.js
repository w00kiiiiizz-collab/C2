'use client';

import { useState, useRef } from 'react';
import { UploadCloud, Key, Send, Download, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { parseExcelFile, generateExcelFile } from '@/utils/excelParser';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  
  const fileInputRef = useRef(null);
  const reportRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const data = await parseExcelFile(file);
      setFileData(data);
      
      // Calculate basic metrics if possible
      calculateBasicMetrics(data);
      
      setChatHistory([
        { role: 'ai', content: `**${file.name}** 파일이 업로드되었습니다. 총 ${data.length}개의 행이 파싱되었습니다. 무엇을 분석해 드릴까요?` }
      ]);
    } catch (error) {
      alert('파일 파싱 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  const calculateBasicMetrics = (data) => {
    let spend = 0;
    let revenue = 0;
    let clicks = 0;
    
    // Attempt to find relevant columns (names can vary)
    data.forEach(row => {
      // Find spend
      const spendKey = Object.keys(row).find(k => k.includes('광고비') || k.includes('총비용') || k.includes('Spend'));
      if (spendKey) spend += Number(row[spendKey]) || 0;
      
      // Find revenue
      const revKey = Object.keys(row).find(k => k.includes('매출') || k.includes('전환매출') || k.includes('Revenue'));
      if (revKey) revenue += Number(row[revKey]) || 0;

      // Find clicks
      const clickKey = Object.keys(row).find(k => k.includes('클릭수') || k.includes('Clicks'));
      if (clickKey) clicks += Number(row[clickKey]) || 0;
    });

    const roas = spend > 0 ? ((revenue / spend) * 100).toFixed(2) : 0;

    setMetrics({ spend, revenue, roas, clicks });
  };

  const handleAnalyze = async () => {
    if (!apiKey) {
      alert('Google Gemini API 키를 입력해주세요.');
      return;
    }
    if (!fileData) {
      alert('먼저 분석할 엑셀 파일을 업로드해주세요.');
      return;
    }
    if (!query.trim()) return;

    const userMessage = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          data: fileData,
          query: userMessage
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '분석 중 오류 발생');
      }

      setChatHistory(prev => [...prev, { role: 'ai', content: data.result }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', content: `**오류 발생:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0f1115' // match background
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`ad-analysis-report-${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF 다운로드 중 오류가 발생했습니다.');
    }
  };

  const downloadExcel = () => {
    if (!fileData) return;
    generateExcelFile(fileData, `ad-data-export-${new Date().getTime()}`);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <BarChart3 size={28} color="var(--primary)" />
          <span>Ad.Analytics</span>
        </div>

        <div className="setting-group">
          <span className="setting-label">API Settings</span>
          <div style={{ position: 'relative' }}>
            <Key size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              className="glass-input" 
              style={{ width: '100%', paddingLeft: 36 }}
              placeholder="Gemini API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none' }}>Get an API key</a>
        </div>

        <div className="setting-group" style={{ marginTop: '16px' }}>
          <span className="setting-label">Data Source</span>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <div 
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="upload-icon" />
            <p style={{ fontWeight: 500, marginTop: 8 }}>Click to Upload Excel</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Naver, Gmarket, Coupang etc.</p>
          </div>
          
          {fileName && (
            <div className="file-info">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></span>
              {fileName}
            </div>
          )}
        </div>

      </aside>

      {/* Main Content */}
      <main className="main-content" ref={reportRef}>
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard Overview</h1>
            <p className="dashboard-subtitle">AI-Powered E-commerce Advertising Analytics</p>
          </div>
          
          <div className="export-actions" data-html2canvas-ignore>
            <button className="glass-button glass-button-secondary" onClick={downloadExcel}>
              <Download size={16} /> Excel
            </button>
            <button className="glass-button glass-button-secondary" onClick={downloadPDF}>
              <Download size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Overview Metrics */}
        {metrics && (
          <div className="metrics-grid">
            <div className="glass-panel metric-card">
              <span className="metric-label">Total Spend</span>
              <span className="metric-value">₩{metrics.spend.toLocaleString()}</span>
            </div>
            <div className="glass-panel metric-card">
              <span className="metric-label">Total Revenue</span>
              <span className="metric-value">₩{metrics.revenue.toLocaleString()}</span>
            </div>
            <div className="glass-panel metric-card">
              <span className="metric-label">Average ROAS</span>
              <span className="metric-value" style={{ color: metrics.roas > 300 ? 'var(--success)' : 'var(--warning)' }}>
                {metrics.roas}%
              </span>
            </div>
            <div className="glass-panel metric-card">
              <span className="metric-label">Total Clicks</span>
              <span className="metric-value">{metrics.clicks.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Chat / Analysis Interface */}
        <div className="glass-panel analysis-section">
          <div className="chat-container">
            {chatHistory.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <h3>No data analyzed yet</h3>
                <p style={{ marginTop: 8 }}>Upload an Excel file to start gaining insights.</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  {msg.role === 'ai' ? (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="message ai loader">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </div>
          
          <div className="chat-input-area" data-html2canvas-ignore style={{ padding: '0 24px 24px 24px' }}>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="예: 수익률(ROAS)이 가장 나쁜 상품 10가지와 개선 방안을 분석해줘"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button className="glass-button" onClick={handleAnalyze} disabled={isLoading}>
              <Send size={18} />
              Analyze
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
