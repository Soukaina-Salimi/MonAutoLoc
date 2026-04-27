<?php
// auth-service/app/Models/ChatLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatLog extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'ip_address',
        'user_message',
        'bot_response',
        'intent',
        'extracted_params',
        'page_context',
        'response_time_ms',
        'agents_called',
        'used_cache',
        'vehicules_returned',
        'services_returned',
        'rating',
        'was_helpful',
    ];

    protected $casts = [
        'extracted_params' => 'array',
        'used_cache'       => 'boolean',
        'was_helpful'      => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
