"use client";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { MoreHorizontal, Shield, Trash2, UserCog } from "lucide-react";
import type { OrganizationMember } from "@/lib/actions/organization";

interface MemberListItemProps {
  member: OrganizationMember;
  isCurrentUser: boolean;
  isAdmin: boolean;
  onEditRole: (member: OrganizationMember) => void;
  onRemove: (member: OrganizationMember) => void;
}

export function MemberListItem({
  member,
  isCurrentUser,
  isAdmin,
  onEditRole,
  onRemove,
}: MemberListItemProps): React.ReactElement {
  const initials = member.user.name
    ? member.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : member.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{member.user.name ?? member.user.email}</span>
            {isCurrentUser && <span className="text-xs text-muted-foreground">(You)</span>}
          </div>
          <p className="text-sm text-muted-foreground">{member.user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
          {member.role === "admin" ? (
            <>
              <Shield className="mr-1 h-3 w-3" />
              Admin
            </>
          ) : (
            "Member"
          )}
        </Badge>
        {isAdmin && !isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditRole(member)}>
                <UserCog className="mr-2 h-4 w-4" />
                Change role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRemove(member)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
