<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property int|null $department_id
 * @property string $status
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'department_id',
        'status',
        'signature_path',
        'order_num'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    private function orderRule(?int $departmentId, ?int $ignoreId = null): \Closure
    {
        return function ($attribute, $value, $fail) use ($departmentId, $ignoreId) {
            $base = User::query()->when(
                $departmentId,
                fn($q) => $q->where('department_id', $departmentId),
                fn($q) => $q->whereNull('department_id'),
            );

            $taken = (clone $base)
                ->where('order_num', $value)
                ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
                ->exists();

            if ($taken) {
                $last = (int) (clone $base)->max('order_num');
                $fail("رقم الترتيب {$value} مستخدم بالفعل في هذا القسم. آخر رقم مسجل: {$last}، المقترح: " . ($last + 1));
            }
        };
    }
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function uploadedDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'uploaded_by');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function documentAccess(): HasMany
    {
        return $this->hasMany(DocumentAccess::class);
    }

    public function hasRole(string|array $roles): bool
    {
        $roleArray = is_array($roles) ? $roles : [$roles];
        return $this->roles->pluck('name')->intersect($roleArray)->isNotEmpty();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isArchivist(): bool
    {
        return $this->hasRole(['admin', 'archivist']);
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        foreach ($this->roles as $role) {
            if ($role->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    public function hasDepartmentAccess(?int $departmentId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return (int) $this->department_id === (int) $departmentId;
    }
}
