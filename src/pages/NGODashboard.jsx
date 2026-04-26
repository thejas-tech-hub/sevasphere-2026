import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { detectCrises, enhanceNeedWithAI, generateSituationReport, extractFromHandwrittenReport } from '../utils/gemini';
import { AlertTriangle, Plus, Zap, Users, MapPin, Brain, Loader, CheckCircle, FileText, X, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const URGENCY = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200'
};

const CRISIS_COLOR = {
  flood: 'bg-blue-500', heatwave: 'bg-orange-500', cyclone: 'bg-purple-500',
  food: 'bg-yellow-500', health: 'bg-green-500', fire: 'bg-red-500'
};

const SKILLS = [
  'Medical Aid', 'Rescue Operations', 'Food Distribution', 'Water Distribution',
  'Shelter Management', 'Evacuation Support', 'Logistics', 'Community Outreach',
  'First Aid', 'Sanitation'
];

export default function NGODashboard() {
  const { userProfile } = useAuth();
  const [crises, setCrises] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [tab, setTab] = useState('crises');
  const [showForm, setShowForm] = useState(false);
  const [loadingCrises, setLoadingCrises] = useState(true);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', location: userProfile?.location || '',
    skills: [], urgency: 'medium', volunteersNeeded: 10
  });

  useEffect(() => { loadCrises(); loadNeeds(); }, []);

  async function loadCrises() {
    setLoadingCrises(true);
    setCrises(await detectCrises());
    setLoadingCrises(false);
  }

  async function loadNeeds() {
    try {
      const snap = await getDocs(query(collection(db, 'needs'), orderBy('createdAt', 'desc')));
      setNeeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }

  async function handleEnhance() {
    if (!form.title) return;
    setAiEnhancing(true);
    const res = await enhanceNeedWithAI(form.title, form.description, form.location);
    if (res) {
      setAiResult(res);
      setForm(p => ({
        ...p,
        urgency: res.urgency || p.urgency,
        volunteersNeeded: res.estimatedVolunteers || p.volunteersNeeded,
        skills: res.suggestedSkills || p.skills
      }));
    }
    setAiEnhancing(false);
  }

  // Fix 1 — Multimodal: read handwritten field report
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrSuccess(false);
    setAiResult(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result.split(',')[1];
      const result = await extractFromHandwrittenReport(base64, file.type);
      if (result) {
        setForm(p => ({
          ...p,
          title: result.title || p.title,
          description: result.description || p.description,
          location: result.location || p.location,
          urgency: result.urgency || p.urgency,
          skills: result.skills || p.skills,
          volunteersNeeded: result.volunteersNeeded || p.volunteersNeeded,
        }));
        setAiResult({
          aiSummary: result.aiSummary,
          priority: 8,
          urgency: result.urgency,
          estimatedVolunteers: result.volunteersNeeded
        });
        setOcrSuccess(true);
      }
      setOcrLoading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setShowReport(true);
    setReportContent('');
    const totalAffected = crises.reduce((a, c) => a + (c.affectedPeople || 0), 0);
    const totalDeployed = crises.reduce((a, c) => a + (c.volunteersDeployed || 0), 0);
    const totalNeeded = crises.reduce((a, c) => a + (c.volunteersNeeded || 0), 0);
    const report = await generateSituationReport(crises, { totalAffected, totalDeployed, totalNeeded });
    setReportContent(report || 'Unable to generate report. Please try again.');
    setGeneratingReport(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'needs'), {
        ...form,
        ngoId: userProfile?.uid,
        ngoName: userProfile?.name,
        status: 'active',
        volunteersApplied: 0,
        createdAt: new Date().toISOString(),
        aiPriority: aiResult?.priority || 5,
        aiSummary: aiResult?.aiSummary || ''
      });
      setShowForm(false);
      setForm({ title: '', description: '', location: userProfile?.location || '', skills: [], urgency: 'medium', volunteersNeeded: 10 });
      setAiResult(null);
      setOcrSuccess(false);
      loadNeeds();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {userProfile?.name} 👋</h1>
            <p className="text-gray-500 mt-1">NGO Command Center · Gemini AI Powered</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleGenerateReport} disabled={generatingReport || crises.length === 0}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50">
              {generatingReport ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              AI Situation Report
            </button>
            <button onClick={() => { setShowForm(true); setOcrSuccess(false); setAiResult(null); }}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition">
              <Plus className="w-5 h-5" /> Post a Need
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <AlertTriangle className="w-5 h-5 text-red-500" />, value: crises.filter(c => c.urgency === 'critical').length, label: 'Critical Alerts', bg: 'bg-red-50' },
            { icon: <CheckCircle className="w-5 h-5 text-green-500" />, value: needs.length, label: 'Active Needs', bg: 'bg-green-50' },
            { icon: <Users className="w-5 h-5 text-blue-500" />, value: needs.reduce((a, n) => a + (n.volunteersApplied || 0), 0), label: 'Volunteers Applied', bg: 'bg-blue-50' },
            { icon: <Zap className="w-5 h-5 text-orange-500" />, value: crises.length, label: 'AI Alerts Today', bg: 'bg-orange-50' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
              {s.icon}
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 rounded-xl p-1 w-fit">
          {[{ id: 'crises', label: '🚨 AI Crisis Alerts' }, { id: 'needs', label: '📋 Your Needs' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t.id ? 'bg-white shadow text-blue-900' : 'text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Crisis Alerts Tab */}
        {tab === 'crises' && (
          loadingCrises ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Gemini AI scanning crisis intelligence feeds...</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {crises.map(c => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${CRISIS_COLOR[c.type] || 'bg-gray-500'}`}>
                      {c.type?.toUpperCase()}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${URGENCY[c.urgency]}`}>
                      {c.urgency}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{c.title}</h3>
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
                    <MapPin className="w-3 h-3" />{c.location}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{c.description}</p>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Risk Score</span>
                      <span className="font-bold text-gray-700">{c.riskScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${c.riskScore >= 80 ? 'bg-red-500' : c.riskScore >= 60 ? 'bg-orange-500' : 'bg-yellow-400'}`}
                        style={{ width: `${c.riskScore}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>👥 {c.affectedPeople?.toLocaleString()} affected</span>
                    <span>🙋 {c.volunteersDeployed}/{c.volunteersNeeded}</span>
                  </div>
                  {c.source && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.source === 'GDACS' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                      {c.source === 'GDACS' ? '🌍 Live GDACS Data' : '🤖 Gemini AI'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Your Needs Tab */}
        {tab === 'needs' && (
          <div className="space-y-4">
            {needs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No needs posted yet. Click "Post a Need" to get started.</p>
              </div>
            ) : needs.map(n => (
              <div key={n.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900">{n.title}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${URGENCY[n.urgency]}`}>{n.urgency}</span>
                      {n.aiPriority && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI Priority: {n.aiPriority}/10</span>}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                      <MapPin className="w-3 h-3" />{n.location}
                    </div>
                    {n.aiSummary && (
                      <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-2">🤖 {n.aiSummary}</p>
                    )}
                    <p className="text-sm text-gray-600">{n.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {n.skills?.map(s => <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{s}</span>)}
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-blue-900">{n.volunteersApplied || 0}</div>
                    <div className="text-xs text-gray-400">of {n.volunteersNeeded}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POST A NEED MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">Post a Volunteer Need</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Fix 1 — Paper Survey Upload */}
              <div className="border-2 border-dashed border-purple-300 rounded-xl p-4 bg-purple-50">
                <p className="text-sm font-semibold text-purple-800 mb-1">📄 Upload Handwritten Field Report</p>
                <p className="text-xs text-purple-600 mb-3">
                  Take a photo of your paper survey — Gemini AI reads the handwriting and auto-fills the form below
                </p>
                <label className="cursor-pointer block">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={ocrLoading} />
                  <div className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition select-none
                    ${ocrLoading ? 'bg-purple-400 text-white cursor-wait'
                      : ocrSuccess ? 'bg-green-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                    {ocrLoading ? (
                      <><Loader className="w-4 h-4 animate-spin" /> Gemini AI Reading Handwriting...</>
                    ) : ocrSuccess ? (
                      <><CheckCircle className="w-4 h-4" /> Form Auto-Filled from Report!</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Upload Paper Survey / Field Report</>
                    )}
                  </div>
                </label>
                {ocrSuccess && (
                  <p className="text-xs text-green-600 mt-2 text-center">✅ Handwriting extracted successfully. Review and edit the fields below before posting.</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR FILL MANUALLY</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Need title" />

              <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-gray-900"
                placeholder="Describe what volunteers need to do..." />

              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Location (e.g. Mumbai, Maharashtra)" />

              <button type="button" onClick={handleEnhance} disabled={aiEnhancing || !form.title}
                className="w-full flex items-center justify-center gap-2 border-2 border-purple-300 text-purple-700 font-semibold py-3 rounded-lg hover:bg-purple-50 transition disabled:opacity-50">
                {aiEnhancing ? <Loader className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {aiEnhancing ? 'Gemini AI Analyzing...' : '✨ Enhance with Gemini AI'}
              </button>

              {aiResult && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-purple-800 mb-1">🤖 AI Recommendations Applied</p>
                  <p className="text-purple-700">Priority: {aiResult.priority}/10 · Urgency: {aiResult.urgency} · ~{aiResult.estimatedVolunteers} volunteers</p>
                  {aiResult.aiSummary && <p className="text-purple-600 mt-1 italic">"{aiResult.aiSummary}"</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <select value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-3 outline-none text-gray-900">
                  {['low', 'medium', 'high', 'critical'].map(u => (
                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
                <input type="number" min={1} value={form.volunteersNeeded}
                  onChange={e => setForm(p => ({ ...p, volunteersNeeded: parseInt(e.target.value) || 1 }))}
                  className="border border-gray-300 rounded-lg px-3 py-3 outline-none text-gray-900"
                  placeholder="Volunteers needed" />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(p => ({ ...p, skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s] }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${form.skills.includes(s) ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-60">
                {submitting ? 'Posting...' : 'Post Need →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI SITUATION REPORT MODAL */}
      {showReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">AI Situation Report</h2>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Powered by Gemini</span>
              </div>
              <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {generatingReport ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader className="w-10 h-10 animate-spin text-purple-500 mb-4" />
                  <p className="text-gray-500 font-medium">Gemini AI analyzing all crisis data...</p>
                  <p className="text-gray-400 text-sm mt-1">Generating government-ready situation report</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none
                  prose-headings:text-blue-900 prose-headings:font-bold
                  prose-strong:text-gray-900
                  prose-td:border prose-td:px-3 prose-td:py-2
                  prose-th:border prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50
                  text-sm text-gray-700 leading-relaxed">
                  <ReactMarkdown>{reportContent}</ReactMarkdown>
                </div>
              )}
            </div>
            {!generatingReport && reportContent && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button onClick={() => {
                  const blob = new Blob([reportContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `SevaSphere_SITREP_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.txt`;
                  a.click();
                }} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm">
                  <FileText className="w-4 h-4" /> Download Report
                </button>
                <button onClick={() => setShowReport(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}