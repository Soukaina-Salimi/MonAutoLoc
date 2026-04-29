<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Document;
use App\Models\Subscription;
use App\Models\ServiceRequest;
use App\Models\ChatLog;
use App\Models\MarketingCampaign;
use App\Models\ServiceCustomization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class AdminController extends Controller
{
    // ── GET /api/admin/stats ───────────────────────────────────────────────
    public function stats()
    {
        // Véhicules depuis vehicle-service
        $vehiculesCount = 0;
        $bookingsCount  = 0;
        try {
            $vRes = Http::timeout(5)->get(
                env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . '/api/vehicules'
            );
            $vehiculesCount = $vRes->successful() ? count($vRes->json()) : 0;

            $bRes = Http::timeout(5)->get(
                env('BOOKING_SERVICE_URL', 'http://booking-service') . '/api/admin/bookings-count'
            );
            $bookingsCount = $bRes->successful() ? $bRes->json()['count'] : 0;
        } catch (\Exception $e) {
        }

        return response()->json([
            // Utilisateurs
            'total_users'          => User::count(),
            'total_owners'         => User::whereHas('role', fn($q) => $q->where('name', 'owner'))->count(),
            'total_clients'        => User::whereHas('role', fn($q) => $q->where('name', 'client'))->count(),
            'new_users_this_month' => User::whereMonth('created_at', now()->month)->count(),

            // Véhicules & Réservations
            'total_vehicules'      => $vehiculesCount,
            'total_bookings'       => $bookingsCount,

            // Documents
            'pending_documents'    => Document::where('status', 'pending')->count(),
            'verified_documents'   => Document::where('status', 'verified')->count(),

            // Abonnements
            'active_subscriptions' => Subscription::where('status', 'active')->count(),
            'pending_subscriptions' => Subscription::where('status', 'pending')->count(),

            // Services
            'pending_requests'     => ServiceRequest::where('status', 'pending')->count(),
            'pending_customizations' => ServiceCustomization::where('status', 'pending')->count(),

            // Chatbot
            'total_chat_messages'  => ChatLog::whereDate('created_at', today())->count(),
            'chat_cache_rate'      => $this->getChatCacheRate(),

            // Marketing
            'total_campaigns'      => MarketingCampaign::where('status', 'published')->count(),
        ]);
    }

    private function getChatCacheRate(): float
    {
        $stats = ChatLog::where('created_at', '>=', now()->subDays(7))
            ->select(DB::raw('count(*) as total'), DB::raw('sum(used_cache) as cached'))
            ->first();
        if (!$stats || !$stats->total) return 0;
        return round($stats->cached / $stats->total * 100, 1);
    }

    // ── GET /api/admin/users ───────────────────────────────────────────────
    public function users(Request $request)
    {
        $query = User::with(['role', 'ownerServices', 'documents'])
            ->orderByDesc('created_at');

        if ($request->role) {
            $query->whereHas('role', fn($q) => $q->where('name', $request->role));
        }
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name',  'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        $users = $query->paginate(20);

        return response()->json([
            'data' => $users->map(fn($u) => [
                'id'               => $u->id,
                'name'             => $u->name,
                'email'            => $u->email,
                'phone'            => $u->phone,
                'city'             => $u->city,
                'role'             => $u->role->name,
                'is_agency'        => $u->is_agency,
                'agency_name'      => $u->agency_name,
                'avatar'           => $u->avatar ? asset('storage/' . $u->avatar) : null,
                'profile_completed' => $u->profile_completed,
                'created_at'       => $u->created_at->format('d/m/Y'),
                'docs_count'       => $u->documents->count(),
                'docs_verified'    => $u->documents->where('status', 'verified')->count(),
                'services'         => $u->ownerServices
                    ->where('is_active', true)
                    ->pluck('service_type'),
            ]),
            'total'       => $users->total(),
            'current_page' => $users->currentPage(),
            'last_page'   => $users->lastPage(),
        ]);
    }

    // ── PATCH /api/admin/users/{id}/toggle ────────────────────────────────
    public function toggleUser(int $id)
    {
        $user = User::findOrFail($id);
        // Utiliser profile_completed comme indicateur de compte actif
        // En production → ajouter un champ is_active
        $user->update(['profile_completed' => !$user->profile_completed]);
        return response()->json(['success' => true]);
    }

    // ── GET /api/admin/documents ───────────────────────────────────────────
    public function documents(Request $request)
    {
        $query = Document::with('user')
            ->orderByDesc('created_at');

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->type) {
            $query->where('type', $request->type);
        }

        $docs = $query->paginate(20);

        return response()->json([
            'data' => $docs->map(fn($d) => [
                'id'                 => $d->id,
                'type'               => $d->type,
                'status'             => $d->status,
                'extracted_data'     => $d->extracted_data,
                'cross_validated_at' => $d->cross_validated_at,
                'created_at'         => $d->created_at->format('d/m/Y H:i'),
                'user' => [
                    'id'    => $d->user->id,
                    'name'  => $d->user->name,
                    'email' => $d->user->email,
                ],
            ]),
            'total'       => $docs->total(),
            'current_page' => $docs->currentPage(),
            'last_page'   => $docs->lastPage(),
        ]);
    }

    // ── PATCH /api/admin/documents/{id}/verify ────────────────────────────
    public function verifyDocument(int $id)
    {
        $doc = Document::findOrFail($id);
        $doc->update(['status' => 'verified', 'verified_at' => now()]);
        return response()->json(['success' => true, 'status' => 'verified']);
    }

    // ── PATCH /api/admin/documents/{id}/reject ────────────────────────────
    public function rejectDocument(int $id)
    {
        $doc = Document::findOrFail($id);
        $doc->update(['status' => 'rejected']);
        return response()->json(['success' => true, 'status' => 'rejected']);
    }

    // ── GET /api/admin/subscriptions ──────────────────────────────────────
    public function subscriptions(Request $request)
    {
        $query = Subscription::with('owner')
            ->orderByDesc('created_at');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $subs = $query->paginate(20);

        return response()->json([
            'data' => $subs->map(fn($s) => [
                'id'             => $s->id,
                'plan'           => $s->plan,
                'status'         => $s->status,
                'payment_amount' => $s->payment_amount,
                'payment_proof'  => $s->payment_proof,
                'started_at'     => $s->started_at?->format('d/m/Y'),
                'expires_at'     => $s->expires_at?->format('d/m/Y'),
                'created_at'     => $s->created_at->format('d/m/Y'),
                'owner' => [
                    'id'    => $s->owner->id,
                    'name'  => $s->owner->agency_name ?? $s->owner->name,
                    'email' => $s->owner->email,
                    'phone' => $s->owner->phone,
                ],
            ]),
            'total'       => $subs->total(),
            'current_page' => $subs->currentPage(),
            'last_page'   => $subs->lastPage(),
        ]);
    }

    // ── PATCH /api/admin/subscriptions/{id}/activate ──────────────────────
    public function activateSubscription(int $id)
    {
        $sub = Subscription::findOrFail($id);
        $sub->update([
            'status'     => 'active',
            'started_at' => now(),
            'expires_at' => now()->addMonth(),
        ]);

        // Activer le module chatbot_indexing automatiquement
        $this->activateChatbotIndexing($sub->owner_id);

        return response()->json(['success' => true]);
    }

    // ── PATCH /api/admin/subscriptions/{id}/reject ────────────────────────
    public function rejectSubscription(int $id)
    {
        $sub = Subscription::findOrFail($id);
        $sub->update(['status' => 'cancelled']);
        return response()->json(['success' => true]);
    }

    private function activateChatbotIndexing(int $ownerId): void
    {
        $feature = \App\Models\AiFeature::where('feature_name', 'chatbot_indexing')->first();
        if (!$feature) return;
        \App\Models\OwnerAiFeature::updateOrCreate(
            ['owner_id' => $ownerId, 'feature_id' => $feature->id],
            ['active' => true, 'activated_at' => now()]
        );
    }

    // ── GET /api/admin/customizations ─────────────────────────────────────
    public function customizations(Request $request)
    {
        $query = ServiceCustomization::with('owner')
            ->orderByDesc('created_at');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $items = $query->paginate(20);

        return response()->json([
            'data' => $items->map(fn($c) => [
                'id'                 => $c->id,
                'service_type'       => $c->service_type,
                'customization_type' => $c->customization_type,
                'details'            => $c->details,
                'status'             => $c->status,
                'payment_required'   => $c->payment_required,
                'payment_amount'     => $c->payment_amount,
                'payment_status'     => $c->payment_status,
                'admin_notes'        => $c->admin_notes,
                'created_at'         => $c->created_at->format('d/m/Y'),
                'owner' => [
                    'id'    => $c->owner->id,
                    'name'  => $c->owner->agency_name ?? $c->owner->name,
                    'email' => $c->owner->email,
                ],
            ]),
            'total'       => $items->total(),
            'current_page' => $items->currentPage(),
            'last_page'   => $items->lastPage(),
        ]);
    }

    // ── PATCH /api/admin/customizations/{id} ──────────────────────────────
    public function updateCustomization(Request $request, int $id)
    {
        $request->validate([
            'status'      => 'required|in:approved,rejected',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $item = ServiceCustomization::findOrFail($id);
        $item->update([
            'status'      => $request->status,
            'admin_notes' => $request->admin_notes,
        ]);

        return response()->json(['success' => true]);
    }

    // ── GET /api/admin/chat-analytics ─────────────────────────────────────
    public function chatAnalytics(Request $request)
    {
        $days = (int) $request->query('days', 7);

        $topIntents = ChatLog::select('intent', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($days))
            ->whereNotNull('intent')
            ->groupBy('intent')
            ->orderByDesc('count')
            ->limit(8)
            ->get();

        $messagesPerDay = ChatLog::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('count(*) as count'),
            DB::raw('avg(response_time_ms) as avg_ms'),
            DB::raw('sum(used_cache) as cached')
        )
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        $topPages = ChatLog::select('page_context', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('page_context')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        $stats = ChatLog::where('created_at', '>=', now()->subDays($days))
            ->select(
                DB::raw('count(*) as total'),
                DB::raw('sum(used_cache) as cached'),
                DB::raw('avg(response_time_ms) as avg_ms'),
                DB::raw('avg(agents_called) as avg_agents'),
                DB::raw('count(DISTINCT session_id) as sessions')
            )
            ->first();

        $feedback = ChatLog::where('created_at', '>=', now()->subDays($days))
            ->whereNotNull('was_helpful')
            ->select(
                DB::raw('count(*) as total'),
                DB::raw('sum(was_helpful) as positive')
            )
            ->first();

        return response()->json([
            'period_days'     => $days,
            'total_messages'  => $stats?->total ?? 0,
            'unique_sessions' => $stats?->sessions ?? 0,
            'avg_response_ms' => round($stats?->avg_ms ?? 0),
            'avg_agents'      => round($stats?->avg_agents ?? 0, 1),
            'cache_rate'      => $stats?->total > 0
                ? round($stats->cached / $stats->total * 100, 1) : 0,
            'satisfaction'    => $feedback?->total > 0
                ? round($feedback->positive / $feedback->total * 100, 1) : null,
            'top_intents'      => $topIntents,
            'messages_per_day' => $messagesPerDay,
            'top_pages'        => $topPages,
        ]);
    }

    // ── GET /api/admin/campaigns ───────────────────────────────────────────
    public function campaigns(Request $request)
    {
        $campaigns = MarketingCampaign::with('owner')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data' => $campaigns->map(fn($c) => [
                'id'         => $c->id,
                'platform'   => $c->platform,
                'status'     => $c->status,
                'post_url'   => $c->post_url,
                'content'    => substr($c->content, 0, 100) . '...',
                'created_at' => $c->created_at->format('d/m/Y H:i'),
                'owner' => [
                    'id'   => $c->owner->id,
                    'name' => $c->owner->agency_name ?? $c->owner->name,
                ],
            ]),
            'total' => $campaigns->total(),
        ]);
    }
}
