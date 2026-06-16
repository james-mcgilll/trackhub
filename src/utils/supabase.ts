import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://irnzqmqxvqkxdnkyhfcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybnpxbXF4dnFreGRua3loZmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA2OTAsImV4cCI6MjA5NzIwNjY5MH0.QnAgnUnoeGsP7dBdh3uOrxJdmhQGQJOZa-xknjz6UtA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
