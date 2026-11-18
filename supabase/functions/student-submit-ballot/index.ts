import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  try {
    const { lrn, election_id, selections } = await req.json();
    const cleanedLRN = String(lrn || "").trim();

    if (!/^\d{12}$/.test(cleanedLRN) || !election_id || !Array.isArray(selections)) {
      return respond({ error: "Invalid ballot submission request." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, is_active")
      .eq("lrn", cleanedLRN)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student || !student.is_active) {
      return respond({ error: "Student record not found or inactive." }, 403);
    }

    const { data, error } = await supabase.rpc("submit_student_ballot", {
      p_student_id: student.id,
      p_election_id: election_id,
      p_selections: selections,
    });

    if (error) {
      console.error("Ballot submission RPC error:", error);
      const message = error.message || "Unable to submit ballot.";
      const status = /already voted/i.test(message) ? 409 :
        /not eligible|not active|invalid|candidate|position|selection/i.test(message) ? 400 : 500;
      return respond({ error: message }, status);
    }

    return respond({ receipt_code: data?.receipt_code || data });
  } catch (error) {
    console.error("Student ballot submission error:", error);
    return respond({ error: "Unable to process ballot submission." }, 500);
  }
});
