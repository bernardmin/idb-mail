'use client';
import React, { useState } from 'react';
import Papa from 'papaparse';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailDraft, setEmailDraft] = useState({ subject: '', body: '' });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setLeads(results.data.map((row, index) => ({
          id: index,
          firstName: row['FirstName'] || 'Partner',
          company: row['Company'] || 'Company',
          notes: (row['Notes'] || '').trim(),
        })));
      },
    });
  };

  const generateAIEmail = async (lead) => {
    if (!apiKey) { alert("API Key를 입력해주세요!"); return; }
    setIsGenerating(true);
    setSelectedLead(lead);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `CEO Bernard Min of IDB Inc. writing to ${lead.firstName} at ${lead.company}. Topic: ${lead.notes}. Language: English. Format: JSON {"subject": "...", "body": "..."}`;
      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setEmailDraft({ subject: data.subject, body: data.body });
    } catch (e) { alert("AI 생성 중 오류 발생"); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="p-10 font-sans bg-slate-50 min-h-screen">
      <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">IDB Mail Assistant</h1>
        <div className="flex gap-3">
          <input type="password" placeholder="Gemini API Key" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} className="border p-2 rounded-lg text-sm w-64 shadow-sm"/>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="text-sm border p-2 rounded-lg bg-slate-50 cursor-pointer"/>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-[650px] overflow-y-auto">
          <h3 className="font-bold mb-5 text-slate-700 border-b pb-2">고객 리스트 ({leads.length})</h3>
          {leads.map(l => (
            <div key={l.id} onClick={()=>generateAIEmail(l)} className={`p-4 mb-3 rounded-lg border cursor-pointer transition-all ${selectedLead?.id === l.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}>
              <div className="font-bold text-slate-800">{l.firstName}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{l.company}</div>
            </div>
          ))}
        </div>
        <div className="md:col-span-2 bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative flex flex-col h-[650px]">
          {isGenerating && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center font-bold text-blue-600 text-lg">AI가 맞춤형 메일을 작성하고 있습니다...</div>}
          {selectedLead ? (
            <>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-900">
                <strong>💡 메모 분석:</strong> {selectedLead.notes}
              </div>
              <input value={emailDraft.subject} onChange={(e)=>setEmailDraft({...emailDraft, subject: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg mb-4 font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="제목"/>
              <textarea value={emailDraft.body} onChange={(e)=>setEmailDraft({...emailDraft, body: e.target.value})} className="w-full flex-1 p-4 border border-slate-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-slate-700" placeholder="메일 본문이 여기에 나타납니다." />
              <button onClick={()=> {navigator.clipboard.writeText(emailDraft.subject + "\n\n" + emailDraft.body); alert("복사되었습니다!");}} className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95">내용 복사하기</button>
            </>
          ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><p className="text-lg">CSV 파일을 업로드하고</p><p>왼쪽 리스트에서 고객을 선택해 주세요.</p></div>}
        </div>
      </div>
    </div>
  );
}
