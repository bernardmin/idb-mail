'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Save, Upload, Copy, CheckCircle, Mail, Sparkles, Loader2, Download, RefreshCw } from 'lucide-react';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailDraft, setEmailDraft] = useState({ subject: '', body: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailType, setEmailType] = useState('auto'); // auto, sales, partnership, invest, general

  // 1. CSV 파일 업로드 및 분석
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processed = results.data.map((row, index) => ({
          id: index,
          firstName: row['FirstName'] || 'Partner',
          lastName: row['LastName'] || '',
          company: row['Company'] || 'Company',
          email: row['Email'] || '',
          country: row['CountryCode'] || '',
          // 지저분한 태그 제거
          notes: (row['Notes'] || '').replace(/\/g, '').replace(/<[^>]*>?/gm, '').trim(),
          status: 'pending',
          generatedSubject: '',
          generatedBody: ''
        }));
        setLeads(processed);
      },
    });
  };

  // 2. AI 메일 생성 (핵심 로직)
  const generateAIEmail = async (lead, type = 'auto') => {
    if (!apiKey) {
      alert("화면 맨 위에 API Key를 먼저 입력해주세요!");
      return;
    }

    setIsGenerating(true);
    setSelectedLead(lead);
    setEmailType(type);
    
    // 한국 기업 여부 판단
    const isKorea = lead.country === '82' || lead.country?.toLowerCase() === 'south korea';
    const notesContent = lead.notes || "CES 부스 방문";

    // AI에게 줄 지령 (프롬프트)
    const prompt = `
      당신은 산업용 AI 기업 'IDB Inc.'의 CEO '민보경(Bernard Min)'입니다.
      CES 2026에서 만난 리드에게 후속 메일을 보냅니다.
      
      [상대방 정보]
      - 이름: ${lead.firstName} ${lead.lastName}
      - 회사: ${lead.company}
      - 메모: "${notesContent}"
      
      [작성 방향: ${type === 'auto' ? '메모 내용을 보고 스스로 판단하세요' : type}]
      - Sales (판매): 우리 솔루션(Protect Go AI) 도입 제안, 비용 절감 강조.
      - Partnership (협업): 기술 제휴(Systemic Brain), 공동 사업 제안, 시너지 강조.
      - Invest (투자): IDB의 성장성, IR 미팅 제안.
      - General (일반): 가벼운 안부, 관계 유지.

      [필수 포함 내용]
      1. 언어: ${isKorea ? "한국어 (비즈니스 정중한 톤)" : "영어 (Business Professional Tone)"}
      2. 메모의 내용을 구체적으로 언급하여 "기억하고 있다"는 느낌을 줄 것.
      3. 우리 제품(Protect Go AI, Systemic Brain)이 그들에게 왜 필요한지 연결할 것.
      4. 다음 단계(화상 미팅, 자료 요청 등)를 명확히 제안할 것.
      5. 서명: 민보경 드림 (CEO, IDB Inc.) / Bernard Min (CEO, IDB Inc.)
      
      [결과 형식]
      오직 JSON만 출력: {"subject": "제목", "body": "본문"}
    `;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);

      setEmailDraft({ subject: data.subject, body: data.body });
    } catch (error) {
      console.error(error);
      alert("AI 생성 실패. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. 작업 내용 저장 (메모리에 임시 저장)
  const handleConfirm = () => {
    if (!selectedLead) return;
    const updatedLeads = leads.map(l => 
      l.id === selectedLead.id ? { 
        ...l, 
        status: 'done',
        generatedSubject: emailDraft.subject,
        generatedBody: emailDraft.body
      } : l
    );
    setLeads(updatedLeads);
    // 다음 사람 자동 선택 (옵션)
    alert('저장되었습니다. (리스트에 초록색 체크 표시됨)');
  };

  // 4. 결과물 엑셀 다운로드
  const downloadCSV = () => {
    const csvContent = Papa.unparse(leads.map(l => ({
      ...l,
      notes: l.notes.replace(/\n/g, ' '), // 줄바꿈 제거
      generatedBody: l.generatedBody?.replace(/\n/g, '\\n') // 본문 줄바꿈 보존 처리
    })));
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'IDB_CES_FollowUp_Result.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
      {/* 상단 헤더 */}
      <header className="max-w-7xl mx-auto mb-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IDB Mail Assistant <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">V1.0</span></h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="password" placeholder="API Key 입력" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} className="border p-2 rounded-lg text-sm w-full md:w-64"/>
          <label className="btn-upload bg-slate-800 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-700 flex items-center gap-2 text-sm">
            <Upload size={16}/> CSV 업로드 <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden"/>
          </label>
          {leads.length > 0 && (
            <button onClick={downloadCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm">
              <Download size={16}/> 결과 다운로드
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        
        {/* 왼쪽: 리드 리스트 */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">Leads List ({leads.length})</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} onClick={() => generateAIEmail(lead)} 
                className={`p-3 rounded-xl border cursor-pointer hover:bg-blue-50 transition-all ${selectedLead?.id === lead.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : lead.status === 'done' ? 'border-green-300 bg-green-50' : 'border-slate-100'}`}>
                <div className="flex justify-between">
                  <span className="font-bold text-sm">{lead.firstName} {lead.lastName}</span>
                  {lead.status === 'done' && <CheckCircle size={16} className="text-green-600"/>}
                </div>
                <div className="text-xs text-slate-500 truncate">{lead.company}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 에디터 */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
              <p className="font-bold text-blue-600 animate-pulse">Gemini가 {selectedLead?.company} 맞춤 메일을 작성 중...</p>
            </div>
          )}

          {selectedLead ? (
            <>
              {/* 컨트롤 패널 */}
              <div className="p-4 border-b bg-slate-50 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={() => generateAIEmail(selectedLead, 'sales')} className={`px-3 py-1.5 text-xs rounded-full border ${emailType === 'sales' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>💰 판매 제안</button>
                  <button onClick={() => generateAIEmail(selectedLead, 'partnership')} className={`px-3 py-1.5 text-xs rounded-full border ${emailType === 'partnership' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-gray-100'}`}>🤝 협업/제휴</button>
                  <button onClick={() => generateAIEmail(selectedLead, 'invest')} className={`px-3 py-1.5 text-xs rounded-full border ${emailType === 'invest' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white hover:bg-gray-100'}`}>📈 투자 유치</button>
                  <button onClick={() => generateAIEmail(selectedLead, 'general')} className={`px-3 py-1.5 text-xs rounded-full border ${emailType === 'general' ? 'bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-100'}`}>☕ 일반/안부</button>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => {navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`); alert('복사됨');}} className="p-2 border rounded hover:bg-gray-100"><Copy size={18}/></button>
                   <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center gap-2"><Save size={18}/> 저장 (완료처리)</button>
                </div>
              </div>

              {/* 에디터 본문 */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-sm">
                  <strong className="block mb-1">📝 상담 메모:</strong> {selectedLead.notes}
                </div>
                <div className="space-y-4">
                  <input value={emailDraft.subject} onChange={(e) => setEmailDraft({...emailDraft, subject: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="제목"/>
                  <textarea value={emailDraft.body} onChange={(e) => setEmailDraft({...emailDraft, body: e.target.value})} className="w-full h-[400px] p-4 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed" placeholder="본문"/>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Sparkles size={48} className="mb-4 opacity-30"/>
              <p>리드를 선택하면 AI가 자동으로 작성합니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
