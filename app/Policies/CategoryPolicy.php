<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Category $category): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$category->department_id) {
            return true;
        }

        return (int) $user->department_id === (int) $category->department_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('categories.manage');
    }

    public function update(User $user, Category $category): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('categories.manage') &&
            (!$category->department_id || (int) $user->department_id === (int) $category->department_id);
    }

    public function delete(User $user, Category $category): bool
    {
        return $this->update($user, $category);
    }
}
