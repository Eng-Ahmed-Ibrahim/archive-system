<?php

use App\Models\Category;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentRecipient;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    Storage::fake('local');
    Storage::fake('public');

    $dept = Department::firstOrCreate(['name' => 'الإدارة العامة'], ['code' => 'HQ']);
    Category::firstOrCreate(['name' => 'عام'], ['department_id' => $dept->id]);
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
    $type = DocumentType::firstOrCreate(['name' => 'عقد'], ['code' => 'CNT']);

    // Create a subject for this department
    $subject = Subject::create([
        'name' => 'موضوع تجريبي للاختبار',
        'department_id' => $dept->id,
    ]);

    $file = UploadedFile::fake()->create('test-contract.pdf', 1024, 'application/pdf');

    $response = $this->actingAs($admin)->post('/documents', [
        'title' => 'عقد تجريبي للاختبار',
        'reference_no' => 'REF-TEST-001',
        'doc_date' => '2026-03-01',
        'direction' => 'incoming',
        'subject_id' => $subject->id,
        'department_id' => $dept->id,
        'category_id' => $cat->id,
        'type_id' => $type?->id,
        'file' => $file,
        'comment' => 'ملاحظة أولية',
    ]);

    $response->assertRedirect();

    $document = Document::where('reference_no', 'REF-TEST-001')->first();
    expect($document)->not->toBeNull();
    expect($document->title)->toBe('عقد تجريبي للاختبار');
    expect($document->status)->toBe('pending');
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
    $dept = Department::first();
    $cat = Category::first();
    $subject = Subject::create(['name' => 'موضوع للاختبار', 'department_id' => $dept->id]);

    $file = UploadedFile::fake()->create('contract.pdf', 1024, 'application/pdf');
    $this->actingAs($admin)->post('/documents', [
        'title' => 'مستند إصدارات',
        'reference_no' => 'REF-VER-001',
        'doc_date' => '2026-03-01',
        'direction' => 'incoming',
        'subject_id' => $subject->id,
        'department_id' => $dept->id,
        'category_id' => $cat->id,
        'file' => $file,
    ]);

    $document = Document::where('reference_no', 'REF-VER-001')->first();
    $newFile = UploadedFile::fake()->create('updated-doc.pdf', 2048, 'application/pdf');

    $response = $this->actingAs($admin)->post("/documents/{$document->id}/versions", [
        'file' => $newFile,
        'change_notes' => 'تعديل البنود والشروط',
    ]);

    $response->assertRedirect();

    $latestVersion = $document->fresh()->latestVersion;
    expect($latestVersion->version_no)->toBe(2);
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
    $dept = Department::first();

    // Create user
    $response = $this->actingAs($admin)->post('/users', [
        'name' => 'موظف جديد للاختبار',
        'email' => 'newuser@archive.local',
        'password' => 'secret123',
        'department_id' => $dept->id,
        'role_id' => $role->id,
        'status' => 'active',
        'order_num' => 50,
    ]);
    $response->assertRedirect();
    $this->assertDatabaseHas('users', ['email' => 'newuser@archive.local']);

    $newUser = User::where('email', 'newuser@archive.local')->first();
    expect($newUser->roles)->toHaveCount(1);
    expect($newUser->order_num)->toBe(50);

    // Update user
    $response = $this->actingAs($admin)->put("/users/{$newUser->id}", [
        'name' => 'موظف معدل للاختبار',
        'email' => 'newuser@archive.local',
        'department_id' => $dept->id,
        'role_id' => $role->id,
        'status' => 'inactive',
        'order_num' => 51,
    ]);
    $response->assertRedirect();
    expect($newUser->fresh()->name)->toBe('موظف معدل للاختبار');
    expect($newUser->fresh()->status)->toBe('inactive');

    // Delete user
    $response = $this->actingAs($admin)->delete("/users/{$newUser->id}");
    $response->assertRedirect();
    $this->assertDatabaseMissing('users', ['id' => $newUser->id]);
});

test('user can update and delete their signature in profile', function () {
    $user = User::where('email', 'admin@archive.local')->first();

    // View profile
    $response = $this->actingAs($user)->get('/profile');
    $response->assertOk();

    // Update signature via file upload
    $sigFile = UploadedFile::fake()->image('my-signature.png', 200, 100);
    $response = $this->actingAs($user)->post('/profile/signature', [
        'signature' => $sigFile,
    ]);
    $response->assertRedirect();

    $user->refresh();
    expect($user->signature_path)->not->toBeNull();
    Storage::disk('public')->assertExists($user->signature_path);

    // Delete signature
    $response = $this->actingAs($user)->delete('/profile/signature');
    $response->assertRedirect();

    $user->refresh();
    expect($user->signature_path)->toBeNull();
});

test('inter-department forwarding and status pending vs finish workflow', function () {
    $admin = User::where('email', 'admin@archive.local')->first();

    $dept1 = Department::first();
    $dept2 = Department::create(['name' => 'قسم الشؤون القانونية']);
    $dept3 = Department::create(['name' => 'قسم المالية']);

    $userDept2 = User::create([
        'name' => 'موظف القانونية',
        'email' => 'legal@archive.local',
        'password' => 'secret123',
        'department_id' => $dept2->id,
        'status' => 'active',
        'order_num' => 1,
    ]);

    $userDept3 = User::create([
        'name' => 'موظف المالية',
        'email' => 'finance@archive.local',
        'password' => 'secret123',
        'department_id' => $dept3->id,
        'status' => 'active',
        'order_num' => 1,
    ]);

    $cat = Category::first();
    $subject = Subject::create(['name' => 'موضوع المعاملة', 'department_id' => $dept1->id]);

    // 1. Create document -> status defaults to pending
    $file = UploadedFile::fake()->create('request.pdf', 500, 'application/pdf');
    $this->actingAs($admin)->post('/documents', [
        'title' => 'معاملة طلب شراء',
        'reference_no' => 'REQ-2026-001',
        'doc_date' => '2026-03-01',
        'direction' => 'incoming',
        'subject_id' => $subject->id,
        'department_id' => $dept1->id,
        'category_id' => $cat->id,
        'file' => $file,
    ]);

    $doc = Document::where('reference_no', 'REQ-2026-001')->first();
    expect($doc->status)->toBe('pending');

    // 2. Forward to Dept 2 (Legal)
    $response = $this->actingAs($admin)->post("/documents/{$doc->id}/forward", [
        'department_id' => $dept2->id,
        'user_ids' => [$userDept2->id],
        'note' => 'برجاء مراجعة الجانب القانوني',
    ]);
    $response->assertRedirect();

    $this->assertDatabaseHas('document_recipients', [
        'document_id' => $doc->id,
        'department_id' => $dept2->id,
        'user_id' => $userDept2->id,
        'status' => 'pending',
    ]);

    // 3. User in Dept 2 forwards to Dept 3 (Finance)
    $response = $this->actingAs($userDept2)->post("/documents/{$doc->id}/forward", [
        'department_id' => $dept3->id,
        'user_ids' => [$userDept3->id],
        'note' => 'تمت المراجعة القانونية ومحول للمالية للاعتماد المالي',
    ]);
    $response->assertRedirect();

    $this->assertDatabaseHas('document_recipients', [
        'document_id' => $doc->id,
        'department_id' => $dept3->id,
        'user_id' => $userDept3->id,
    ]);

    // 4. Update status to finish
    $response = $this->actingAs($userDept3)->post("/documents/{$doc->id}/status", [
        'status' => 'finish',
    ]);
    $response->assertRedirect();
    expect($doc->fresh()->status)->toBe('finish');

    // 5. Reopen status to pending
    $response = $this->actingAs($userDept3)->post("/documents/{$doc->id}/status", [
        'status' => 'pending',
    ]);
    $response->assertRedirect();
    expect($doc->fresh()->status)->toBe('pending');
});

test('user can sign a document generating a new version and finishing the document', function () {
    $admin = User::where('email', 'admin@archive.local')->first();
    $dept = Department::first();
    $cat = Category::first();
    $subject = Subject::create(['name' => 'عقد شراكة', 'department_id' => $dept->id]);

    $file = UploadedFile::fake()->create('contract.pdf', 1000, 'application/pdf');
    $this->actingAs($admin)->post('/documents', [
        'title' => 'عقد شراكة للتوقيع',
        'reference_no' => 'SIGN-001',
        'doc_date' => '2026-03-01',
        'direction' => 'incoming',
        'subject_id' => $subject->id,
        'department_id' => $dept->id,
        'category_id' => $cat->id,
        'file' => $file,
    ]);

    $doc = Document::where('reference_no', 'SIGN-001')->first();
    expect($doc->versions)->toHaveCount(1);
    expect($doc->status)->toBe('pending');

    // Sign the document with a signed PDF
    $signedPdf = UploadedFile::fake()->create('signed-contract.pdf', 1200, 'application/pdf');

    $response = $this->actingAs($admin)->post("/documents/{$doc->id}/sign", [
        'file' => $signedPdf,
        'mark_as_finish' => true,
        'note' => 'تم التوقيع والاعتماد النهائي',
    ]);

    $response->assertRedirect();

    $doc->refresh();
    expect($doc->versions)->toHaveCount(2);
    expect($doc->latestVersion->version_no)->toBe(2);
    expect($doc->status)->toBe('finish');

    $this->assertDatabaseHas('audit_logs', [
        'document_id' => $doc->id,
        'action' => 'sign',
    ]);
});
