<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Update any existing active documents to pending if appropriate
        DB::table('documents')->where('status', 'active')->update(['status' => 'pending']);
    }

    public function down(): void
    {
        DB::table('documents')->where('status', 'pending')->update(['status' => 'active']);
    }
};
