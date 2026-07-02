import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from "../types";

interface UserRow extends User {
  createdAt: string;
}

function buildUserFormSchema(isEditing: boolean) {
  return z.object({
    name: z.string().trim().min(3, "Name must be at least 3 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().optional().superRefine((val, ctx) => {
      const length = val?.length ?? 0;
      if (length === 0) {
        if (!isEditing) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password must be at least 8 characters" });
        }
        return;
      }
      if (length < 8) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password must be at least 8 characters" });
      }
    }),
  });
}

type UserFormValues = z.infer<ReturnType<typeof buildUserFormSchema>>;

interface Props {
  user: User;
}

export default function Users({ user: currentUser }: Props) {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: () => api.get<UserRow[]>("/users"),
  });

  const isEditing = editingUser !== null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(buildUserFormSchema(isEditing)),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormValues) => api.post<UserRow>("/users", data),
    onSuccess: () => {
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      setError("email", { message: err instanceof Error ? err.message : "Failed to create user" });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormValues }) =>
      api.patch<UserRow>(`/users/${id}`, {
        name: data.name,
        email: data.email,
        ...(data.password ? { password: data.password } : {}),
      }),
    onSuccess: () => {
      reset();
      setOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      setError("email", { message: err instanceof Error ? err.message : "Failed to update user" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  function onSubmit(data: UserFormValues) {
    if (editingUser) {
      editMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function openCreateDialog() {
    setEditingUser(null);
    reset({ name: "", email: "", password: "" });
    setOpen(true);
  }

  function openEditDialog(u: UserRow) {
    setEditingUser(u);
    reset({ name: u.name, email: u.email, password: "" });
    setOpen(true);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
      setEditingUser(null);
    }
  }

  const isPending = createMutation.isPending || editMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Users</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={onOpenChange}>
            <Button onClick={openCreateDialog}>Add user</Button>
            <DialogContent>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogHeader>
                  <DialogTitle>{isEditing ? "Edit user" : "Add user"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" type="text" {...register("name")} />
                    {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={isEditing ? "Leave blank to keep current password" : undefined}
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : isEditing ? "Save changes" : "Add user"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400">No users found.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.role}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${u.name}`}
                          onClick={() => openEditDialog(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.role !== "ADMIN" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            aria-label={`Delete ${u.name}`}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
