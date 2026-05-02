"use client";

import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="action-shell">
      <div className="welcome-copy">
        <p className="eyebrow">Personal finance dashboard</p>
        <h1 className="hero-title">Finansialin</h1>
        <p className="hero-subtitle">Bangun kebiasaan finansial yang lebih rapi, modern, dan mudah dipakai.</p>
      </div>

      <div className="action-row">
        <Link href="/login" className="ghost-button" style={{ color: '#d4a017', borderColor: '#d4a017', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          Login
        </Link>
        <Link href="/register" className="solid-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          Register
        </Link>
      </div>
    </div>
  );
}
