<?php
// auth-service/app/Http/Controllers/Api/ChatLogController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatLogController extends Controller
{
    // ── POST /api/internal/chat-logs — depuis agent-orchestrator ─────────
    public function store(Request $request)
    {
        try {
            $log = ChatLog::create([
                'user_id'           => $request->user_id,
                'session_id'        => $request->session_id,
                'ip_address'        => $request->ip_address,
                'user_message'      => $request->user_message,
                'bot_response'      => $request->bot_response,
                'intent'            => $request->intent,
                'extracted_params'  => $request->extracted_params,
                'page_context'      => $request->page_context,
                'response_time_ms'  => $request->response_time_ms,
                'agents_called'     => $request->agents_called ?? 0,
                'used_cache'        => $request->used_cache ?? false,
                'vehicules_returned' => $request->vehicules_returned ?? 0,
                'services_returned' => $request->services_returned ?? 0,
            ]);
            return response()->json([
                'success' => true,
                'id'      => $log->id,  // ← retourner l'ID
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'id' => null], 200);
        }
    }

    // ── GET /api/admin/chat-analytics — admin seulement ──────────────────
    public function analytics(Request $request)
    {
        $days = (int) $request->query('days', 7);

        // Intents les plus fréquents
        $topIntents = ChatLog::select('intent', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($days))
            ->whereNotNull('intent')
            ->groupBy('intent')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Messages par jour
        $messagesPerDay = ChatLog::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('count(*) as count'),
            DB::raw('avg(response_time_ms) as avg_response_ms')
        )
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Pages les plus actives
        $topPages = ChatLog::select('page_context', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('page_context')
            ->orderByDesc('count')
            ->get();

        // Sessions uniques
        $uniqueSessions = ChatLog::where('created_at', '>=', now()->subDays($days))
            ->distinct('session_id')
            ->count('session_id');

        // Taux de cache
        $cacheStats = ChatLog::where('created_at', '>=', now()->subDays($days))
            ->select(
                DB::raw('count(*) as total'),
                DB::raw('sum(used_cache) as cached'),
                DB::raw('avg(response_time_ms) as avg_ms')
            )
            ->first();

        return response()->json([
            'period_days'     => $days,
            'unique_sessions' => $uniqueSessions,
            'total_messages'  => $cacheStats?->total ?? 0,
            'cache_rate'      => $cacheStats?->total > 0
                ? round($cacheStats->cached / $cacheStats->total * 100, 1)
                : 0,
            'avg_response_ms' => round($cacheStats?->avg_ms ?? 0),
            'top_intents'     => $topIntents,
            'messages_per_day' => $messagesPerDay,
            'top_pages'       => $topPages,
        ]);
    }

    // ── PATCH /api/chat-logs/{id}/feedback ───────────────────────────────
    public function feedback(Request $request, int $id)
    {
        $request->validate([
            'rating'      => 'nullable|integer|min:1|max:5',
            'was_helpful' => 'nullable|boolean',
        ]);

        ChatLog::where('id', $id)->update([
            'rating'      => $request->rating,
            'was_helpful' => $request->was_helpful,
        ]);

        return response()->json(['success' => true]);
    }
}
