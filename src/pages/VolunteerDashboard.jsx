import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { MapPin, Users, CheckCircle, Heart, Loader, Zap, Star, Award, TrendingUp } from 'lucide-react';
import { generateVolunteerImpact } from '../utils/gemini';

const URGENCY = {
  critical:'bg-red-100 text-red-700 border-red-200',
  high:'bg-orange-100 text-orange-700 border-orange-200',
  medium:'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:'bg-green-100 text-green-700 border-green-200'
};

const BADGE_CONFIG = {
  'First Responder':  { color:'bg-blue-100 text-blue-700',   icon:'🚑' },
  'Community Hero':   { color:'bg-green-100 text-green-700', icon:'🌟' },
  'Crisis Champion':  { color:'bg-purple-100 text-purple-700',icon:'🏆' },
  'Disaster Warrior': { color:'bg-red-100 text-red-700',     icon:'⚔️' },
  'Relief Expert':    { color:'bg-orange-100 text-orange-700',icon:'🎯' },
};

export default function VolunteerDashboard() {
  const { currentUser, userProfile } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [applications, setApplications] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [applying, setApplying] = useState(null);
  const [tab, setTab] = useState('opportunities');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const nSnap = await getDocs(query(collection(db,'needs'), orderBy('createdAt','desc')));
      setNeeds(nSnap.docs.map(d => ({id:d.id,...d.data()})));
      const aSnap = await getDocs(query(collection(db,'applications'), where('volunteerId','==',currentUser.uid)));
      const apps = aSnap.docs.map(d => d.data());
      setApplications(apps);
      setAppliedIds(apps.map(a => a.needId));
      if (apps.length > 0) loadImpact(apps);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function loadImpact(apps) {
    setLoadingImpact(true);
    const result = await generateVolunteerImpact(apps, userProfile);
    setImpact(result);
    setLoadingImpact(false);
  }

  function skillMatch(need) {
    const mine = userProfile?.skills || [];
    const req = need.skills || [];
    if (!req.length) return 0;
    return Math.round((req.filter(s => mine.includes(s)).length / req.length) * 100);
  }

  async function handleApply(need) {
    setApplying(need.id);
    try {
      await addDoc(collection(db,'applications'), {
        needId: need.id, needTitle: need.title,
        volunteerId: currentUser.uid, volunteerName: userProfile?.name,
        volunteerSkills: userProfile?.skills, location: userProfile?.location,
        status: 'pending', appliedAt: new Date().toISOString()
      });
      await updateDoc(doc(db,'needs',need.id), { volunteersApplied: increment(1) });
      const newApps = [...applications, { needId: need.id, needTitle: need.title }];
      setApplications(newApps);
      setAppliedIds(p => [...p, need.id]);
      loadImpact(newApps);
    } catch(e) { console.error(e); }
    setApplying(null);
  }

  const ranked = needs
    .filter(n => !appliedIds.includes(n.id))
    .map(n => ({...n, matchScore: skillMatch(n)}))
    .sort((a,b) => b.matchScore - a.matchScore);

  const badge = impact?.badge ? BADGE_CONFIG[impact.badge] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Profile + Impact Hero */}
        <div className="bg-blue-900 text-white rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome, {userProfile?.name} 🙋</h1>
              <p className="text-blue-300 text-sm mb-3">AI-matched opportunities based on your skills</p>
              <div className="flex items-center gap-1 text-blue-300 text-sm mb-3">
                <MapPin className="w-4 h-4"/>{userProfile?.location}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {userProfile?.skills?.map(s => (
                  <span key={s} className="text-xs bg-blue-800 text-blue-200 px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>

            {/* Impact Score */}
            <div className="flex gap-4 flex-wrap">
              <div className="bg-blue-800/60 rounded-xl p-4 text-center min-w-[90px]">
                <div className="text-3xl font-extrabold text-orange-400">{appliedIds.length}</div>
                <div className="text-xs text-blue-300 mt-1">Applied</div>
              </div>
              {loadingImpact ? (
                <div className="bg-blue-800/60 rounded-xl p-4 flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin text-blue-300"/>
                  <span className="text-xs text-blue-300">AI scoring...</span>
                </div>
              ) : impact ? (
                <>
                  <div className="bg-blue-800/60 rounded-xl p-4 text-center min-w-[90px]">
                    <div className="text-3xl font-extrabold text-green-400">{impact.impactScore}</div>
                    <div className="text-xs text-blue-300 mt-1">Impact Score</div>
                  </div>
                  <div className="bg-blue-800/60 rounded-xl p-4 text-center min-w-[90px]">
                    <div className="text-3xl font-extrabold text-yellow-400">{impact.livesImpacted?.toLocaleString()}</div>
                    <div className="text-xs text-blue-300 mt-1">Lives Touched</div>
                  </div>
                  <div className="bg-blue-800/60 rounded-xl p-4 text-center min-w-[90px]">
                    <div className="text-3xl font-extrabold text-purple-400">{impact.hoursEstimate}</div>
                    <div className="text-xs text-blue-300 mt-1">Hours Est.</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Badge + AI Message */}
          {impact && (
            <div className="mt-4 pt-4 border-t border-blue-800 flex items-center gap-3 flex-wrap">
              {badge && (
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${badge.color}`}>
                  {badge.icon} {impact.badge}
                </span>
              )}
              {impact.topSkill && (
                <span className="flex items-center gap-1 text-xs bg-blue-800 text-blue-200 px-3 py-1.5 rounded-full">
                  <Star className="w-3 h-3 text-yellow-400"/> Top Skill: {impact.topSkill}
                </span>
              )}
              {impact.message && (
                <p className="text-blue-200 text-sm italic ml-1">"{impact.message}"</p>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 rounded-xl p-1 w-fit">
          {[
            {id:'opportunities', label:'🎯 Opportunities'},
            {id:'applied', label:'✅ My Applications'},
            {id:'impact', label:'📊 My Impact'},
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab===t.id?'bg-white shadow text-blue-900':'text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-7 h-7 animate-spin text-blue-600"/>
            <span className="ml-2 text-gray-500">Finding opportunities for you...</span>
          </div>
        ) : tab === 'opportunities' ? (
          <div className="space-y-4">
            {ranked.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                <p>No new opportunities right now. Check back soon!</p>
              </div>
            ) : ranked.map(n => (
              <div key={n.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-gray-900">{n.title}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${URGENCY[n.urgency]}`}>{n.urgency}</span>
                      {n.matchScore > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${n.matchScore>=70?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>
                          {n.matchScore}% match
                        </span>
                      )}
                      {n.aiPriority && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">🤖 Priority {n.aiPriority}/10</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{n.location}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{n.volunteersApplied||0}/{n.volunteersNeeded}</span>
                    </div>
                    {n.aiSummary && (
                      <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mb-2">🤖 {n.aiSummary}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-3">{n.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {n.skills?.map(s => (
                        <span key={s} className={`text-xs px-2 py-1 rounded-full ${userProfile?.skills?.includes(s)?'bg-green-100 text-green-700 font-medium':'bg-gray-100 text-gray-500'}`}>
                          {userProfile?.skills?.includes(s)?'✓ ':''}{s}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Posted by {n.ngoName}</p>
                  </div>
                  <button onClick={() => handleApply(n)} disabled={applying===n.id}
                    className="ml-4 flex-shrink-0 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60">
                    {applying===n.id ? <Loader className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'applied' ? (
          <div className="space-y-4">
            {appliedIds.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                <p>No applications yet. Start helping!</p>
              </div>
            ) : needs.filter(n => appliedIds.includes(n.id)).map(n => (
              <div key={n.id} className="bg-white rounded-xl shadow-sm border border-green-100 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-500"/>
                  <h3 className="font-bold text-gray-900">{n.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                  <MapPin className="w-3 h-3"/>{n.location}
                </div>
                <p className="text-xs text-green-600 font-medium mt-2">✅ Application submitted · Pending NGO review</p>
              </div>
            ))}
          </div>
        ) : (
          /* Impact Tab */
          <div className="space-y-5">
            {appliedIds.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                <p>Apply to opportunities to see your impact grow!</p>
              </div>
            ) : loadingImpact ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="w-8 h-8 animate-spin text-purple-500"/>
                <span className="ml-3 text-gray-500">Gemini AI calculating your impact...</span>
              </div>
            ) : impact ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon:<Award className="w-6 h-6 text-orange-500"/>, value:impact.impactScore, label:'Impact Score', color:'text-orange-500', bg:'bg-orange-50' },
                    { icon:<Heart className="w-6 h-6 text-red-500"/>, value:impact.livesImpacted?.toLocaleString(), label:'Lives Touched', color:'text-red-500', bg:'bg-red-50' },
                    { icon:<Zap className="w-6 h-6 text-yellow-500"/>, value:`${impact.hoursEstimate}h`, label:'Hours Volunteered', color:'text-yellow-600', bg:'bg-yellow-50' },
                    { icon:<Star className="w-6 h-6 text-purple-500"/>, value:appliedIds.length, label:'Missions Joined', color:'text-purple-500', bg:'bg-purple-50' },
                  ].map((s,i) => (
                    <div key={i} className={`${s.bg} rounded-xl p-5 flex items-center gap-3`}>
                      {s.icon}
                      <div>
                        <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {badge && (
                      <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${badge.color}`}>
                        {badge.icon} {impact.badge}
                      </span>
                    )}
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">Impact Score Progress</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                          style={{width:`${impact.impactScore}%`}}/>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-orange-500">{impact.impactScore}/100</span>
                  </div>
                  {impact.message && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                      <p className="text-blue-700 text-sm italic">🤖 "{impact.message}"</p>
                    </div>
                  )}
                  {impact.topSkill && (
                    <div className="mt-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500"/>
                      <span className="text-sm text-gray-600">Your strongest skill: <strong>{impact.topSkill}</strong></span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Fallback when Gemini unavailable */
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon:<Award className="w-6 h-6 text-orange-500"/>, value: Math.min(appliedIds.length * 15, 100), label:'Impact Score', color:'text-orange-500', bg:'bg-orange-50' },
                    { icon:<Heart className="w-6 h-6 text-red-500"/>, value:(appliedIds.length * 247).toLocaleString(), label:'Lives Touched', color:'text-red-500', bg:'bg-red-50' },
                    { icon:<Zap className="w-6 h-6 text-yellow-500"/>, value:`${appliedIds.length * 8}h`, label:'Hours Volunteered', color:'text-yellow-600', bg:'bg-yellow-50' },
                    { icon:<Star className="w-6 h-6 text-purple-500"/>, value:appliedIds.length, label:'Missions Joined', color:'text-purple-500', bg:'bg-purple-50' },
                  ].map((s,i) => (
                    <div key={i} className={`${s.bg} rounded-xl p-5 flex items-center gap-3`}>
                      {s.icon}
                      <div>
                        <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                      🚑 First Responder
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">Impact Score Progress</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                          style={{width:`${Math.min(appliedIds.length * 15, 100)}%`}}/>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-orange-500">{Math.min(appliedIds.length * 15, 100)}/100</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                    <p className="text-blue-700 text-sm italic">
                      🌟 You've joined {appliedIds.length} relief {appliedIds.length === 1 ? 'mission' : 'missions'}, contributing to disaster response across India. Every action counts.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500"/>
                    <span className="text-sm text-gray-600">Skills: <strong>{userProfile?.skills?.slice(0,2).join(', ')}</strong></span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}