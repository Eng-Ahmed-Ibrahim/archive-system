export interface Department {
    id: number;
    name: string;
    code?: string | null;
    description?: string | null;
    documents_count?: number;
    categories_count?: number;
    users_count?: number;
    can_access?: boolean;
    created_at?: string;
}

export interface Category {
    id: number;
    parent_id?: number | null;
    department_id?: number | null;
    name: string;
    description?: string | null;
    documents_count?: number;
    children?: Category[];
    parent?: Category | null;
    department?: Department | null;
    created_at?: string;
}

export interface DocumentType {
    id: number;
    name: string;
    code?: string | null;
}

export interface Tag {
    id: number;
    name: string;
}

export interface DocumentVersion {
    id: number;
    document_id: number;
    version_no: number;
    file_path: string;
    original_name: string;
    file_size: number;
    formatted_size?: string;
    mime_type: string;
    file_hash: string;
    change_notes?: string | null;
    uploaded_by: number;
    uploader?: User;
    created_at: string;
}

export interface DocumentAccess {
    id: number;
    document_id: number;
    user_id: number;
    access_level: 'view' | 'download' | 'edit';
    user?: User;
    created_at: string;
}

export interface DocumentItem {
    id: number;
    title: string;
    reference_no: string;
    doc_date: string;
    type_id?: number | null;
    category_id: number;
    department_id: number;
    uploaded_by: number;
    status: 'active' | 'archived' | 'draft';
    deleted_at?: string | null;
    created_at: string;
    updated_at: string;
    department?: Department;
    category?: Category;
    type?: DocumentType | null;
    uploader?: User;
    latest_version?: DocumentVersion | null;
    versions?: DocumentVersion[];
    tags?: Tag[];
    access_list?: DocumentAccess[];
    audit_logs?: AuditLog[];
}

export interface AuditLog {
    id: number;
    user_id?: number | null;
    document_id?: number | null;
    action: string;
    ip_address?: string | null;
    user_agent?: string | null;
    details?: Record<string, any> | null;
    created_at: string;
    user?: User | null;
    document?: DocumentItem | null;
}

export interface User {
    id: number;
    name: string;
    email: string;
    department_id?: number | null;
    department?: string | Department | null;
    roles?: string[];
    role_names?: string[];
    is_admin?: boolean;
    permissions?: string[];
}

export interface DemoUser {
    id: number;
    name: string;
    email: string;
    department: string;
    role: string;
}

export interface SharedProps {
    appName: string;
    auth: {
        user: User | null;
    };
    flash: {
        success?: string | null;
        error?: string | null;
    };
    demoUsers: DemoUser[];
    [key: string]: unknown;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}
