<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // إضافة العمود وجعله يرتبط بجدول subjects (مع الحذف المتسلسل أو التقييد حسب رغبتك)
            $table->foreignId('subject_id')
                  ->after('department_id') // وضعه بعد حقل القسم (اختياري)
                  ->nullable()
                  ->constrained('subjects')
                  
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['subject_id']);
            $table->dropColumn('subject_id');
        });
    }
};