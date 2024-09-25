import React from 'react';
import Home from './components/Home';
import { Analytics } from "@vercel/analytics/react"

function App() {
  return (
    <div>
      <Home />
      <Analytics />
    </div>
  );
}

export default App;