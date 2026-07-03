import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            &larr; Back
          </Link>
          <h1 className="font-serif text-lg font-semibold text-foreground">Users</h1>
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
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
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
                      <p className="text-sm text-destructive">{errors.password.message}</p>
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
          <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-card">
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 px-4 py-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users yet" description="Add an agent to start assigning tickets." />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-secondary/40">
                    <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">
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
                            className="h-8 w-8 text-destructive hover:text-destructive"
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
