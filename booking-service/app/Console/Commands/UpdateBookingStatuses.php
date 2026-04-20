<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Booking;

class UpdateBookingStatuses extends Command
{
    protected $signature = 'bookings:update-statuses';
    protected $description = 'Update approved bookings to completed if end_date has passed';

    public function handle()
    {
        $updated = Booking::where('status', 'approved')
            ->where('end_date', '<', now())
            ->update(['status' => 'completed']);

        $this->info("{$updated} bookings updated.");

        return Command::SUCCESS;
    }
}
