<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\DocumentVersion;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {


        // 2. Roles & Permissions
        $permissions = [
            ['name' => 'documents.view', 'display_name' => 'عرض المستندات', 'group' => 'documents'],
            ['name' => 'documents.upload', 'display_name' => 'رفع مستندات جديدة', 'group' => 'documents'],
            ['name' => 'documents.download', 'display_name' => 'تحميل المستندات', 'group' => 'documents'],
            ['name' => 'documents.version', 'display_name' => 'إضافة إصدار جديد', 'group' => 'documents'],
            ['name' => 'documents.delete', 'display_name' => 'حذف المستندات', 'group' => 'documents'],
            ['name' => 'documents.share', 'display_name' => 'مشاركة المستندات', 'group' => 'documents'],
            ['name' => 'categories.manage', 'display_name' => 'إدارة المجلدات والتصنيفات', 'group' => 'categories'],
            ['name' => 'departments.manage', 'display_name' => 'إدارة الأقسام', 'group' => 'departments'],
            ['name' => 'audit.view', 'display_name' => 'عرض سجل الرقابة', 'group' => 'audit'],
            ['name' => 'users.manage', 'display_name' => 'إدارة المستخدمين', 'group' => 'users'],
        ];

        $permModels = [];
        foreach ($permissions as $p) {
            $permModels[$p['name']] = Permission::create($p);
        }

        $adminRole = Role::create([
            'name' => 'admin',
            'display_name' => 'مدير النظام',
            'description' => 'صلاحيات كاملة للتحكم في جميع الأقسام والمستندات وسجل الرقابة',
        ]);
        $adminRole->permissions()->sync(collect($permModels)->pluck('id'));

        $archivistRole = Role::create([
            'name' => 'archivist',
            'display_name' => 'مؤرشف',
            'description' => 'صلاحيات رفع، تعديل، تحميل، ومشاركة المستندات داخل القسم',
        ]);
        $archivistRole->permissions()->sync([
            $permModels['documents.view']->id,
            $permModels['documents.upload']->id,
            $permModels['documents.download']->id,
            $permModels['documents.version']->id,
            $permModels['documents.share']->id,
            $permModels['categories.manage']->id,
        ]);

        $viewerRole = Role::create([
            'name' => 'viewer',
            'display_name' => 'مشاهد',
            'description' => 'صلاحيات استعراض وتحميل المستندات المتاحة له فقط',
        ]);
        $viewerRole->permissions()->sync([
            $permModels['documents.view']->id,
            $permModels['documents.download']->id,
        ]);
        // 5. Users
        $admin = User::create([
            'name' => 'أحمد إبراهيم (مدير النظام)',
            'email' => 'admin@archive.local',
            'password' => Hash::make('password'),
            'department_id' => null,
            'status' => 'active',
        ]);
        $admin->roles()->attach($adminRole->id);



    }
}
