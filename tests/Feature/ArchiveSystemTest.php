<?php

use App\Models\Category;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    Storage::fake('local');
});

test('login page is accessible for guests', function () {
    $response = $this->get('/login');
    $response->assertOk();
});

test('demo login allows quick switching to user', function () {
    $user = User::where('email', 'admin@archive.local')->first();

    $response = $this->post('/demo-login', ['user_id' => $user->id]);
    $response->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($user);
});

test('authenticated user can view dashboard with stats', function () {
    $admin = User::where('email', 'admin@archive.local')->first();

    $response = $this->actingAs($admin)->get('/dashboard');
    $response->assertOk();
});

test('document upload saves file in private storage and records audit log', function () {
    $admin = User::where('email', 'admin@archive.local')->first();
    $dept = Department::first();
    $cat = Category::first();
    $type = DocumentType::first();

    $file = UploadedFile::fake()->create('test-contract.pdf', 1024, 'application/pdf');

    $response = $this->actingAs($admin)->post('/documents', [
        'title' => 'عقد تجريبي للاختبار',
        'reference_no' => 'REF-TEST-001',
        'doc_date' => '2026-03-01',
        'department_id' => $dept->id,
        'category_id' => $cat->id,
        'type_id' => $type?->id,
        'status' => 'active',
        'file' => $file,
        'change_notes' => 'نسخة تجريبية',
    ]);

    $response->assertRedirect();

    $document = Document::where('reference_no', 'REF-TEST-001')->first();
    expect($document)->not->toBeNull();
    expect($document->title)->toBe('عقد تجريبي للاختبار');
    expect($document->versions)->toHaveCount(1);
    expect($document->latestVersion->version_no)->toBe(1);

    // Verify file exists on private storage
    Storage::disk('local')->assertExists($document->latestVersion->file_path);

    // Verify audit log
    $this->assertDatabaseHas('audit_logs', [
        'document_id' => $document->id,
        'action' => 'upload',
    ]);
});

test('user can upload a new version and it increments version number', function () {
    $admin = User::where('email', 'admin@archive.local')->first();
    $document = Document::first();

    $newFile = UploadedFile::fake()->create('updated-doc.pdf', 2048, 'application/pdf');

    $response = $this->actingAs($admin)->post("/documents/{$document->id}/versions", [
        'file' => $newFile,
        'change_notes' => 'تعديل البنود والشروط',
    ]);

    $response->assertRedirect();

    $latestVersion = $document->fresh()->latestVersion;
    expect($latestVersion->version_no)->toBeGreaterThan(1);
    expect($latestVersion->change_notes)->toBe('تعديل البنود والشروط');
});

test('category explorer lists folders and supports creating new subfolders', function () {
    $admin = User::where('email', 'admin@archive.local')->first();

    $response = $this->actingAs($admin)->get('/categories');
    $response->assertOk();

    $response = $this->actingAs($admin)->post('/categories', [
        'name' => 'مجلد فرعي تجريبي',
        'parent_id' => null,
        'description' => 'وصف للاختبار',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('categories', ['name' => 'مجلد فرعي تجريبي']);
});

test('admin can create, update, and delete a department', function () {
    $admin = User::where('email', 'admin@archive.local')->first();

    // Create
    $response = $this->actingAs($admin)->post('/departments', [
        'name' => 'إدارة التسويق الرقمي',
        'code' => 'MKT',
        'description' => 'قسم التسويق والمبيعات',
    ]);
    $response->assertRedirect();
    $this->assertDatabaseHas('departments', ['code' => 'MKT']);

    $dept = Department::where('code', 'MKT')->first();

    // Update
    $response = $this->actingAs($admin)->put("/departments/{$dept->id}", [
        'name' => 'إدارة التسويق المحدثة',
        'code' => 'MKT2',
        'description' => 'وصف محدث',
    ]);
    $response->assertRedirect();
    $this->assertDatabaseHas('departments', ['code' => 'MKT2', 'name' => 'إدارة التسويق المحدثة']);

    // Delete
    $response = $this->actingAs($admin)->delete("/departments/{$dept->id}");
    $response->assertRedirect();
    $this->assertDatabaseMissing('departments', ['id' => $dept->id]);
});

test('admin can create, update, and delete a user', function () {
    $admin = User::where('email', 'admin@archive.local')->first();
    $role = Role::where('name', 'viewer')->first();

    // Create user
    $response = $this->actingAs($admin)->post('/users', [
        'name' => 'موظف جديد للاختبار',
        'email' => 'newuser@archive.local',
        'password' => 'secret123',
        'role_id' => $role->id,
        'status' => 'active',
    ]);
    $response->assertRedirect();
    $this->assertDatabaseHas('users', ['email' => 'newuser@archive.local']);

    $newUser = User::where('email', 'newuser@archive.local')->first();
    expect($newUser->roles)->toHaveCount(1);

    // Update user
    $response = $this->actingAs($admin)->put("/users/{$newUser->id}", [
        'name' => 'موظف معدل للاختبار',
        'email' => 'newuser@archive.local',
        'role_id' => $role->id,
        'status' => 'inactive',
    ]);
    $response->assertRedirect();
    expect($newUser->fresh()->name)->toBe('موظف معدل للاختبار');
    expect($newUser->fresh()->status)->toBe('inactive');

    // Delete user
    $response = $this->actingAs($admin)->delete("/users/{$newUser->id}");
    $response->assertRedirect();
    $this->assertDatabaseMissing('users', ['id' => $newUser->id]);
});

