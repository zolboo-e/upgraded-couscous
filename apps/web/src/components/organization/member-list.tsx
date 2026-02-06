"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import type { OrganizationMember } from "@/lib/actions/organization";
import { AddMemberDialog } from "./add-member-dialog";
import { EditMemberDialog } from "./edit-member-dialog";
import { MemberListItem } from "./member-list-item";
import { RemoveMemberDialog } from "./remove-member-dialog";

interface MemberListProps {
  members: OrganizationMember[];
  currentUserId: string;
  isAdmin: boolean;
}

export function MemberList({
  members,
  currentUserId,
  isAdmin,
}: MemberListProps): React.ReactElement {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<OrganizationMember | null>(null);
  const [removeMember, setRemoveMember] = useState<OrganizationMember | null>(null);

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Members ({members.length})</CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                isCurrentUser={member.userId === currentUserId}
                isAdmin={isAdmin}
                onEditRole={setEditMember}
                onRemove={setRemoveMember}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <AddMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditMemberDialog
        member={editMember}
        open={editMember !== null}
        onOpenChange={(open) => !open && setEditMember(null)}
      />
      <RemoveMemberDialog
        member={removeMember}
        open={removeMember !== null}
        onOpenChange={(open) => !open && setRemoveMember(null)}
      />
    </>
  );
}
