import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Users, MapPin } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-orange-400" />
          <span className="text-2xl font-bold">Seva<span className="text-orange-400">Sphere</span></span>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="px-5 py-2 text-sm font-medium hover:text-orange-300 transition">Login</Link>
          <Link to="/register" className="px-5 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 rounded-lg transition">Get Started</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-4 h-4 text-orange-400" />
          <span className="text-sm text-orange-300 font-medium">Gemini AI · Predictive Crisis Response</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          Mobilize Help<br /><span className="text-orange-400">Before Disaster Strikes</span>
        </h1>
        <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto">
          SevaSphere uses Gemini AI to detect emerging crises across India and pre-mobilize verified volunteers — connecting NGOs, communities, and responders in real-time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link to="/register" className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg transition transform hover:scale-105">
            Join as Volunteer →
          </Link>
          <Link to="/register" className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 font-bold rounded-xl text-lg transition">
            Register NGO
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-20">
          {[["2,400+","Active Volunteers"],["180+","NGO Partners"],["48 hrs","Avg Response Time"]].map(([v,l],i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-extrabold text-orange-400">{v}</div>
              <div className="text-blue-300 text-sm mt-1">{l}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Zap className="w-6 h-6" />, title: "AI Crisis Detection", desc: "Gemini AI monitors weather alerts, news feeds, and patterns to detect crises before they peak — hours ahead of traditional systems." },
            { icon: <Users className="w-6 h-6" />, title: "Smart Volunteer Matching", desc: "AI matches volunteers to needs based on skills, proximity, and availability. The right person at the right place, every time." },
            { icon: <MapPin className="w-6 h-6" />, title: "Live Risk Intelligence", desc: "Real-time risk scores across Indian states, volunteer deployment tracking, and impact measurement — all in one dashboard." }
          ].map((f, i) => (
            <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10 text-left">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-blue-200 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}