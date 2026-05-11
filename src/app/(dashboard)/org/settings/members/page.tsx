"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrg } from "@/components/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppLocale } from "@/components/app-locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";

export default function OrgSettingsMembersPage() {
  const { toast } = useToast();
  const { currentOrg } = useOrg();
  const utils = trpc.useUtils();
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);
  const roleLabel = (r: string) => {
    if (!isZh) return r;
    switch (r) {
      case "OWNER": return "所有者";
      case "ADMIN": return "管理员";
      case "MEMBER": return "成员";
      case "VIEWER": return "查看者";
      default: return r;
    }
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">(
    "MEMBER",
  );
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);

  const membersQuery = trpc.orgMember.list.useQuery(
    { organizationId: currentOrg?.id ?? "" },
    { enabled: !!currentOrg },
  );

  const inviteMutation = trpc.orgMember.invite.useMutation({
    onSuccess: () => {
      toast({ title: tt("Member invited", "已邀请成员") });
      setInviteOpen(false);
      setInviteEmail("");
      utils.orgMember.list.invalidate();
    },
    onError: (err) => {
      toast({ title: tt("Error", "出错了"), description: err.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = trpc.orgMember.updateRole.useMutation({
    onSuccess: () => {
      toast({ title: tt("Role updated", "角色已更新") });
      setEditingRoleUserId(null);
      utils.orgMember.list.invalidate();
    },
    onError: (err) => {
      toast({
        title: tt("Error", "出错了"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = trpc.orgMember.remove.useMutation({
    onSuccess: () => {
      toast({ title: tt("Member removed", "成员已移除") });
      utils.orgMember.list.invalidate();
    },
    onError: (err) => {
      toast({
        title: tt("Error", "出错了"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {tt("No organization selected", "未选择组织")}
      </div>
    );
  }

  const isOwner = currentOrg.role === "OWNER";
  const isAdmin = isOwner || currentOrg.role === "ADMIN";
  const members = membersQuery.data ?? [];

  const roleVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default" as const;
      case "ADMIN":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{tt("Members", "成员")}</h2>
          <p className="text-sm text-muted-foreground">
            {isZh
              ? `管理可以访问 “${currentOrg.name}” 的成员。`
              : `Manage who has access to "${currentOrg.name}".`}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {tt("Add member", "添加成员")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tt("Invite Member", "邀请成员")}</DialogTitle>
                <DialogDescription>
                  {tt(
                    "They must have an account to be invited.",
                    "被邀请的人需要已经有账户。",
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{tt("Email", "邮箱")}</Label>
                  <Input
                    type="email"
                    placeholder={tt("colleague@company.com", "同事邮箱@公司.com")}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tt("Role", "角色")}</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as typeof inviteRole)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">{tt("Admin", "管理员")}</SelectItem>
                      <SelectItem value="MEMBER">{tt("Member", "成员")}</SelectItem>
                      <SelectItem value="VIEWER">{tt("Viewer", "查看者")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  {tt("Cancel", "取消")}
                </Button>
                <Button
                  onClick={() =>
                    inviteMutation.mutate({
                      organizationId: currentOrg.id,
                      email: inviteEmail,
                      role: inviteRole,
                    })
                  }
                  disabled={
                    inviteMutation.isPending || !inviteEmail.includes("@")
                  }
                >
                  {inviteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {tt("Invite", "邀请")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tt("Name", "姓名")}</TableHead>
                <TableHead>{tt("Email", "邮箱")}</TableHead>
                <TableHead>{tt("Organization Role", "组织角色")}</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const profileInitials =
                  m.profile?.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() ?? "?";

                return (
                  <TableRow key={m.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={m.profile?.avatar ?? undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {profileInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {m.profile?.name ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.profile?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {editingRoleUserId === m.userId && m.role !== "OWNER" ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) =>
                            updateRoleMutation.mutate({
                              organizationId: currentOrg.id,
                              userId: m.userId,
                              role: v as "ADMIN" | "MEMBER" | "VIEWER",
                            })
                          }
                          onOpenChange={(open) => {
                            if (!open) setEditingRoleUserId(null);
                          }}
                          defaultOpen
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {isOwner && (
                              <SelectItem value="ADMIN">{roleLabel("ADMIN")}</SelectItem>
                            )}
                            <SelectItem value="MEMBER">{roleLabel("MEMBER")}</SelectItem>
                            <SelectItem value="VIEWER">{roleLabel("VIEWER")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge variant={roleVariant(m.role)}>
                            {roleLabel(m.role)}
                          </Badge>
                          {isAdmin && m.role !== "OWNER" && (
                            <button
                              onClick={() => setEditingRoleUserId(m.userId)}
                              className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {m.role !== "OWNER" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{tt("Remove Member", "移除成员")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {isZh ? (
                                    <>
                                      确认将{" "}
                                      <span className="font-medium text-foreground">
                                        {m.profile?.name ?? m.profile?.email}
                                      </span>{" "}
                                      从 “{currentOrg.name}” 中移除吗？他们将失去访问该组织所有项目的权限。
                                    </>
                                  ) : (
                                    <>
                                      Are you sure you want to remove{" "}
                                      <span className="font-medium text-foreground">
                                        {m.profile?.name ?? m.profile?.email}
                                      </span>{" "}
                                      from &quot;{currentOrg.name}&quot;? They will
                                      lose access to all projects in this
                                      organization.
                                    </>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{tt("Cancel", "取消")}</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() =>
                                    removeMutation.mutate({
                                      organizationId: currentOrg.id,
                                      userId: m.userId,
                                    })
                                  }
                                >
                                  {tt("Remove", "移除")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
