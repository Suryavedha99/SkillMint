import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { BrowserRouter } from 'react-router-dom';

// ✅ Correct env variable keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey);
console.log("ENV:", import.meta.env);

const supabase = createClient(supabaseUrl, supabaseKey);

createRoot(document.getElementById("root")!).render(
  <SessionContextProvider supabaseClient={supabase}>
    <BrowserRouter> {/* ✅ This is your one and only Router */}
      <App />
    </BrowserRouter>
  </SessionContextProvider>
);
