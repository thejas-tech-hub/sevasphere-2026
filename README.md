# 🛡️ SevaSphere — AI-Powered Crisis Prediction & Volunteer Coordination

> **Solution Challenge 2026 India** | Track: Smart Resource Allocation

[![Live Demo](https://img.shields.io/badge/Live%20Demo-sevasphere--2026.web.app-orange)](https://sevasphere-2026.web.app)
[![Firebase](https://img.shields.io/badge/Firebase-Deployed-yellow)](https://sevasphere-2026.web.app)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini%20AI-blue)](https://ai.google.dev)

## 🌟 Problem Statement

Every year, 50+ million Indians are affected by natural disasters. NGOs lose **72 critical hours** coordinating volunteers. Field data from paper surveys is never digitized. No platform predicts where help will be needed before crisis peaks.

## 🚀 The 3-Layer Intelligence Solution

**Layer 1 — PREDICT:** Gemini AI analyzes active GDACS crisis patterns and forecasts where volunteers will be needed 24-48 hours ahead with probability scores.

**Layer 2 — DIGITIZE:** NGOs photograph handwritten field reports and paper surveys. Gemini Vision reads the handwriting and converts it into structured Firestore data instantly.

**Layer 3 — DEPLOY:** A hybrid matching engine pre-filters volunteers by skill overlap using JavaScript, then Gemini AI ranks the top candidates by location, urgency, and experience.

## ✨ Core Features

| Feature | Description |
|---|---|
| 🔮 **Predictive Crisis Intelligence** | Gemini forecasts crisis zones 24-48hr ahead with probability scores and recommended preparedness actions |
| 📄 **Multimodal Field Reports** | Upload photo of handwritten survey — Gemini Vision reads handwriting, auto-fills the form |
| 🤖 **Hybrid AI Matching** | Two-stage pipeline: JS pre-filters by skill overlap, Gemini ranks top candidates contextually |
| 🌍 **Live Crisis Detection** | Real UN/GDACS disaster data + Gemini AI generates risk scores per crisis |
| 🗺️ **Crisis Intelligence Map** | Google Maps with crisis pins, pulse zones, click-to-detail popups |
| 📋 **AI Situation Report** | One-click government-ready SITREP downloadable for NDMA |
| 📊 **Volunteer Impact Tracker** | AI impact scoring with Disaster Warrior, Crisis Champion badges |

## 🏗️ Architecture

GDACS Live Feed + NGO Handwritten Reports
                   ↓

     Gemini AI Intelligence Engine
 ┌───────────────────────────────────┐
 │ Predict │ Digitize │ Match+Rank   │
 └───────────────────────────────────┘

                   ↓

     Firebase Firestore (Real-time)
     
                   ↓

 ┌───────────────────────────────────┐
 │ NGO Dashboard │ Crisis Map        │
 │ + Predictions │ Volunteer DB      │
 └───────────────────────────────────┘

                   ↓

      Firebase Hosting (Google Cloud)

## 🛠️ Tech Stack

- **Frontend:** React.js, TailwindCSS, Recharts, React Markdown
- **AI Engine:** Google Gemini Flash — predictive forecasting, Vision OCR, hybrid ranking, SITREP, impact scoring
- **Matching:** Hybrid pipeline — JavaScript pre-filter + async Gemini ranking with graceful fallback
- **Data:** GDACS (UN Global Disaster Alert System) — multi-proxy live feed
- **Backend:** Firebase Firestore, Firebase Auth, Firebase Hosting (Google Cloud)
- **Maps:** Google Maps JavaScript API

## 🚀 Live Demo

🌐 **[https://sevasphere-2026.web.app](https://sevasphere-2026.web.app)**

### Test Accounts
| Role | Email | Password |
|---|---|---|
| NGO | demo-ngo@sevasphere.com | demo123 |
| Volunteer | demo-volunteer@sevasphere.com | demo123 |

## 📦 Local Setup

```bash
git clone https://github.com/thejas-tech-hub/sevasphere-2026.git
cd sevasphere-2026
npm install
```

Create `.env`:

REACT_APP_GEMINI_API_KEY=your_gemini_key
REACT_APP_MAPS_API_KEY=your_maps_key
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_AUTH_DOMAIN=sevasphere-2026.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=sevasphere-2026
REACT_APP_FIREBASE_STORAGE_BUCKET=sevasphere-2026.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_ID=your_messaging_id
REACT_APP_FIREBASE_APP_ID=your_app_id

```bash
npm start
```

## 🗺️ Phase 2 Roadmap

**Security & Backend**
- Firebase Cloud Functions — secure GDACS proxy, zero CORS dependency
- Google Secret Manager — API keys never client-side exposed
- Firestore row-level security per organization

**AI & Scalability**
- RAG Pipeline — Google text embeddings + Firestore vector search for scalable matching
- Predictive ML model on 10 years of NDMA disaster data
- Gemini Vision for satellite imagery flood extent mapping

**Product Expansion**
- Flutter mobile app with offline field data collection
- Multi-language: Hindi, Telugu, Tamil, Bengali, Kannada
- NDMA and IMD official API integration
- WhatsApp/SMS volunteer alerts via Firebase Cloud Messaging

## 🎯 UN SDG Alignment

- **SDG 11** — Sustainable Cities and Communities
- **SDG 13** — Climate Action
- **SDG 17** — Partnerships for the Goals

---
*Built for Solution Challenge 2026 India | Powered by Google Technologies*
