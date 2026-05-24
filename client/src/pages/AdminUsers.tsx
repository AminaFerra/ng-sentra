import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Lock, Trash2, Users, UserCog } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const roleBadge: Record<string, string> = {
  Admin: "bg-red-500/20 text-red-400 border-red-500/30",
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  Analyst: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Viewer: "bg-muted text-muted-foreground border-border",
  user: "bg-muted text-muted-foreground border-border",
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const { data: users, refetch } = trpc.users.list.useQuery();

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("User role updated"); refetch(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => { toast.success("User deleted"); refetch(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "admin";

  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          User Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage SOC team members and their role-based access permissions
        </p>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-3 p-3 bg-muted/20 border border-border rounded-lg">
        {[
          { role: "Admin", desc: "Full access — configure components, manage users, view audit logs" },
          { role: "Analyst", desc: "Operational access — view all, trigger SOAR IR approaches" },
          { role: "Viewer", desc: "Read-only access — view dashboard and component status only" },
        ].map(({ role, desc }) => (
          <div key={role} className="flex items-center gap-2">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${roleBadge[role]}`}>{role}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">{desc}</span>
          </div>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            SOC Team Members
            <span className="ml-auto text-xs text-muted-foreground font-mono">{users?.length ?? 0} users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(users ?? []).map(u => {
              const isSelf = u.id === currentUser?.id;
              const displayRole = u.role === "admin" ? "Admin" : u.role === "user" ? "Viewer" : u.role;
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/20 border border-border/50 hover:border-border transition-colors">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{(u.name ?? u.email ?? "U")[0].toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{u.name ?? "Unnamed"}</p>
                      {isSelf && <span className="text-[10px] font-mono text-primary/60 bg-primary/10 px-1 rounded">YOU</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email ?? u.openId}</p>
                  </div>

                  {/* Role Badge */}
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border flex-shrink-0 ${roleBadge[displayRole ?? "Viewer"]}`}>
                    {displayRole ?? "Viewer"}
                  </span>

                  {/* Role Selector */}
                  <Select
                    value={displayRole ?? "Viewer"}
                    onValueChange={role => updateRole.mutate({ id: u.id, role: role as any })}
                    disabled={isSelf || updateRole.isPending}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Analyst">Analyst</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isSelf}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <strong>{u.name ?? u.email}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteUser.mutate({ id: u.id })}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
            {(!users || users.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
