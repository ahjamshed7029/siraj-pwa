import { createClient } from '@supabase/supabase-js';

// Возьми эти данные из настроек своего проекта Supabase (Project Settings -> API)
const SUPABASE_URL = "https://djvxsbjmzojltixzcycn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqdnhzYmptem9qbHRpeHpjeWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDM0MjIsImV4cCI6MjA5ODQ3OTQyMn0.ZR3CNUjUOHwsY9kJFs0J9EQmKwUMiYzCIMCPFD4srWQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);