
const { createClient } = require('@supabase/supabase-js');


const SUPABASE_URL = 'https://fnjzuwzduhflejiwagiw.supabase.co';
const SUPABASE_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuanp1d3pkdWhmbGVqaXdhZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE5MTc5NDIsImV4cCI6MjAzNzQ5Mzk0Mn0.XmcAbW9QUwQFROhiTTkjU6sZ3QWRCL6dvPtFO4gTdHg';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

module.exports = {supabase}
