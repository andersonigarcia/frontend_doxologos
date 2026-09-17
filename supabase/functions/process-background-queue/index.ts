// Supabase Edge Function (Deno) - process-background-queue
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

Deno.serve(async (req: Request) => {
  // This is typically called by pg_cron or Supabase scheduling (pg_net)
  // We secure it by requiring the SERVICE_ROLE_KEY in the auth header
  
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SERVICE_ROLE = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${SERVICE_ROLE}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // 1. Fetch pending tasks that are ready for retry
    const { data: tasks, error: fetchErr } = await supabase
      .from('background_tasks_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .limit(10); // Process in batches of 10

    if (fetchErr) throw fetchErr;

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No tasks to process' }), { status: 200 });
    }

    const results = [];

    // 2. Process each task
    for (const task of tasks) {
      console.log(`Processing task ${task.id} (Type: ${task.task_type})`);
      
      // Mark as processing
      await supabase.from('background_tasks_queue').update({ status: 'processing' }).eq('id', task.id);

      let success = false;
      let errorMsg = '';

      if (task.task_type === 'email') {
        try {
          const { error: invokeErr } = await supabase.functions.invoke('send-email', {
            body: task.payload
          });
          
          if (invokeErr) {
            errorMsg = invokeErr.message || JSON.stringify(invokeErr);
          } else {
            success = true;
          }
        } catch (e: any) {
          errorMsg = e.message;
        }
      } else {
        errorMsg = 'Unknown task type';
      }

      // 3. Update task status based on result
      if (success) {
        await supabase.from('background_tasks_queue').update({
          status: 'completed',
          updated_at: new Date().toISOString()
        }).eq('id', task.id);
        
        results.push({ id: task.id, status: 'completed' });
      } else {
        const newAttempts = task.attempts + 1;
        const willRetry = newAttempts < task.max_attempts;
        
        await supabase.from('background_tasks_queue').update({
          status: willRetry ? 'pending' : 'failed',
          attempts: newAttempts,
          last_error: errorMsg,
          // Exponential backoff for next retry: (2 ^ attempts) * 5 minutes
          next_retry_at: willRetry 
            ? new Date(Date.now() + Math.pow(2, task.attempts) * 5 * 60 * 1000).toISOString()
            : task.next_retry_at,
          updated_at: new Date().toISOString()
        }).eq('id', task.id);
        
        results.push({ id: task.id, status: willRetry ? 'pending_retry' : 'failed', error: errorMsg });
      }
    }

    return new Response(JSON.stringify({ processed: tasks.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Queue processing error:', err);
    return new Response(JSON.stringify({ error: 'Internal Error', details: err.message }), { status: 500 });
  }
});
