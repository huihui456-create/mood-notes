import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Record from './pages/Record.jsx';
import Timeline from './pages/Timeline.jsx';
import Stats from './pages/Stats.jsx';
import Review from './pages/Review.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="record" element={<Record />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="stats" element={<Stats />} />
        <Route path="review" element={<Review />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}