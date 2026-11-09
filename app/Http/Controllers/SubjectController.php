<?php
// app/Http/Controllers/SubjectController.php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Subject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    private function authorizeManage(Request $request): void
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('subjects.manage')) {
            abort(403, 'غير مصرح لك بإدارة المواضيع.');
        }
    }

    public function index(Request $request): Response
    {
        $this->authorizeManage($request);

        $subjects = Subject::query()
            ->with('department:id,name')
            ->when($request->filled('search'), fn ($q) =>
                $q->where('name', 'like', '%' . trim($request->search) . '%')
            )
            ->when($request->filled('department_id'), fn ($q) =>
                $q->where('department_id', $request->department_id)
            )
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Subjects/Index', [
            'subjects'    => $subjects,
            'filters'     => $request->only(['search', 'department_id']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeManage($request);

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('subjects')->where('department_id', $request->department_id),
            ],
            'department_id' => ['required', 'exists:departments,id'],
        ], [
            'name.unique' => 'هذا الموضوع موجود بالفعل في نفس القسم.',
        ]);

        $subject = Subject::create($validated);

        return back()->with('success', "تم إضافة الموضوع \"{$subject->name}\" بنجاح.");
    }

    public function update(Request $request, Subject $subject): RedirectResponse
    {
        $this->authorizeManage($request);

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('subjects')
                    ->where('department_id', $request->department_id)
                    ->ignore($subject->id),
            ],
            'department_id' => ['required', 'exists:departments,id'],
        ], [
            'name.unique' => 'هذا الموضوع موجود بالفعل في نفس القسم.',
        ]);

        $subject->update($validated);

        return back()->with('success', 'تم تحديث الموضوع بنجاح.');
    }

    public function destroy(Request $request, Subject $subject): RedirectResponse
    {
        $this->authorizeManage($request);

        $name = $subject->name;
        $subject->delete();

        return back()->with('success', "تم حذف الموضوع \"{$name}\".");
    }
}