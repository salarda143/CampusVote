import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return respond({ error: "Server configuration is incomplete." }, 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return respond({ error: "Authentication required." }, 401);
    }

    const accessToken = authorization.slice("Bearer ".length);

    // Verify the caller's JWT with Supabase Auth.
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } =
      await authClient.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return respond({ error: "Invalid or expired session." }, 401);
    }

    // Use service role only after authenticating the caller.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (
      roleError ||
      !roleData ||
      !["admin", "super_admin"].includes(roleData.role)
    ) {
      return respond({ error: "You are not authorized to view election results." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const electionId = body?.election_id;

    if (
      typeof electionId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        electionId
      )
    ) {
      return respond({ error: "A valid election_id is required." }, 400);
    }

    const { data: election, error: electionError } = await adminClient
      .from("elections")
      .select("id, title, school_year, status, start_date, end_date")
      .eq("id", electionId)
      .maybeSingle();

    if (electionError) throw electionError;
    if (!election) return respond({ error: "Election not found." }, 404);

    if (!["active", "closed"].includes(election.status)) {
      return respond({
        error: "Results are available only while an election is active or after it is closed.",
      }, 403);
    }

    const [
      positionsResult,
      candidatesResult,
      selectionsResult,
      eligibleResult,
      participationResult,
    ] = await Promise.all([
      adminClient
        .from("positions")
        .select("id, position_name, max_votes, display_order")
        .eq("election_id", electionId)
        .order("display_order", { ascending: true }),

      adminClient
        .from("candidates")
        .select(
          "id, position_id, first_name, last_name, party_name, photo_url, grade_level, section"
        )
        .eq("election_id", electionId)
        .order("last_name", { ascending: true }),

      adminClient
        .from("ballot_selections")
        .select("position_id, candidate_id")
        .eq("election_id", electionId),

      adminClient
        .from("voter_eligibility")
        .select("id", { count: "exact", head: true })
        .eq("election_id", electionId),

      adminClient
        .from("voting_participation")
        .select("student_id", { count: "exact", head: true })
        .eq("election_id", electionId),
    ]);

    for (const result of [
      positionsResult,
      candidatesResult,
      selectionsResult,
      eligibleResult,
      participationResult,
    ]) {
      if (result.error) throw result.error;
    }

    const positions = positionsResult.data ?? [];
    const candidates = candidatesResult.data ?? [];
    const selections = selectionsResult.data ?? [];

    const resultsByPosition = positions.map((position) => {
      const positionCandidates = candidates.filter(
        (candidate) => candidate.position_id === position.id
      );

      const voteCounts = new Map<string, number>();
      for (const candidate of positionCandidates) {
        voteCounts.set(candidate.id, 0);
      }

      for (const selection of selections) {
        if (selection.position_id === position.id) {
          voteCounts.set(
            selection.candidate_id,
            (voteCounts.get(selection.candidate_id) ?? 0) + 1
          );
        }
      }

      const totalPositionVotes = positionCandidates.reduce(
        (sum, candidate) => sum + (voteCounts.get(candidate.id) ?? 0),
        0
      );

      const candidateResults = positionCandidates
        .map((candidate) => {
          const votes = voteCounts.get(candidate.id) ?? 0;
          return {
            ...candidate,
            votes,
            percentage:
              totalPositionVotes > 0
                ? Number(((votes / totalPositionVotes) * 100).toFixed(1))
                : 0,
          };
        })
        .sort(
          (a, b) =>
            b.votes - a.votes ||
            a.last_name.localeCompare(b.last_name)
        );

      const highestVotes = candidateResults[0]?.votes ?? 0;
      const leaders =
        highestVotes > 0
          ? candidateResults.filter(
              (candidate) => candidate.votes === highestVotes
            )
          : [];

      return {
        id: position.id,
        position_name: position.position_name,
        max_votes: position.max_votes,
        total_votes: totalPositionVotes,
        tied: leaders.length > 1,
        winner: leaders.length === 1 ? leaders[0] : null,
        leaders,
        candidates: candidateResults,
      };
    });

    const eligibleVoters = eligibleResult.count ?? 0;
    const ballotsSubmitted = participationResult.count ?? 0;

    return respond({
      election,
      summary: {
        eligible_voters: eligibleVoters,
        ballots_submitted: ballotsSubmitted,
        turnout_percentage:
          eligibleVoters > 0
            ? Number(((ballotsSubmitted / eligibleVoters) * 100).toFixed(1))
            : 0,
      },
      positions: resultsByPosition,
    });
  } catch (error) {
    console.error("admin-election-results error:", error);
    return respond(
      { error: error instanceof Error ? error.message : "Unable to load results." },
      500
    );
  }
});
